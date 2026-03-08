# API 설계 리뷰

## 요약
**전체 평가**: 변경 필요
**Breaking Changes**: MINOR

---

## 엔드포인트 목록

| 메서드 | 경로 | 인증 |
|--------|------|------|
| GET | `/api/news` | User Bearer token |
| GET | `/api/news/unified` | 없음 (미인증) |
| GET | `/api/reports/[articleId]` | 없음 (미인증) |
| POST | `/api/reports/generate` | 없음 (미인증) |
| POST | `/api/social-media/publish` | User Bearer token |
| GET | `/api/social-media/status/[postId]` | User Bearer token |
| GET | `/api/subscriptions` | User Bearer token |
| POST | `/api/subscriptions` | User Bearer token |
| DELETE | `/api/subscriptions/[id]` | User Bearer token |
| POST | `/api/summaries/generate` | 없음 (미인증) |
| GET | `/api/cron/fetch-rss` | CRON_SECRET (선택적) |
| GET | `/api/cron/process-articles` | CRON_SECRET (선택적) |
| GET | `/api/cron/run-pipeline` | CRON_SECRET (선택적) |
| GET | `/api/cron/send-notifications` | CRON_SECRET (선택적) |
| GET | `/api/cron/update-posts` | CRON_SECRET (선택적) |

---

## CRITICAL 발견사항

**C-1 — `app/api/cron/update-posts/route.ts:16` — CRON_SECRET 미설정 시 인증 가드가 비정상 작동**

다른 cron 엔드포인트와 달리 `update-posts`는 다른 패턴을 사용합니다:

```ts
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
```

`CRON_SECRET`이 미설정이면 `"Bearer undefined"`와 비교하게 되어, 정확히 `Bearer undefined` 헤더를 가진 요청만 통과합니다.

수정 방향: `fetch-rss/route.ts:10-14`의 패턴과 통일할 것.

---

## HIGH 발견사항

**H-1 — 데이터 변경 및 AI 비용 발생 엔드포인트에 인증 없음**

`POST /api/summaries/generate`는 인증 없이 Gemini API 호출(유료)을 트리거합니다. `POST /api/reports/generate`도 동일합니다. `GET /api/news/unified`와 `GET /api/reports/[articleId]`는 인증 없이 전체 분석 데이터를 노출합니다.

이 엔드포인트들은 `createServerSupabaseClient()`를 사용하여 **service-role** 클라이언트(RLS 우회)를 생성하므로, RLS 정책이 존재해도 보호 효과가 없습니다.

- `app/api/summaries/generate/route.ts:10`
- `app/api/reports/generate/route.ts:11`
- `app/api/reports/[articleId]/route.ts:9`
- `app/api/news/unified/route.ts:9`

**H-2 — `batchSize` 쿼리 파라미터에 상한값 없음**

```ts
const batchSize = batchSizeParam ? parseInt(batchSizeParam) || 30 : 30;
```

호출자가 `batchSize=100000`을 전달할 수 있으며, Supabase `.limit(batchSize)` 호출과 모든 반환 기사에 대한 AI 점수 산정으로 이어집니다.

수정 방향: `Math.min(batchSize, 100)` 또는 문서화된 최대값을 적용하고, 초과 시 400 응답을 반환할 것.

- `app/api/cron/run-pipeline/route.ts:216`

**H-3 — 도메인 에러의 응답 형식 불일치**

같은 파일 내에서 두 가지 다른 에러 응답 형식이 사용됩니다:

```ts
// 도메인 에러 (line 43):
{ error: 'already_subscribed', message: '...' }

// 검증 에러 (line 21):
{ error: 'Invalid ticker format. Must be 6 digits.' }
```

호출자가 일관된 에러 핸들러를 작성할 수 없습니다.

수정 방향: `{ error: string (기계 코드), message: string (사람 텍스트) }` 형식으로 통일할 것.

- `app/api/subscriptions/route.ts:21,43,52`

---

## MEDIUM 발견사항

**M-1 — 사일런트 폴백이 스키마 변경을 숨김** — `analysis_reports` 조인 실패 시 조용히 재시도하여 `hasReport`가 항상 `false`인 다른 응답을 반환합니다. (`app/api/news/unified/route.ts:69-116`)

**M-2 — `limit`에 상한값 없음** — 기본 100이지만 `limit=10000` 전달 시 대량 DB 읽기 발생. (`app/api/news/unified/route.ts:14`)

**M-3 — 안전하지 않은 `any` 캐스트로 내부 DB 컬럼명 노출** — `(article as any).summaries?.[0]`로 TypeScript 무력화. (`app/api/news/route.ts:92`)

**M-4 — 응답 형식이 다른 cron 엔드포인트와 불일치** — `run-pipeline`은 `{ success, ...result }` 플랫 형식이지만 다른 것은 `{ success, message, result }`. (`app/api/cron/run-pipeline/route.ts:224`)

**M-5 — `remaining` 카운트 1 오차** — 삽입 전 `remaining`에서 다시 -1하여 실제보다 1 적게 보고. (`app/api/subscriptions/route.ts:71`)

**M-6 — 멱등성 및 중복 발행 방지 없음** — 네트워크 실패로 재시도 시 같은 기사가 다시 발행됨. (`app/api/social-media/publish/route.ts`)

**M-7 — DELETE가 존재하지 않는 리소스에 404를 반환하지 않음** — Supabase `delete()`는 0행 삭제 시에도 에러를 반환하지 않아 항상 성공 응답. (`app/api/subscriptions/[id]/route.ts`)

---

## LOW 발견사항

**L-1** — `app/api/news/unified/route.ts`에 `runtime`, `dynamic` export 지시어 누락. Next.js가 정적 캐시할 수 있음.

**L-2** — `batchSize` 쿼리 파라미터가 camelCase. REST 관례는 snake_case 또는 kebab-case.

**L-3** — `generationType`에 검증 없음. 유효하지 않은 값이 DB까지 전달됨. (`app/api/reports/generate/route.ts:13`)

**L-4** — `dispatcher.ts:76`에서 `summaries` 컬럼을 `summary`로 조회하지만 실제 컬럼명은 `summary_text`. 소셜 미디어 포스트가 빈 콘텐츠로 발행될 수 있는 잠재적 버그.

---

## 에러 계약 문제

**E-1** — 여러 엔드포인트에서 Supabase 내부 에러 메시지가 클라이언트에 그대로 노출됨 (테이블명, 컬럼명, 제약조건명 유출).

**E-2** — 500 응답 형식 불일치. 일부는 `{ error, message }`, 일부는 `{ error }`, cron은 `{ success: false, error }`.

**E-3** — `summaries/generate`에서 정상 운영 상태에 404 반환. 데이터 무결성 위반에는 409 Conflict 또는 500이 더 적절함. (`app/api/summaries/generate/route.ts:76-80`)
