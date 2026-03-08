/**
 * CLI: 미처리 뉴스 목록 조회
 * Usage: npx tsx scripts/cli-list.ts [--limit N] [--category stock|crypto]
 *
 * 아직 분석되지 않은 뉴스 기사 목록을 JSON으로 출력합니다.
 * Claude Code가 이 출력을 읽고 각 기사를 분석합니다.
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not configured');
    process.exit(1);
  }

  // Parse args
  const args = process.argv.slice(2);
  let limit = 20;
  let category: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1]);
      i++;
    }
    if (args[i] === '--category' && args[i + 1]) {
      category = args[i + 1];
      i++;
    }
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let query = supabase
    .from('news_articles')
    .select('id, title, description, url, pub_date, ticker, category')
    .eq('is_processed', false)
    .order('pub_date', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('category', category);
  }

  const { data: articles, error } = await query;

  if (error) {
    console.error('조회 실패:', error.message);
    process.exit(1);
  }

  if (!articles || articles.length === 0) {
    console.log('미처리 기사가 없습니다.');
    console.log(JSON.stringify([]));
    return;
  }

  console.error(`미처리 기사 ${articles.length}개 발견:\n`);

  articles.forEach((a, i) => {
    const cat = a.category === 'crypto' ? '[암호화폐]' : '[주식]';
    console.error(`${i + 1}. ${cat} ${a.ticker || '(티커없음)'} - ${a.title}`);
  });

  // JSON output to stdout (stderr has human-readable, stdout has JSON)
  console.log(JSON.stringify(articles, null, 2));
}

main();
