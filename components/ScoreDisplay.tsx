'use client';

import { type Sentiment } from '@/lib/types/scores';

// 점수에 따른 등급
type ScoreGrade = 'S' | 'A' | 'B' | 'C' | 'D';

function getScoreGrade(totalScore: number): ScoreGrade {
  if (totalScore >= 80) return 'S';
  if (totalScore >= 65) return 'A';
  if (totalScore >= 50) return 'B';
  if (totalScore >= 35) return 'C';
  return 'D';
}

const GRADE_COLORS: Record<ScoreGrade, { bg: string; text: string }> = {
  S: { bg: 'bg-purple-100', text: 'text-purple-700' },
  A: { bg: 'bg-blue-100', text: 'text-blue-700' },
  B: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  C: { bg: 'bg-amber-100', text: 'text-amber-700' },
  D: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

const SENTIMENT_EMOJIS: Record<number, string> = {
  [-2]: '🔴',
  [-1]: '🟠',
  [0]: '🟡',
  [1]: '🟢',
  [2]: '🔵',
};

const SENTIMENT_LABELS: Record<number, string> = {
  [-2]: '매우 악재',
  [-1]: '악재',
  [0]: '중립',
  [1]: '호재',
  [2]: '매우 호재',
};

interface ScoreDisplayProps {
  totalScore: number;
  sentiment: Sentiment | number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export default function ScoreDisplay({
  totalScore,
  sentiment,
  showLabel = false,
  size = 'sm',
}: ScoreDisplayProps) {
  const grade = getScoreGrade(totalScore);
  const colors = GRADE_COLORS[grade];
  const emoji = SENTIMENT_EMOJIS[sentiment] || '🟡';
  const sentimentLabel = SENTIMENT_LABELS[sentiment] || '중립';

  const sizeClasses = size === 'sm'
    ? 'text-xs px-1.5 py-0.5'
    : 'text-sm px-2 py-1';

  return (
    <div className="flex items-center gap-1.5">
      {/* 등급 배지 */}
      <span
        className={`inline-flex items-center font-bold rounded ${colors.bg} ${colors.text} ${sizeClasses}`}
      >
        {grade}
      </span>

      {/* 종합 점수 */}
      <span className={`font-semibold text-gray-700 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        {totalScore}점
      </span>

      {/* 투자 심리 이모지 */}
      <span className={size === 'sm' ? 'text-sm' : 'text-base'} title={sentimentLabel}>
        {emoji}
      </span>

      {/* 레이블 (옵션) */}
      {showLabel && (
        <span className="text-xs text-gray-500 ml-1">{sentimentLabel}</span>
      )}
    </div>
  );
}
