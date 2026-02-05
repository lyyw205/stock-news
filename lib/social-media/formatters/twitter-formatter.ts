/**
 * Twitter Content Formatter
 * Formats news content for Twitter with 280 character limit and hashtags
 */

import { NewsContent, FormattedContent } from '../types';

const MAX_LENGTH = 280;

export function formatForTwitter(news: NewsContent): FormattedContent {
  const { ticker, title, summary, url } = news;

  // Generate hashtags
  const hashtags = [`#${ticker}`, '#한국주식', '#뉴스'];
  const hashtagText = hashtags.join(' ');

  // Calculate available space for content
  // Reserve space for: hashtags + 2 newlines + URL + some padding
  const reservedSpace = hashtagText.length + url.length + 4;
  const availableSpace = MAX_LENGTH - reservedSpace;

  // Try to fit title and summary
  let content = `${title}\n\n${summary}`;

  // Truncate if needed
  if (content.length > availableSpace) {
    // Try title only
    if (title.length <= availableSpace - 3) {
      content = title;
    } else {
      // Truncate title
      content = title.substring(0, availableSpace - 3) + '...';
    }
  }

  const text = `${content}\n\n${url}\n\n${hashtagText}`;

  // Final length check
  const truncated = text.length > MAX_LENGTH;
  const finalText = truncated ? text.substring(0, MAX_LENGTH) : text;

  return {
    platform: 'twitter',
    text: finalText,
    metadata: {
      hashtags,
      characterCount: finalText.length,
      truncated,
    },
  };
}
