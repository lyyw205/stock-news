# 프로젝트 감사 보고서: korean-stock-news

**날짜:** 2026-03-08
**감사 수행:** 9개 전문 에이전트 (구조, 데이터베이스, API, 보안, DevOps, 코드 품질, 성능, 의존성, 테스트)

---

## 요약

Next.js 15 기반 한국 주식 뉴스 집계 서비스의 종합 점수는 **35/100 (POOR)**입니다. RSS → AI 점수 산정 → 자동 발행 파이프라인과 토큰 최적화 전략(점수만 먼저, 요약은 필요시 생성)은 잘 설계되어 있으나, **심각한 보안 취약점**(인증 없는 엔드포인트, cron 인증 우회, git에 커밋된 프로덕션 키), **CI/CD 파이프라인 부재**, **~35-45% 테스트 커버리지**(설정된 80% 기준 미달), 레이스 컨디션과 N+1 DB 패턴 등 **코드 품질 문제**가 존재합니다. 가장 시급한 조치는 노출된 자격 증명 교체와 인증 결함 수정입니다.

---

## 건강 점수표

| 카테고리 | 점수 | 등급 |
|---------|------|------|
| 아키텍처 & 구조 | 40/100 | 개선 필요 |
| 보안 | 25/100 | 취약 |
| 코드 품질 | 45/100 | 개선 필요 |
| 데이터베이스 | 35/100 | 취약 |
| API 설계 | 40/100 | 개선 필요 |
| DevOps & 배포 | 20/100 | 위험 |
| 성능 | 40/100 | 개선 필요 |
| 테스트 커버리지 | 25/100 | 취약 |
| 의존성 관리 | 55/100 | 개선 필요 |
| **종합** | **35/100** | **취약** |

---

## CRITICAL 발견사항 (12건)

### 보안

**S-1. CRON_SECRET 미설정 시 cron 인증 우회** — 5개 cron 엔드포인트 중 4개가 `if (cronSecret && ...)` 패턴을 사용하여, 환경변수가 없으면 인증 검사를 완전히 건너뜁니다. 인증되지 않은 누구나 RSS 수집, AI 처리(API 크레딧 소진), 알림 발송, 자동 발행을 트리거할 수 있습니다.
- `app/api/cron/fetch-rss/route.ts:12`, `process-articles/route.ts:12`, `send-notifications/route.ts:12`, `run-pipeline/route.ts:202`

**S-2. 인증 없는 API 엔드포인트 — 전체 데이터 노출 + AI 비용 발생** — `/api/news/unified` (GET), `/api/summaries/generate` (POST), `/api/reports/generate` (POST), `/api/reports/[articleId]` (GET)에 인증이 전혀 없습니다. 누구나 전체 분석 DB를 스크래핑하거나 무제한 Gemini API 호출을 할 수 있습니다.
- `app/api/news/unified/route.ts:9`, `app/api/summaries/generate/route.ts:10`, `app/api/reports/generate/route.ts:11`

### DevOps

**D-1. git 히스토리에 프로덕션 자격 증명 커밋됨** — `.env.example` 파일에 실제 Supabase service role key(2085년 만료 JWT), anon key, Gemini API key가 포함되어 있으며, 이미 git 히스토리에 영구적으로 기록되어 있습니다. 파일을 수정해도 과거 커밋에서 열람 가능합니다.
- `.env.example:2-7`

**D-2. CI/CD 파이프라인 없음** — `.github/workflows/` 등 자동화 파이프라인이 존재하지 않습니다. 린트 오류, 타입 오류, 깨진 테스트가 배포 전에 감지되지 않습니다.

### 데이터베이스

**DB-1. 트리거 함수가 존재하지 않는 컬럼 참조** — `update_news_credibility` 트리거가 `summaries` 테이블에서 `WHERE news_article_id = NEW.id`를 조회하지만, 실제 컬럼명은 `article_id`입니다. 트리거가 항상 0행을 업데이트하여 자동 신뢰도 갱신이 완전히 미작동합니다.
- `supabase/migrations/20250205000004_deduplication_support.sql:50`

**DB-2. 같은 테이블에 대한 중복 FK** — `social_media_posts` 테이블에 `article_id`와 `news_article_id` 두 컬럼이 모두 `news_articles(id)`를 참조합니다. 두 값이 일관성 제약 없이 서로 달라질 수 있습니다.
- `supabase/migrations/20250205000002_social_media_schema.sql:7`, `20250205000004_deduplication_support.sql:17`

### 코드 품질

**Q-1. `markSummaryAsPosted`의 TOCTOU 레이스 컨디션** — `social_post_count`를 읽은 후 별도 호출로 `count + 1`을 기록합니다. 동시 발행 시 카운트가 유실됩니다.
- `lib/social-media/dispatcher.ts:297-316`

