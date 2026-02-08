import { createClient } from '@supabase/supabase-js';
import { scoreNewsOnly } from './score';
import { summarizeNews } from './summarize';
import { generateAnalysisReport, saveAnalysisReport } from './report';
import { autoPublishArticle } from '@/lib/social-media/auto-publisher';
import {
  findExistingDuplicate,
  calculateCredibility,
  type NewsArticleForDedup,
} from '@/lib/services/deduplication';
// Note: For further optimization, consider using batchScoreArticles from './batch-processor'
// to process non-duplicate articles in parallel batches

export interface ProcessResult {
  processed: number;
  scored: number; // Articles scored (replaces filtered)
  autoPublished: number; // Articles auto-published (≥80 score)
  reportsGenerated: number; // Analysis reports generated (≥80 score)
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
      scored: 0,
      autoPublished: 0,
      reportsGenerated: 0,
      deduplicated: 0,
      errors: 0,
    };
  }

  let processedCount = 0;
  let scoredCount = 0;
  let autoPublishedCount = 0;
  let reportsGeneratedCount = 0;
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

      // Step 1: Score news (without summary generation)
      const scoreResult = await scoreNewsOnly(
        article.title,
        article.description || '',
      );

      scoredCount++;

      // Step 2: Save scores to database (summary_text = NULL initially)
      const { data: summaryData, error: summaryError } = await supabase
        .from('summaries')
        .insert({
          article_id: article.id,
          summary_text: null, // Will be generated on-demand or for auto-publish
          is_useful: true, // All articles are useful now (no filter step)
          confidence: 1.0, // No filter confidence
          // Visual scores (for radar chart)
          score_impact: scoreResult.scores.visual.impact,
          score_urgency: scoreResult.scores.visual.urgency,
          score_certainty: scoreResult.scores.visual.certainty,
          score_durability: scoreResult.scores.visual.durability,
          score_attention: scoreResult.scores.visual.attention,
          score_relevance: scoreResult.scores.visual.relevance,
          // Hidden scores (for calculation only)
          score_sector_impact: scoreResult.scores.hidden.sectorImpact,
          score_institutional_interest: scoreResult.scores.hidden.institutionalInterest,
          score_volatility: scoreResult.scores.hidden.volatility,
          // Sentiment and total
          sentiment: scoreResult.scores.sentiment,
          total_score: scoreResult.scores.totalScore,
          score_reasoning: scoreResult.scores.reasoning,
          auto_published: false, // Will be set to true if auto-published
        })
        .select('id')
        .single();

      if (summaryError || !summaryData) {
        console.error(`Failed to save scores for article ${article.id}:`, summaryError);
        errorCount++;
        continue;
      }

      // Step 3: Check if article should be auto-published (≥80 score)
      const totalScore = scoreResult.scores.totalScore;
      if (totalScore >= 80) {
        try {
          // Generate summary for auto-published articles
          const summaryTextResult = await summarizeNews(
            article.title,
            article.description || '',
          );

          // Update summary with generated text
          await supabase
            .from('summaries')
            .update({ summary_text: summaryTextResult.summary })
            .eq('id', summaryData.id);

          // Auto-publish to all platforms
          const autoPublishResult = await autoPublishArticle(article.id, totalScore);

          if (autoPublishResult.attempted) {
            // Mark as auto-published
            await supabase
              .from('summaries')
              .update({
                auto_published: true,
                auto_published_at: new Date().toISOString(),
              })
              .eq('id', summaryData.id);

            autoPublishedCount++;
          }

          // Step 3.5: Auto-generate analysis report for high-score articles
          try {
            const { report, processingTimeMs } = await generateAnalysisReport(
              article.title,
              article.description || '',
              summaryTextResult.summary,
            );

            await saveAnalysisReport(
              supabase,
              article.id,
              summaryData.id,
              report,
              'auto',
              processingTimeMs,
            );

            reportsGeneratedCount++;
          } catch (reportError) {
            console.error(`Error generating report for article ${article.id}:`, reportError);
            // Continue processing even if report generation fails
          }
        } catch (autoPublishError) {
          console.error(`Error auto-publishing article ${article.id}:`, autoPublishError);
          // Continue processing even if auto-publish fails
        }
      }
      // Articles with score <80 remain with summary_text = NULL
      // They will appear in dashboard for manual selection

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
    } catch (error) {
      console.error(`Error processing article ${article.id}:`, error);
      errorCount++;
    }
  }

  return {
    processed: processedCount,
    scored: scoredCount,
    autoPublished: autoPublishedCount,
    reportsGenerated: reportsGeneratedCount,
    deduplicated: deduplicatedCount,
    errors: errorCount,
  };
}
