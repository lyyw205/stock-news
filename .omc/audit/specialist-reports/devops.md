# DevOps 분석 보고서

## 개요

| 항목 | 값 |
|------|---|
| CI/CD 플랫폼 | 없음 |
| 컨테이너화 | 없음 |
| IaC | 없음 |
| 배포 대상 | Vercel (vercel.json cron 설정으로 추정) |
| DevOps 성숙도 | 최소 |

---

## CRITICAL 발견사항

### 1. `.env.example`에 실제 프로덕션 자격 증명 커밋

`.env.example` 파일에 실제 기능하는 시크릿이 git 히스토리에 커밋됨:

- `NEXT_PUBLIC_SUPABASE_URL` — 실제 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 유효한 JWT (만료: 2085-08-16)
- `SUPABASE_SERVICE_ROLE_KEY` — RLS 완전 우회하는 **service role** JWT
- `GEMINI_API_KEY` — 실제 Google AI API 키

**필수 즉시 조치:**
1. 4개 자격 증명 모두 즉시 교체
2. `git filter-repo` 또는 BFG Repo Cleaner로 git 히스토리 퍼지
3. `.env.example`을 `.gitignore`에 추가하거나 플레이스홀더 값만 유지

### 2. CI/CD 파이프라인 없음

`.github/workflows/`, `.gitlab-ci.yml` 등 미존재. lint, type-check, test가 자동으로 실행되지 않음. 시크릿 스캐닝도 없어 `.env.example` 커밋이 감지되지 않았음.

---

## HIGH 발견사항

### 3. Cron 인증 우회

4개 cron 라우트가 `if (cronSecret && ...)` 패턴 사용. `CRON_SECRET` 미설정 시 완전 공개.

### 4. 환경변수에 Non-null 어서션 사용 — 시작 시 검증 없음

`process.env.NEXT_PUBLIC_SUPABASE_URL!`처럼 TypeScript non-null 어서션 사용. 런타임에 값이 없으면 `createClient` 내부에서 불명확한 에러 발생.

---

## MEDIUM 발견사항

- Vercel cron 스케줄이 5분 간격 — 무료 티어 제한 초과 가능
- Vercel 함수 `maxDuration = 300` — 무료 티어 최대 10초와 충돌
- 에러 추적 도구(Sentry 등) 없음
- 구조화된 로깅 없음 — `console.log/error`만 사용 (24곳)
- Health check 엔드포인트 없음
- 알림/모니터링 없음

---

## 의존성 버전 격차

| 패키지 | 설치 | 최신 | 위험 |
|--------|------|------|------|
| `@google/generative-ai` | 0.1.3 | 0.24.x | HIGH — 23개 마이너 버전 |
| `eslint` | 8.57.1 | 10.x | LOW — v8 지원 종료 |
| `firebase-admin` | 12.7.0 | 13.x | MEDIUM |
