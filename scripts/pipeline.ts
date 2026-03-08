/**
 * Pipeline Orchestrator
 * Usage: npx tsx scripts/pipeline.ts [options]
 *
 * Options:
 *   --category stock|crypto    Filter by category
 *   --scoring-engine gemini|claude  Scoring engine (default: gemini)
 *   --batch-size N             Articles per run (default: 30)
 *   --concurrency N            Parallel workers (default: 1)
 *   --dry-run                  Score but don't save to DB
 *   --verify-high-scores       Re-score 80+ articles with alternate engine
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRSSSources, type NewsCategory } from '../lib/rss/fetcher';
import { scoringAdapter, type ScoringEngine } from '../lib/ai/scoring-adapter';
import { findExistingDuplicate, type NewsArticleForDedup } from '../lib/services/deduplication';
import { summarizeNews } from '../lib/ai/summarize';
import { rateLimitedBatch } from '../lib/pipeline/rate-limiter';
import { calculateTotalScore } from '../lib/types/scores';

// ─── CLI arg parsing ─────────────────────────────────────────────────────────

interface PipelineOptions {
  category?: NewsCategory;
  scoringEngine: ScoringEngine;
  batchSize: number;
  concurrency: number;
  dryRun: boolean;
  verifyHighScores: boolean;
}

function parseArgs(): PipelineOptions {
  const args = process.argv.slice(2);
  const opts: PipelineOptions = {
    scoringEngine: 'gemini',
    batchSize: 30,
    concurrency: 1,
    dryRun: false,
    verifyHighScores: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--category':
        const cat = args[++i];
        if (cat === 'stock' || cat === 'crypto') opts.category = cat;
        else { console.error(`Invalid category: ${cat}`); process.exit(1); }
        break;
      case '--scoring-engine':
        const eng = args[++i];
        if (eng === 'gemini' || eng === 'claude') opts.scoringEngine = eng;
        else { console.error(`Invalid engine: ${eng}`); process.exit(1); }
        break;
      case '--batch-size':
        opts.batchSize = parseInt(args[++i]) || 30;
        break;
      case '--concurrency':
        opts.concurrency = parseInt(args[++i]) || 1;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--verify-high-scores':
        opts.verifyHighScores = true;
        break;
    }
  }

  return opts;
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

interface ArticleRow {
  id: string;
  title: string;
  description: string;
  url: string;
  pub_date: string;
  ticker: string;
  category: string;
}

async function fetchUnprocessedArticles(
  supabase: SupabaseClient,
  opts: PipelineOptions,
): Promise<ArticleRow[]> {
  let query = supabase
    .from('news_articles')
    .select('id, title, description, url, pub_date, ticker, category')
    .eq('is_processed', false)
    .order('pub_date', { ascending: false })
    .limit(opts.batchSize);

  if (opts.category) {
    query = query.eq('category', opts.category);
  }

  const { data, error } = await query;
  if (error) throw new Error(`DB query failed: ${error.message}`);
  return data ?? [];
}

async function fetchRecentProcessedArticles(
  supabase: SupabaseClient,
  category?: NewsCategory,
): Promise<NewsArticleForDedup[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let query = supabase
    .from('news_articles')
    .select('id, url, title, description, pub_date, ticker, source_count')
    .eq('is_processed', true)
    .gte('pub_date', sevenDaysAgo.toISOString())
    .limit(500);

  if (category) query = query.eq('category', category);

  const { data } = await query;
  return (data ?? []) as NewsArticleForDedup[];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

async function saveResult(
  supabase: SupabaseClient,
  article: ArticleRow,
  result: NonNullable<Awaited<ReturnType<typeof scoringAdapter.score>>>,
  summary: string | null,
): Promise<void> {
  const { visual, hidden, sentiment, totalScore, reasoning } = result.scores;

  await supabase.from('summaries').insert({
    article_id: article.id,
    summary_text: summary ?? null,
    is_useful: true,
    confidence: 1.0,
    score_impact: visual.impact,
    score_urgency: visual.urgency,
    score_certainty: visual.certainty,
    score_durability: visual.durability,
    score_attention: visual.attention,
    score_relevance: visual.relevance,
    score_sector_impact: hidden.sectorImpact,
    score_institutional_interest: hidden.institutionalInterest,
    score_volatility: hidden.volatility,
    sentiment,
    total_score: totalScore,
    score_reasoning: reasoning ?? null,
    auto_published: false,
  });

  await supabase
    .from('news_articles')
    .update({ is_processed: true, source_count: 1 })
    .eq('id', article.id);
}

// ─── Per-article processing ───────────────────────────────────────────────────

interface ArticleResult {
  id: string;
  title: string;
  status: 'scored' | 'duplicate' | 'error' | 'dry-run';
  totalScore?: number;
  grade?: string;
  engine?: ScoringEngine;
}

function getGrade(score: number): string {
  if (score >= 80) return 'S';
  if (score >= 65) return 'A';
  if (score >= 50) return 'B';
  if (score >= 35) return 'C';
  return 'D';
}

async function processArticle(
  supabase: SupabaseClient,
  article: ArticleRow,
  recentArticles: NewsArticleForDedup[],
  engine: ScoringEngine,
  dryRun: boolean,
): Promise<ArticleResult> {
  const base = { id: article.id, title: article.title };

  try {
    // Dedup check
    const articleForDedup: NewsArticleForDedup = {
      id: article.id,
      url: article.url,
      title: article.title,
      description: article.description,
      pub_date: article.pub_date,
      ticker: article.ticker,
    };

    const duplicate = await findExistingDuplicate(articleForDedup, recentArticles);
    if (duplicate) {
      console.log(`  [SKIP] Duplicate: ${article.title.slice(0, 60)}`);
      if (!dryRun) {
        await supabase
          .from('news_articles')
          .update({ is_processed: true })
          .eq('id', article.id);
      }
      return { ...base, status: 'duplicate' };
    }

    // Score
    const scoreResult = await scoringAdapter.score(
      article.title,
      article.description,
      article.category as 'stock' | 'crypto' | undefined,
      engine,
    );

    if (!scoreResult) {
      console.error(`  [ERROR] Scoring failed: ${article.title.slice(0, 60)}`);
      return { ...base, status: 'error' };
    }

    const { totalScore } = scoreResult.scores;
    const grade = getGrade(totalScore);
    console.log(`  [${grade}] ${totalScore}pt - ${article.title.slice(0, 60)}`);

    if (dryRun) {
      return { ...base, status: 'dry-run', totalScore, grade, engine };
    }

    // Generate summary for high-scoring articles
    let summary: string | null = null;
    if (totalScore >= 80) {
      try {
        const summaryResult = await summarizeNews(
          article.title,
          article.description,
          article.category as 'stock' | 'crypto' | undefined,
        );
        summary = summaryResult.summary;
      } catch (err) {
        console.warn(`  [WARN] Summary generation failed: ${(err as Error).message}`);
      }
    }

    await saveResult(supabase, article, scoreResult, summary);

    // Add to recent articles for subsequent dedup checks in this batch
    recentArticles.push(articleForDedup);

    return { ...base, status: 'scored', totalScore, grade, engine };
  } catch (err) {
    console.error(`  [ERROR] ${article.title.slice(0, 60)}: ${(err as Error).message}`);
    return { ...base, status: 'error' };
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not configured');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Step 1: Fetch RSS
  console.log(`\n=== Pipeline Start [${opts.category ?? 'all'} / ${opts.scoringEngine}] ===\n`);
  console.log('Step 1: Fetching RSS...');
  const rssResult = await fetchAllRSSSources(opts.category);
  console.log(`  RSS: ${rssResult.success} new, ${rssResult.duplicates} dup, ${rssResult.errors} err`);

  // Step 2: Query unprocessed articles
  console.log('Step 2: Querying unprocessed articles...');
  const articles = await fetchUnprocessedArticles(supabase, opts);
  if (articles.length === 0) {
    console.log('  No unprocessed articles found.');
    console.log(JSON.stringify({ rss: rssResult, processed: 0, scored: 0, duplicates: 0, errors: 0, highScores: [] }));
    return;
  }
  console.log(`  Found ${articles.length} articles to process`);

  // Load recent processed articles for dedup
  const recentArticles = await fetchRecentProcessedArticles(supabase, opts.category);

  // Step 3: Process articles with rate limiting
  console.log(`Step 3: Scoring ${articles.length} articles (engine=${opts.scoringEngine}, concurrency=${opts.concurrency})...`);

  // RPM: gemini free tier 12, claude 30
  const rpm = opts.scoringEngine === 'gemini' ? 12 : 30;

  const results = await rateLimitedBatch(
    articles,
    (article) => processArticle(supabase, article, recentArticles, opts.scoringEngine, opts.dryRun),
    { rpm, concurrency: opts.concurrency },
  );

  // Step 4: Verify high scores with alternate engine
  const highScores = results.filter((r) => r.status === 'scored' && (r.totalScore ?? 0) >= 80);

  if (opts.verifyHighScores && highScores.length > 0 && !opts.dryRun) {
    const altEngine: ScoringEngine = opts.scoringEngine === 'gemini' ? 'claude' : 'gemini';
    console.log(`\nStep 4: Verifying ${highScores.length} high-score articles with ${altEngine}...`);

    const highScoreArticles = articles.filter((a) => highScores.some((r) => r.id === a.id));
    const altRpm = altEngine === 'gemini' ? 12 : 30;

    await rateLimitedBatch(
      highScoreArticles,
      async (article) => {
        const reScore = await scoringAdapter.score(
          article.title,
          article.description,
          article.category as 'stock' | 'crypto' | undefined,
          altEngine,
        );
        if (reScore) {
          const { totalScore } = reScore.scores;
          const grade = getGrade(totalScore);
          console.log(`  [VERIFY/${altEngine}] ${grade} ${totalScore}pt - ${article.title.slice(0, 50)}`);
        }
        return reScore;
      },
      { rpm: altRpm, concurrency: 1 },
    );
  }

  // Output summary
  const scored = results.filter((r) => r.status === 'scored').length;
  const duplicates = results.filter((r) => r.status === 'duplicate').length;
  const errors = results.filter((r) => r.status === 'error').length;
  const dryRuns = results.filter((r) => r.status === 'dry-run').length;

  const summary = {
    rss: rssResult,
    processed: results.length,
    scored: scored + dryRuns,
    duplicates,
    errors,
    dryRun: opts.dryRun,
    highScores: results
      .filter((r) => (r.totalScore ?? 0) >= 80)
      .map((r) => ({ id: r.id, title: r.title, score: r.totalScore, grade: r.grade })),
  };

  console.log('\n=== Pipeline Complete ===');
  console.log(`  Scored: ${summary.scored}, Duplicates: ${duplicates}, Errors: ${errors}`);
  if (summary.highScores.length > 0) {
    console.log(`  High scores (S-grade): ${summary.highScores.length}`);
    summary.highScores.forEach((h) => console.log(`    [S] ${h.score}pt - ${h.title}`));
  }

  console.log('\n' + JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
