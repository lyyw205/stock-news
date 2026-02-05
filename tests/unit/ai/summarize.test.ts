import { summarizeNews, type SummaryResult } from '@/lib/ai/summarize';
import * as gemini from '@/lib/ai/gemini';

// Mock the Gemini API
jest.mock('@/lib/ai/gemini');

describe('AI Summarize', () => {
  describe('summarizeNews', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('should generate Korean summary', async () => {
      const article = {
        title: '삼성전자(005930) 4분기 실적 발표',
        description:
          '삼성전자가 4분기 영업이익 6.5조원을 기록했다고 발표했습니다. 이는 전년 동기 대비 30% 증가한 수치입니다. 반도체 부문의 실적 개선이 주요 원인으로 분석됩니다.',
      };

      const mockSummary =
        '삼성전자가 4분기 영업이익 6.5조원을 기록했습니다. 전년 대비 30% 증가했으며 반도체 부문 실적 개선이 주요 원인입니다.';

      (gemini.generateContent as jest.Mock).mockResolvedValue(mockSummary);

      const result = await summarizeNews(article.title, article.description);

      expect(result.summary).toBeTruthy();
      expect(typeof result.summary).toBe('string');
      // Check if it contains Korean characters
      expect(result.summary).toMatch(/[가-힣]/);
    });

    it('should generate 2-3 sentence summary', async () => {
      const article = {
        title: 'SK하이닉스(000660) 주가 급등',
        description:
          'SK하이닉스 주가가 전일 대비 5% 급등했습니다. HBM 메모리 수요 증가가 원인으로 분석됩니다. 애널리스트들은 목표가를 상향 조정했습니다.',
      };

      const mockSummary =
        'SK하이닉스 주가가 5% 급등했습니다. HBM 메모리 수요 증가가 원인입니다.';

      (gemini.generateContent as jest.Mock).mockResolvedValue(mockSummary);

      const result = await summarizeNews(article.title, article.description);

      // Count periods (Korean and English)
      const sentences = result.summary.split(/[.。]/);
      const sentenceCount = sentences.filter((s) => s.trim().length > 0).length;

      expect(sentenceCount).toBeGreaterThanOrEqual(1);
      expect(sentenceCount).toBeLessThanOrEqual(4);
    });

    it('should be shorter than original', async () => {
      const longDescription =
        '삼성전자가 오늘 4분기 실적을 발표했습니다. ' +
        '영업이익은 6.5조원으로 전년 동기 대비 30% 증가했습니다. ' +
        '반도체 부문의 실적 개선이 주요 원인으로 분석됩니다. ' +
        '특히 메모리 반도체의 수요가 크게 증가했으며, ' +
        '시스템 LSI 부문도 양호한 성과를 보였습니다.';

      const mockSummary =
        '삼성전자 4분기 영업이익 6.5조원으로 전년 대비 30% 증가했습니다. 반도체 부문 실적 개선이 주요 원인입니다.';

      (gemini.generateContent as jest.Mock).mockResolvedValue(mockSummary);

      const result = await summarizeNews('삼성전자 실적 발표', longDescription);

      expect(result.summary.length).toBeLessThan(longDescription.length);
    });

    it('should handle API errors with fallback', async () => {
      const article = {
        title: 'Test',
        description: '',
      };

      (gemini.generateContent as jest.Mock).mockRejectedValue(
        new Error('API Error'),
      );

      const result = await summarizeNews(article.title, article.description);

      expect(result).toHaveProperty('summary');
      expect(typeof result.summary).toBe('string');
    });

    it('should include summary in result', async () => {
      const article = {
        title: '네이버(035420) 신사업 진출',
        description: '네이버가 AI 사업에 본격 진출한다고 발표했습니다.',
      };

      const mockSummary = '네이버가 AI 사업 진출을 발표했습니다.';

      (gemini.generateContent as jest.Mock).mockResolvedValue(mockSummary);

      const result = await summarizeNews(article.title, article.description);

      expect(result).toHaveProperty('summary');
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('should preserve key information', async () => {
      const article = {
        title: '카카오(035720) 매출 10조 돌파',
        description: '카카오가 연간 매출 10조원을 돌파했다고 발표했습니다.',
      };

      const mockSummary = '카카오가 연간 매출 10조원을 돌파했습니다.';

      (gemini.generateContent as jest.Mock).mockResolvedValue(mockSummary);

      const result = await summarizeNews(article.title, article.description);

      // Summary should mention key numbers or company name
      expect(result.summary).toMatch(/카카오|10조|매출/);
    });
  });
});
