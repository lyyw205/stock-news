# Team Agent Pipeline - Automated News Analysis Orchestration

**Created:** 2026-03-08
**Status:** Draft
**Complexity:** MEDIUM-HIGH

---

## Context

The stock-news project currently has two parallel paths for processing news:

1. **Cron-based (automated, Gemini):** `fetch-rss` cron -> `process-articles` cron -> Gemini scoring -> auto-publish for score >= 80. This already works end-to-end but uses Gemini Flash 2.0 for scoring, which produces acceptable but not expert-level analysis.

2. **CLI-based (manual, Claude):** `cli-fetch.ts` -> `cli-list.ts` -> Claude Code reads articles and scores manually -> `cli-save.ts`. This produces higher-quality analysis because Claude applies domain expertise, but requires a human operator to run each step and babysit the process.

The goal is to build an **orchestration layer** that combines the reliability of the cron pipeline with the quality of Claude-grade analysis, running autonomously as a team of specialized agents.

### Key Findings from Codebase

- `lib/ai/processor.ts` already orchestrates: dedup -> score -> summarize -> auto-publish -> report generation
- `lib/rss/fetcher.ts` fetches from 8 RSS sources (4 stock, 4 crypto) with URL-based dedup on insert
- `lib/services/deduplication.ts` does content-based dedup (Jaccard 70% + Levenshtein 30%, threshold 75%)
- `lib/ai/score.ts` calls Gemini with a structured prompt, returns 9-factor scores + sentiment
- `lib/social-media/auto-publisher.ts` publishes to all platforms when score >= 80
- Cron endpoints are simple wrappers with CRON_SECRET auth and 5-minute timeout
- CLI scripts are thin wrappers around the same library functions

---

## Work Objectives

Build a **standalone orchestration script** (`scripts/pipeline.ts`) that runs the full news analysis pipeline autonomously, with the option to use either Gemini (fast/cheap) or Claude (high-quality) for scoring, and with proper error handling, rate limiting, and observability.

This is NOT a Claude Code Team (TeamCreate/TaskCreate) -- those are for developer workflow orchestration, not runtime automation. The deliverable is a self-contained TypeScript pipeline that can be triggered via CLI, cron, or a Next.js API route.

---

## Guardrails

### Must Have
- Single entry point that runs fetch -> dedup -> score -> summarize -> publish
- Support for `--category stock|crypto` and `--scoring-engine gemini|claude` flags
- Rate limiting: respect Gemini (15 RPM free tier) and Claude API limits
- Batch processing with configurable batch size and concurrency
- Structured JSON logging for each pipeline stage (not just console.log)
- Dry-run mode (`--dry-run`) that scores but does not publish or save
- Graceful error handling: one article failure does not abort the batch

### Must NOT Have
- No changes to existing cron endpoints (they continue working as-is)
- No new database tables or schema changes
- No external queue system (keep it in-process for now)
- No breaking changes to existing CLI scripts
- No real-time streaming -- batch processing is sufficient

---

## Task Flow

```
Phase 1: Pipeline Core
  scripts/pipeline.ts (orchestrator)
  lib/ai/scoring-adapter.ts (Gemini/Claude adapter)

Phase 2: Quality & Observability
  lib/pipeline/rate-limiter.ts
  lib/pipeline/logger.ts
  Verification step for high-score articles

Phase 3: Integration
  app/api/cron/run-pipeline/route.ts (new cron endpoint)
  Dashboard status display (optional)
```

---

## Detailed TODOs

### Step 1: Create a Scoring Adapter Layer

**What:** Abstract the scoring engine behind a common interface so the pipeline can use either Gemini (existing `scoreNewsOnly`) or a new Claude-based scorer interchangeably.

**Files to create/modify:**
- Create `lib/ai/scoring-adapter.ts` -- adapter with `score(title, description, category, engine)` function
- The Gemini path calls existing `scoreNewsOnly` from `lib/ai/score.ts`
- The Claude path calls Claude API with the same prompt format from `lib/ai/prompts.ts`, parses identical JSON output

**Acceptance Criteria:**
- `scoringAdapter.score(title, desc, 'crypto', 'gemini')` returns identical `ScoreOnlyResult` as `scoreNewsOnly`
- `scoringAdapter.score(title, desc, 'crypto', 'claude')` returns the same `ScoreOnlyResult` shape via Claude API
- Both paths handle errors gracefully and return default scores on failure
- Unit test covers both paths with mocked API responses

---

### Step 2: Build the Pipeline Orchestrator Script

**What:** Create `scripts/pipeline.ts` that runs the full pipeline: fetch -> list unprocessed -> dedup -> score -> summarize high-scorers -> publish.

**Files to create:**
- `scripts/pipeline.ts` -- main orchestrator

