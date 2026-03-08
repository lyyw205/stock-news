export function validateTicker(ticker: string): boolean {
  if (!ticker || typeof ticker !== 'string') {
    return false;
  }

  // Stock ticker: exactly 6 digits
  const stockTickerRegex = /^\d{6}$/;
  if (stockTickerRegex.test(ticker)) {
    return true;
  }

  // Crypto ticker: 2-5 uppercase letters
  const cryptoTickerRegex = /^[A-Z]{2,5}$/;
  if (cryptoTickerRegex.test(ticker)) {
    return true;
  }

  return false;
}

export interface SubscriptionLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
}

export function checkSubscriptionLimit(
  existingTickers: string[],
  limit: number = 5,
): SubscriptionLimitResult {
  const count = existingTickers.length;
  const allowed = count < limit;
  const remaining = Math.max(0, limit - count);

  return {
    allowed,
    count,
    limit,
    remaining,
  };
}
