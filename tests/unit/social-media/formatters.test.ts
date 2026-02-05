/**
 * Unit tests for Social Media Formatters
 */

import {
  formatForTelegram,
  formatForTwitter,
  formatForThreads,
  formatForToss,
} from '@/lib/social-media/formatters';
import { NewsContent } from '@/lib/social-media/types';

describe('Social Media Formatters', () => {
  const mockNews: NewsContent = {
    articleId: 'test-article-id',
    summaryId: 'test-summary-id',
    ticker: 'SAMSUNG',
    title: '삼성전자, 신제품 발표로 주가 상승',
    summary:
      '삼성전자가 오늘 새로운 스마트폰을 발표하면서 주가가 3% 상승했습니다. 시장은 긍정적으로 반응하고 있습니다.',
    url: 'https://example.com/news/123',
    pubDate: new Date('2024-01-15T10:30:00Z'),
  };

  describe('Telegram Formatter', () => {
    it('should format news for Telegram with Markdown and emojis', () => {
      const result = formatForTelegram(mockNews);

      expect(result.platform).toBe('telegram');
      expect(result.text).toContain('**SAMSUNG**');
      expect(result.text).toContain('📰');
      expect(result.text).toContain('🔗');
      expect(result.text).toContain(mockNews.title);
      expect(result.text).toContain(mockNews.summary);
      expect(result.text).toContain(mockNews.url);
      expect(result.text).toContain('#SAMSUNG');
      expect(result.metadata?.characterCount).toBeGreaterThan(0);
    });

    it('should include date in Korean format', () => {
      const result = formatForTelegram(mockNews);

      expect(result.text).toMatch(/\d{4}년 \d{2}월 \d{2}일/);
    });
  });

  describe('Twitter Formatter', () => {
    it('should format news for Twitter with hashtags', () => {
      const result = formatForTwitter(mockNews);

      expect(result.platform).toBe('twitter');
      expect(result.text).toContain('#SAMSUNG');
      expect(result.text).toContain('#한국주식');
      expect(result.text).toContain(mockNews.url);
      expect(result.metadata?.hashtags).toContain('#SAMSUNG');
      expect(result.metadata?.characterCount).toBeLessThanOrEqual(280);
    });

    it('should truncate content to fit 280 character limit', () => {
      const longNews: NewsContent = {
        ...mockNews,
        title: 'a'.repeat(200),
        summary: 'b'.repeat(200),
      };

      const result = formatForTwitter(longNews);

      expect(result.text.length).toBeLessThanOrEqual(280);
      expect(result.metadata?.truncated).toBeDefined();
    });

    it('should prioritize title over summary', () => {
      const result = formatForTwitter(mockNews);

      // Should always include title (or truncated version)
      expect(result.text).toContain(mockNews.title.substring(0, 20));
    });
  });

  describe('Threads Formatter', () => {
    it('should format news for Threads with visual separators', () => {
      const result = formatForThreads(mockNews);

      expect(result.platform).toBe('threads');
      expect(result.text).toContain('━');
      expect(result.text).toContain('📈');
      expect(result.text).toContain(mockNews.ticker);
      expect(result.text).toContain(mockNews.title);
      expect(result.text).toContain(mockNews.url);
      expect(result.metadata?.characterCount).toBeLessThanOrEqual(500);
    });

    it('should truncate content to fit 500 character limit', () => {
      const longNews: NewsContent = {
        ...mockNews,
        title: 'a'.repeat(300),
        summary: 'b'.repeat(300),
      };

      const result = formatForThreads(longNews);

      expect(result.text.length).toBeLessThanOrEqual(500);
    });
  });

  describe('Toss Formatter', () => {
    it('should format news for Toss with concise style', () => {
      const result = formatForToss(mockNews);

      expect(result.platform).toBe('toss');
      expect(result.text).toContain(`[${mockNews.ticker}]`);
      expect(result.text).toContain(mockNews.title);
      expect(result.text).toContain(mockNews.summary);
      expect(result.text).toContain(mockNews.url);
      expect(result.text).toContain('📅');
      expect(result.metadata?.characterCount).toBeLessThanOrEqual(1000);
    });

    it('should truncate summary if exceeds 1000 character limit', () => {
      const longNews: NewsContent = {
        ...mockNews,
        summary: 'b'.repeat(1000),
      };

      const result = formatForToss(longNews);

      expect(result.text.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Common Format Requirements', () => {
    it('all formatters should include URL', () => {
      const formatters = [
        formatForTelegram,
        formatForTwitter,
        formatForThreads,
        formatForToss,
      ];

      formatters.forEach((formatter) => {
        const result = formatter(mockNews);
        expect(result.text).toContain(mockNews.url);
      });
    });

    it('all formatters should include ticker', () => {
      const formatters = [
        formatForTelegram,
        formatForTwitter,
        formatForThreads,
        formatForToss,
      ];

      formatters.forEach((formatter) => {
        const result = formatter(mockNews);
        expect(result.text).toContain(mockNews.ticker);
      });
    });

    it('all formatters should respect their platform max length', () => {
      const maxLengths = {
        telegram: 4096,
        twitter: 280,
        threads: 500,
        toss: 1000,
      };

      const formatters = [
        { fn: formatForTelegram, platform: 'telegram' as const },
        { fn: formatForTwitter, platform: 'twitter' as const },
        { fn: formatForThreads, platform: 'threads' as const },
        { fn: formatForToss, platform: 'toss' as const },
      ];

      formatters.forEach(({ fn, platform }) => {
        const result = fn(mockNews);
        expect(result.text.length).toBeLessThanOrEqual(maxLengths[platform]);
      });
    });
  });
});
