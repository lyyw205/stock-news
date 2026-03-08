# 성능 리뷰

## 요약
**전체 평가**: 최적화 필요

데이터 파이프라인(`processor.ts`, `fetcher.ts`, `dispatcher.ts`)에 집중된 성능 문제가 있습니다. 가장 심각한 문제는 기사당 N+1 순차 DB 쓰기, 함수 호출마다 Supabase 클라이언트 재생성, 중복 감지 핫 경로의 무제한 필터입니다.

---

## CRITICAL 핫스팟

### 1. 중복 기사당 4회 순차 DB 라운드트립
`lib/ai/processor.ts:73-134` — SELECT source_urls, UPDATE news_articles, UPDATE summaries, UPDATE social_media_posts, UPDATE is_processed. 50개 배치에서 30개 중복 시 ~150회 순차 호출 (~3초).

### 2. 발행 호출당 Supabase 클라이언트 9회 재생성
`lib/social-media/dispatcher.ts` — 26, 60, 112, 145, 187, 217, 250, 298, 329줄에서 `createServerSupabaseClient()` 호출. 4개 플랫폼 발행 시 최소 9+회.

---

## HIGH 발견사항

### 3. RSS fetcher에서 N+1 DB 삽입 및 기사별 중복 검사
`lib/rss/fetcher.ts:89-128` — 기사마다 `checkDuplicate()`(SELECT) + INSERT. 300개 기사 × 2 DB 작업 = ~600 호출 × 20ms = ~12초.

수정: RSS 소스를 `Promise.all`로 병렬 가져오기. URL 해시 배치 조회 후 배치 삽입.

### 4. `findExistingDuplicate` 호출마다 날짜 필터 재계산
`lib/services/deduplication.ts:147-155` — 50개 기사 × O(500) = 25,000 비교.

수정: `sevenDaysAgo`를 배치 전에 한 번 계산. ticker별 `Map`으로 사전 그룹화.

### 5. 중복 감지 핫 경로에서 Gemini AI 호출
`lib/services/cross-language-dedup.ts:37-67` — 교차 언어 기사 쌍마다 Gemini API 호출 (1-3초). 점수 산정 RPM 할당량과 경쟁.

---

## MEDIUM 발견사항

- processor의 7일간 `recentArticles` 쿼리에 LIMIT 없음 (`lib/ai/processor.ts:65-72`)
- 고점수 기사에 7회 순차 Supabase 호출
- `analysis_reports` 실패 시 이중 쿼리 (`app/api/news/unified/route.ts:19-116`)
- Rate limiter의 `Array.shift()` — O(n) (현재 규모에서는 무시 가능)

---

## LOW 발견사항

- 대시보드 범위 슬라이더에서 매 변경마다 API 재호출 (디바운스 없음)
- `extractTicker`에서 루프 내 문자열 연결

---

## 수용 가능한 성능

- `score.ts`, `summarize.ts`: 단순 프롬프트 구성 + Gemini 호출. 문제 없음.
- `report.ts`: 점수 >= 80 기사에만 트리거. 수용 가능.
- `groupDuplicateNews`: 같은 ticker 기사 n<50에서 O(n^2) — 실제로 빠름.
- `Promise.all`로 플랫폼 병렬 발행. 정상.
