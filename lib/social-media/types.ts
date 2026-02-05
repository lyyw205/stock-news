/**
 * Common types for social media publishing system
 */

// Supported social media platforms
export type SocialPlatform = 'telegram' | 'twitter' | 'threads' | 'toss';

// Status for overall post request
export type PostStatus = 'pending' | 'processing' | 'completed' | 'partial_failure' | 'failed';

// Status for individual platform log
export type LogStatus = 'pending' | 'sent' | 'failed' | 'retrying';

/**
 * News content structure from database
 */
export interface NewsContent {
  ticker: string;
  title: string;
  summary: string;
  url: string;
  pubDate: Date;
  articleId: string;
  summaryId: string;
}

/**
 * Formatted content ready for platform publishing
 */
export interface FormattedContent {
  platform: SocialPlatform;
  text: string;
  metadata?: {
    hashtags?: string[];
    characterCount?: number;
    truncated?: boolean;
  };
}

/**
 * Result from publishing to a platform
 */
export interface PublishResult {
  platform: SocialPlatform;
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  timestamp: Date;
  responseData?: any;
}

/**
 * Summary of publishing to multiple platforms
 */
export interface PublishSummary {
  postId: string;
  articleId: string;
  status: PostStatus;
  successCount: number;
  failureCount: number;
  results: PublishResult[];
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Options for publishing to social media
 */
export interface PublishOptions {
  articleId: string;
  platforms: SocialPlatform[];
  retryFailures?: boolean;
}

/**
 * Interface that all platform publishers must implement
 */
export interface PlatformPublisher {
  name: SocialPlatform;
  publish(content: FormattedContent): Promise<PublishResult>;
}

/**
 * Database record types
 */
export interface SocialMediaPost {
  id: string;
  article_id: string;
  summary_id: string;
  platforms: string[];
  status: PostStatus;
  success_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface SocialMediaLog {
  id: string;
  post_id: string;
  article_id: string;
  platform: SocialPlatform;
  status: LogStatus;
  formatted_content?: string;
  platform_response?: any;
  error_message?: string;
  error_code?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  sent_at?: string;
  failed_at?: string;
}

/**
 * Error codes used by mock publishers
 */
export enum ErrorCode {
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_CONTENT = 'INVALID_CONTENT',
  DUPLICATE_POST = 'DUPLICATE_POST',
  AUTH_FAILED = 'AUTH_FAILED',
  CONTENT_TOO_LONG = 'CONTENT_TOO_LONG',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Platform-specific configuration
 */
export interface PlatformConfig {
  name: SocialPlatform;
  maxLength?: number;
  supportsMarkdown?: boolean;
  supportsHashtags?: boolean;
  supportsEmojis?: boolean;
  successRate?: number; // For mock simulation (0-1)
}

/**
 * Default platform configurations
 */
export const PLATFORM_CONFIGS: Record<SocialPlatform, PlatformConfig> = {
  telegram: {
    name: 'telegram',
    maxLength: 4096,
    supportsMarkdown: true,
    supportsHashtags: true,
    supportsEmojis: true,
    successRate: 0.95,
  },
  twitter: {
    name: 'twitter',
    maxLength: 280,
    supportsMarkdown: false,
    supportsHashtags: true,
    supportsEmojis: true,
    successRate: 0.90,
  },
  threads: {
    name: 'threads',
    maxLength: 500,
    supportsMarkdown: false,
    supportsHashtags: true,
    supportsEmojis: true,
    successRate: 0.92,
  },
  toss: {
    name: 'toss',
    maxLength: 1000,
    supportsMarkdown: false,
    supportsHashtags: false,
    supportsEmojis: true,
    successRate: 0.88,
  },
};
