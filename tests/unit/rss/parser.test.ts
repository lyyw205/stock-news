import { parseRSSFeed, fetchRSSFeed, type Article } from '@/lib/rss/parser';

describe('RSS Parser', () => {
  describe('parseRSSFeed', () => {
    it('should parse Naver Finance RSS successfully', async () => {
      const mockRSSContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Naver Finance</title>
    <item>
      <title>삼성전자(005930) 실적 발표</title>
      <link>https://finance.naver.com/item/news_read.naver?article_id=123</link>
      <pubDate>Wed, 05 Feb 2026 10:00:00 +0900</pubDate>
      <description>삼성전자가 4분기 실적을 발표했습니다.</description>
    </item>
    <item>
      <title>SK하이닉스(000660) 주가 상승</title>
      <link>https://finance.naver.com/item/news_read.naver?article_id=124</link>
      <pubDate>Wed, 05 Feb 2026 09:00:00 +0900</pubDate>
      <description>SK하이닉스 주가가 급등했습니다.</description>
    </item>
  </channel>
</rss>`;

      const articles = await parseRSSFeed(mockRSSContent);

      expect(articles).toHaveLength(2);
      expect(articles[0]).toHaveProperty('title');
      expect(articles[0]).toHaveProperty('link');
      expect(articles[0]).toHaveProperty('pubDate');
      expect(articles[0].title).toContain('삼성전자');
    });

    it('should extract at least 10 articles from real RSS feed', async () => {
      const mockRSSContent = generateMockRSS(15);
      const articles = await parseRSSFeed(mockRSSContent);

      expect(articles.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle invalid XML format with error', async () => {
      const invalidXML = 'This is not valid XML';

      await expect(parseRSSFeed(invalidXML)).rejects.toThrow();
    });

    it('should parse article with all required fields', async () => {
      const mockRSSContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Test Article</title>
      <link>https://example.com/article</link>
      <pubDate>Wed, 05 Feb 2026 10:00:00 +0900</pubDate>
      <description>Test description</description>
    </item>
  </channel>
</rss>`;

      const articles = await parseRSSFeed(mockRSSContent);

      expect(articles[0]).toEqual({
        title: 'Test Article',
        link: 'https://example.com/article',
        pubDate: expect.any(Date),
        description: 'Test description',
      });
    });

    it('should return empty array for feed with no items', async () => {
      const mockRSSContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Empty Feed</title>
  </channel>
</rss>`;

      const articles = await parseRSSFeed(mockRSSContent);

      expect(articles).toEqual([]);
    });

    it('should throw error for missing required fields', async () => {
      const mockRSSContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Only Title</title>
    </item>
  </channel>
</rss>`;

      await expect(parseRSSFeed(mockRSSContent)).rejects.toThrow(
        'RSS item missing required fields',
      );
    });
  });

  describe('fetchRSSFeed', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should fetch and parse RSS feed from URL', async () => {
      const mockRSSContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Test Article</title>
      <link>https://example.com/article</link>
      <pubDate>Wed, 05 Feb 2026 10:00:00 +0900</pubDate>
      <description>Test description</description>
    </item>
  </channel>
</rss>`;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockRSSContent,
      });

      const articles = await fetchRSSFeed('https://example.com/rss');

      expect(articles).toHaveLength(1);
      expect(articles[0].title).toBe('Test Article');
    });

    it('should throw error for HTTP failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(fetchRSSFeed('https://example.com/rss')).rejects.toThrow(
        'HTTP error! status: 404',
      );
    });

    it('should handle fetch network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(fetchRSSFeed('https://example.com/rss')).rejects.toThrow(
        'Failed to fetch RSS feed',
      );
    });
  });
});

function generateMockRSS(count: number): string {
  let items = '';
  for (let i = 0; i < count; i++) {
    items += `
    <item>
      <title>Article ${i + 1}</title>
      <link>https://example.com/article${i + 1}</link>
      <pubDate>Wed, 05 Feb 2026 10:00:00 +0900</pubDate>
      <description>Description ${i + 1}</description>
    </item>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test RSS</title>
    ${items}
  </channel>
</rss>`;
}
