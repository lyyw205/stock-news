/**
 * Formatters index
 * Exports all content formatters
 */

import { formatForTelegram } from './telegram-formatter';
import { formatForTwitter } from './twitter-formatter';
import { formatForThreads } from './threads-formatter';
import { formatForToss } from './toss-formatter';
import { NewsContent, FormattedContent, SocialPlatform } from '../types';

// Export individual formatters
export { formatForTelegram } from './telegram-formatter';
export { formatForTwitter } from './twitter-formatter';
export { formatForThreads } from './threads-formatter';
export { formatForToss } from './toss-formatter';

// Formatter function type
export type FormatterFunction = (news: NewsContent) => FormattedContent;

// Map of platform to formatter
export const formatters: Record<SocialPlatform, FormatterFunction> = {
  telegram: formatForTelegram,
  twitter: formatForTwitter,
  threads: formatForThreads,
  toss: formatForToss,
};

// Get formatter by platform
export function getFormatter(platform: SocialPlatform): FormatterFunction {
  const formatter = formatters[platform];
  if (!formatter) {
    throw new Error(`Unknown platform: ${platform}`);
  }
  return formatter;
}

// Format news for specific platform
export function formatNews(
  news: NewsContent,
  platform: SocialPlatform
): FormattedContent {
  const formatter = getFormatter(platform);
  return formatter(news);
}
