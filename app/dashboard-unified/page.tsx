'use client';

import { useState, useEffect } from 'react';
import UnifiedNewsList from '@/components/unified/UnifiedNewsList';
import { UnifiedArticle } from '@/components/unified/UnifiedNewsCard';
import { SocialPlatform } from '@/lib/social-media/types';
import { authenticatedFetch } from '@/lib/auth/authenticated-fetch';

export default function UnifiedDashboard() {
  const [articles, setArticles] = useState<UnifiedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [showAutoPublished, setShowAutoPublished] = useState(true);

  useEffect(() => {
    loadArticles();
  }, [minScore, showAutoPublished]);

  const loadArticles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        minScore: minScore.toString(),
        includeAutoPublished: showAutoPublished.toString(),
        limit: '100',
      });

      const response = await authenticatedFetch(`/api/news/unified?${params}`);

      if (!response.ok) {
        throw new Error('Failed to load articles');
      }

      const data = await response.json();
      setArticles(data.articles || []);
    } catch (err) {
      console.error('Error loading articles:', err);
      setError(err instanceof Error ? err.message : 'Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarize = async (articleId: string) => {
    try {
      const response = await authenticatedFetch('/api/summaries/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();

      // Update article with generated summary
      setArticles((prev) =>
        prev.map((article) =>
          article.id === articleId
            ? { ...article, summary: data.summary }
            : article
        )
      );
    } catch (err) {
      console.error('Error generating summary:', err);
      alert('요약 생성 실패: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handlePublish = async (articleId: string, platforms: SocialPlatform[]) => {
    try {
      const response = await authenticatedFetch('/api/social-media/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleIds: [articleId], platforms }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish');
      }

      const data = await response.json();

      // Update article status
      setArticles((prev) =>
        prev.map((article) =>
          article.id === articleId
            ? { ...article, socialPosted: true, socialPostedAt: new Date().toISOString() }
            : article
        )
      );

      alert(`발행 완료: ${data.totalSuccessCount}/${platforms.length} 플랫폼`);
    } catch (err) {
      console.error('Error publishing:', err);
      alert('발행 실패: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 통합 뉴스 대시보드</h1>
              <p className="text-gray-600 mt-1">
                자동 발행 및 수동 선택 뉴스를 한눈에 확인하세요
              </p>
            </div>
            <nav className="flex gap-3">
              <a
                href="/subscriptions"
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                구독 관리
              </a>
            </nav>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">최소 점수:</label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(parseInt(e.target.value))}
                className="w-32"
              />
              <span className="text-sm font-medium text-gray-900 w-12">{minScore}점</span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAutoPublished}
                onChange={(e) => setShowAutoPublished(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">자동 발행 뉴스 표시</span>
            </label>

            <button
              onClick={loadArticles}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              새로고침
            </button>

            {!isLoading && (
              <span className="text-sm text-gray-600">
                총 {articles.length}개 뉴스
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">뉴스 로딩 중...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">오류 발생</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={loadArticles}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <UnifiedNewsList
            articles={articles}
            onSummarize={handleSummarize}
            onPublish={handlePublish}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>주식/암호화폐 뉴스 요약 서비스 · AI 기반 뉴스 점수 평가 및 자동 발행</p>
          <p className="mt-1 text-xs text-gray-500">
            80점 이상: 자동 발행 | 80점 미만: 수동 선택
          </p>
        </div>
      </footer>
    </div>
  );
}
