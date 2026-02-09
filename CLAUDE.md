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
