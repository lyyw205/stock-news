/**
 * Telegram Mock Publisher
 * Simulates posting to Telegram with realistic success/failure rates
 */

import {
  PlatformPublisher,
  FormattedContent,
  PublishResult,
  ErrorCode,
  PLATFORM_CONFIGS,
} from '../types';

export class TelegramPublisher implements PlatformPublisher {
  name = 'telegram' as const;
  private config = PLATFORM_CONFIGS.telegram;

  async publish(content: FormattedContent): Promise<PublishResult> {
    // Simulate network delay
    await this.simulateDelay();

    // Simulate success/failure based on configured rate
    const isSuccess = Math.random() < (this.config.successRate || 0.95);

    const timestamp = new Date();

    if (isSuccess) {
      return {
        platform: this.name,
        success: true,
        messageId: this.generateMockMessageId(),
        timestamp,
        responseData: {
          chat_id: this.getMockChatId(),
          message_id: this.generateMockMessageId(),
          text: content.text,
          date: Math.floor(timestamp.getTime() / 1000),
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
        ok: false,
        error_code: failureScenario.apiCode,
        description: failureScenario.message,
      },
    };
  }

  private simulateDelay(): Promise<void> {
    const delay = Math.random() * 400 + 100; // 100-500ms
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  private generateMockMessageId(): string {
    return `tg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMockChatId(): string {
    return '-1001234567890'; // Mock channel ID
  }

  private getRandomFailureScenario() {
    const scenarios = [
      {
        code: ErrorCode.RATE_LIMIT,
        apiCode: 429,
        message: 'Too Many Requests: retry after 30 seconds',
      },
      {
        code: ErrorCode.NETWORK_ERROR,
        apiCode: 500,
        message: 'Internal Server Error',
      },
      {
        code: ErrorCode.INVALID_CONTENT,
        apiCode: 400,
        message: 'Bad Request: message is too long',
      },
      {
        code: ErrorCode.DUPLICATE_POST,
        apiCode: 400,
        message: 'Bad Request: message is not modified',
      },
    ];

    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }
}

// Export singleton instance
export const telegramPublisher = new TelegramPublisher();
