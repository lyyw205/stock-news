# 데이터베이스 분석 보고서

## 개요

- **데이터베이스**: PostgreSQL (Supabase 호스팅)
- **ORM**: Supabase JS Client (PostgREST 쿼리 빌더) — 전통적 ORM 없음; 마이그레이션에서만 raw SQL
- **테이블**: 8개 (users, news_articles, subscriptions, summaries, notification_log, social_media_posts, social_media_log, analysis_reports)
- **마이그레이션**: 8개 파일 (20250205 ~ 20250308)
- **DB 건강도**: 개선 필요

---

## CRITICAL (데이터 손실 / 무결성 위험)

### C1 — `summaries` 테이블이 마이그레이션 중간에 NOT NULL 계약 위반

- `20250205000001_initial_schema.sql:42` — `summary_text TEXT NOT NULL`
- `20250205000005_auto_publish_support.sql:7` — `ALTER COLUMN summary_text DROP NOT NULL`

마이그레이션 5에서 NOT NULL 제약을 제거. `summary_text`가 이제 nullable이지만 `lib/notifications/dispatcher.ts:150`에서 null 가드 없이 접근.

### C2 — `social_media_posts`에 `news_articles`에 대한 중복 FK

- `20250205000002_social_media_schema.sql:7` — `article_id UUID NOT NULL REFERENCES news_articles(id)`
- `20250205000004_deduplication_support.sql:17` — `news_article_id UUID REFERENCES news_articles(id) ON DELETE SET NULL`

같은 관계가 다른 컬럼명으로 두 번 표현됨. 두 컬럼 간 일관성 제약이 없어 값이 서로 달라질 수 있음.

### C3 — 트리거 함수가 존재하지 않는 컬럼 참조

- `20250205000004_deduplication_support.sql:50` — `WHERE news_article_id = NEW.id`

`summaries` 테이블에 `news_article_id` 컬럼이 없음 (실제 FK는 `article_id`). 트리거가 항상 0행을 업데이트하여 자동 신뢰도 갱신이 완전히 미작동.

---

## HIGH (규모에서의 성능)

### H1 — `processUnprocessedArticles`에서 기사당 4-5회 순차 DB 쓰기

중복 기사의 경우 5회 순차 라운드트립. 50개 배치에서 30개가 중복이면 ~150회 순차 호출.

- `lib/ai/processor.ts:73`

### H2 — RSS fetcher에서 기사당 `checkDuplicate` 쿼리

8개 RSS 소스에서 각 20-50개 기사로, 160-400개의 개별 SELECT 쿼리가 순차 실행.

- `lib/rss/fetcher.ts:89-91`

### H3 — `markSummaryAsPosted`의 읽기 후 쓰기 패턴

`social_post_count`를 읽고 증가하여 기록하는 TOCTOU 레이스 컨디션.

- `lib/social-media/dispatcher.ts:301-315`

### H4 — `createServerSupabaseClient`가 요청당 여러 번 재생성

`dispatcher.ts` 한 모듈에서만 9번 호출됨.

### H5 — 메인 대시보드 쿼리에 무제한 기본 `limit=100`

서버 측 상한 없어 `limit=10000` 전달 시 전체 테이블 조회.

- `app/api/news/unified/route.ts:14`

### H6 — 넓은 테이블에 `SELECT *`

`analysis_reports` 테이블의 다수 JSONB 컬럼까지 불필요하게 전체 조회.

- `processor.ts:38`, `dispatcher.ts:334`, `report.ts:150`

---

## MEDIUM (설계 개선)

- **M1** — `summaries` 테이블이 16개 이상 점수 컬럼을 가진 넓은 플랫 테이블
- **M2** — `notification_log`에 `(article_id, user_id)` 복합 인덱스 누락
- **M3** — `analysis_reports`에 중복 인덱스 (UNIQUE 제약의 암시적 인덱스 + 명시적 인덱스)
- **M4** — `summaries` 부분 인덱스 `idx_summaries_needs_summary`가 시간이 지나면 빈 집합만 포함
- **M5** — `social_media_posts.platforms`가 `TEXT[]`로 저장 — GIN 인덱스 필요
- **M6** — `news_articles.ticker`가 nullable이지만 복합 인덱스에 NULL 포함

---

## 누락 인덱스

| 테이블 | 컬럼 | 예상 영향 |
|--------|------|----------|
| news_articles | `(is_processed, pub_date DESC)` | HIGH — 메인 처리 쿼리 |
| news_articles | `ticker` (WHERE ticker IS NOT NULL) | MEDIUM |
| notification_log | `(article_id, user_id)` | MEDIUM |
| summaries | `article_id` WHERE `summary_text IS NULL` | MEDIUM |

---

## RLS 정책 평가

| 테이블 | RLS 활성화 | 비고 |
|--------|-----------|------|
| users | 예 | 정상 |
| subscriptions | 예 | 정상 |
| notification_log | 예 | 정상 |
| news_articles | 예 | 인증된 사용자 읽기 가능 |
| summaries | 예 | 인증된 사용자 읽기 가능 |
| **social_media_posts** | **아니오** | **RLS 미적용 — anon key로 읽기/쓰기 가능** |
| **social_media_log** | **아니오** | **RLS 미적용** |
| analysis_reports | 예 | 인증된 사용자 읽기만 |

---

## 마이그레이션 안전성

| 마이그레이션 | 위험 | 문제 |
|-------------|------|------|
| 000003 (점수 추가) | LOW | `ADD COLUMN ... DEFAULT NULL` — 안전 |
| 000005 (자동발행) | MEDIUM | `DROP NOT NULL` — 짧은 `ACCESS EXCLUSIVE` 잠금 |
| 000005 (CHECK 제약) | MEDIUM | 기존 행 검증 중 잠금 |
| 모든 마이그레이션 | LOW | 명시적 `BEGIN`/`COMMIT` 트랜잭션 래퍼 없음 |
