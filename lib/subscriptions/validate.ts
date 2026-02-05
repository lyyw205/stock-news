export function validateTicker(ticker: string): boolean {
  if (!ticker || typeof ticker !== 'string') {
    return false;
  }

  // Must be exactly 6 digits, no spaces or other characters
  const tickerRegex = /^\d{6}$/;
  return tickerRegex.test(ticker);
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
