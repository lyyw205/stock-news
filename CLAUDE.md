# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Korean stock news aggregation service (주식 뉴스 요약 서비스). Fetches Korean stock market news via RSS, scores them with Gemini AI, and auto-publishes high-scoring articles to social media platforms. Built with Next.js 15 (App Router), TypeScript, Supabase (PostgreSQL), and Google Gemini Flash 2.0.

## Commands

```bash
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint (next/core-web-vitals)
npm run type-check       # TypeScript strict check (tsc --noEmit)
npm run format:check     # Prettier check
npm run format           # Prettier auto-format
npm test                 # Run Jest tests
npm run test:watch       # Jest watch mode
npm run test:coverage    # Jest with coverage (80% threshold)
npm run migrate          # Run all DB migrations
```

Run a single test file: `npx jest tests/unit/some-test.ts`

## Code Style

- Prettier: single quotes, semicolons, trailing commas, 100 char width, 2-space indent
- ESLint: `next/core-web-vitals` preset
- TypeScript: strict mode, path alias `@/*` maps to project root
- Target: ES2017

## Architecture

### Data Pipeline

```
RSS feeds → fetch-rss cron → news_articles table
  → process-articles cron → duplicate detection → AI scoring (score-only, no summary)
  → score ≥ 80: auto-generate summary + publish to all platforms
  → score < 80: summary generated on-demand via dashboard
```

### Key Directories

- **`app/api/cron/`** — Scheduled endpoints (fetch-rss, process-articles, send-notifications, update-posts). Protected by `CRON_SECRET` Bearer token.
- **`lib/ai/`** — AI pipeline. `processor.ts` orchestrates scoring/summarization. `score.ts` does score-only analysis (token-efficient). `summarize.ts` generates summaries lazily. `prompts.ts` has all prompt templates.
- **`lib/rss/`** — RSS feed fetching and parsing from Korean news sources.
- **`lib/social-media/`** — Multi-platform publishing. `dispatcher.ts` orchestrates, `auto-publisher.ts` handles score≥80 auto-publish. Platform implementations in `platforms/` are currently mocks. Formatters in `formatters/` handle platform-specific constraints (Twitter 280 chars, Telegram 4096 Markdown, etc.).
- **`lib/services/deduplication.ts`** — Duplicate detection using Jaccard (70%) + Levenshtein (30%) similarity, 75% threshold. Merges duplicates and tracks source credibility.
- **`lib/auth/`** — `supabase-server.ts` (service role, server-side) and `supabase-client.ts` (anon key, client-side).
- **`components/unified/`** — Main dashboard UI components.
- **`supabase/migrations/`** — SQL migrations run via `npm run migrate`.

### Scoring System

9-factor scoring: 6 visual axes (impact, urgency, certainty, durability, attention, relevance) + 3 hidden (sectorImpact, institutionalInterest, volatility). Total score 1-100. Grades: S(≥80), A(≥65), B(≥50), C(≥35), D(<35). Configuration in `lib/config/scores.ts`.

### Token Optimization Strategy

Summaries are NOT generated during initial processing — only scores. `summary_text` is nullable. Summaries are generated on-demand via `/api/summaries/generate` or automatically when auto-publishing (score ≥ 80). This saves ~1,400 tokens per article.

### Database

Supabase PostgreSQL with RLS enabled. Key tables: `news_articles` (raw news), `summaries` (AI scores + optional summary), `social_media_posts`/`social_media_log` (publishing), `subscriptions` (user ticker subscriptions), `analysis_reports` (detailed AI reports). UUIDs for primary keys.

### Environment Variables

