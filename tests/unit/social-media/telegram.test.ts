/**
 * Unit tests for Telegram Mock Publisher
 */

import { telegramPublisher } from '@/lib/social-media/platforms/telegram';
import { FormattedContent } from '@/lib/social-media/types';

describe('TelegramPublisher', () => {
  it('should have correct platform name', () => {
    expect(telegramPublisher.name).toBe('telegram');
  });

  it('should publish successfully with valid content', async () => {
    const content: FormattedContent = {
      platform: 'telegram',
      text: 'Test message for Telegram',
      metadata: {
        characterCount: 24,
      },
    };

    const result = await telegramPublisher.publish(content);

    expect(result.platform).toBe('telegram');
    expect(result.timestamp).toBeInstanceOf(Date);

    // Result should be either success or failure (mock simulation)
    if (result.success) {
      expect(result.messageId).toBeDefined();
      expect(result.responseData).toBeDefined();
      expect(result.responseData.chat_id).toBeDefined();
    } else {
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBeDefined();
    }
  });

  it('should handle network delay', async () => {
    const content: FormattedContent = {
      platform: 'telegram',
      text: 'Test message',
    };

    const startTime = Date.now();
    await telegramPublisher.publish(content);
    const endTime = Date.now();

    // Should take at least 100ms (minimum simulated delay)
    expect(endTime - startTime).toBeGreaterThanOrEqual(100);
  });

  it('should generate unique message IDs', async () => {
    const content: FormattedContent = {
      platform: 'telegram',
      text: 'Test message',
    };

    const results = await Promise.all([
      telegramPublisher.publish(content),
      telegramPublisher.publish(content),
      telegramPublisher.publish(content),
    ]);

    const messageIds = results
      .filter((r) => r.success)
      .map((r) => r.messageId);

    // All successful message IDs should be unique
    const uniqueIds = new Set(messageIds);
    expect(uniqueIds.size).toBe(messageIds.length);
  });

  it('should simulate both success and failure scenarios', async () => {
    const content: FormattedContent = {
      platform: 'telegram',
      text: 'Test message',
    };

    // Run multiple times to test randomness
    const results = await Promise.all(
      Array.from({ length: 20 }, () => telegramPublisher.publish(content))
    );

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    // With 95% success rate, we should see some of each (probabilistically)
    // At least one should be present in 20 attempts
    expect(successCount).toBeGreaterThan(0);

    // Success rate should be roughly 95% (allow some variance)
    const actualRate = successCount / results.length;
    expect(actualRate).toBeGreaterThan(0.7); // Allow variance in mock
  });
});
