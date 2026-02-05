/**
 * Telegram Content Formatter
 * Formats news content for Telegram with Markdown and emojis
 */

import { NewsContent, FormattedContent } from '../types';

export function formatForTelegram(news: NewsContent): FormattedContent {
  const { ticker, title, summary, url, pubDate } = news;

  // Format date in Korean style
  const formattedDate = formatDate(pubDate);

  // Build Telegram message with Markdown formatting
  const text = `🏢 **${ticker}** 관련 뉴스

📰 **${title}**

${summary}

📅 ${formattedDate}

🔗 [전체 기사 읽기](${url})

#${ticker} #한국주식 #뉴스`;

  return {
    platform: 'telegram',
    text,
    metadata: {
      characterCount: text.length,
    },
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
}
