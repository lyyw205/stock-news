# 테스트 보고서

## 요약

**커버리지**: 예상 35-45% (설정된 80% 기준 미달)
**테스트 건강도**: CRITICAL

16개 테스트 파일이 16개 소스 모듈을 커버. ~45개 `lib/` 모듈 중 약 절반에 테스트 없음. 가장 비즈니스 크리티컬한 경로(AI 점수 산정, 프로세서 파이프라인, 자동 발행, Rate limiter, 중복 감지 알고리즘)에 의미 있는 테스트 커버리지가 전무.

---

## 커버리지 맵

| 모듈 | 테스트 파일 | 상태 |
|------|-----------|------|
| `lib/rss/parser.ts` | `tests/unit/rss/parser.test.ts` | 부분 |
| `lib/rss/fetcher.ts` | `tests/unit/rss/fetcher.test.ts` | 스켈레톤 — `RSS_SOURCES` 설정만 테스트 |
| `lib/ai/filter.ts` | `tests/unit/ai/filter.test.ts` | 양호 |
| `lib/ai/summarize.ts` | `tests/unit/ai/summarize.test.ts` | 양호 |
| **`lib/ai/score.ts`** | 없음 | **누락 — 핵심 점수 엔진** |
| **`lib/ai/processor.ts`** | 없음 | **누락 — 파이프라인 오케스트레이터** |
| **`lib/services/deduplication.ts`** | 없음 | **누락 — 중복 감지** |
| **`lib/utils/text-similarity.ts`** | 없음 | **누락 — 유사성 알고리즘 핵심** |
| **`lib/pipeline/rate-limiter.ts`** | 없음 | **누락 — 처리량 제어** |
| `lib/utils/dedup.ts` | `tests/unit/utils/dedup.test.ts` | 양호 |
| `lib/social-media/dispatcher.ts` | `tests/unit/social-media/dispatcher.test.ts` | 파사드만 |
| `lib/social-media/formatters/*.ts` | `tests/unit/social-media/formatters.test.ts` | 양호 |
| `lib/social-media/platforms/telegram.ts` | `tests/unit/social-media/telegram.test.ts` | 불안정 |
| `lib/social-media/platforms/twitter.ts` | `tests/unit/social-media/twitter.test.ts` | 부분 |
| `lib/subscriptions/validate.ts` | `tests/unit/subscriptions/validate.test.ts` | 양호 |
| `lib/ticker/extract.ts` | `tests/unit/ticker/extract.test.ts` | 부분 — 코인 경로 미테스트 |
| `lib/notifications/push.ts` | `tests/unit/notifications/push.test.ts` | 빈 껍데기 — Firebase 미설정 스킵 경로만 |
| `lib/notifications/email.ts` | `tests/unit/notifications/email.test.ts` | 빈 껍데기 — email.ts 자체를 임포트하지 않음 |
| `lib/types/scores.ts` | `tests/unit/types/scores.test.ts` | 양호 |
| `app/api/subscriptions/` | `tests/unit/api/subscriptions.test.ts` | 깨짐 — 존재하지 않는 경로 임포트 |
| `components/unified/` | 없음 | **누락 — UI 컴포넌트** |

---

## CRITICAL 발견사항

1. **`lib/ai/score.ts` — 커버리지 제로** — 모든 기사에서 호출되는 핵심 점수 엔진. JSON 추출 정규식, 클램프 로직, 폴백 경로 모두 미테스트.

2. **`lib/services/deduplication.ts` — 커버리지 제로** — `groupDuplicateNews`, `findExistingDuplicate`, `calculateCredibility` 미테스트. 기사가 원본으로 저장되거나 병합되는 결정을 하는 서비스.

3. **`lib/utils/text-similarity.ts` — 커버리지 제로** — `jaccardSimilarity`, `levenshteinDistance`, `newsSimilarity` 모두 미테스트. 순수 함수로 단위 테스트에 이상적이며 중복 감지의 수학적 핵심.

4. **`lib/ai/processor.ts` — 커버리지 제로** — 12개 분기를 가진 전체 데이터 파이프라인 오케스트레이터. 어떤 분기도 테스트되지 않음.

5. **구독 API 테스트가 깨진 임포트** — 존재하지 않는 경로에서 임포트하여 로드 시점에 실패.

---

## HIGH 발견사항

- `lib/ticker/extract.ts`의 코인 브랜치 완전 미테스트
- `lib/pipeline/rate-limiter.ts` 커버리지 제로 — 동시성 민감 함수
- `lib/ai/scoring-adapter.ts` 커버리지 제로 — Gemini/Claude 라우팅
- `lib/social-media/auto-publisher.ts` 커버리지 제로 — 자동 발행 게이트
- `lib/ai/report.ts:parseReportResponse` 커버리지 제로 — 12개 검증 분기

---

## 불안정 테스트

- `telegram.test.ts:73-94` — 확률적 mock (95% 성공률)으로 단일 실행에서 불규칙하게 실패
- `twitter.test.ts:93-113` — 조건부 `expect`가 실행되지 않을 수 있어 공허하게 통과

---

## 우선 테스트 백로그

1. `lib/utils/text-similarity.ts` — 순수 함수, 모킹 불필요, 최고의 비용 대비 효과
2. `lib/services/deduplication.ts` — 픽스처 배열로 테스트 가능한 순수 그룹핑/중복 함수
3. `lib/ai/score.ts` — `generateContent` 모킹, JSON 추출 정규식 엣지 케이스 테스트
4. `lib/pipeline/rate-limiter.ts` — `jest.useFakeTimers()`로 슬라이딩 윈도우 테스트
5. `lib/ticker/extract.ts` — 코인 카테고리 테스트 케이스 추가
6. 깨진 `tests/unit/api/subscriptions.test.ts` 임포트 수정
