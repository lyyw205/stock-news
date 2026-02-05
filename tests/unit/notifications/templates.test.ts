import {
  generateSingleNewsEmail,
  generateDigestEmail,
  generateMultiTickerDigestEmail,
  type NewsItem,
} from '@/lib/notifications/templates';

describe('Email Templates', () => {
  const mockNewsItem: NewsItem = {
    ticker: '005930',
    title: '삼성전자 4분기 실적 발표',
    summary: '삼성전자가 4분기 영업이익 6.5조원을 기록했습니다. 반도체 부문이 실적을 견인했습니다.',
    url: 'https://example.com/news/1',
    pubDate: new Date('2024-01-15T10:00:00Z'),
  };

  describe('generateSingleNewsEmail', () => {
    it('should generate email with correct subject', () => {
      const result = generateSingleNewsEmail(mockNewsItem);

      expect(result.subject).toBe('[005930] 삼성전자 4분기 실적 발표');
    });

    it('should include ticker in HTML', () => {
      const result = generateSingleNewsEmail(mockNewsItem);

      expect(result.html).toContain('005930');
      expect(result.html).toContain('삼성전자 4분기 실적 발표');
      expect(result.html).toContain('삼성전자가 4분기 영업이익');
    });

    it('should include article URL in HTML', () => {
      const result = generateSingleNewsEmail(mockNewsItem);

      expect(result.html).toContain('https://example.com/news/1');
      expect(result.html).toContain('전체 기사 읽기');
    });

    it('should generate plain text version', () => {
      const result = generateSingleNewsEmail(mockNewsItem);

      expect(result.text).toContain('[005930]');
      expect(result.text).toContain('삼성전자 4분기 실적 발표');
      expect(result.text).toContain('삼성전자가 4분기 영업이익');
      expect(result.text).toContain('https://example.com/news/1');
    });

    it('should format date correctly', () => {
      const result = generateSingleNewsEmail(mockNewsItem);

      // Date should be formatted as Korean
      expect(result.html).toMatch(/2024년.*01월.*15일/);
    });
  });

  describe('generateDigestEmail', () => {
    const mockNewsList: NewsItem[] = [
      mockNewsItem,
      {
        ticker: '005930',
        title: '삼성전자 신제품 출시',
        summary: '삼성전자가 새로운 스마트폰을 출시했습니다.',
        url: 'https://example.com/news/2',
        pubDate: new Date('2024-01-16T10:00:00Z'),
      },
    ];

    it('should generate subject with count', () => {
      const result = generateDigestEmail('005930', mockNewsList);

      expect(result.subject).toBe('[005930] 새로운 뉴스 2건');
    });

    it('should include all news items', () => {
      const result = generateDigestEmail('005930', mockNewsList);

      expect(result.html).toContain('삼성전자 4분기 실적 발표');
      expect(result.html).toContain('삼성전자 신제품 출시');
      expect(result.html).toContain('새로운 뉴스 2건');
    });

    it('should include all URLs', () => {
      const result = generateDigestEmail('005930', mockNewsList);

      expect(result.html).toContain('https://example.com/news/1');
      expect(result.html).toContain('https://example.com/news/2');
    });

    it('should generate text version with numbered list', () => {
      const result = generateDigestEmail('005930', mockNewsList);

      expect(result.text).toContain('1.');
      expect(result.text).toContain('2.');
      expect(result.text).toContain('[005930] 새로운 뉴스 2건');
    });
  });

  describe('generateMultiTickerDigestEmail', () => {
    const mockTickerNews: Record<string, NewsItem[]> = {
      '005930': [mockNewsItem],
      '000660': [
        {
          ticker: '000660',
          title: 'SK하이닉스 HBM3 양산',
          summary: 'SK하이닉스가 HBM3 메모리 양산을 시작했습니다.',
          url: 'https://example.com/news/3',
          pubDate: new Date('2024-01-17T10:00:00Z'),
        },
      ],
    };

    it('should generate subject with total count and ticker count', () => {
      const result = generateMultiTickerDigestEmail(mockTickerNews);

      expect(result.subject).toContain('2건');
      expect(result.subject).toContain('2개 종목');
    });

    it('should include all tickers', () => {
      const result = generateMultiTickerDigestEmail(mockTickerNews);

      expect(result.html).toContain('005930');
      expect(result.html).toContain('000660');
    });

    it('should group news by ticker', () => {
      const result = generateMultiTickerDigestEmail(mockTickerNews);

      expect(result.html).toContain('삼성전자 4분기 실적 발표');
      expect(result.html).toContain('SK하이닉스 HBM3 양산');
    });

    it('should show count per ticker', () => {
      const result = generateMultiTickerDigestEmail(mockTickerNews);

      expect(result.html).toContain('005930');
      expect(result.html).toContain('1건');
      expect(result.html).toContain('000660');
    });
  });
});