Required in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `CRON_SECRET`. Optional: `RESEND_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

## Claude Code CLI 뉴스 분석 워크플로우

사용자가 "뉴스 분석해줘"라고 요청하면 아래 순서대로 실행합니다.

### 1단계: RSS 뉴스 수집

```bash
npx tsx scripts/cli-fetch.ts --category stock    # 주식 뉴스만
npx tsx scripts/cli-fetch.ts --category crypto   # 코인 뉴스만
npx tsx scripts/cli-fetch.ts                     # 전체 수집
```

`--category` 옵션으로 주식/코인을 분리 수집합니다. "주식 뉴스 분석해줘"면 `--category stock`, "코인 뉴스 분석해줘"면 `--category crypto`를 사용합니다.

### 2단계: 미처리 기사 목록 조회

```bash
npx tsx scripts/cli-list.ts --limit 20
npx tsx scripts/cli-list.ts --category crypto --limit 10
```

아직 분석되지 않은 기사를 JSON으로 출력합니다. 각 기사의 `id`, `title`, `description`, `url`, `pub_date`, `ticker`, `category`를 반환합니다.

### 3단계: 기사 분석 및 점수 산정

각 기사를 읽고 아래 9가지 요소로 점수를 매깁니다:

- **시각적 점수 (1-10)**: impact(시장영향력), urgency(긴급성), certainty(확실성), durability(지속성), attention(관심도), relevance(관련성)
- **숨겨진 점수 (1-10)**: sectorImpact(섹터영향), institutionalInterest(기관관심도), volatility(변동성)
- **감성 (-2 ~ +2)**: 매우부정(-2), 부정(-1), 중립(0), 긍정(+1), 매우긍정(+2)

점수 기준:
- S등급(80+): 시장을 흔드는 대형 뉴스 (금리결정, 대형M&A, 규제변화)
- A등급(65-79): 주요 섹터에 영향을 주는 중요 뉴스
- B등급(50-64): 관련 종목에 의미있는 뉴스
- C등급(35-49): 일반적인 시장 뉴스
- D등급(35미만): 영향력 낮은 뉴스

### 4단계: 분석 결과 저장

```bash
npx tsx scripts/cli-save.ts '<JSON>'
```

JSON 형식:
```json
{
  "articleId": "uuid",
  "scores": {
    "impact": 7,
    "urgency": 6,
    "certainty": 8,
    "durability": 5,
    "attention": 7,
    "relevance": 6,
    "sectorImpact": 7,
    "institutionalInterest": 6,
    "volatility": 5,
    "sentiment": 1
  },
  "summary": "2-3문장 요약",
  "reasoning": "점수 산정 근거"
}
```

여러 기사를 한번에 저장하려면 배열로 전달:
```bash
npx tsx scripts/cli-save.ts '[{"articleId":"...","scores":{...},"summary":"..."},{"articleId":"...","scores":{...},"summary":"..."}]'
```

### 주의사항

- 총점 80점 이상(S등급)은 콘솔에 알림이 표시됩니다 (실제 소셜미디어 발행은 대시보드에서 수동 처리)
- summary는 한국어로 작성하며, 2-3문장으로 핵심 내용을 요약합니다
- reasoning은 왜 이 점수를 줬는지 간략히 설명합니다
- 제목이 매우 유사한 기사는 중복일 수 있으므로 하나만 분석합니다 (CLI에는 자동 중복감지 없음)
- Gemini API도 여전히 사용 가능합니다 (cron API 경로로 실행)

## 자동화 파이프라인

`scripts/pipeline.ts`는 RSS 수집부터 점수 산정, 자동 발행까지 전체 파이프라인을 한 번에 실행합니다.

### 기본 사용법

```bash
npx tsx scripts/pipeline.ts                                  # 전체 실행 (Gemini, 배치 30개)
npx tsx scripts/pipeline.ts --category stock                 # 주식 뉴스만
npx tsx scripts/pipeline.ts --category crypto                # 코인 뉴스만
npx tsx scripts/pipeline.ts --scoring-engine claude          # Claude로 점수 산정
npx tsx scripts/pipeline.ts --dry-run                        # DB 쓰기 없이 테스트
npx tsx scripts/pipeline.ts --batch-size 50 --concurrency 3 # 배치 크기 및 동시 처리 수
npx tsx scripts/pipeline.ts --verify-high-scores             # S등급 기사를 다른 엔진으로 교차 검증
```

### CLI 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--category stock\|crypto` | (전체) | 카테고리 필터 |
| `--scoring-engine gemini\|claude` | `gemini` | 점수 산정 엔진 |
| `--batch-size N` | `30` | 한 번에 처리할 기사 수 |
| `--dry-run` | `false` | DB 쓰기 및 발행 스킵 |
| `--concurrency N` | `1` | 병렬 처리 worker 수 |
| `--verify-high-scores` | `false` | S등급 기사 교차 검증 |

