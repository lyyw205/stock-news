import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyCronSecret } from '@/lib/auth/cron-auth';
import { fetchAllRSSSources, type NewsCategory } from '@/lib/rss/fetcher';
import { scoringAdapter, type ScoringEngine } from '@/lib/ai/scoring-adapter';
import { findExistingDuplicate, type NewsArticleForDedup } from '@/lib/services/deduplication';
import { summarizeNews } from '@/lib/ai/summarize';
import { rateLimitedBatch } from '@/lib/pipeline/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface ArticleRow {
  id: string;
  title: string;
  description: string;
  url: string;
  pub_date: string;
  ticker: string;
  category: string;
}

function getGrade(score: number): string {
  if (score >= 80) return 'S';
  if (score >= 65) return 'A';
  if (score >= 50) return 'B';
  if (score >= 35) return 'C';
  return 'D';
}

async function runPipeline(params: {
  category?: NewsCategory;
  engine: ScoringEngine;
  batchSize: number;
  verify: boolean;
}) {
  const { category, engine, batchSize, verify } = params;
  const startTime = Date.now();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Step 1: Fetch RSS
  const rssResult = await fetchAllRSSSources(category);
  let fetched = rssResult.success;

  // Step 2: Query unprocessed articles
  let query = supabase
    .from('news_articles')
    .select('id, title, description, url, pub_date, ticker, category')
    .eq('is_processed', false)
    .order('pub_date', { ascending: false })
    .limit(batchSize);

  if (category) query = query.eq('category', category);

  const { data: articles, error: queryError } = await query;
  if (queryError) throw new Error(`DB query failed: ${queryError.message}`);
  const articleRows: ArticleRow[] = articles ?? [];

  // Load recent processed articles for dedup
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  let recentQuery = supabase
    .from('news_articles')
    .select('id, url, title, description, pub_date, ticker, source_count')
    .eq('is_processed', true)
    .gte('pub_date', sevenDaysAgo.toISOString())
    .limit(500);
  if (category) recentQuery = recentQuery.eq('category', category);
  const { data: recentData } = await recentQuery;
  const recentArticles: NewsArticleForDedup[] = (recentData ?? []) as NewsArticleForDedup[];

  // Step 3: Score articles
  let scored = 0;
  let errors = 0;
  let published = 0;
  const highScoreIds: string[] = [];

  const rpm = engine === 'gemini' ? 12 : 30;

  await rateLimitedBatch(
    articleRows,
    async (article) => {
      try {
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
          await supabase
            .from('news_articles')
            .update({ is_processed: true })
            .eq('id', article.id);
          return;
        }

        const scoreResult = await scoringAdapter.score(
          article.title,
          article.description,
          article.category as 'stock' | 'crypto' | undefined,
          engine,
        );

        if (!scoreResult) {
          errors++;
          return;
        }

        const { visual, hidden, sentiment, totalScore, reasoning } = scoreResult.scores;

        let summaryText: string | null = null;
        if (totalScore >= 80) {
          try {
            const sr = await summarizeNews(
              article.title,
              article.description,
              article.category as 'stock' | 'crypto' | undefined,
            );
            summaryText = sr.summary;
            published++;
          } catch {
            // non-fatal
          }
          highScoreIds.push(article.id);
        }

        await supabase.from('summaries').insert({
          article_id: article.id,
          summary_text: summaryText,
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

        recentArticles.push(articleForDedup);
        scored++;
      } catch {
        errors++;
      }
    },
    { rpm, concurrency: 1 },
  );

  // Step 4: Verify high scores with alternate engine (optional)
  if (verify && highScoreIds.length > 0) {
    const altEngine: ScoringEngine = engine === 'gemini' ? 'claude' : 'gemini';
    const altRpm = altEngine === 'gemini' ? 12 : 30;
    const highScoreArticles = articleRows.filter((a) => highScoreIds.includes(a.id));

    await rateLimitedBatch(
      highScoreArticles,
      async (article) => {
        await scoringAdapter.score(
          article.title,
          article.description,
          article.category as 'stock' | 'crypto' | undefined,
          altEngine,
        );
      },
      { rpm: altRpm, concurrency: 1 },
    );
  }

  return {
    fetched,
    scored,
    published,
    errors,
    duration: Date.now() - startTime,
  };
}

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request, 'run-pipeline');
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get('category');
  const engineParam = searchParams.get('engine');
  const batchSizeParam = searchParams.get('batchSize') || searchParams.get('batch_size');
  const verifyParam = searchParams.get('verify');

  const category: NewsCategory | undefined =
    categoryParam === 'stock' || categoryParam === 'crypto' ? categoryParam : undefined;
  const engine: ScoringEngine =
    engineParam === 'claude' ? 'claude' : 'gemini';
  const MAX_BATCH_SIZE = 100;
  const parsedBatchSize = batchSizeParam ? parseInt(batchSizeParam) || 30 : 30;
  const batchSize = Math.min(Math.max(1, parsedBatchSize), MAX_BATCH_SIZE);
  const verify = verifyParam === 'true';

  try {
    console.log(`Starting run-pipeline cron: category=${category ?? 'all'} engine=${engine} batchSize=${batchSize}`);
    const result = await runPipeline({ category, engine, batchSize, verify });
    console.log('run-pipeline completed:', result);

    // NOTE: 기존 연동 호환성을 위해 플랫 구조 유지 ({ success, ...result })
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[run-pipeline] Cron error:', error);
    return NextResponse.json(
      { success: false, error: 'internal_error', message: 'Internal server error' },
      { status: 500 },
    );
  }
}
