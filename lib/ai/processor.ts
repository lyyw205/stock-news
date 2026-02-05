import { createClient } from '@supabase/supabase-js';
import { filterNews } from './filter';
import { summarizeNewsWithScores } from './summarize';
import {
  findExistingDuplicate,
  calculateCredibility,
  type NewsArticleForDedup,
} from '@/lib/services/deduplication';

export interface ProcessResult {
  processed: number;
  filtered: number;
  summarized: number;
  deduplicated: number; // 중복으로 판단된 뉴스 수
  errors: number;
}

export async function processUnprocessedArticles(
  batchSize: number = 50,
): Promise<ProcessResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch unprocessed articles
  const { data: articles, error: fetchError } = await supabase
    .from('news_articles')
    .select('*')
    .eq('is_processed', false)
    .limit(batchSize);

  if (fetchError) {
    throw new Error(`Failed to fetch articles: ${fetchError.message}`);
  }

  if (!articles || articles.length === 0) {
    return {
      processed: 0,
      filtered: 0,
      summarized: 0,
      deduplicated: 0,
      errors: 0,
    };
  }

  let processedCount = 0;
  let filteredCount = 0;
  let summarizedCount = 0;
  let deduplicatedCount = 0;
  let errorCount = 0;

  // 최근 7일간의 뉴스 가져오기 (중복 체크용)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: recentArticles } = await supabase
    .from('news_articles')
    .select('id, url, title, description, pub_date, ticker, source_count')
    .gte('pub_date', sevenDaysAgo.toISOString())
    .eq('is_processed', true);

  for (const article of articles) {
    try {
      // Step 0: Check for duplicates
      const existingDuplicate = await findExistingDuplicate(
        {
          url: article.url,
          title: article.title,
          description: article.description || '',
          pub_date: article.pub_date,
          ticker: article.ticker,
        },
        (recentArticles || []) as NewsArticleForDedup[],
      );

      if (existingDuplicate && existingDuplicate.id) {
        // 중복 발견 - source_count 증가 및 URL 추가
        const currentSourceCount = existingDuplicate.source_count || 1;
        const newSourceCount = currentSourceCount + 1;
        const newCredibility = calculateCredibility(newSourceCount);

        // source_urls 배열 업데이트
        const { data: existingArticleData } = await supabase
          .from('news_articles')
          .select('source_urls')
          .eq('id', existingDuplicate.id)
          .single();

        const sourceUrls = existingArticleData?.source_urls || [];
        if (!sourceUrls.includes(article.url)) {
          sourceUrls.push(article.url);
        }

        // 기존 뉴스 업데이트
        await supabase
          .from('news_articles')
          .update({
            source_count: newSourceCount,
            source_urls: sourceUrls,
          })
          .eq('id', existingDuplicate.id);

        // 요약 테이블의 credibility도 업데이트
        await supabase
          .from('summaries')
          .update({ credibility: newCredibility })
          .eq('article_id', existingDuplicate.id);

        // 소셜미디어 포스트 업데이트 플래그 설정
        await supabase
          .from('social_media_posts')
          .update({ needs_update: true })
          .eq('news_article_id', existingDuplicate.id);

        // 현재 기사는 처리완료로 마크 (중복이므로 별도 저장 안함)
        await supabase
          .from('news_articles')
          .update({ is_processed: true })
          .eq('id', article.id);

        deduplicatedCount++;
        processedCount++;
        continue;
      }

      // Step 1: Filter news
      const filterResult = await filterNews(
        article.title,
        article.description || '',
      );

      if (!filterResult.isUseful) {
        // Mark as processed but don't create summary
        await supabase
          .from('news_articles')
          .update({ is_processed: true })
          .eq('id', article.id);

        processedCount++;
        continue;
      }

      filteredCount++;

      // Step 2: Generate summary with scores
      const summaryResult = await summarizeNewsWithScores(
        article.title,
        article.description || '',
      );

      // Step 3: Save summary with scores
      const { error: summaryError } = await supabase.from('summaries').insert({
        article_id: article.id,
        summary_text: summaryResult.summary,
        is_useful: filterResult.isUseful,
        confidence: filterResult.confidence,
        // Visual scores (for radar chart)
        score_impact: summaryResult.scores.visual.impact,
        score_urgency: summaryResult.scores.visual.urgency,
        score_certainty: summaryResult.scores.visual.certainty,
        score_durability: summaryResult.scores.visual.durability,
        score_attention: summaryResult.scores.visual.attention,
        score_relevance: summaryResult.scores.visual.relevance,
        // Hidden scores (for calculation only)
        score_sector_impact: summaryResult.scores.hidden.sectorImpact,
        score_institutional_interest: summaryResult.scores.hidden.institutionalInterest,
        score_volatility: summaryResult.scores.hidden.volatility,
        // Sentiment and total
        sentiment: summaryResult.scores.sentiment,
        total_score: summaryResult.scores.totalScore,
        score_reasoning: summaryResult.scores.reasoning,
      });

      if (summaryError) {
        console.error(`Failed to save summary for article ${article.id}:`, summaryError);
        errorCount++;
        continue;
      }

      // Step 4: Mark article as processed and initialize source tracking
      await supabase
        .from('news_articles')
        .update({
          is_processed: true,
          source_count: 1,
          source_urls: [article.url],
        })
        .eq('id', article.id);

      processedCount++;
      summarizedCount++;
    } catch (error) {
      console.error(`Error processing article ${article.id}:`, error);
      errorCount++;
    }
  }

  return {
    processed: processedCount,
    filtered: filteredCount,
    summarized: summarizedCount,
    deduplicated: deduplicatedCount,
    errors: errorCount,
  };
}
