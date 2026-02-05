import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://opumwzybnjglxnyksxmo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wdW13enlibmpnbHhueWtzeG1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI4MjA0NiwiZXhwIjoyMDg1ODU4MDQ2fQ.tv9BZvsIa6tfVDtwWUJnbWsP2w_IVBiTIUdnxtC7UGo'
);

// 테스트 삽입
const testInsert = await supabase.from('news_articles').insert({
  url: 'https://test.example.com/article-test-' + Date.now(),
  url_hash: 'test_hash_' + Date.now(),
  title: 'Test Article',
  description: 'Test Description',
  pub_date: new Date().toISOString(),
  is_processed: false,
  source_count: 1
});

if (testInsert.error) {
  console.log('Insert error:', testInsert.error.message);
} else {
  console.log('Insert successful!');
}
