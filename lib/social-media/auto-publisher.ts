/**
 * Auto-Publishing System
 * Automatically publishes high-score articles (≥80) to all social media platforms
 */

import { publishToSocialMedia } from './dispatcher';
import { shouldAutoPublish, SCORE_CONFIG } from '../config/scores';
import type { PublishSummary, SocialPlatform } from './types';

export interface AutoPublishResult {
  /** Whether auto-publish criteria was met */
  shouldPublish: boolean;
  /** Whether auto-publish was attempted */
  attempted: boolean;
  /** Publishing results if attempted */
  publishResult?: PublishSummary;
  /** Error message if failed */
  error?: string;
}

/**
 * Auto-publish an article if it meets the score threshold
 *
 * @param articleId - The article ID to potentially publish
 * @param totalScore - The article's total score
 * @returns AutoPublishResult with publishing status
 */
export async function autoPublishArticle(
  articleId: string,
  totalScore: number,
): Promise<AutoPublishResult> {
  // Check if article should be auto-published
  if (!shouldAutoPublish(totalScore)) {
    return {
      shouldPublish: false,
      attempted: false,
    };
  }

  // Article meets criteria, attempt to publish to all platforms
  try {
    const platforms = [...SCORE_CONFIG.AUTO_PUBLISH_PLATFORMS] as SocialPlatform[];

    const publishResult = await publishToSocialMedia({
      articleId,
      platforms,
      retryFailures: false,
    });

    return {
      shouldPublish: true,
      attempted: true,
      publishResult,
    };
  } catch (error) {
    console.error('Error auto-publishing article:', error);

    return {
      shouldPublish: true,
      attempted: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if an article should be auto-published based on score
 */
export function checkAutoPublishCriteria(totalScore: number): boolean {
  return shouldAutoPublish(totalScore);
}

/**
 * Get the list of platforms for auto-publishing
 */
export function getAutoPublishPlatforms(): readonly SocialPlatform[] {
  return SCORE_CONFIG.AUTO_PUBLISH_PLATFORMS;
}
