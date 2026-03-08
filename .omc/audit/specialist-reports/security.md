# 보안 리뷰 보고서

**범위:** `/home/lyyw205/repos/stock-news` 전체 코드베이스 — 14개 API 라우트, 8개 SQL 마이그레이션, 인증 레이어, AI 파이프라인, RSS fetcher, 소셜 미디어 dispatcher, 모든 의존성.

**위험 수준:** HIGH

## 요약
- CRITICAL: 2건
- HIGH: 4건
- MEDIUM: 5건
- LOW: 3건

---

## CRITICAL (즉시 수정)

### 1. CRON_SECRET 미설정 시 Cron 엔드포인트 인증 우회

**심각도:** CRITICAL
**카테고리:** OWASP A01:2021 — Broken Access Control
**위치:** `app/api/cron/fetch-rss/route.ts:12`, `process-articles/route.ts:12`, `send-notifications/route.ts:12`, `run-pipeline/route.ts:202`

**악용 가능성:** 원격, 미인증
**영향 범위:** 전체 파이프라인 실행 — 공격자가 RSS 수집, AI 처리(Gemini/Anthropic API 크레딧 소진), 모든 사용자에게 알림 발송, 소셜 미디어 자동 발행을 트리거할 수 있음.

**문제:** 4개 cron 엔드포인트가 `if (cronSecret && ...)` 패턴을 사용하여, `CRON_SECRET`이 미설정이면 인증 검사가 완전히 생략됨.

**수정:**
```ts
// 잘못된 코드
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) { return 401; }

// 올바른 코드
if (!cronSecret) { return 500; } // 서버 설정 오류
if (authHeader !== `Bearer ${cronSecret}`) { return 401; }
```

---

### 2. 미인증 API 엔드포인트 — 전체 데이터 노출 + AI 비용 발생

**심각도:** CRITICAL
**카테고리:** OWASP A01:2021 — Broken Access Control
**위치:** `app/api/news/unified/route.ts:9`, `app/api/summaries/generate/route.ts:10`, `app/api/reports/generate/route.ts:11`, `app/api/reports/[articleId]/route.ts:9`

**악용 가능성:** 원격, 미인증
**영향 범위:**
- `/api/news/unified` — 전체 분석 DB를 미인증으로 스크래핑 가능
- `/api/summaries/generate` — 무제한 Gemini API 호출로 비용 발생
- `/api/reports/generate` — 동일 문제, 비용이 더 높은 AI 리포트 생성
- `/api/reports/[articleId]` — 상세 분석 리포트 무단 접근

모든 엔드포인트가 `createServerSupabaseClient()` (service-role, RLS 우회)를 사용하므로 RLS 정책이 보호 효과 없음.

---

## HIGH 발견사항

### 3. Service Role Key가 모든 곳에서 사용됨 — RLS 설계상 우회

**심각도:** HIGH
**카테고리:** OWASP A01:2021
**위치:** `lib/auth/supabase-server.ts:4-13`

`createServerSupabaseClient()`가 항상 service role key로 클라이언트를 생성. 인증된 API 라우트(구독 등)도 service role로 작동하여, 코드에서 수동으로 `user.id` 필터링에 의존하는 취약한 패턴.

### 4. 소셜 미디어 테이블에 RLS 미적용

**심각도:** HIGH
**카테고리:** OWASP A01:2021
**위치:** `supabase/migrations/20250205000002_social_media_schema.sql`

`social_media_posts`와 `social_media_log` 테이블에 RLS가 활성화되지 않음. Supabase anon key가 `NEXT_PUBLIC_` 변수(브라우저 노출)이므로, 클라이언트 측에서 직접 읽기/쓰기 가능.

### 5. 사용자 대면 API에 Rate Limiting 없음

**심각도:** HIGH
**카테고리:** OWASP A04:2021 — Insecure Design
**위치:** 프로젝트 전체

Rate limiting 미들웨어가 전혀 없음. `middleware.ts` 파일 자체가 존재하지 않음. 공격자가 AI 트리거 엔드포인트를 루프로 호출하여 API 할당량 고갈 가능.

