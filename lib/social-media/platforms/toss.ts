/**
 * Toss Stock Mock Publisher
 * Simulates posting to Toss Stock community with realistic success/failure rates
 */

import {
  PlatformPublisher,
  FormattedContent,
  PublishResult,
  ErrorCode,
  PLATFORM_CONFIGS,
} from '../types';

export class TossPublisher implements PlatformPublisher {
  name = 'toss' as const;
  private config = PLATFORM_CONFIGS.toss;

  async publish(content: FormattedContent): Promise<PublishResult> {
    // Validate content length
    if (content.text.length > (this.config.maxLength || 1000)) {
      return {
        platform: this.name,
        success: false,
        error: 'Post exceeds 1000 character limit',
        errorCode: ErrorCode.CONTENT_TOO_LONG,
        timestamp: new Date(),
      };
    }

    // Simulate network delay
    await this.simulateDelay();

    // Simulate success/failure based on configured rate
    const isSuccess = Math.random() < (this.config.successRate || 0.88);

    const timestamp = new Date();

    if (isSuccess) {
      return {
        platform: this.name,
        success: true,
        messageId: this.generateMockPostId(),
        timestamp,
        responseData: {
          postId: this.generateMockPostId(),
          content: content.text,
          authorId: this.getMockAuthorId(),
          createdAt: timestamp.toISOString(),
          status: 'published',
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
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
        success: false,
        errorCode: failureScenario.apiCode,
        errorMessage: failureScenario.message,
      },
    };
  }

  private simulateDelay(): Promise<void> {
    const delay = Math.random() * 500 + 200; // 200-700ms (slightly slower)
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  private generateMockPostId(): string {
    return `toss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMockAuthorId(): string {
    return 'user_korean_stock_news'; // Mock author ID
  }

  private getRandomFailureScenario() {
    const scenarios = [
      {
        code: ErrorCode.RATE_LIMIT,
        apiCode: 'RATE_LIMIT_EXCEEDED',
        message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
      },
      {
        code: ErrorCode.NETWORK_ERROR,
        apiCode: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
      {
        code: ErrorCode.INVALID_CONTENT,
        apiCode: 'INVALID_CONTENT',
        message: '유효하지 않은 콘텐츠입니다.',
      },
      {
        code: ErrorCode.DUPLICATE_POST,
        apiCode: 'DUPLICATE_CONTENT',
        message: '동일한 내용의 게시물이 이미 존재합니다.',
      },
      {
        code: ErrorCode.AUTH_FAILED,
        apiCode: 'UNAUTHORIZED',
        message: '인증에 실패했습니다.',
      },
    ];

    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }
}

// Export singleton instance
export const tossPublisher = new TossPublisher();
