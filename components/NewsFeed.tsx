'use client';

import { useState, useEffect } from 'react';
import NewsCard, { type NewsArticle } from './NewsCard';

interface NewsFeedProps {
  initialPage?: number;
  tickerFilter?: string;
}

type DateFilter = 'today' | 'week' | 'month' | 'all';

export default function NewsFeed({ initialPage = 1, tickerFilter }: NewsFeedProps) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [tickers, setTickers] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tickerFilter, dateFilter]);

  async function loadNews() {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (tickerFilter) {
        params.append('ticker', tickerFilter);
      }

      const response = await fetch(`/api/news?${params}`);
      const data = await response.json();

      if (response.ok) {
        // 날짜 필터링
        let filteredNews = data.news;
        if (dateFilter !== 'all') {
          const now = new Date();
          const filterDate = new Date();

          switch (dateFilter) {
            case 'today':
              filterDate.setHours(0, 0, 0, 0);
              break;
            case 'week':
              filterDate.setDate(now.getDate() - 7);
              break;
            case 'month':
              filterDate.setDate(now.getDate() - 30);
              break;
          }

          filteredNews = data.news.filter((article: NewsArticle) => {
            const articleDate = new Date(article.pubDate);
            return articleDate >= filterDate;
          });
        }

        setNews(filteredNews);
        setHasMore(data.hasMore);
        setTotal(dateFilter === 'all' ? data.total : filteredNews.length);
        setTickers(data.tickers || []);
      } else {
        setError(data.error || '뉴스를 불러오는데 실패했습니다');
      }
    } catch (err) {
      setError('뉴스를 불러오는데 실패했습니다');
      console.error('Error loading news:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleNextPage = () => {
    setPage((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 날짜별로 뉴스 그룹핑
  const groupNewsByDate = (articles: NewsArticle[]) => {
    const groups: Record<string, NewsArticle[]> = {};

    articles.forEach((article) => {
      const date = new Date(article.pubDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateKey: string;
      if (date >= today) {
        dateKey = '오늘';
      } else if (date >= yesterday) {
        dateKey = '어제';
      } else {
        dateKey = date.toLocaleDateString('ko-KR', {
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        });
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(article);
    });

    return groups;
  };

  // Loading state
  if (loading && news.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-20 bg-gray-200 rounded"></div>
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-1"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg
          className="w-12 h-12 text-red-400 mx-auto mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-red-800 mb-2">오류 발생</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadNews}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // Empty state - no subscriptions
  if (tickers.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <svg
          className="w-16 h-16 text-blue-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          구독 중인 종목이 없습니다
        </h3>
        <p className="text-gray-600 mb-6">
          종목을 구독하면 관련 뉴스를 여기서 볼 수 있습니다
        </p>
        <a
          href="/subscriptions"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          종목 구독하기
        </a>
      </div>
    );
  }

  // Empty state - no news
  if (news.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <svg
          className="w-16 h-16 text-gray-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          아직 뉴스가 없습니다
        </h3>
        <p className="text-gray-600">
          구독한 종목의 새로운 뉴스가 수집되면 여기에 표시됩니다
        </p>
      </div>
    );
  }

  // News list
  return (
    <div>
      {/* Date Filter */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-gray-600 font-medium">기간:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              dateFilter === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            오늘
          </button>
          <button
            onClick={() => setDateFilter('week')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              dateFilter === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            최근 7일
          </button>
          <button
            onClick={() => setDateFilter('month')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              dateFilter === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            최근 30일
          </button>
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              dateFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            전체
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 text-sm text-gray-600">
        총 <span className="font-semibold text-gray-900">{total}개</span>의 뉴스
        {tickerFilter && (
          <span>
            {' '}
            · 필터: <span className="font-semibold">{tickerFilter}</span>
          </span>
        )}
      </div>

      {/* News grid - grouped by date */}
      <div className="space-y-6 mb-6">
        {Object.entries(groupNewsByDate(news)).map(([date, articles]) => (
          <div key={date}>
            <h3 className="text-sm font-semibold text-gray-500 mb-3 pb-2 border-b border-gray-200">
              {date}
            </h3>
            <div className="space-y-4">
              {articles.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={handlePrevPage}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            이전
          </button>
          <span className="text-sm text-gray-600">페이지 {page}</span>
          <button
            onClick={handleNextPage}
            disabled={!hasMore}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
