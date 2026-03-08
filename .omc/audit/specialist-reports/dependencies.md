# 의존성 감사 보고서

## 의존성 목록

| 패키지 | 선언 범위 | 설치 버전 | 유형 |
|--------|----------|----------|------|
| `@anthropic-ai/sdk` | `^0.78.0` | `0.78.0` | prod |
| `@google/generative-ai` | `^0.1.0` | `0.1.3` | prod |
| `@nivo/core` | `^0.99.0` | `0.99.0` | prod |
| `@nivo/radar` | `^0.99.0` | `0.99.0` | prod |
| `@supabase/supabase-js` | `^2.38.0` | `2.94.1` | prod |
| `dotenv` | `^17.2.3` | `17.2.3` | prod |
| `firebase-admin` | `^12.0.0` | `12.7.0` | prod |
| `next` | `^15.0.0` | `15.5.12` | prod |
| `react` / `react-dom` | `^18.3.0` | `18.3.1` | prod |
| `resend` | `^3.0.0` | `3.5.0` | prod |
| `rss-parser` | `^3.13.0` | `3.13.0` | prod |
| `eslint` | `^8.0.0` | `8.57.1` | dev |
| `typescript` | `^5.3.0` | `5.9.3` | dev |
| `jest` / `ts-jest` | `^29.5.0` | `29.7.0` | dev |

**총 설치 패키지: 949개** (prod: 230, dev: 612, optional: 131)

---

## CRITICAL

### C-1: `fast-xml-parser` — CVE 수준 엔티티 인코딩 우회

- **취약점:** CVSS 9.3 (GHSA-m7jm-9gc2-mpf2) + CVSS 7.5 (GHSA-jmr7-xgp7-cmfj)
- **설치 버전:** 4.5.3 (취약). 4.5.4+에서 수정.
- **경로:** `firebase-admin@12.7.0` → `@google-cloud/storage@7.18.0` → `fast-xml-parser@^4.4.1`
- **수정:** `npm audit fix` (major 버전 변경 불필요)

---

## HIGH

- **H-1: `minimatch` — 4개 복사본에 걸친 다수 ReDoS 취약점** (CVSS 7.5). 모두 dev 전용. `npm audit fix`로 해결.
- **H-2: `editorconfig` — minimatch 의존성을 통한 ReDoS**. Dev 전용.

---

## MEDIUM

- **M-2: `@google/generative-ai` 심각하게 구버전** — 0.1.3 → 0.24.x (23개 마이너 버전). 캐싱 API 미사용(`gemini.ts:26`의 TODO 확인).
- **M-3: ESLint v8 지원 종료** — 2024년 10월 EOL. v9 flat config 마이그레이션 필요.

---

## LOW

- **L-1:** `firebase-admin` v12의 전이 취약점 — 다운그레이드 역설 (v10.3.0 권장은 API 회귀). 모니터링.
- **L-3:** `dotenv`이 prod 의존성에 포함 — 스크립트에서만 사용. devDependencies로 이동 필요.
- **L-4:** `@anthropic-ai/sdk`이 prod에 선언되었지만 선택적 사용 (dynamic import + API 키 가드).

---

## 우선순위 조치 계획

**즉시:** `npm audit fix` (C-1, H-1, H-2 해결)
**단기:** `@google/generative-ai` 0.1.3 → 최신 업그레이드 + 캐싱 API 구현
**중기:** ESLint v8 → v9 마이그레이션, `dotenv` devDependencies 이동