**Q-2. Rate limiter 워커 사망 문제** — `fn(items[i])`에서 예외가 발생하면 해당 워커가 종료되어 할당된 나머지 항목이 모두 유실됩니다.
- `lib/pipeline/rate-limiter.ts:53`

**Q-3. 음수 substring 길이로 인한 데이터 손상** — Toss 포맷터에서 `summary.length < overhead + 3`일 때 빈 문자열이 생성됩니다.
- `lib/social-media/formatters/toss-formatter.ts:32`

### 아키텍처

**A-1. 3개의 파이프라인 구현체가 서로 다른 동작** — `processor.ts`(cron), `run-pipeline/route.ts`(HTTP), `scripts/pipeline.ts`(CLI)가 같은 흐름을 구현하지만 부작용이 다릅니다. 하나는 자동 발행과 분석 리포트를 생성하지만 다른 것은 하지 않습니다.
- `lib/ai/processor.ts`, `app/api/cron/run-pipeline/route.ts`, `scripts/pipeline.ts`

### 의존성

**DEP-1. `fast-xml-parser` CVE (CVSS 9.3)** — DOCTYPE의 정규식 인젝션을 통한 엔티티 인코딩 우회. 설치 버전: 4.5.3 (취약). 4.5.4+에서 수정됨. `firebase-admin` → `@google-cloud/storage` 전이 의존성.

### 성능

**P-1. 기사당 N+1 DB 쓰기** — 중복 기사 처리 시 기사당 4-5회 순차 DB 라운드트립. 50개 배치에서 30개가 중복이면 ~150회 순차 호출(~3초 순수 네트워크 지연).
- `lib/ai/processor.ts:73-134`

---

## HIGH 발견사항 (18건)

| # | 카테고리 | 발견사항 | 위치 |
|---|---------|---------|------|
| H-1 | 보안 | Service role key가 모든 곳에 사용됨 — RLS 설계상 우회됨 | `lib/auth/supabase-server.ts:4-13` |
| H-2 | 보안 | `social_media_posts`, `social_media_log` 테이블에 RLS 미적용 | `migrations/20250205000002_social_media_schema.sql` |
| H-3 | 보안 | 모든 엔드포인트에 Rate limiting 없음 | 프로젝트 전체 |
| H-4 | 보안 | POST 요청에 입력 크기 제한 및 UUID 검증 없음 | `summaries/generate`, `reports/generate`, `social-media/publish` |
| H-5 | 품질 | AI 실패 시 기본 점수(50)가 실제 점수와 구분 불가 | `lib/ai/score.ts:79-105` |
| H-6 | 품질 | 점수 처리 중간 실패 시에도 기사가 처리 완료로 표시 — 중복 summary 위험 | `lib/ai/processor.ts:245-253` |
| H-7 | 품질 | `summary` vs `summary_text` 컬럼명 불일치 — 소셜 발행 시 요약이 `undefined` | `lib/social-media/dispatcher.ts:73,98` |
| H-8 | 품질 | Threads 포맷터에서 `maxTitleLength`가 음수일 때 빈 제목 생성 | `lib/social-media/formatters/threads-formatter.ts:62-64` |
| H-9 | DB | processor 루프에서 기사당 N+1 순차 DB 쓰기 (4-5회) | `lib/ai/processor.ts:73` |
| H-10 | DB | RSS fetcher에서 기사당 N+1 중복 검사 (사이클당 160-400 쿼리) | `lib/rss/fetcher.ts:89-91` |
| H-11 | DB | 대형 JSONB 테이블에 `SELECT *` 사용 | `processor.ts:38`, `dispatcher.ts:334`, `report.ts:150` |
| H-12 | API | `batchSize` 쿼리 파라미터에 상한값 없음 — 리소스 고갈 가능 | `app/api/cron/run-pipeline/route.ts:216` |
| H-13 | API | 엔드포인트 간 에러 응답 형식 불일치 | `app/api/subscriptions/route.ts:21,43,52` |
| H-14 | 성능 | 발행 호출당 Supabase 클라이언트 9회 이상 재생성 | `lib/social-media/dispatcher.ts` |
| H-15 | 성능 | 중복 감지 핫 경로에서 Gemini AI 호출 — 점수 산정 RPM 할당량 소모 | `lib/services/cross-language-dedup.ts:37-67` |
| H-16 | 성능 | RSS 소스 8개를 순차적으로 가져옴 | `lib/rss/fetcher.ts:83` |
| H-17 | 테스트 | 핵심 모듈 5개의 테스트 커버리지 제로 (score, processor, deduplication, text-similarity, rate-limiter) | 테스트 보고서 참조 |
| H-18 | 테스트 | 구독 API 테스트가 잘못된 경로를 임포트 — 로드 시점에 실패 | `tests/unit/api/subscriptions.test.ts:1-3` |

