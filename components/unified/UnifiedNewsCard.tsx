'use client';

import { useState } from 'react';
import Link from 'next/link';
import ScoreDisplay from '../ScoreDisplay';
import { getCompanyName } from '@/lib/utils/ticker-names';
import { SocialPlatform } from '@/lib/social-media/types';

export interface UnifiedArticle {
  id: string;
  summaryId: string;
  ticker: string;
  title: string;
  summary: string | null; // May be NULL
  url: string;
  pubDate: string;
  sourceCount: number;
  scores: {
    visual: {
      impact: number;
      urgency: number;
      certainty: number;
      durability: number;
      attention: number;
      relevance: number;
    };
    sentiment: number;
    totalScore: number;
  };
  autoPublished: boolean;
  autoPublishedAt: string | null;
  socialPosted: boolean;
  socialPostedAt: string | null;
  hasReport?: boolean;
}

interface UnifiedNewsCardProps {
  article: UnifiedArticle;
  onSummarize?: (articleId: string) => void;
  onPublish?: (articleId: string, platforms: SocialPlatform[]) => void;
  isGeneratingSummary?: boolean;
}

const PLATFORMS: { id: SocialPlatform; label: string }[] = [
  { id: 'telegram', label: '텔레그램' },
  { id: 'twitter', label: '트위터' },
  { id: 'threads', label: '쓰레드' },
  { id: 'toss', label: '토스' },
];

export default function UnifiedNewsCard({
  article,
  onSummarize,
  onPublish,
  isGeneratingSummary = false,
}: UnifiedNewsCardProps) {
  const [showPublishOptions, setShowPublishOptions] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  const handleSummarizeAndPublish = () => {
    if (!article.summary && onSummarize) {
      onSummarize(article.id);
    }
    setShowPublishOptions(true);
  };

  const handlePublish = () => {
    if (selectedPlatforms.length > 0 && onPublish) {
      onPublish(article.id, selectedPlatforms);
      setShowPublishOptions(false);
      setSelectedPlatforms([]);
    }
  };

  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* Auto-published badge */}
      {article.autoPublished && (
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ 자동 발행됨
          </span>
          {article.autoPublishedAt && (
            <span className="text-xs text-gray-500">
              {formatDate(article.autoPublishedAt)}
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-bold text-blue-600">{article.ticker}</span>
            <span className="text-gray-600">{getCompanyName(article.ticker)}</span>
            <span className="text-sm text-gray-500">{formatDate(article.pubDate)}</span>
            {article.sourceCount > 1 && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {article.sourceCount}개 출처
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{article.title}</h3>
        </div>
        <ScoreDisplay
          totalScore={article.scores.totalScore}
          sentiment={article.scores.sentiment}
        />
      </div>

      {/* Summary or Generate Button */}
      {article.summary ? (
        <p className="text-gray-700 leading-relaxed mb-4">{article.summary}</p>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 mb-2">요약이 아직 생성되지 않았습니다.</p>
          {isGeneratingSummary ? (
            <div className="text-sm text-blue-600">요약 생성 중...</div>
          ) : (
            <button
              onClick={handleSummarizeAndPublish}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              요약 생성 및 발행 →
            </button>
          )}
        </div>
      )}

      {/* Publish Options */}
      {!article.autoPublished && (
        <div className="border-t pt-4">
          {!showPublishOptions ? (
            <button
              onClick={handleSummarizeAndPublish}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {article.summary ? '소셜미디어 발행' : '요약 생성 및 발행'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`py-2 px-3 rounded-lg border transition-colors text-sm ${
                      selectedPlatforms.includes(platform.id)
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {platform.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePublish}
                  disabled={selectedPlatforms.length === 0}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  발행 ({selectedPlatforms.length})
                </button>
                <button
                  onClick={() => setShowPublishOptions(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Already posted indicator */}
      {article.socialPosted && !article.autoPublished && (
        <div className="mt-3 text-sm text-gray-500">
          소셜미디어 발행 완료 · {article.socialPostedAt && formatDate(article.socialPostedAt)}
        </div>
      )}

      {/* Links */}
      <div className="flex items-center gap-4 mt-2">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          원문 보기 →
        </a>

        {/* Report Link */}
        <Link
          href={`/reports/${article.id}`}
          className={`text-sm ${
            article.hasReport
              ? 'text-purple-600 hover:underline'
              : 'text-gray-500 hover:text-purple-600'
          }`}
        >
          {article.hasReport ? '상세 분석 보기 →' : '상세 분석 생성 →'}
        </Link>
      </div>
    </div>
  );
}
