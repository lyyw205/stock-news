import { fetchRSSFeed, type Article } from './parser';
import { createClient } from '@supabase/supabase-js';
import { checkDuplicate, createUrlHash } from '@/lib/utils/dedup';
import { extractTicker } from '@/lib/ticker/extract';

export type NewsCategory = 'stock' | 'crypto';

export interface RSSSource {
  name: string;
  url: string;
  category: NewsCategory;
}

export const RSS_SOURCES: RSSSource[] = [
  // 주식 뉴스
  {
    name: '연합뉴스 경제',
    url: 'https://www.yna.co.kr/rss/economy.xml',
    category: 'stock',
  },
  {
    name: '매일경제 경제',
    url: 'https://www.mk.co.kr/rss/30100041/',
    category: 'stock',
  },
  {
    name: '연합뉴스 산업',
    url: 'https://www.yna.co.kr/rss/industry.xml',
    category: 'stock',
  },
  {
    name: '연합뉴스 IT/과학',
    url: 'https://www.yna.co.kr/rss/it.xml',
    category: 'stock',
  },
  // 암호화폐 뉴스
  {
    name: '블루밍비트',
    url: 'https://bloomingbit.io/rss.xml',
    category: 'crypto',
  },
  {
    name: '블록미디어',
    url: 'https://www.blockmedia.co.kr/feed',
    category: 'crypto',
  },
  {
    name: 'CoinTelegraph',
    url: 'https://cointelegraph.com/rss',
    category: 'crypto',
  },
  {
    name: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml',
    category: 'crypto',
  },
];

export interface FetchResult {
  success: number;
  duplicates: number;
  errors: number;
  total: number;
}

export async function fetchAllRSSSources(category?: NewsCategory): Promise<FetchResult> {
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

  const sources = category ? RSS_SOURCES.filter(s => s.category === category) : RSS_SOURCES;

  for (const source of sources) {
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
            source.category,
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
            category: source.category,
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
