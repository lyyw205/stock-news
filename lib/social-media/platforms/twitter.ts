/**
 * Twitter Mock Publisher
 * Simulates posting to Twitter (X) with realistic success/failure rates
 */

import {
  PlatformPublisher,
  FormattedContent,
  PublishResult,
  ErrorCode,
  PLATFORM_CONFIGS,
} from '../types';

export class TwitterPublisher implements PlatformPublisher {
  name = 'twitter' as const;
  private config = PLATFORM_CONFIGS.twitter;

  async publish(content: FormattedContent): Promise<PublishResult> {
    // Validate content length (280 character limit)
    if (content.text.length > (this.config.maxLength || 280)) {
      return {
        platform: this.name,
        success: false,
        error: 'Tweet exceeds 280 character limit',
        errorCode: ErrorCode.CONTENT_TOO_LONG,
        timestamp: new Date(),
      };
    }

    // Simulate network delay
    await this.simulateDelay();

    // Simulate success/failure based on configured rate
    const isSuccess = Math.random() < (this.config.successRate || 0.90);

    const timestamp = new Date();

    if (isSuccess) {
      return {
        platform: this.name,
        success: true,
        messageId: this.generateMockTweetId(),
        timestamp,
        responseData: {
          id: this.generateMockTweetId(),
          text: content.text,
          created_at: timestamp.toISOString(),
          author_id: this.getMockAuthorId(),
          public_metrics: {
            retweet_count: 0,
            reply_count: 0,
            like_count: 0,
            quote_count: 0,
          },
        },
      };
    }

    // Simulate various failure scenarios
    const failureScenario = this.getRandomFailureScenario();

    return {
      platform: this.name,
      success: false,
      error: failureScenario.message,
      errorCode: failureScenario.code,
      timestamp,
      responseData: {
        errors: [
          {
            code: failureScenario.apiCode,
            message: failureScenario.message,
          },
        ],
      },
    };
  }

  private simulateDelay(): Promise<void> {
    const delay = Math.random() * 400 + 100; // 100-500ms
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  private generateMockTweetId(): string {
    return `tw_${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }

  private getMockAuthorId(): string {
    return '1234567890123456789'; // Mock user ID
  }

  private getRandomFailureScenario() {
    const scenarios = [
      {
        code: ErrorCode.RATE_LIMIT,
        apiCode: 429,
        message: 'Rate limit exceeded',
      },
      {
        code: ErrorCode.NETWORK_ERROR,
        apiCode: 503,
        message: 'Service Unavailable',
      },
      {
        code: ErrorCode.DUPLICATE_POST,
        apiCode: 403,
        message: 'Status is a duplicate',
      },
      {
        code: ErrorCode.AUTH_FAILED,
        apiCode: 401,
        message: 'Unauthorized: Authentication credentials were missing or incorrect',
      },
    ];

    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }
}

// Export singleton instance
export const twitterPublisher = new TwitterPublisher();
