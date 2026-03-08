# 프로젝트 구조 분석

## 개요

- **기술 스택**: Next.js 15 (App Router), TypeScript strict 모드, Supabase PostgreSQL, Google Gemini Flash 2.0, Anthropic Claude (선택적), Firebase Admin, Resend, React 18, Tailwind CSS, Jest
- **아키텍처 패턴**: 관심사별 기능 계층 하이브리드 — 최상위 디렉터리가 관심사별로 분리 (`lib/ai`, `lib/rss`, `lib/social-media`, `lib/services`)
- **전체 소스 파일**: 88개 (node_modules, .next 제외)
  - App 라우트: 22개
  - 라이브러리 모듈: 42개
  - 테스트 파일: 17개
  - 스크립트: 4개
  - 설정/기타: 3개
- **구조적 건강도**: 개선 필요

---

## CRITICAL (아키텍처 부채)

### 1. 3개의 파이프라인 구현체가 로직 분기

거의 동일한 두 개의 파이프라인 구현이 병렬로 유지되고 있습니다:

- `lib/ai/processor.ts` — `app/api/cron/process-articles/route.ts`에서 사용
- `app/api/cron/run-pipeline/route.ts` — HTTP 트리거 파이프라인
- `scripts/pipeline.ts` — CLI용 세 번째 구현

주요 동작 차이:
- `processor.ts`는 `autoPublishArticle` 호출 (자동 발행); `run-pipeline/route.ts`는 안 함
- `processor.ts`는 `scoreNewsOnly` 직접 사용; `run-pipeline/route.ts`는 `scoringAdapter` 사용
- `processor.ts`는 점수 >= 80 시 분석 리포트 생성; `run-pipeline/route.ts`는 안 함

### 2. 비즈니스 로직 전체에 Supabase 클라이언트 직접 생성 산재

`createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)` 패턴이 최소 6개 파일에서 반복:

- `lib/ai/processor.ts:33`
- `lib/rss/fetcher.ts:74`
- `lib/services/post-updater.ts:25, :221`
- `app/api/reports/generate/route.ts:32`
- `app/api/cron/run-pipeline/route.ts:42`

`lib/auth/supabase-server.ts`의 `createServerSupabaseClient()`가 이미 존재하지만 일부에서만 사용됨.

---

## HIGH (조직 문제)

### 3. 3개의 병렬 대시보드 라우트 — 소유권 불명확

- `app/dashboard/page.tsx` (레거시)
- `app/dashboard-unified/page.tsx` (주력, 활발히 수정 중)
- `app/dashboard-admin/page.tsx` (관리자, 위와 목적 중복)

### 4. API 라우트 파일에 파이프라인 비즈니스 로직 직접 삽입

`app/api/cron/run-pipeline/route.ts`에 165줄의 `runPipeline()` 함수가 라우트 핸들러 파일에 직접 포함. HTTP 전송 계층과 비즈니스 로직 간의 계층 경계 위반.

### 5. `lib/social-media/index.ts` 배럴 익스포트 미사용

모든 소비자가 하위 경로에서 직접 임포트하며, 배럴을 통한 임포트가 없음.

### 6. 두 개의 중복 감지 모듈 간 명명 충돌

- `lib/utils/dedup.ts` — URL 해시 기반 정확 중복 감지
- `lib/services/deduplication.ts` — 의미론적 유사성 기반 중복 감지

`dedup`와 `deduplication`이 쉽게 혼동됨.

### 7. `lib/mock/news-data.ts`가 프로덕션에 배포되는 코드

`app/api/news/route.ts`에서 임포트되어 프로덕션 빌드에 포함. 340줄 이상의 하드코딩된 한국 주식 데이터.

---

## MEDIUM (조직 문제)

### 8-9. 죽은 코드

- `lib/ai/filter.ts` — 프로덕션 코드 경로에서 호출되지 않음
- `lib/ai/batch-processor.ts` — 어디서도 임포트되지 않음

### 10. `lib/pipeline/`이 단일 파일만 포함하는 과도한 중첩

`rate-limiter.ts`만 있으며, `lib/utils/`에 속하는 것이 더 적절.

### 11. `clampScore`/`clampSentiment` 3개 파일에 중복

`lib/ai/score.ts`, `lib/ai/summarize.ts`, `lib/ai/scoring-adapter.ts`에 동일 로직 반복.

### 12. `cross-language-dedup.ts`가 서비스 레이어 경계 위반

`lib/services/cross-language-dedup.ts`가 `@/lib/ai/gemini`를 직접 임포트하여 `services → ai` 의존성 생성.

### 13. `summarizeNewsWithScores` 미사용 익스포트

이전 결합 방식의 잔재. 현재 파이프라인은 `scoreNewsOnly` + `summarizeNews` 분리 호출을 사용.

---

## 순환 의존성

수동 추적 결과 순환 임포트가 감지되지 않음. 의존성 그래프가 방향성을 가짐.

---

## 죽은 코드 / 고아 파일

| 파일 | 상태 | 이유 |
|------|------|------|
| `lib/ai/filter.ts` | 죽은 코드 | 프로덕션 임포트 없음; 점수 전용 흐름으로 대체 |
| `lib/ai/batch-processor.ts` | 죽은 코드 | 어디서도 임포트되지 않음 |
| `lib/social-media/index.ts` | 죽은 코드 | 배럴에서 임포트하는 소비자 없음 |
| `summarizeNewsWithScores` | 죽은 익스포트 | 이전 결합 방식, 의도적으로 대체됨 |
| `app/dashboard/page.tsx` | 고아 후보 | `/dashboard`로의 네비게이션 링크 없음 |
| `components/NewsCard.tsx` | 고아 후보 | 활성 대시보드에서 참조되지 않음 |
| `components/NewsFeed.tsx` | 고아 후보 | 활성 페이지에서 참조되지 않음 |

---

## 명명 일관성

| 패턴 | 준수율 |
|------|--------|
| 소문자 kebab-case 파일명 | 97% |
| PascalCase React 컴포넌트 | 100% |
| `route.ts` API 세그먼트 | 100% |
| `page.tsx` 페이지 | 100% |
| `*.test.ts` 테스트 파일 | 100% |
| 단수/복수 디렉터리 | 54% (혼재) |
