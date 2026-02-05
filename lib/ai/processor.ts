import { createClient } from '@supabase/supabase-js';
import { filterNews } from './filter';
import { summarizeNews } from './summarize';

export interface ProcessResult {
  processed: number;
  filtered: number;
  summarized: number;
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
      errors: 0,
    };
  }

  let processedCount = 0;
  let filteredCount = 0;
  let summarizedCount = 0;
  let errorCount = 0;

  for (const article of articles) {
    try {
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

      // Step 2: Generate summary
      const summaryResult = await summarizeNews(
        article.title,
        article.description || '',
      );

      // Step 3: Save summary
      const { error: summaryError } = await supabase.from('summaries').insert({
        article_id: article.id,
        summary_text: summaryResult.summary,
        is_useful: filterResult.isUseful,
        confidence: filterResult.confidence,
      });

      if (summaryError) {
        console.error(`Failed to save summary for article ${article.id}:`, summaryError);
        errorCount++;
        continue;
      }

      // Step 4: Mark article as processed
      await supabase
        .from('news_articles')
        .update({ is_processed: true })
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
    errors: errorCount,
  };
}
