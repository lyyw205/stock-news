import { checkDuplicate, createUrlHash } from '@/lib/utils/dedup';

describe('Deduplication', () => {
  describe('createUrlHash', () => {
    it('should create consistent hash for the same URL', () => {
      const url = 'https://finance.naver.com/item/news_read.naver?article_id=123';
      const hash1 = createUrlHash(url);
      const hash2 = createUrlHash(url);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string
    });

    it('should create different hashes for different URLs', () => {
      const url1 = 'https://finance.naver.com/item/news_read.naver?article_id=123';
      const url2 = 'https://finance.naver.com/item/news_read.naver?article_id=124';

      const hash1 = createUrlHash(url1);
      const hash2 = createUrlHash(url2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('checkDuplicate', () => {
    const mockSupabaseClient = {
      from: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return "new" for non-duplicate URL', async () => {
      const url = 'https://finance.naver.com/item/news_read.naver?article_id=123';

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const result = await checkDuplicate(url, mockSupabaseClient as any);

      expect(result).toBe('new');
    });

    it('should return "duplicate" for existing URL hash', async () => {
      const url = 'https://finance.naver.com/item/news_read.naver?article_id=123';

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ url_hash: 'some-hash' }],
            error: null,
          }),
        }),
      });

      const result = await checkDuplicate(url, mockSupabaseClient as any);

      expect(result).toBe('duplicate');
    });

    it('should throw error on database failure', async () => {
      const url = 'https://finance.naver.com/item/news_read.naver?article_id=123';

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      await expect(checkDuplicate(url, mockSupabaseClient as any)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
