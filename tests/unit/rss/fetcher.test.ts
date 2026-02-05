import { RSS_SOURCES } from '@/lib/rss/fetcher';

describe('RSS Fetcher', () => {
  describe('RSS_SOURCES', () => {
    it('should have multiple RSS sources configured', () => {
      expect(RSS_SOURCES.length).toBeGreaterThan(0);
    });

    it('should have valid RSS source structure', () => {
      RSS_SOURCES.forEach((source) => {
        expect(source).toHaveProperty('name');
        expect(source).toHaveProperty('url');
        expect(typeof source.name).toBe('string');
        expect(typeof source.url).toBe('string');
        expect(source.url).toMatch(/^https?:\/\//);
      });
    });

    it('should include Naver Finance sources', () => {
      const naverSources = RSS_SOURCES.filter((s) => s.name.includes('Naver'));
      expect(naverSources.length).toBeGreaterThan(0);
    });
  });
});
