'use client';

import { useState } from 'react';
import UnifiedNewsCard, { UnifiedArticle } from './UnifiedNewsCard';
import { SocialPlatform } from '@/lib/social-media/types';

interface UnifiedNewsListProps {
  articles: UnifiedArticle[];
  onSummarize: (articleId: string) => Promise<void>;
  onPublish: (articleId: string, platforms: SocialPlatform[]) => Promise<void>;
}

export default function UnifiedNewsList({
  articles,
  onSummarize,
  onPublish,
}: UnifiedNewsListProps) {
  const [generatingSummaries, setGeneratingSummaries] = useState<Set<string>>(new Set());

  // Separate articles by auto-publish status
  const autoPublishedArticles = articles.filter((a) => a.autoPublished);
  const manualArticles = articles.filter((a) => !a.autoPublished);

  const handleSummarize = async (articleId: string) => {
    setGeneratingSummaries((prev) => new Set(prev).add(articleId));
    try {
      await onSummarize(articleId);
    } finally {
      setGeneratingSummaries((prev) => {
        const next = new Set(prev);
        next.delete(articleId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Auto-Published Section */}
      {autoPublishedArticles.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-green-600">✓</span>
              자동 발행된 뉴스
              <span className="text-sm font-normal text-gray-500">
                (총점 80점 이상, {autoPublishedArticles.length}개)
              </span>
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              고품질 뉴스가 자동으로 모든 플랫폼에 발행되었습니다.
            </p>
          </div>
          <div className="space-y-4">
            {autoPublishedArticles.map((article) => (
              <UnifiedNewsCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}

      {/* Manual Selection Section */}
      {manualArticles.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-blue-600">✎</span>
              수동 선택 대기 뉴스
              <span className="text-sm font-normal text-gray-500">
                (총점 80점 미만, {manualArticles.length}개)
              </span>
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              아래 뉴스 중 발행할 뉴스를 선택하세요. 요약이 필요한 경우 자동 생성됩니다.
            </p>
          </div>
          <div className="space-y-4">
            {manualArticles.map((article) => (
              <UnifiedNewsCard
                key={article.id}
                article={article}
                onSummarize={handleSummarize}
                onPublish={onPublish}
                isGeneratingSummary={generatingSummaries.has(article.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {articles.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">표시할 뉴스가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