**Behavior:**
1. Parse CLI args: `--category`, `--scoring-engine`, `--batch-size`, `--dry-run`, `--concurrency`
2. Call `fetchAllRSSSources(category)` (reuse existing)
3. Query unprocessed articles from DB (reuse logic from `cli-list.ts`)
4. For each article in batch:
   a. Run content-based dedup against recent articles (reuse `findExistingDuplicate`)
   b. Score via scoring adapter (Gemini or Claude)
   c. Save scores to `summaries` table
   d. If score >= 80: generate summary, auto-publish, generate report
   e. Mark article as processed
5. Output structured JSON summary of pipeline run

**Acceptance Criteria:**
- `npx tsx scripts/pipeline.ts --category crypto --scoring-engine gemini` runs full pipeline
- `npx tsx scripts/pipeline.ts --dry-run` scores articles but does not write to DB or publish
- Pipeline processes articles sequentially by default, respecting rate limits
- Each stage outputs structured log lines (JSON with timestamp, stage, article_id, result)
- Exit code 0 on success (even with individual article failures), exit code 1 on fatal errors
- Total execution time logged at end

---

### Step 3: Add Rate Limiting and Concurrency Control

**What:** Build a simple token-bucket rate limiter for API calls, and a concurrency limiter for parallel processing.

**Files to create:**
- `lib/pipeline/rate-limiter.ts` -- configurable rate limiter (requests per minute)

**Behavior:**
- Gemini free tier: 15 RPM -> rate limit to 12 RPM (80% safety margin)
- Claude API: configurable, default 30 RPM
- The rate limiter wraps the scoring adapter: `rateLimited(scoringAdapter.score, { rpm: 12 })`
- Optional parallel processing: `--concurrency N` processes N articles concurrently within rate limits

**Acceptance Criteria:**
- With `--concurrency 1`, articles are processed sequentially with rate limiting
- With `--concurrency 3`, up to 3 articles are scored in parallel, still within RPM limits
- Rate limiter delays requests rather than dropping them
- Unit test verifies that N requests over T seconds respects the RPM cap

---

### Step 4: Add Verification Step for High-Score Articles

**What:** Before auto-publishing score >= 80 articles, run a lightweight verification: cross-check the scoring engine's output against a second opinion (e.g., if scored by Gemini, verify with Claude, or vice versa).

**Files to modify:**
- `scripts/pipeline.ts` -- add verification stage between scoring and publishing

**Behavior:**
- When an article scores >= 80, optionally re-score with the alternate engine
- If both engines agree (both >= 75), proceed with publish
- If they disagree (delta > 15 points), flag for manual review instead of auto-publishing
- Verification is opt-in via `--verify-high-scores` flag (skipped by default for cost reasons)

**Acceptance Criteria:**
- Without `--verify-high-scores`, pipeline behaves exactly as before (no extra API calls)
- With `--verify-high-scores`, articles scoring >= 80 get a second scoring pass
- Disagreements are logged with both scores and the article is NOT auto-published
- Verification results included in pipeline output JSON

---

### Step 5: Create a Cron-Compatible API Route

**What:** Expose the pipeline as a Next.js API route so it can be triggered by external cron services (Vercel Cron, Railway, etc.) alongside the existing cron endpoints.

**Files to create:**
- `app/api/cron/run-pipeline/route.ts`

**Behavior:**
- GET endpoint, protected by `CRON_SECRET` Bearer token (same pattern as existing crons)
- Accepts query params: `?category=crypto&engine=gemini&batchSize=20`
- Calls the pipeline orchestrator programmatically (not as a subprocess)
- Returns JSON with pipeline results
- `maxDuration = 300` (5 minutes, same as process-articles)

**Acceptance Criteria:**
- `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/run-pipeline?category=crypto` runs the pipeline
- Unauthorized requests return 401
- Response includes structured results (fetched, scored, published, errors)
- Existing `/api/cron/fetch-rss` and `/api/cron/process-articles` continue working unchanged

---

## Success Criteria

1. A single command (`npx tsx scripts/pipeline.ts`) runs the entire news analysis pipeline end-to-end
2. The pipeline supports both Gemini and Claude scoring with identical output shapes
3. Rate limiting prevents API quota exhaustion
4. High-score articles can optionally be cross-verified before publishing
5. The pipeline can be triggered via CLI or HTTP cron
6. All existing functionality (cron endpoints, CLI scripts, dashboard) remains unaffected
7. Structured logging enables monitoring pipeline health without reading source code

---

## Open Questions

- **Claude API key management:** Is there a Claude API key available in the environment, or does the Claude scoring path need to be deferred until one is provisioned?
- **Cost budget:** Cross-verification doubles API cost for high-score articles. Is there a monthly budget constraint that should cap how many verifications run?
- **Scheduling:** Should the pipeline cron replace the existing `fetch-rss` + `process-articles` crons, or run alongside them? Running both would cause duplicate processing unless guarded.
- **Notification on disagreement:** When verification flags a disagreement, should it just log, or also send a notification (email/Telegram)?
