'use client';

import { useState } from 'react';
import UnifiedNewsCard, { UnifiedArticle } from './UnifiedNewsCard';
import { SocialPlatform } from '@/lib/social-media/types';

type CategoryFilter = 'all' | 'stock' | 'crypto';

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'stock', label: '주식' },
  { id: 'crypto', label: '암호화폐' },
];

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
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Filter by category
  const filteredArticles =
    categoryFilter === 'all'
      ? articles
      : articles.filter((a) => (a.category || 'stock') === categoryFilter);

  // Separate articles by auto-publish status
  const autoPublishedArticles = filteredArticles.filter((a) => a.autoPublished);
  const manualArticles = filteredArticles.filter((a) => !a.autoPublished);

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
      {/* Category Filter Tabs */}
      <div className="flex gap-2">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              categoryFilter === tab.id
                ? tab.id === 'crypto'
                  ? 'bg-violet-600 text-white'
                  : tab.id === 'stock'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-80">
              ({tab.id === 'all'
                ? articles.length
                : articles.filter((a) => (a.category || 'stock') === tab.id).length})
            </span>
          </button>
        ))}
      </div>

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
      {filteredArticles.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            {categoryFilter === 'all'
              ? '표시할 뉴스가 없습니다.'
              : categoryFilter === 'crypto'
                ? '암호화폐 뉴스가 없습니다.'
                : '주식 뉴스가 없습니다.'}
          </p>
        </div>
      )}
    </div>
  );
}
