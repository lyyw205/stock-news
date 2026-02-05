'use client';

import { useState, useEffect, useMemo } from 'react';
import { NewsArticle } from '@/components/NewsCard';
import { SocialPlatform } from '@/lib/social-media/types';
import NewsSelectionList from '@/components/social-media/NewsSelectionList';
import PlatformSelector from '@/components/social-media/PlatformSelector';
import PublishButton from '@/components/social-media/PublishButton';
import PlatformPreview from '@/components/social-media/PlatformPreview';

export default function AdminDashboard() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<any>(null);

  // Get selected article for preview (first selected)
  const previewArticle = useMemo(() => {
    if (selectedNewsIds.length === 0) return null;
    return news.find((n) => n.id === selectedNewsIds[0]) || null;
  }, [news, selectedNewsIds]);

  // Load useful news on mount
  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/news?limit=50&useful=true');

      if (!response.ok) {
        throw new Error('Failed to load news');
      }

      const data = await response.json();
      setNews(data.news || []);
    } catch (err) {
      console.error('Error loading news:', err);
      setError(err instanceof Error ? err.message : 'Failed to load news');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (selectedNewsIds.length === 0 || selectedPlatforms.length === 0) {
      return;
    }

    setPublishResult(null);
    setError(null);

    try {
      const response = await fetch('/api/social-media/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleIds: selectedNewsIds,
          platforms: selectedPlatforms,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish');
      }

      setPublishResult(data);

      // Clear selections on success
      setSelectedNewsIds([]);
      setSelectedPlatforms([]);

      // Show success message
      alert(
        `게시 완료!\n\n` +
          `성공: ${data.totalSuccessCount}개\n` +
          `실패: ${data.totalFailureCount}개`
      );

      // Reload news to update social_posted status
      await loadNews();
    } catch (err) {
      console.error('Error publishing:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish');
      alert(`게시 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                소셜 미디어 게시 관리
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                유용한 뉴스를 선택하여 소셜 미디어에 게시하세요
              </p>
            </div>
            <button
              onClick={loadNews}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {isLoading ? '로딩 중...' : '새로고침'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-semibold">오류:</span>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">뉴스를 불러오는 중...</p>
          </div>
        ) : (
          /* Grid Layout */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: News Selection (2/3 width) */}
            <div className="lg:col-span-2">
              <NewsSelectionList
                news={news}
                selectedIds={selectedNewsIds}
                onSelectionChange={setSelectedNewsIds}
              />
            </div>

            {/* Right: Platform Selection and Publish (1/3 width) */}
            <div className="space-y-6">
              {/* Platform Selector */}
              <PlatformSelector
                selectedPlatforms={selectedPlatforms}
                onSelectionChange={setSelectedPlatforms}
              />

              {/* Publish Button */}
              <PublishButton
                selectedNewsIds={selectedNewsIds}
                selectedPlatforms={selectedPlatforms}
                onPublish={handlePublish}
              />

              {/* Result Summary */}
              {publishResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-800 mb-2">
                    게시 완료
                  </h3>
                  <div className="space-y-1 text-sm text-green-700">
                    <div>처리: {publishResult.processedArticles}개 뉴스</div>
                    <div>성공: {publishResult.totalSuccessCount}개</div>
                    <div>실패: {publishResult.totalFailureCount}개</div>
                  </div>
                </div>
              )}

              {/* Platform Preview */}
              {previewArticle && selectedPlatforms.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">
                      {selectedNewsIds.length > 1
                        ? `${selectedNewsIds.length}개 중 첫 번째 뉴스 미리보기`
                        : '선택한 뉴스 미리보기'}
                    </div>
                    <div className="text-sm font-medium text-gray-900 line-clamp-1">
                      {previewArticle.title}
                    </div>
                  </div>
                  <PlatformPreview
                    article={previewArticle}
                    platforms={selectedPlatforms}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8 text-center text-sm text-gray-500">
        <p>
          Mock 모드로 동작 중입니다. 실제 소셜 미디어에 게시되지 않습니다.
        </p>
      </footer>
    </div>
  );
}
