import { extractTicker } from '@/lib/ticker/extract';

describe('Ticker Extraction', () => {
  describe('extractTicker', () => {
    it('should extract ticker from parentheses format', () => {
      const text = '삼성전자(005930) 실적 발표';
      const ticker = extractTicker(text);

      expect(ticker).toBe('005930');
    });

    it('should extract ticker from colon format', () => {
      const text = '종목코드: 035720 카카오 주가 상승';
      const ticker = extractTicker(text);

      expect(ticker).toBe('035720');
    });

    it('should return null when no ticker found', () => {
      const text = 'NAVER Corp general market news';
      const ticker = extractTicker(text);

      expect(ticker).toBeNull();
    });

    it('should extract first ticker when multiple tickers exist', () => {
      const text = '삼성전자(005930)와 SK하이닉스(000660) 비교';
      const ticker = extractTicker(text);

      expect(ticker).toBe('005930');
    });

    it('should handle ticker in description field', () => {
      const text = '본문 내용에 삼성전자(005930)가 언급되었습니다';
      const ticker = extractTicker(text);

      expect(ticker).toBe('005930');
    });

    it('should only match 6-digit numbers', () => {
      const text = '가격은 1234원이며 종목 코드는 005930입니다';
      const ticker = extractTicker(text);

      expect(ticker).toBe('005930');
    });

    it('should handle empty string', () => {
      const ticker = extractTicker('');

      expect(ticker).toBeNull();
    });

    it('should extract ticker from bracket format', () => {
      const text = '[종목] 005930 삼성전자';
      const ticker = extractTicker(text);

      expect(ticker).toBe('005930');
    });
  });
});
