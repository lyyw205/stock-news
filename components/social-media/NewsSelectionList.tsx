'use client';

import { useState } from 'react';
import { NewsArticle } from '@/components/NewsCard';

interface NewsSelectionListProps {
  news: NewsArticle[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export default function NewsSelectionList({
  news,
  selectedIds,
  onSelectionChange,
}: NewsSelectionListProps) {
  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === news.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(news.map((n) => n.id));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          유용한 뉴스 선택
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {selectedIds.length}/{news.length} 선택됨
          </span>
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {selectedIds.length === news.length ? '전체 해제' : '전체 선택'}
          </button>
        </div>
      </div>

      {/* News List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {news.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            유용한 뉴스가 없습니다.
          </div>
        ) : (
          news.map((article) => {
            const isSelected = selectedIds.includes(article.id);

            return (
              <div
                key={article.id}
                onClick={() => handleToggle(article.id)}
                className={`
                  p-3 rounded border cursor-pointer transition-all
                  ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(article.id)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Ticker and Date */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded">
                        {article.ticker}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(article.pubDate)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      {truncateText(article.title, 60)}
                    </h3>

                    {/* Summary */}
                    <p className="text-xs text-gray-600">
                      {truncateText(article.summary, 100)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
