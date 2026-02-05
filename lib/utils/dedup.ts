import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export function createUrlHash(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

export async function checkDuplicate(
  url: string,
  supabase: SupabaseClient,
): Promise<'new' | 'duplicate'> {
  const urlHash = createUrlHash(url);

  const { data, error } = await supabase
    .from('news_articles')
    .select('url_hash')
    .eq('url_hash', urlHash);

  if (error) {
    throw new Error(error.message);
  }

  if (data && data.length > 0) {
    return 'duplicate';
  }

  return 'new';
}