---

## MEDIUM 발견사항 (25건)

| # | 카테고리 | 발견사항 |
|---|---------|---------|
| M-1 | 보안 | RSS 피드 제목/설명을 통한 AI 프롬프트 인젝션 가능 |
| M-2 | 보안 | 15개 이상의 API 응답에서 내부 에러 상세 노출 |
| M-3 | 보안 | CORS, CSP, 보안 헤더 미설정 |
| M-4 | 보안 | 페이지네이션 파라미터 무제한 (`limit=999999` 허용) |
| M-5 | API | `analysis_reports` 에러 시 이중 쿼리로 스키마 변경 감춤 |
| M-6 | API | unified 엔드포인트의 `limit`에 상한값 없음 |
| M-7 | API | 중복 발행 방지 및 멱등성 보장 없음 |
| M-8 | API | 구독 DELETE가 리소스 미존재 시에도 200 반환 |
| M-9 | API | 구독 응답의 `remaining` 카운트 1 오차 |
| M-10 | 품질 | `clampScore`/`clampSentiment` 3개 파일에 중복 정의 |
| M-11 | 품질 | `formatDate` 3개 포맷터 파일에 중복 정의 |
| M-12 | 품질 | `report.ts`에서 `supabase: any` 타입 — TypeScript strict 모드 무력화 |
| M-13 | 품질 | unified 라우트 핸들러 전체에 `any` 타입 사용 |
| M-14 | 품질 | 프롬프트 `.replace()`가 의도치 않은 치환에 취약 |
| M-15 | DB | `summaries` 테이블에 16개 이상의 점수 컬럼 — 과도하게 넓은 테이블 |
| M-16 | DB | 가장 빈번한 쿼리 경로에 복합 인덱스 `(is_processed, pub_date DESC)` 누락 |
| M-17 | DB | `analysis_reports.article_id`에 중복 인덱스 존재 |
| M-18 | DB | `notification_log`에 `(article_id, user_id)` 복합 인덱스 누락 |
| M-19 | 아키텍처 | 3개의 대시보드 라우트가 소유권 불명확하게 병존 |
| M-20 | 아키텍처 | 파이프라인 비즈니스 로직(165줄)이 라우트 파일에 직접 삽입 |
| M-21 | 아키텍처 | 죽은 코드: `filter.ts`, `batch-processor.ts`, `summarizeNewsWithScores` (~350줄) |
| M-22 | 아키텍처 | `lib/mock/news-data.ts`가 프로덕션 빌드에 포함됨 |
| M-23 | 의존성 | `@google/generative-ai`가 23개 마이너 버전 뒤처짐 (0.1.3 → 0.24.x) |
| M-24 | 의존성 | ESLint v8 지원 종료 |
| M-25 | 성능 | processor에서 7일간 `recentArticles` 쿼리에 LIMIT 없음 |

---

## 강점

- **스마트한 토큰 최적화** — 점수만 먼저 산정하고, 요약은 필요 시(점수 >= 80 자동발행 또는 사용자 요청) 생성. 기사당 ~1,400 토큰 절약.
- **깔끔한 도메인 분리** — `lib/ai/`, `lib/rss/`, `lib/social-media/`, `lib/services/`가 높은 응집도로 명확한 경계를 가짐.
- **견고한 에러 격리** — 각 기사가 개별 try/catch에서 처리되어, 단일 기사 실패가 전체 배치를 중단하지 않음.
- **교차 언어 중복 감지** — AI 기반 한국어/영어 중복 감지로 좋은 도메인 이해를 보여줌.
- **좋은 포맷터 아키텍처** — 플랫폼별 포맷터와 문자 수 제한 적용 (Twitter 280자, Telegram 4096자).
- **방어적 점수 클램핑** — AI 응답을 유효 범위로 제한한 후 DB에 저장.
- **일관된 파일 명명** — lib 파일의 97%+ kebab-case 준수, 컴포넌트의 PascalCase 100% 준수.

---

## 개선 로드맵

### Phase 1: 긴급 보안 수정 (즉시 — 1-2일)

