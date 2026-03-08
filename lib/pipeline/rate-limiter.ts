export interface RateLimiterConfig {
  rpm: number;
  concurrency?: number;
}

interface RateLimiter {
  acquire(): Promise<void>;
}

export function createRateLimiter(rpm: number): RateLimiter {
  const timestamps: number[] = [];
  const windowMs = 60_000;

  async function acquire(): Promise<void> {
    while (true) {
      const now = Date.now();
      // Remove timestamps outside the sliding window
      while (timestamps.length > 0 && timestamps[0] <= now - windowMs) {
        timestamps.shift();
      }

      if (timestamps.length < rpm) {
        timestamps.push(now);
        return;
      }

      // Calculate wait time: oldest timestamp + window - now
      const waitMs = timestamps[0] + windowMs - now + 1;
      await sleep(waitMs);
    }
  }

  return { acquire };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function rateLimitedBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  config: RateLimiterConfig,
): Promise<R[]> {
  const { rpm, concurrency = 1 } = config;
  const limiter = createRateLimiter(rpm);
  const results: R[] = new Array(items.length);

  let index = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = index++;
      if (i >= items.length) return;
      await limiter.acquire();
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  return results;
}
