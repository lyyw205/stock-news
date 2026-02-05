import { fetchRSSFeed, type Article } from './parser';
import { createClient } from '@supabase/supabase-js';
import { checkDuplicate, createUrlHash } from '@/lib/utils/dedup';
import { extractTicker } from '@/lib/ticker/extract';

export const RSS_SOURCES = [
  {
    name: '연합뉴스 경제',
    url: 'https://www.yna.co.kr/rss/economy.xml',
  },
  {
    name: '매일경제 경제',
    url: 'https://www.mk.co.kr/rss/30100041/',
  },
  {
    name: '연합뉴스 산업',
    url: 'https://www.yna.co.kr/rss/industry.xml',
  },
  {
    name: '연합뉴스 IT/과학',
    url: 'https://www.yna.co.kr/rss/it.xml',
  },
];

export interface FetchResult {
  success: number;
  duplicates: number;
  errors: number;
  total: number;
}

export async function fetchAllRSSSources(): Promise<FetchResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let successCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  let totalArticles = 0;

  for (const source of RSS_SOURCES) {
    try {
      console.log(`Fetching from ${source.name}...`);
      const articles = await fetchRSSFeed(source.url);
      totalArticles += articles.length;

      for (const article of articles) {
        try {
          const isDuplicate = await checkDuplicate(article.link, supabase);

          if (isDuplicate === 'duplicate') {
            duplicateCount++;
            continue;
          }

          // Extract ticker from title and description
          const ticker = extractTicker(
            `${article.title} ${article.description || ''}`,
          );

          const urlHash = createUrlHash(article.link);

          // Insert article into database
          const { error } = await supabase.from('news_articles').insert({
            url: article.link,
            url_hash: urlHash,
            title: article.title,
            description: article.description,
            pub_date: article.pubDate.toISOString(),
            ticker: ticker,
            ticker_confidence: ticker ? 0.9 : 0.0,
            is_processed: false,
          });

          if (error) {
            console.error(`Failed to insert article: ${error.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (articleError) {
          console.error(`Error processing article:`, articleError);
          errorCount++;
        }
      }
    } catch (sourceError) {
      console.error(`Failed to fetch from ${source.name}:`, sourceError);
      errorCount++;
    }
  }

  return {
    success: successCount,
    duplicates: duplicateCount,
    errors: errorCount,
    total: totalArticles,
  };
}
