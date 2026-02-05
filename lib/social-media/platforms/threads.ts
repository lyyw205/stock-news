/**
 * Threads Mock Publisher
 * Simulates posting to Instagram Threads with realistic success/failure rates
 */

import {
  PlatformPublisher,
  FormattedContent,
  PublishResult,
  ErrorCode,
  PLATFORM_CONFIGS,
} from '../types';

export class ThreadsPublisher implements PlatformPublisher {
  name = 'threads' as const;
  private config = PLATFORM_CONFIGS.threads;

  async publish(content: FormattedContent): Promise<PublishResult> {
    // Validate content length
    if (content.text.length > (this.config.maxLength || 500)) {
      return {
        platform: this.name,
        success: false,
        error: 'Thread exceeds 500 character limit',
        errorCode: ErrorCode.CONTENT_TOO_LONG,
        timestamp: new Date(),
      };
    }

    // Simulate network delay
    await this.simulateDelay();

    // Simulate success/failure based on configured rate
    const isSuccess = Math.random() < (this.config.successRate || 0.92);

    const timestamp = new Date();

    if (isSuccess) {
      return {
        platform: this.name,
        success: true,
        messageId: this.generateMockThreadId(),
        timestamp,
        responseData: {
          id: this.generateMockThreadId(),
          text: content.text,
          username: this.getMockUsername(),
          permalink: this.generatePermalink(),
          timestamp: timestamp.toISOString(),
          media_type: 'TEXT',
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
        error: {
          message: failureScenario.message,
          type: failureScenario.type,
          code: failureScenario.apiCode,
        },
      },
    };
  }

  private simulateDelay(): Promise<void> {
    const delay = Math.random() * 400 + 150; // 150-550ms
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  private generateMockThreadId(): string {
    return `th_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMockUsername(): string {
    return 'korean_stock_news'; // Mock username
  }

  private generatePermalink(): string {
    const id = this.generateMockThreadId();
    return `https://www.threads.net/@korean_stock_news/post/${id}`;
  }

  private getRandomFailureScenario() {
    const scenarios = [
      {
        code: ErrorCode.RATE_LIMIT,
        apiCode: 4,
        type: 'OAuthException',
        message: 'Application request limit reached',
      },
      {
        code: ErrorCode.NETWORK_ERROR,
        apiCode: 1,
        type: 'APIException',
        message: 'An unknown error occurred',
      },
      {
        code: ErrorCode.INVALID_CONTENT,
        apiCode: 100,
        type: 'InvalidParameter',
        message: 'Invalid parameter',
      },
      {
        code: ErrorCode.AUTH_FAILED,
        apiCode: 190,
        type: 'OAuthException',
        message: 'Invalid OAuth access token',
      },
    ];

    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }
}

// Export singleton instance
export const threadsPublisher = new ThreadsPublisher();
