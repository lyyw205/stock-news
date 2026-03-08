# Plan: Add Cryptocurrency News Support

**Created:** 2026-03-08
**Complexity:** MEDIUM
**Scope:** ~10 files modified, 2 new files (migration + crypto ticker data)

---

## Context

The stock-news service currently aggregates Korean stock market news via RSS, scores them with Gemini AI, and auto-publishes high-scoring articles. The user wants to extend this to also cover cryptocurrency news, reusing the same pipeline (fetch -> dedup -> score -> auto-publish) with minimal architectural changes.

Key insight from codebase analysis: There is NO existing `category` field anywhere in the codebase. The `news_articles` table, all queries, UI components, and AI prompts are stock-only. The ticker extraction (`lib/ticker/extract.ts`) only handles 6-digit Korean stock codes.

## Work Objectives

1. Articles from crypto RSS feeds flow through the same pipeline as stock news
2. Crypto articles are distinguishable from stock articles via a `category` column
3. AI scoring prompts are context-aware (stock vs crypto terminology)
4. Dashboard supports filtering by category
5. Existing stock news functionality is unchanged

## Guardrails

**Must Have:**
- Backward compatibility: all existing stock queries, scoring, and publishing continue unchanged
- `category` column defaults to `'stock'` so all existing data is auto-classified
- Same deduplication, scoring scale, and auto-publish threshold for both categories

**Must NOT Have:**
- Separate tables for crypto vs stock (use single `news_articles` table)
- Different scoring algorithms per category (same 9-factor system, just context-aware prompts)
- Breaking changes to existing API routes or UI props

---

## Task Flow

### Step 1: Database Migration - Add `category` Column

**Files:**
- NEW: `supabase/migrations/20250308000001_add_category_column.sql`

**Changes:**
- Add `category TEXT NOT NULL DEFAULT 'stock'` column to `news_articles` table
- Add CHECK constraint: `category IN ('stock', 'crypto')`
- Add index on `category` for filtered queries: `CREATE INDEX idx_news_articles_category ON news_articles(category)`
- All existing rows automatically get `'stock'` via DEFAULT

**Acceptance Criteria:**
- Migration runs without errors (`npm run migrate`)
- Existing articles have `category = 'stock'`
- New inserts without specifying category default to `'stock'`

---

### Step 2: RSS Sources and Fetcher - Add Crypto Feeds with Category

**Files:**
- `lib/rss/fetcher.ts` -- Modify `RSS_SOURCES` array and `fetchAllRSSSources()`

**Changes:**
- Add `category` field to `RSS_SOURCES` type: `{ name: string; url: string; category: 'stock' | 'crypto' }`
- Add `category: 'stock'` to all 4 existing sources
- Add 4 new crypto sources:
  ```
  { name: '블루밍비트', url: 'https://bloomingbit.io/rss.xml', category: 'crypto' }
  { name: '블록미디어', url: 'https://www.blockmedia.co.kr/feed', category: 'crypto' }
  { name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss', category: 'crypto' }
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml', category: 'crypto' }
  ```
- Pass `source.category` into the database insert: `category: source.category`

**Acceptance Criteria:**
- `RSS_SOURCES` has 8 entries (4 stock + 4 crypto)
- Each source has a `category` field
- Inserted articles carry the correct `category` value
- Existing stock sources still work identically

---

### Step 3: Ticker Extraction - Add Crypto Symbol Support

**Files:**
- `lib/ticker/extract.ts` -- Extend `extractTicker()` with crypto patterns

**Changes:**
- Add an optional `category` parameter: `extractTicker(text: string, category?: 'stock' | 'crypto')`
- When `category === 'crypto'`, check for crypto symbols BEFORE stock patterns:
  - Common symbols map: `BTC`, `ETH`, `XRP`, `SOL`, `ADA`, `DOGE`, `AVAX`, `DOT`, `MATIC`, `LINK`, `UNI`, `ATOM`, etc.
  - Pattern: match uppercase 2-5 letter symbols from the known list when found in text
  - Also match Korean names: `비트코인` -> `BTC`, `이더리움` -> `ETH`, `리플` -> `XRP`, `솔라나` -> `SOL`, etc.
