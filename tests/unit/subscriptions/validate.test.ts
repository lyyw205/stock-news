import {
  validateTicker,
  checkSubscriptionLimit,
} from '@/lib/subscriptions/validate';

describe('Subscription Validation', () => {
  describe('validateTicker', () => {
    it('should accept valid 6-digit ticker', () => {
      expect(validateTicker('005930')).toBe(true);
      expect(validateTicker('000660')).toBe(true);
      expect(validateTicker('035720')).toBe(true);
    });

    it('should reject invalid ticker format', () => {
      expect(validateTicker('12345')).toBe(false); // Too short
      expect(validateTicker('1234567')).toBe(false); // Too long
      expect(validateTicker('ABC123')).toBe(false); // Contains letters
      expect(validateTicker('')).toBe(false); // Empty
      expect(validateTicker('  005930  ')).toBe(false); // With spaces
    });

    it('should be case-insensitive for numeric check', () => {
      expect(validateTicker('005930')).toBe(true);
    });
  });

  describe('checkSubscriptionLimit', () => {
    it('should allow subscription when under limit', () => {
      const existingSubscriptions = ['005930', '000660', '035720'];

      const result = checkSubscriptionLimit(existingSubscriptions);

      expect(result.allowed).toBe(true);
      expect(result.count).toBe(3);
      expect(result.limit).toBe(5);
    });

    it('should block subscription when at limit', () => {
      const existingSubscriptions = ['005930', '000660', '035720', '035420', '005380'];

      const result = checkSubscriptionLimit(existingSubscriptions);

      expect(result.allowed).toBe(false);
      expect(result.count).toBe(5);
      expect(result.limit).toBe(5);
    });

    it('should return correct counts', () => {
      const existingSubscriptions = ['005930', '000660'];

      const result = checkSubscriptionLimit(existingSubscriptions);

      expect(result.count).toBe(2);
      expect(result.remaining).toBe(3);
    });
  });
});
