/**
 * Toss Stock Content Formatter
 * Formats news content for Toss Stock community with concise style
 */

import { NewsContent, FormattedContent } from '../types';

const MAX_LENGTH = 1000;

export function formatForToss(news: NewsContent): FormattedContent {
  const { ticker, title, summary, url, pubDate } = news;

  // Format date in simple style
  const formattedDate = formatDate(pubDate);

  // Build Toss post with concise format
  let text = `[${ticker}] ${title}

${summary}

📅 ${formattedDate}
🔗 ${url}`;

  // Truncate if needed (though 1000 chars should be enough)
  if (text.length > MAX_LENGTH) {
    // Calculate how much to truncate from summary
    const overhead = text.length - MAX_LENGTH;
    const truncatedSummary = summary.substring(0, summary.length - overhead - 3) + '...';

    text = `[${ticker}] ${title}

${truncatedSummary}

📅 ${formattedDate}
🔗 ${url}`;
  }

  return {
    platform: 'toss',
    text,
    metadata: {
      characterCount: text.length,
      truncated: text.length >= MAX_LENGTH,
    },
  };
}

function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${month}.${day} ${hours}:${minutes}`;
}
