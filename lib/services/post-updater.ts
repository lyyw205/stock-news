/**
 * 소셜미디어 포스트 업데이트 서비스
 * 뉴스 내용이 변경되었을 때 기존 포스트를 수정
 */

import { createClient } from '@supabase/supabase-js';

export interface PostUpdateResult {
  updated: number;
  failed: number;
  errors: string[];
}

/**
 * 업데이트가 필요한 포스트들을 찾아서 수정
 */
export async function updateOutdatedPosts(): Promise<PostUpdateResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const result: PostUpdateResult = {
    updated: 0,
    failed: 0,
    errors: [],
  };

  // needs_update = true인 포스트 찾기
  const { data: postsToUpdate, error: fetchError } = await supabase
    .from('social_media_posts')
    .select(
      `
      id,
      platform,
      post_id,
      content,
      news_article_id,
      news_articles (
        id,
        title,
        description,
        url,
        source_count,
        summaries (
          summary_text,
          credibility,
          total_score,
          sentiment
        )
      )
    `,
    )
    .eq('needs_update', true)
    .eq('status', 'published')
    .limit(50);

  if (fetchError) {
    result.errors.push(`Failed to fetch posts: ${fetchError.message}`);
    return result;
  }

  if (!postsToUpdate || postsToUpdate.length === 0) {
    return result;
  }

  for (const post of postsToUpdate) {
    try {
      const newsArticle = (post as any).news_articles;
      const summary = newsArticle?.summaries?.[0];

      if (!newsArticle || !summary) {
        result.errors.push(`Post ${post.id}: No news article or summary found`);
        result.failed++;
        continue;
      }

      // 새로운 포스트 내용 생성
      const updatedContent = generateUpdatedPostContent({
        title: newsArticle.title,
        summary: summary.summary_text,
        sourceCount: newsArticle.source_count || 1,
        credibility: summary.credibility || 0.5,
        totalScore: summary.total_score,
        sentiment: summary.sentiment,
        url: newsArticle.url,
      });

      // 플랫폼별 업데이트 API 호출
      const updateSuccess = await updatePostOnPlatform(
        post.platform,
        post.post_id,
        updatedContent,
      );

      if (updateSuccess) {
        // DB 업데이트
        await supabase
          .from('social_media_posts')
          .update({
            content: updatedContent,
            needs_update: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        result.updated++;
      } else {
        result.errors.push(`Post ${post.id}: Failed to update on ${post.platform}`);
        result.failed++;
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Post ${post.id}: ${errorMsg}`);
      result.failed++;
    }
  }

  return result;
}

/**
 * 업데이트된 포스트 내용 생성
 */
function generateUpdatedPostContent(params: {
  title: string;
  summary: string;
  sourceCount: number;
  credibility: number;
  totalScore: number;
  sentiment: number;
  url: string;
}): string {
  const { title, summary, sourceCount, credibility, totalScore, sentiment, url } =
    params;

  // 신뢰도 표시
  const credibilityEmoji =
    credibility >= 0.9 ? '✅' : credibility >= 0.7 ? '☑️' : '⚠️';
  const sourceText =
    sourceCount > 1 ? `\n📰 ${sourceCount}개 출처에서 보도` : '';

  // 심리 이모지
  const sentimentEmojis: Record<number, string> = {
    [-2]: '🔴',
    [-1]: '🟠',
    [0]: '🟡',
    [1]: '🟢',
    [2]: '🔵',
  };
  const sentimentEmoji = sentimentEmojis[sentiment] || '🟡';

  // 등급
  const grade =
    totalScore >= 80
      ? 'S'
      : totalScore >= 65
        ? 'A'
        : totalScore >= 50
          ? 'B'
          : totalScore >= 35
            ? 'C'
            : 'D';

  return `${credibilityEmoji} [업데이트] ${title}

${summary}${sourceText}

📊 점수: ${totalScore}점 (${grade}등급)
${sentimentEmoji} 투자심리

🔗 ${url}

#주식 #뉴스 #투자정보`;
}

/**
 * 플랫폼별 포스트 업데이트 API 호출
 */
async function updatePostOnPlatform(
  platform: string,
  postId: string,
  content: string,
): Promise<boolean> {
  // TODO: 실제 플랫폼별 API 구현
  // 현재는 시뮬레이션만 수행

  console.log(`[SIMULATION] Updating post on ${platform}:`, {
    postId,
    contentLength: content.length,
  });

  // Twitter/X는 포스트 수정 불가 - 삭제 후 재작성 필요
  if (platform === 'twitter') {
    console.warn('Twitter does not support post editing - skipping');
    return false;
  }

  // 다른 플랫폼은 수정 가능하다고 가정
  return true;
}

/**
 * 특정 뉴스 기사와 연결된 모든 포스트 업데이트 플래그 설정
 */
export async function markPostsForUpdate(
  newsArticleId: string,
): Promise<number> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('social_media_posts')
    .update({ needs_update: true })
    .eq('news_article_id', newsArticleId)
    .eq('status', 'published')
    .select('id');

  if (error) {
    console.error('Failed to mark posts for update:', error);
    return 0;
  }

  return data?.length || 0;
}
