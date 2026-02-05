'use client';

import { useState, useRef, useEffect } from 'react';
import ScoreDisplay from './ScoreDisplay';
import RadarChart from './RadarChart';
import { getCompanyName } from '@/lib/utils/ticker-names';

export interface NewsScores {
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
}

export interface NewsArticle {
  id: string;
  ticker: string;
  title: string;
  summary: string;
  url: string;
  pubDate: string;
  confidence?: number;
  scores?: NewsScores;
}

interface NewsCardProps {
  article: NewsArticle;
}

const SENTIMENT_LABELS: Record<number, string> = {
  [-2]: '매우 악재',
  [-1]: '악재',
  [0]: '중립',
  [1]: '호재',
  [2]: '매우 호재',
};

const GRADE_LABELS: Record<string, string> = {
  S: '핵심 뉴스',
  A: '중요 뉴스',
  B: '일반 뉴스',
  C: '참고 뉴스',
  D: '낮은 중요도',
};

function getScoreGrade(totalScore: number): string {
  if (totalScore >= 80) return 'S';
  if (totalScore >= 65) return 'A';
  if (totalScore >= 50) return 'B';
  if (totalScore >= 35) return 'C';
  return 'D';
}

export default function NewsCard({ article }: NewsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 팝오버 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        detailRef.current &&
        !detailRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDetail(false);
      }
    }

    if (showDetail) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDetail]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}분 전`;
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`;
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const truncateSummary = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-block px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded">
            {getCompanyName(article.ticker)}
          </span>
          <span className="text-sm text-gray-500">{formatDate(article.pubDate)}</span>
        </div>

        {/* Score Display */}
        {article.scores && (
          <ScoreDisplay
            totalScore={article.scores.totalScore}
            sentiment={article.scores.sentiment}
          />
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
        {article.title}
      </h3>

      {/* Summary */}
      <div className="mb-3">
        <p className="text-gray-700 text-sm leading-relaxed">
          {expanded ? article.summary : truncateSummary(article.summary)}
        </p>
        {article.summary.length > 120 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600 text-sm font-medium mt-1 hover:underline focus:outline-none"
          >
            {expanded ? '접기' : '더 보기'}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 text-sm font-medium hover:underline inline-flex items-center gap-1"
        >
          전체 기사 읽기
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>

        <div className="flex items-center gap-3">
          {article.confidence && !article.scores && (
            <span className="text-xs text-gray-400">
              신뢰도: {Math.round(article.confidence * 100)}%
            </span>
          )}

          {/* 상세보기 버튼 */}
          {article.scores && (
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={() => setShowDetail(!showDetail)}
                className="text-gray-500 hover:text-blue-600 text-sm font-medium inline-flex items-center gap-1 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                상세보기
              </button>

              {/* 상세보기 팝오버 */}
              {showDetail && (
                <div
                  ref={detailRef}
                  className="absolute right-0 bottom-full mb-2 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-72"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      뉴스 분석
                    </h4>
                    <button
                      onClick={() => setShowDetail(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* 레이더 차트 */}
                  <div className="flex justify-center mb-3">
                    <RadarChart scores={article.scores.visual} size={200} />
                  </div>

                  {/* 종합 정보 */}
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">종합 점수</span>
                      <span className="font-bold text-gray-900">
                        {article.scores.totalScore}점 ({getScoreGrade(article.scores.totalScore)}등급)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">등급 의미</span>
                      <span className="text-sm text-gray-700">
                        {GRADE_LABELS[getScoreGrade(article.scores.totalScore)]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">투자 심리</span>
                      <span className="text-sm text-gray-700">
                        {SENTIMENT_LABELS[article.scores.sentiment] || '중립'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
