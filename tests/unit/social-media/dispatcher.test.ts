/**
 * Unit tests for Social Media Dispatcher
 * Note: These tests mock Supabase calls since we don't have a test database
 */

import { getPublisher } from '@/lib/social-media/platforms';
import { formatNews } from '@/lib/social-media/formatters';
import { SocialPlatform, NewsContent } from '@/lib/social-media/types';

describe('Social Media Dispatcher Components', () => {
  const mockNews: NewsContent = {
    articleId: 'test-article-id',
    summaryId: 'test-summary-id',
    ticker: 'SAMSUNG',
    title: '삼성전자, 신제품 발표',
    summary: '삼성전자가 새로운 제품을 발표했습니다.',
    url: 'https://example.com/news/123',
    pubDate: new Date('2024-01-15T10:30:00Z'),
  };

  describe('Platform Publisher Registry', () => {
    it('should return correct publishers for each platform', () => {
      const platforms: SocialPlatform[] = [
        'telegram',
        'twitter',
        'threads',
        'toss',
      ];

      platforms.forEach((platform) => {
        const publisher = getPublisher(platform);
        expect(publisher.name).toBe(platform);
      });
    });

    it('should throw error for unknown platform', () => {
      expect(() => {
        getPublisher('unknown' as SocialPlatform);
      }).toThrow('Unknown platform');
    });
  });

  describe('Format News Function', () => {
    it('should format news for all platforms', () => {
      const platforms: SocialPlatform[] = [
        'telegram',
        'twitter',
        'threads',
        'toss',
      ];

      platforms.forEach((platform) => {
        const formatted = formatNews(mockNews, platform);

        expect(formatted.platform).toBe(platform);
        expect(formatted.text).toBeDefined();
        expect(formatted.text.length).toBeGreaterThan(0);
        expect(formatted.text).toContain(mockNews.ticker);
      });
    });
  });

  describe('Publishing Flow Integration', () => {
    it('should be able to format and publish to each platform', async () => {
      const platforms: SocialPlatform[] = [
        'telegram',
        'twitter',
        'threads',
        'toss',
      ];

      for (const platform of platforms) {
        // Format content
        const formatted = formatNews(mockNews, platform);
        expect(formatted.platform).toBe(platform);

        // Get publisher
        const publisher = getPublisher(platform);
        expect(publisher.name).toBe(platform);

        // Publish (mock)
        const result = await publisher.publish(formatted);
        expect(result.platform).toBe(platform);
        expect(result.timestamp).toBeInstanceOf(Date);

        // Result should have either success or error info
        if (result.success) {
          expect(result.messageId).toBeDefined();
        } else {
          expect(result.error).toBeDefined();
          expect(result.errorCode).toBeDefined();
        }
      }
    });

    it('should handle parallel publishing to multiple platforms', async () => {
      const platforms: SocialPlatform[] = [
        'telegram',
        'twitter',
        'threads',
        'toss',
      ];

      const publishTasks = platforms.map(async (platform) => {
        const formatted = formatNews(mockNews, platform);
        const publisher = getPublisher(platform);
        return publisher.publish(formatted);
      });

      const results = await Promise.all(publishTasks);

      expect(results).toHaveLength(4);
      results.forEach((result, index) => {
        expect(result.platform).toBe(platforms[index]);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid content gracefully', async () => {
      const invalidNews: NewsContent = {
        ...mockNews,
        title: '',
        summary: '',
      };

      const platform: SocialPlatform = 'twitter';
      const formatted = formatNews(invalidNews, platform);
      const publisher = getPublisher(platform);

      const result = await publisher.publish(formatted);

      // Should complete without throwing
      expect(result).toBeDefined();
      expect(result.platform).toBe(platform);
    });
  });
});