- When `category === 'stock'` or `undefined`, existing 6-digit Korean stock code logic runs unchanged
- Update the call in `fetcher.ts` to pass `source.category`

**Acceptance Criteria:**
- `extractTicker("비트코인 가격 급등", "crypto")` returns `"BTC"`
- `extractTicker("이더리움 업그레이드 완료", "crypto")` returns `"ETH"`
- `extractTicker("삼성전자(005930) 실적 발표", "stock")` returns `"005930"` (unchanged)
- `extractTicker("삼성전자(005930) 실적 발표")` returns `"005930"` (backward compatible)

---

### Step 4: AI Prompts - Context-Aware Scoring

**Files:**
- `lib/ai/prompts.ts` -- Add crypto-aware prompt variants
- `lib/ai/score.ts` -- Pass category to prompt selection
- `lib/ai/processor.ts` -- Thread category through the pipeline

**Changes:**
- In `prompts.ts`:
  - Add `SCORE_ONLY_PROMPT_CRYPTO` -- same structure as `SCORE_ONLY_PROMPT` but with crypto-specific language:
    - Replace "한국 주식 뉴스" with "암호화폐/가상자산 뉴스"
    - Replace "회사 실적" references with "프로젝트/프로토콜 성과"
    - Replace "주가" references with "코인/토큰 가격"
    - Adjust `relevance` axis: "AI, 반도체, 2차전지" -> "DeFi, L2, 규제, 반감기"
    - Adjust `institutionalInterest`: "외국인/기관" -> "기관/고래 지갑"
  - Add `formatScoreOnlyPrompt(title, description, category?)` overload that selects the right prompt template
  - Similarly add `SUMMARIZE_PROMPT_CRYPTO`, `FILTER_PROMPT_CRYPTO`, `SUMMARIZE_WITH_SCORES_PROMPT_CRYPTO`, `ANALYSIS_REPORT_PROMPT_CRYPTO`
- In `score.ts`: Pass category through to `formatScoreOnlyPrompt`
- In `processor.ts`: Read `category` from the article row and pass it downstream to scoring/summarization

**Acceptance Criteria:**
- Crypto articles are scored using crypto-specific prompt language
- Stock articles continue using existing prompts (no change)
- The scoring scale (1-10 per axis, total 1-100) is identical for both
- `processor.ts` reads `article.category` and threads it through

---

### Step 5: Dashboard UI - Category Filter

**Files:**
- `components/unified/UnifiedNewsList.tsx` -- Add category filter tabs
- `app/dashboard-unified/page.tsx` -- Pass category filter to data query
- Potentially `components/unified/UnifiedNewsCard.tsx` -- Add category badge

**Changes:**
- Add a tab bar or toggle at the top of `UnifiedNewsList`: "전체" | "주식" | "암호화폐"
- Filter the `articles` array client-side by `category` field (or add server-side query param)
- Add a small badge/tag on `UnifiedNewsCard` showing "주식" or "암호화폐" with distinct colors
- The data query in the dashboard page should include `category` in the SELECT
- Default view: "전체" (all categories mixed, sorted by score/date as before)

**Acceptance Criteria:**
- Dashboard shows category filter tabs
- Clicking "주식" shows only stock news, "암호화폐" shows only crypto
- "전체" shows all articles (default)
- Each card shows a category badge
- Existing dashboard functionality (summarize, publish, score display) works unchanged

---

## Success Criteria

1. `npm run build` passes with zero errors
2. `npm run type-check` passes
3. `npm test` passes (existing tests unbroken)
4. Crypto RSS feeds can be fetched and inserted with `category = 'crypto'`
5. Crypto articles are scored with crypto-context prompts
6. Dashboard displays both stock and crypto news with filtering
7. Existing stock news pipeline is completely unchanged (regression-free)