### 6. POST 요청에 입력 크기 제한 및 UUID 검증 없음

**심각도:** HIGH
**카테고리:** OWASP A03:2021 / A04:2021
**위치:** `summaries/generate/route.ts:12`, `reports/generate/route.ts:13`, `social-media/publish/route.ts:22`

`articleId`가 UUID 형식 검증 없이 DB 쿼리에 전달됨. 발행 엔드포인트의 `articleIds` 배열에 크기 제한 없음.

---

## MEDIUM 발견사항

### 7. RSS 피드 제목/설명을 통한 AI 프롬프트 인젝션

**심각도:** MEDIUM
**카테고리:** OWASP A03:2021 — Injection (LLM 특화)
**위치:** `lib/ai/prompts.ts:129-148`

외부 RSS 피드의 제목과 설명이 `template.replace('{title}', title)`로 AI 프롬프트에 직접 삽입됨. 악의적 RSS 운영자가 점수를 조작하여 80점 이상으로 만들면 자동 발행이 트리거됨.

### 8. API 응답에서 내부 에러 상세 노출

**심각도:** MEDIUM
**카테고리:** OWASP A04:2021
**위치:** 15곳 이상

Supabase, Gemini, Node.js의 내부 에러 메시지가 테이블명, 컬럼명, 쿼리 구조를 포함하여 클라이언트에 그대로 반환됨.

### 9. CORS, CSP, 보안 헤더 미설정

**심각도:** MEDIUM
**카테고리:** OWASP A05:2021 — Security Misconfiguration
**위치:** `next.config.ts`

X-Frame-Options, Content-Security-Policy 없음. 대시보드가 clickjacking에 취약.

### 10. 페이지네이션 파라미터 무제한

**심각도:** MEDIUM
**위치:** `app/api/news/route.ts:14-15`, `app/api/news/unified/route.ts:14`, `app/api/cron/run-pipeline/route.ts:216`

`?limit=999999`로 대량 DB 쿼리 강제 가능.

### 11. npm audit: CRITICAL 1건, HIGH 2건의 의존성 취약점

**심각도:** MEDIUM
**위치:** `package.json` (전이 의존성)

총 14건의 취약점 (critical 1, high 2, moderate 1, low 10). 대부분 `firebase-admin` 전이 의존성.

---

## LOW 발견사항

### 12. 소셜 미디어 포스트 카운트 증가의 레이스 컨디션

**위치:** `lib/social-media/dispatcher.ts:300-316`

`social_post_count`를 읽은 후 증가하여 기록하는 패턴. 동시 요청 시 카운트 유실.

### 13. `generationType` 입력 미검증

**위치:** `app/api/reports/generate/route.ts:13`

요청 본문의 `generationType`이 검증 없이 `GenerationType`으로 캐스팅됨.

### 14. RSS 피드 URL 하드코딩 — 제한된 SSRF 표면

**위치:** `lib/rss/fetcher.ts:14-57`

현재는 URL이 하드코딩되어 SSRF에 직접 취약하지 않으나, `fetchRSSFeed` 함수가 URL 파라미터를 검증 없이 받아들이므로 향후 사용자 입력 URL이 전달되면 SSRF 가능.

---

## 보안 체크리스트

- [x] 소스 코드에 하드코딩된 시크릿 없음
- [ ] **모든 입력 검증** — 실패: `articleId` UUID 미검증, `limit`/`batchSize` 무제한
- [x] 인젝션 방지 확인 — Supabase 파라미터화 쿼리, `eval`/`exec` 없음
- [ ] **인증/인가 확인** — 실패: 4개 API 라우트 인증 없음, cron 인증 우회
- [ ] **의존성 감사** — 실패: critical 1, high 2 취약점
- [ ] **Rate limiting** — 실패: 모든 엔드포인트에 없음
- [ ] **보안 헤더** — 실패: CORS, CSP 미설정
- [ ] **RLS 완전성** — 실패: 2개 테이블 RLS 누락
