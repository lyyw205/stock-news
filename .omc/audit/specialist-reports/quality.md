# 코드 품질 리뷰

## 요약
**전체 평가**: 개선 필요

---

## CRITICAL 발견사항

### 1. Rate limiter 워커의 레이스 컨디션
`lib/pipeline/rate-limiter.ts:53` — `fn(items[i])`에서 예외 발생 시 해당 워커가 종료되어 나머지 항목 유실. `results` 배열에 `undefined` 항목이 포함됨.

### 2. `markSummaryAsPosted`의 TOCTOU 레이스
`lib/social-media/dispatcher.ts:297-316` — `social_post_count`를 읽고 별도로 `+1` 기록. 동시 발행 시 카운트 유실. 원자적 SQL `social_post_count = social_post_count + 1` 사용 필요.

### 3. 음수 substring 길이로 데이터 손상
`lib/social-media/formatters/toss-formatter.ts:32` — `summary.length < overhead + 3`일 때 음수 길이가 빈 문자열 생성.

---

## HIGH 발견사항

- **AI 실패 시 기본 점수(50) 반환** — 실제 점수와 구분 불가. `isDefault` 플래그 필요. (`lib/ai/score.ts:79-105`)
- **중간 실패 시에도 기사 처리 완료 표시** — summary 삽입 성공 후 article 업데이트 실패 시 재시도할 때 중복 summary. (`lib/ai/processor.ts:245-253`)
- **`summary` vs `summary_text` 컬럼명 불일치** — 소셜 발행 시 `undefined` 반환. (`lib/social-media/dispatcher.ts:73,98`)
- **Threads 포맷터에서 음수 `maxTitleLength`** — 빈 제목 생성. (`lib/social-media/formatters/threads-formatter.ts:62-64`)

---

## MEDIUM 발견사항

- `clampScore`/`clampSentiment` 3개 파일에 중복 (`score.ts`, `summarize.ts`, `scoring-adapter.ts`)
- `formatDate` 3개 포맷터에 중복
- `report.ts`에서 `supabase: any` 타입 사용
- `dispatcher.ts`에서 `createServerSupabaseClient()` 10회 호출
- `unified/route.ts`에서 `any` 타입 사용
- 프롬프트 `.replace()` 치환 취약성
- 중복 감지의 O(n^2) 복잡도

---

## 긍정적 관찰

- 점수 전용 처리와 요약 분리의 토큰 최적화 전략이 우수
- `clampScore`/`clampSentiment`로 AI 응답의 방어적 경계 처리
- `processor.ts`에서 기사별 try/catch로 좋은 에러 격리
- 소셜 미디어 레이어의 dispatcher/formatter/publisher 파이프라인 패턴이 깔끔
- 교차 언어 중복 감지가 좋은 도메인 이해를 보여줌
