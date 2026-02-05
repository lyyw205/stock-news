/**
 * News Score Types
 * 뉴스 분석 점수 관련 타입 정의
 */

/**
 * 육각 그래프 표시용 시각적 점수 (1-10)
 */
export interface VisualScores {
  /** 영향력: 회사 실적에 미치는 영향 규모 */
  impact: number;
  /** 긴급성: 주가 반영 속도 (1=장기, 10=즉시) */
  urgency: number;
  /** 확실성: 정보 신뢰도 (1=루머, 10=공시) */
  certainty: number;
  /** 지속성: 효과 지속 기간 (1=일회성, 10=구조적) */
  durability: number;
  /** 관심도: 투자자/미디어 예상 관심 */
  attention: number;
  /** 연관성: 현재 시장 테마 관련성 */
  relevance: number;
}

/**
 * 점수 계산에만 사용되는 숨겨진 요소 (1-10)
 */
export interface HiddenScores {
  /** 섹터 영향: 업종 전체 영향 여부 (1=종목만, 10=업종전체) */
  sectorImpact: number;
  /** 기관 관심도: 외국인/기관 관심 예상 */
  institutionalInterest: number;
  /** 변동성 예측: 예상 주가 변동폭 (1=미미, 10=급등락) */
  volatility: number;
}

/**
 * 투자 심리 (호재/악재)
 */
export type Sentiment = -2 | -1 | 0 | 1 | 2;

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  [-2]: '매우 악재',
  [-1]: '악재',
  [0]: '중립',
  [1]: '호재',
  [2]: '매우 호재',
};

export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  [-2]: '#DC2626', // red-600
  [-1]: '#F97316', // orange-500
  [0]: '#FBBF24', // yellow-400
  [1]: '#22C55E', // green-500
  [2]: '#3B82F6', // blue-500
};

export const SENTIMENT_EMOJIS: Record<Sentiment, string> = {
  [-2]: '🔴',
  [-1]: '🟠',
  [0]: '🟡',
  [1]: '🟢',
  [2]: '🔵',
};

/**
 * 전체 뉴스 점수
 */
export interface NewsScore {
  /** 시각화용 6축 점수 */
  visual: VisualScores;
  /** 계산용 숨겨진 점수 */
  hidden: HiddenScores;
  /** 투자 심리: -2(매우악재) ~ +2(매우호재) */
  sentiment: Sentiment;
  /** 종합 점수: 1-100 */
  totalScore: number;
  /** 점수 산출 근거 */
  reasoning?: string;
}

/**
 * AI 응답에서 파싱된 결과
 */
export interface SummaryWithScores {
  summary: string;
  scores: NewsScore;
}

/**
 * 종합 점수 계산 함수
 * 시각적 점수 + 숨겨진 점수 가중 평균
 */
export function calculateTotalScore(
  visual: VisualScores,
  hidden: HiddenScores,
  sentiment: Sentiment
): number {
  // 시각적 점수 가중치 (합계 60%)
  const visualWeights = {
    impact: 0.15,      // 15%
    urgency: 0.10,     // 10%
    certainty: 0.12,   // 12%
    durability: 0.08,  // 8%
    attention: 0.08,   // 8%
    relevance: 0.07,   // 7%
  };

  // 숨겨진 점수 가중치 (합계 30%)
  const hiddenWeights = {
    sectorImpact: 0.10,         // 10%
    institutionalInterest: 0.12, // 12%
    volatility: 0.08,           // 8%
  };

  // 심리 가중치 (10%)
  const sentimentWeight = 0.10;

  // 시각적 점수 계산 (1-10 → 0-10)
  const visualScore =
    visual.impact * visualWeights.impact +
    visual.urgency * visualWeights.urgency +
    visual.certainty * visualWeights.certainty +
    visual.durability * visualWeights.durability +
    visual.attention * visualWeights.attention +
    visual.relevance * visualWeights.relevance;

  // 숨겨진 점수 계산
  const hiddenScore =
    hidden.sectorImpact * hiddenWeights.sectorImpact +
    hidden.institutionalInterest * hiddenWeights.institutionalInterest +
    hidden.volatility * hiddenWeights.volatility;

  // 심리 점수 계산 (-2~+2 → 0~10)
  const sentimentScore = ((sentiment + 2) / 4) * 10 * sentimentWeight;

  // 총점 계산 (0-10 스케일을 1-100으로 변환)
  const rawScore = (visualScore + hiddenScore + sentimentScore) * 10;

  // 1-100 범위로 클램핑
  return Math.max(1, Math.min(100, Math.round(rawScore)));
}

/**
 * Score grades and labels
 * Import from centralized config
 */
export {
  type ScoreGrade,
  getScoreGrade,
  GRADE_LABELS,
  GRADE_COLORS,
} from '../config/scores';

/**
 * 점수 축 라벨 (육각 그래프용)
 */
export const VISUAL_SCORE_LABELS: Record<keyof VisualScores, string> = {
  impact: '영향력',
  urgency: '긴급성',
  certainty: '확실성',
  durability: '지속성',
  attention: '관심도',
  relevance: '연관성',
};
