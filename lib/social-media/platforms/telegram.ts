/**
 * Telegram Publisher
 * Posts to Telegram channel using Bot API
 */

import {
  PlatformPublisher,
  FormattedContent,
  PublishResult,
  ErrorCode,
} from '../types';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export class TelegramPublisher implements PlatformPublisher {
  name = 'telegram' as const;
  private botToken: string;
  private chatId: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
  }

  async publish(content: FormattedContent): Promise<PublishResult> {
    const timestamp = new Date();

    // Check configuration
    if (!this.botToken || !this.chatId) {
      return {
        platform: this.name,
        success: false,
        error: 'Telegram bot token or chat ID not configured',
        errorCode: ErrorCode.AUTH_FAILED,
        timestamp,
      };
    }

    try {
      const url = `${TELEGRAM_API_BASE}${this.botToken}/sendMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: content.text,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        return {
          platform: this.name,
          success: true,
          messageId: String(data.result.message_id),
          timestamp,
          responseData: {
            chat_id: data.result.chat.id,
            message_id: data.result.message_id,
            date: data.result.date,
          },
        };
      }

      // Handle Telegram API errors
      const errorCode = this.mapTelegramError(data.error_code);
      return {
        platform: this.name,
        success: false,
        error: data.description || 'Unknown Telegram error',
        errorCode,
        timestamp,
        responseData: data,
      };
    } catch (error) {
      return {
        platform: this.name,
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        errorCode: ErrorCode.NETWORK_ERROR,
        timestamp,
      };
    }
  }

  async updateMessage(messageId: string, content: FormattedContent): Promise<PublishResult> {
    const timestamp = new Date();

    if (!this.botToken || !this.chatId) {
      return {
        platform: this.name,
        success: false,
        error: 'Telegram bot token or chat ID not configured',
        errorCode: ErrorCode.AUTH_FAILED,
        timestamp,
      };
    }

    try {
      const url = `${TELEGRAM_API_BASE}${this.botToken}/editMessageText`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          message_id: parseInt(messageId, 10),
          text: content.text,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json();

      if (data.ok) {
        return {
          platform: this.name,
          success: true,
          messageId: String(data.result.message_id),
          timestamp,
          responseData: data.result,
        };
      }

      return {
        platform: this.name,
        success: false,
        error: data.description || 'Failed to update message',
        errorCode: this.mapTelegramError(data.error_code),
        timestamp,
        responseData: data,
      };
    } catch (error) {
      return {
        platform: this.name,
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        errorCode: ErrorCode.NETWORK_ERROR,
        timestamp,
      };
    }
  }

  private mapTelegramError(telegramErrorCode: number): ErrorCode {
    switch (telegramErrorCode) {
      case 429:
        return ErrorCode.RATE_LIMIT;
      case 400:
        return ErrorCode.INVALID_CONTENT;
      case 401:
      case 403:
        return ErrorCode.AUTH_FAILED;
      default:
        return ErrorCode.NETWORK_ERROR;
    }
  }
}

// Export singleton instance
export const telegramPublisher = new TelegramPublisher();
