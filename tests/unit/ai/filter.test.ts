import { filterNews, type FilterResult } from '@/lib/ai/filter';
import * as gemini from '@/lib/ai/gemini';

// Mock the Gemini API
jest.mock('@/lib/ai/gemini');

describe('AI Filter', () => {
  describe('filterNews', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('should identify useful news with high confidence', async () => {
      const article = {
        title: '삼성전자(005930) 4분기 영업이익 6.5조원 기록',
        description: '삼성전자가 4분기 영업이익 6.5조원을 기록했다고 발표했습니다.',
      };

      const mockResponse = JSON.stringify({
        isUseful: true,
        confidence: 0.9,
        reasoning: '구체적인 실적 발표 내용',
      });

      (gemini.generateContent as jest.Mock).mockResolvedValue(mockResponse);

      const result = await filterNews(article.title, article.description);

      expect(result.isUseful).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should identify useless news with low confidence', async () => {
      const article = {
        title: '오늘의 증시 전망',
        description: '전문가들은 오늘 증시가 보합세를 보일 것으로 전망했습니다.',
      };

      const mockResponse = JSON.stringify({
        isUseful: false,
        confidence: 0.8,
        reasoning: '일반적인 시장 전망',
      });

      (gemini.generateContent as jest.Mock).mockResolvedValue(mockResponse);

      const result = await filterNews(article.title, article.description);

      expect(result.isUseful).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should return confidence score between 0 and 1', async () => {
      const article = {
        title: '현대차(005380) 신차 출시',
        description: '현대차가 신형 전기차를 출시한다고 발표했습니다.',
      };

      const mockResponse = JSON.stringify({
        isUseful: true,
        confidence: 0.75,
        reasoning: '신제품 출시 정보',
      });

      (gemini.generateContent as jest.Mock).mockResolvedValue(mockResponse);

      const result = await filterNews(article.title, article.description);

      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should include reasoning in result', async () => {
      const article = {
        title: 'SK하이닉스(000660) 실적 발표',
        description: 'SK하이닉스가 사상 최대 실적을 기록했습니다.',
      };

      const mockResponse = JSON.stringify({
        isUseful: true,
        confidence: 0.95,
        reasoning: '사상 최대 실적이라는 구체적 정보',
      });

      (gemini.generateContent as jest.Mock).mockResolvedValue(mockResponse);

      const result = await filterNews(article.title, article.description);

      expect(result).toHaveProperty('reasoning');
      expect(typeof result.reasoning).toBe('string');
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should handle API errors gracefully', async () => {
      const article = {
        title: '',
        description: '',
      };

      (gemini.generateContent as jest.Mock).mockRejectedValue(
        new Error('API Error'),
      );

      const result = await filterNews(article.title, article.description);

      expect(result).toHaveProperty('isUseful');
      expect(result).toHaveProperty('confidence');
      expect(result.isUseful).toBe(false);
    });

    it('should handle very long content', async () => {
      const longDescription = 'A'.repeat(10000);

      const mockResponse = JSON.stringify({
        isUseful: false,
        confidence: 0.6,
        reasoning: 'Content too long',
      });

      (gemini.generateContent as jest.Mock).mockResolvedValue(mockResponse);

      const result = await filterNews('Test title', longDescription);

      expect(result).toHaveProperty('isUseful');
      expect(result).toHaveProperty('confidence');
    });
  });
});
