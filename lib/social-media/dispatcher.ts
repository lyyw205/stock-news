/**
 * Social Media Dispatcher
 * Orchestrates publishing news to multiple social media platforms
 */

import { createServerSupabaseClient } from '../auth/supabase-server';
import { getPublisher } from './platforms';
import { formatNews } from './formatters';
import {
  PublishOptions,
  PublishSummary,
  PublishResult,
  NewsContent,
  SocialPlatform,
  PostStatus,
} from './types';

/**
 * Publish news article to selected social media platforms
 */
export async function publishToSocialMedia(
  options: PublishOptions
): Promise<PublishSummary> {
  const { articleId, platforms, retryFailures = false } = options;

  const supabase = createServerSupabaseClient();

  // 1. Fetch article and summary from database
  const newsContent = await fetchNewsContent(articleId);

  if (!newsContent) {
    throw new Error(`Article not found: ${articleId}`);
  }

  // 2. Create social_media_posts record
  const postId = await createPostRecord(newsContent, platforms);

  // 3. Publish to each platform in parallel
  const results = await Promise.all(
    platforms.map((platform) =>
      publishToPlatform(newsContent, platform, postId, retryFailures)
    )
  );

  // 4. Update post record with results
  const summary = await updatePostRecord(postId, results);

  // 5. Update summaries table if successful
  if (summary.successCount > 0) {
    await markSummaryAsPosted(newsContent.summaryId);
  }

  return summary;
}

/**
 * Fetch news content from database
 */
async function fetchNewsContent(articleId: string): Promise<NewsContent | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('news_articles')
    .select(
      `
      id,
      ticker,
      title,
      url,
      pub_date,
      summaries!inner (
        id,
        summary,
        is_useful
      )
    `
    )
    .eq('id', articleId)
    .eq('summaries.is_useful', true)
    .single();

  if (error || !data) {
    console.error('Error fetching news content:', error);
    return null;
  }

  // Extract summary (should only be one useful summary)
  const summary = Array.isArray(data.summaries)
    ? data.summaries[0]
    : data.summaries;

  return {
    articleId: data.id,
    summaryId: summary.id,
    ticker: data.ticker,
    title: data.title,
    summary: summary.summary,
    url: data.url,
    pubDate: new Date(data.pub_date),
  };
}

/**
 * Create social_media_posts record
 */
async function createPostRecord(
  news: NewsContent,
  platforms: SocialPlatform[]
): Promise<string> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('social_media_posts')
    .insert({
      article_id: news.articleId,
      summary_id: news.summaryId,
      news_article_id: news.articleId, // Link to news article for updates
      platforms,
      status: 'processing',
      success_count: 0,
      failure_count: 0,
      needs_update: false,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create post record: ${error?.message}`);
  }

  return data.id;
}

/**
 * Publish to a single platform
 */
async function publishToPlatform(
  news: NewsContent,
  platform: SocialPlatform,
  postId: string,
  retry: boolean
): Promise<PublishResult> {
  const supabase = createServerSupabaseClient();

  // Create log entry
  const logId = await createLogEntry(postId, news.articleId, platform);

  try {
    // Format content for platform
    const formatted = formatNews(news, platform);

    // Get publisher and publish
    const publisher = getPublisher(platform);
    const result = await publisher.publish(formatted);

    // Update log entry with result
    await updateLogEntry(logId, result, formatted.text);

    return result;
  } catch (error) {
    console.error(`Error publishing to ${platform}:`, error);

    const result: PublishResult = {
      platform,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'UNKNOWN_ERROR',
      timestamp: new Date(),
    };

    await updateLogEntry(logId, result);

    return result;
  }
}

/**
 * Create social_media_log entry
 */
async function createLogEntry(
  postId: string,
  articleId: string,
  platform: SocialPlatform
): Promise<string> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('social_media_log')
    .insert({
      post_id: postId,
      article_id: articleId,
      platform,
      status: 'pending',
      retry_count: 0,
      max_retries: 3,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create log entry: ${error?.message}`);
  }

  return data.id;
}

/**
 * Update social_media_log entry with result
 */
async function updateLogEntry(
  logId: string,
  result: PublishResult,
  formattedContent?: string
): Promise<void> {
  const supabase = createServerSupabaseClient();

  const updateData: any = {
    status: result.success ? 'sent' : 'failed',
    formatted_content: formattedContent,
    platform_response: result.responseData,
    error_message: result.error,
    error_code: result.errorCode,
  };

  if (result.success) {
    updateData.sent_at = new Date().toISOString();
  } else {
    updateData.failed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('social_media_log')
    .update(updateData)
    .eq('id', logId);

  if (error) {
    console.error('Error updating log entry:', error);
  }
}

/**
 * Update social_media_posts record with final results
 */
async function updatePostRecord(
  postId: string,
  results: PublishResult[]
): Promise<PublishSummary> {
  const supabase = createServerSupabaseClient();

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  let status: PostStatus;
  if (successCount === results.length) {
    status = 'completed';
  } else if (successCount > 0) {
    status = 'partial_failure';
  } else {
    status = 'failed';
  }

  const completedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('social_media_posts')
    .update({
      status,
      success_count: successCount,
      failure_count: failureCount,
      completed_at: completedAt,
    })
    .eq('id', postId)
    .select('article_id, created_at')
    .single();

  if (error || !data) {
    console.error('Error updating post record:', error);
  }

  return {
    postId,
    articleId: data?.article_id || '',
    status,
    successCount,
    failureCount,
    results,
    createdAt: new Date(data?.created_at || Date.now()),
    completedAt: new Date(completedAt),
  };
}

/**
 * Mark summary as posted to social media
 */
async function markSummaryAsPosted(summaryId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  // Increment post count
  const { data: currentData } = await supabase
    .from('summaries')
    .select('social_post_count')
    .eq('id', summaryId)
    .single();

  const currentCount = currentData?.social_post_count || 0;

  const { error } = await supabase
    .from('summaries')
    .update({
      social_posted: true,
      social_posted_at: new Date().toISOString(),
      social_post_count: currentCount + 1,
    })
    .eq('id', summaryId);

  if (error) {
    console.error('Error marking summary as posted:', error);
  }
}

/**
 * Get publishing status for a post
 */
export async function getPublishStatus(
  postId: string
): Promise<PublishSummary | null> {
  const supabase = createServerSupabaseClient();

  // Get post record
  const { data: post, error: postError } = await supabase
    .from('social_media_posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    return null;
  }

  // Get log entries
  const { data: logs, error: logsError } = await supabase
    .from('social_media_log')
    .select('*')
    .eq('post_id', postId);

  if (logsError) {
    console.error('Error fetching logs:', logsError);
  }

  // Convert logs to PublishResult format
  const results: PublishResult[] = (logs || []).map((log) => ({
    platform: log.platform as SocialPlatform,
    success: log.status === 'sent',
    messageId: log.platform_response?.id || log.platform_response?.messageId,
    error: log.error_message,
    errorCode: log.error_code,
    timestamp: new Date(log.sent_at || log.failed_at || log.created_at),
    responseData: log.platform_response,
  }));

  return {
    postId: post.id,
    articleId: post.article_id,
    status: post.status,
    successCount: post.success_count,
    failureCount: post.failure_count,
    results,
    createdAt: new Date(post.created_at),
    completedAt: post.completed_at ? new Date(post.completed_at) : undefined,
  };
}
