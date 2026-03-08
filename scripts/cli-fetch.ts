/**
 * CLI: RSS 뉴스 수집
 * Usage: npx tsx scripts/cli-fetch.ts [--category stock|crypto]
 *
 * RSS 피드에서 뉴스를 가져와 DB에 저장합니다.
 * --category 옵션으로 주식/코인 뉴스를 분리 수집할 수 있습니다.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { fetchAllRSSSources, type NewsCategory } from '../lib/rss/fetcher';

async function main() {
  // Parse --category arg
  const args = process.argv.slice(2);
  let category: NewsCategory | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--category' && args[i + 1]) {
      const val = args[i + 1];
      if (val === 'stock' || val === 'crypto') {
        category = val;
      } else {
        console.error(`잘못된 카테고리: ${val} (stock 또는 crypto)`);
        process.exit(1);
      }
      i++;
    }
  }

  const label = category === 'stock' ? '주식' : category === 'crypto' ? '암호화폐' : '전체';
  console.log(`RSS 뉴스 수집 시작 [${label}]...\n`);

  try {
    const result = await fetchAllRSSSources(category);

    console.log('\n=== 수집 결과 ===');
    console.log(`총 기사: ${result.total}개`);
    console.log(`신규 저장: ${result.success}개`);
    console.log(`중복 스킵: ${result.duplicates}개`);
    console.log(`오류: ${result.errors}개`);

    // Output JSON for programmatic use
    console.log('\n' + JSON.stringify(result));
  } catch (error) {
    console.error('수집 실패:', error);
    process.exit(1);
  }
}

main();
