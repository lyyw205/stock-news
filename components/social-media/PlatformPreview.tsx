'use client';

import { useMemo } from 'react';
import { NewsArticle } from '@/components/NewsCard';
import { SocialPlatform } from '@/lib/social-media/types';

interface PlatformPreviewProps {
  article: NewsArticle;
  platforms: SocialPlatform[];
}

interface PlatformStyle {
  name: string;
  icon: string;
  bgColor: string;
  textColor: string;
  maxLength: number;
}

const PLATFORM_STYLES: Record<SocialPlatform, PlatformStyle> = {
  telegram: {
    name: '텔레그램',
    icon: '✈️',
    bgColor: 'bg-[#0088cc]',
    textColor: 'text-white',
    maxLength: 4096,
  },
  twitter: {
    name: '트위터 (X)',
    icon: '🐦',
    bgColor: 'bg-black',
    textColor: 'text-white',
    maxLength: 280,
  },
  threads: {
    name: 'Threads',
    icon: '🧵',
    bgColor: 'bg-gradient-to-br from-purple-600 to-pink-500',
    textColor: 'text-white',
    maxLength: 500,
  },
  toss: {
    name: '토스 주식',
    icon: '💰',
    bgColor: 'bg-[#0064FF]',
    textColor: 'text-white',
    maxLength: 1000,
  },
};

function formatDate(dateString: string, style: 'full' | 'short' | 'toss'): string {
  const date = new Date(dateString);

  if (style === 'full') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
  }

  if (style === 'short') {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  }

  // toss style
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}.${day} ${hours}:${minutes}`;
}

function TelegramPreview({ article }: { article: NewsArticle }) {
  const content = `🏢 **${article.ticker}** 관련 뉴스

📰 **${article.title}**

${article.summary}

📅 ${formatDate(article.pubDate, 'full')}

🔗 전체 기사 읽기

#${article.ticker} #한국주식 #뉴스`;

  return (
    <div className="bg-[#17212b] rounded-lg p-4 font-sans">
      <div className="text-[#e4ecf2] text-sm whitespace-pre-wrap leading-relaxed">
        {content.split('\n').map((line, i) => (
          <div key={i}>
            {line.split('**').map((part, j) =>
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-[#6c7883]">
        Telegram 채널
      </div>
    </div>
  );
}

function TwitterPreview({ article }: { article: NewsArticle }) {
  const hashtags = `#${article.ticker} #한국주식 #뉴스`;
  const url = article.url;

  // Calculate available space
  const reserved = hashtags.length + url.length + 6;
  const available = 280 - reserved;

  let content = article.title;
  if (content.length > available - 3) {
    content = content.substring(0, available - 3) + '...';
  }

  const fullText = `${content}

${url}

${hashtags}`;

  return (
    <div className="bg-black rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">
          📊
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className="text-white font-bold text-sm">한국주식뉴스</span>
            <span className="text-gray-500 text-sm">@kr_stock_news · 방금</span>
          </div>
          <div className="text-white text-sm mt-1 whitespace-pre-wrap">
            {fullText}
          </div>
          <div className="flex items-center gap-6 mt-3 text-gray-500 text-xs">
            <span>💬 0</span>
            <span>🔄 0</span>
            <span>❤️ 0</span>
            <span>📊 0</span>
          </div>
        </div>
      </div>
      <div className="mt-2 text-right text-xs text-gray-600">
        {fullText.length}/280자
      </div>
    </div>
  );
}

function ThreadsPreview({ article }: { article: NewsArticle }) {
  const separator = '━━━━━━━━━━';

  const content = `📈 ${article.ticker} 관련 뉴스

${separator}

${article.title}

${article.summary}

${separator}

📅 ${formatDate(article.pubDate, 'short')}
🔗 ${article.url}

#${article.ticker} #한국주식 #뉴스`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-sm">
          📊
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className="text-black font-semibold text-sm">korean_stock_news</span>
            <span className="text-gray-400 text-sm">· 방금</span>
          </div>
          <div className="text-black text-sm mt-2 whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
          <div className="flex items-center gap-4 mt-3 text-gray-400 text-sm">
            <span>❤️</span>
            <span>💬</span>
            <span>🔄</span>
            <span>📤</span>
          </div>
        </div>
      </div>
      <div className="mt-2 text-right text-xs text-gray-400">
        {content.length}/500자
      </div>
    </div>
  );
}

function TossPreview({ article }: { article: NewsArticle }) {
  const content = `[${article.ticker}] ${article.title}

${article.summary}

📅 ${formatDate(article.pubDate, 'toss')}
🔗 ${article.url}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#0064FF] flex items-center justify-center">
          <span className="text-white text-xs font-bold">주식</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">한국주식뉴스</div>
          <div className="text-xs text-gray-400">방금 전</div>
        </div>
      </div>
      <div className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
        <button className="flex items-center gap-1 text-gray-500 text-sm">
          👍 좋아요
        </button>
        <button className="flex items-center gap-1 text-gray-500 text-sm">
          💬 댓글
        </button>
        <button className="flex items-center gap-1 text-gray-500 text-sm">
          📤 공유
        </button>
      </div>
    </div>
  );
}

export default function PlatformPreview({ article, platforms }: PlatformPreviewProps) {
  if (platforms.length === 0) {
    return null;
  }

  const renderPreview = (platform: SocialPlatform) => {
    switch (platform) {
      case 'telegram':
        return <TelegramPreview article={article} />;
      case 'twitter':
        return <TwitterPreview article={article} />;
      case 'threads':
        return <ThreadsPreview article={article} />;
      case 'toss':
        return <TossPreview article={article} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">게시 미리보기</h3>
      <div className="space-y-4">
        {platforms.map((platform) => {
          const style = PLATFORM_STYLES[platform];
          return (
            <div key={platform} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{style.icon}</span>
                <span className="text-sm font-medium text-gray-700">{style.name}</span>
                <span className="text-xs text-gray-400">최대 {style.maxLength}자</span>
              </div>
              {renderPreview(platform)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
