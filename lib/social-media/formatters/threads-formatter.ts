/**
 * Threads Content Formatter
 * Formats news content for Instagram Threads with visual separators
 */

import { NewsContent, FormattedContent } from '../types';

const MAX_LENGTH = 500;

export function formatForThreads(news: NewsContent): FormattedContent {
  const { ticker, title, summary, url, pubDate } = news;

  // Format date
  const formattedDate = formatDate(pubDate);

  // Build Threads post with visual separators
  const separator = '━━━━━━━━━━';

  let text = `📈 ${ticker} 관련 뉴스

${separator}

${title}

${summary}

${separator}

📅 ${formattedDate}
🔗 ${url}

#${ticker} #한국주식 #뉴스`;

  // Truncate if needed
  if (text.length > MAX_LENGTH) {
    // Try to fit without summary
    const withoutSummary = `📈 ${ticker} 관련 뉴스

${separator}

${title}

${separator}

📅 ${formattedDate}
🔗 ${url}

#${ticker} #한국주식`;

    if (withoutSummary.length <= MAX_LENGTH) {
      text = withoutSummary;
    } else {
      // Truncate title
      const maxTitleLength = MAX_LENGTH - (withoutSummary.length - title.length) - 3;
      const truncatedTitle = title.substring(0, maxTitleLength) + '...';
      text = withoutSummary.replace(title, truncatedTitle);
    }
  }

  return {
    platform: 'threads',
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

  return `${month}/${day} ${hours}:${minutes}`;
}
