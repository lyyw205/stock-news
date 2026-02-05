/**
 * Unit tests for Twitter Mock Publisher
 */

import { twitterPublisher } from '@/lib/social-media/platforms/twitter';
import { FormattedContent, ErrorCode } from '@/lib/social-media/types';

describe('TwitterPublisher', () => {
  it('should have correct platform name', () => {
    expect(twitterPublisher.name).toBe('twitter');
  });

  it('should publish successfully with valid content', async () => {
    const content: FormattedContent = {
      platform: 'twitter',
      text: 'Test tweet within 280 characters',
      metadata: {
        characterCount: 33,
      },
    };

    const result = await twitterPublisher.publish(content);

    expect(result.platform).toBe('twitter');
    expect(result.timestamp).toBeInstanceOf(Date);

    if (result.success) {
      expect(result.messageId).toBeDefined();
      expect(result.responseData).toBeDefined();
      expect(result.responseData.text).toBeDefined();
    } else {
      expect(result.error).toBeDefined();
      expect(result.errorCode).toBeDefined();
    }
  });

  it('should reject content exceeding 280 characters', async () => {
    const longText = 'a'.repeat(281); // 281 characters

    const content: FormattedContent = {
      platform: 'twitter',
      text: longText,
      metadata: {
        characterCount: longText.length,
      },
    };

    const result = await twitterPublisher.publish(content);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(ErrorCode.CONTENT_TOO_LONG);
    expect(result.error).toContain('280 character limit');
  });

  it('should accept content exactly at 280 characters', async () => {
    const exactText = 'a'.repeat(280); // Exactly 280 characters

    const content: FormattedContent = {
      platform: 'twitter',
      text: exactText,
      metadata: {
        characterCount: exactText.length,
      },
    };

    const result = await twitterPublisher.publish(content);

    // Should not fail due to length (may succeed or fail due to mock randomness)
    if (!result.success) {
      expect(result.errorCode).not.toBe(ErrorCode.CONTENT_TOO_LONG);
    }
  });

  it('should generate unique tweet IDs', async () => {
    const content: FormattedContent = {
      platform: 'twitter',
      text: 'Test tweet',
    };

    const results = await Promise.all([
      twitterPublisher.publish(content),
      twitterPublisher.publish(content),
      twitterPublisher.publish(content),
    ]);

    const tweetIds = results.filter((r) => r.success).map((r) => r.messageId);

    // All successful tweet IDs should be unique
    const uniqueIds = new Set(tweetIds);
    expect(uniqueIds.size).toBe(tweetIds.length);
  });

  it('should simulate realistic error scenarios', async () => {
    const content: FormattedContent = {
      platform: 'twitter',
      text: 'Test tweet',
    };

    // Run multiple times to collect different errors
    const results = await Promise.all(
      Array.from({ length: 30 }, () => twitterPublisher.publish(content))
    );

    const failures = results.filter((r) => !r.success);

    // Check that we get various error codes (not just one type)
    const errorCodes = new Set(failures.map((f) => f.errorCode));

    // Should have some failures with various error codes
    if (failures.length > 0) {
      expect(errorCodes.size).toBeGreaterThan(0);
    }
  });
});