- [ ] `.env.example` git 히스토리에 노출된 **모든 자격 증명 교체** (Supabase keys, Gemini API key)
- [ ] `git filter-repo` 또는 BFG Repo Cleaner로 **git 히스토리에서 시크릿 퍼지**
- [ ] **Cron 인증 우회 수정** — `CRON_SECRET` 미설정 시 요청 거부 (`cronSecret &&` → `!cronSecret ||`)
- [ ] `/api/news/unified`, `/api/summaries/generate`, `/api/reports/generate`, `/api/reports/[articleId]`에 **인증 추가**
- [ ] `npm audit fix` 실행으로 `fast-xml-parser` CVE (CVSS 9.3) **즉시 해결**

### Phase 2: 데이터 무결성 & 정확성 수정 (1주차)

- [ ] **깨진 신뢰도 트리거 수정** — 마이그레이션에서 `WHERE news_article_id` → `WHERE article_id`
- [ ] `dispatcher.ts:73,98`의 **`summary` → `summary_text` 컬럼명 수정** (소셜 발행 기능 복구)
- [ ] `markSummaryAsPosted`의 **TOCTOU 레이스 수정** — 원자적 SQL 증가 사용
- [ ] **Rate limiter 워커 사망 수정** — `fn()` 호출을 try/catch로 감싸기
- [ ] Toss/Threads 포맷터의 **음수 substring 수정**
- [ ] `social_media_posts`와 `social_media_log`에 **RLS 활성화**
- [ ] `social_media_posts`의 **중복 FK 제거** (`article_id` 또는 `news_article_id` 중 하나)

### Phase 3: CI/CD & 테스트 기반 구축 (2주차)

- [ ] **GitHub Actions CI 추가** — 매 push/PR마다 lint, type-check, test 실행
- [ ] `next.config.ts`에 **보안 헤더 추가** (CSP, X-Frame-Options, CORS)
- [ ] AI 호출 엔드포인트에 최소한의 **Rate limiting 미들웨어 추가**
- [ ] **핵심 경로 테스트 작성** — `text-similarity.ts`, `deduplication.ts`, `score.ts`, `rate-limiter.ts`
- [ ] **깨진 구독 테스트 임포트 수정**
- [ ] 모든 `articleId` 입력에 **UUID 검증 추가**
- [ ] 서버 측 **페이지네이션 파라미터 상한 적용** (`Math.min(limit, 200)`)

### Phase 4: 아키텍처 & 성능 개선 (3-4주차)

- [ ] **3개 파이프라인 구현체를 단일 `lib/pipeline/orchestrator.ts`로 통합**
- [ ] **Supabase 클라이언트 중앙화** — 6곳의 직접 `createClient` 호출을 `createServerSupabaseClient()`로 교체
- [ ] **RSS 중복 검사 배치화** — 기사별 쿼리 대신 `WHERE url_hash IN (...)` 단일 쿼리
- [ ] **RSS 소스 병렬 가져오기** — 순차 `for...of` 대신 `Promise.all` 사용
- [ ] `news_articles`에 **복합 인덱스 `(is_processed, pub_date DESC)` 추가**
- [ ] `@google/generative-ai` 0.1.3 → 최신 버전으로 **업그레이드** (캐싱 API 구현)
- [ ] **죽은 코드 삭제** — `filter.ts`, `batch-processor.ts`, 미사용 프롬프트 내보내기 (~350줄)
- [ ] zod를 사용한 **시작 시 환경변수 검증 추가**
- [ ] **`/api/health` 엔드포인트 추가** 및 에러 추적 도구(Sentry) 연동

### Phase 5: 마무리 & 강화 (지속적)

- [ ] 대시보드 라우트를 적절한 계층으로 재구성 (`app/dashboard/`, `app/dashboard/admin/`)
- [ ] 중복 유틸리티 추출 (`clampScore`, `formatDate`)
- [ ] ESLint v8 → v9 flat config 마이그레이션
- [ ] cron 엔드포인트 통합 테스트 추가
- [ ] 대시보드 UI 컴포넌트 테스트 추가
- [ ] AI 프롬프트 입력 인젝션 방지를 위한 새니타이징
- [ ] 내부 에러 메시지를 일반 응답으로 교체

---

## 부록: 전문가별 상세 리포트

개별 전문가 리포트는 `.omc/audit/specialist-reports/`에 저장되어 있습니다:
- `structure.md` — 프로젝트 구조 및 아키텍처
- `database.md` — 데이터베이스 스키마, 쿼리, 마이그레이션
- `api.md` — API 설계 및 계약
- `security.md` — 보안 취약점 (OWASP)
- `devops.md` — CI/CD, 배포, 모니터링
- `quality.md` — 코드 품질 및 로직 결함
- `performance.md` — 핫스팟 및 알고리즘 복잡도
- `dependencies.md` — 취약점 및 버전 감사
- `tests.md` — 테스트 커버리지 및 품질 분석