### 하이브리드 엔진 전략

- **일반 처리**: `--scoring-engine gemini` (빠르고 저렴, 분당 12 RPM 제한 적용)
- **고품질 분석**: `--scoring-engine claude` (더 정교한 분석, `ANTHROPIC_API_KEY` 필요)
- **교차 검증**: `--verify-high-scores` 플래그로 S등급(80+) 기사를 반대 엔진으로 재검증하여 신뢰도 확보

```bash
# 권장 프로덕션 실행
npx tsx scripts/pipeline.ts --category stock --scoring-engine gemini --verify-high-scores
```

### 파이프라인 단계

```
1. RSS 수집 (fetchAllRSSSources)
2. 미처리 기사 DB 조회
3. 각 기사:
   a. 콘텐츠 기반 중복 감지 (findExistingDuplicate)
   b. 점수 산정 (scoringAdapter - gemini 또는 claude)
   c. summaries 테이블에 점수 저장
   d. 점수 ≥ 80: 요약 생성 + 자동 발행
   e. 처리 완료 마크
4. --verify-high-scores: 80+ 기사를 반대 엔진으로 재검증
5. JSON 요약 출력 (stdout)
```

### Cron API 자동화

`app/api/cron/run-pipeline/route.ts`에서 HTTP GET으로 파이프라인을 트리거할 수 있습니다:

```bash
# 로컬 테스트
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/run-pipeline

# 카테고리 및 엔진 지정
curl -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/cron/run-pipeline?category=stock&engine=gemini"
```

- `CRON_SECRET` 환경변수로 인증 (필수 -- 미설정 시 500 에러 반환)
- 응답: `{ success, result: PipelineSummary }`

## 팀 에이전트 뉴스 분석

고품질 분석이 필요한 경우 oh-my-claudecode 팀 에이전트를 활용합니다.

### 에이전트 흐름

```
Researcher → Analyst → Writer → Reviewer
```

1. **Researcher** (`explore`): RSS 수집 + DB에서 미처리 기사 조회, 시장 컨텍스트 수집
2. **Analyst** (`analyst`): 9가지 지표로 기사 점수 산정, S/A등급 선별
3. **Writer** (`writer`): 한국어 요약 작성, 소셜미디어 포스트 초안 생성
4. **Reviewer** (`quality-reviewer`): 점수 타당성 검증, 요약 품질 확인

### 팀 분석 실행

```bash
# 전체 팀 파이프라인
/oh-my-claudecode:team "주식 뉴스 분석해줘 - 오늘 수집된 기사 전체"

# 특정 카테고리
/oh-my-claudecode:team "코인 뉴스 중 S등급 기사 찾아서 텔레그램 포스트 작성해줘"
```

### 수동 단계별 실행

```bash
# 1. 수집
npx tsx scripts/cli-fetch.ts --category stock

# 2. 목록 확인
npx tsx scripts/cli-list.ts --limit 10

# 3. 파이프라인 실행 (자동 점수+발행)
npx tsx scripts/pipeline.ts --category stock --verify-high-scores

# 4. 또는 CLI로 수동 저장
npx tsx scripts/cli-save.ts '<JSON>'
```
