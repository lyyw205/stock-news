/**
 * Analysis Report Types
 * 고득점 뉴스 상세 AI 분석 리포트 관련 타입
 */

export type GenerationType = 'auto' | 'manual';

export type OverallAssessment = 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';

export const ASSESSMENT_LABELS: Record<OverallAssessment, string> = {
  strong_bullish: '강한 호재',
  bullish: '호재',
  neutral: '중립',
  bearish: '악재',
  strong_bearish: '강한 악재',
};

export const ASSESSMENT_COLORS: Record<OverallAssessment, string> = {
  strong_bullish: '#3B82F6', // blue-500
  bullish: '#22C55E',        // green-500
  neutral: '#FBBF24',        // yellow-400
  bearish: '#F97316',        // orange-500
  strong_bearish: '#DC2626', // red-600
};

export const ASSESSMENT_EMOJIS: Record<OverallAssessment, string> = {
  strong_bullish: '🔵',
  bullish: '🟢',
  neutral: '🟡',
  bearish: '🟠',
  strong_bearish: '🔴',
};

export type Severity = 'high' | 'medium' | 'low';
export type Potential = 'high' | 'medium' | 'low';

export const SEVERITY_LABELS: Record<Severity, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

export const POTENTIAL_LABELS: Record<Potential, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

/**
 * Bullish/Bearish factor
 */
export interface Factor {
  factor: string;
  reasoning: string;
  confidence: number; // 0.0 - 1.0
}

/**
 * Risk factor
 */
export interface RiskFactor {
  factor: string;
  severity: Severity;
  description: string;
}

/**
 * Opportunity factor
 */
export interface OpportunityFactor {
  factor: string;
  potential: Potential;
  description: string;
}

/**
 * Price impact analysis
 */
export interface PriceImpact {
  short: string;  // 1 week
  medium: string; // 1-3 months
  long: string;   // 6+ months
  summary: string;
}

/**
 * Full analysis report
 */
export interface AnalysisReport {
  id: string;
  articleId: string;
  summaryId: string;
  generationType: GenerationType;
  coreSummary: string;
  bullishFactors: Factor[];
  bearishFactors: Factor[];
  overallAssessment: OverallAssessment;
  priceImpact: PriceImpact;
  riskFactors: RiskFactor[];
  opportunityFactors: OpportunityFactor[];
  processingTimeMs?: number;
  createdAt: string;
}

/**
 * AI response format for report generation
 */
export interface AIReportResponse {
  coreSummary: string;
  bullishFactors: Factor[];
  bearishFactors: Factor[];
  overallAssessment: OverallAssessment;
  priceImpact: PriceImpact;
  riskFactors: RiskFactor[];
  opportunityFactors: OpportunityFactor[];
}

/**
 * Visual scores for radar chart
 */
export interface VisualScores {
  impact: number;
  urgency: number;
  certainty: number;
  durability: number;
  attention: number;
  relevance: number;
}

/**
 * Hidden scores for calculation
 */
export interface HiddenScores {
  sectorImpact: number;
  institutionalInterest: number;
  volatility: number;
}

/**
 * Report with article info for display
 */
export interface ReportWithArticle extends AnalysisReport {
  article: {
    ticker: string;
    title: string;
    url: string;
    pubDate: string;
  };
  summary: {
    summaryText: string | null;
    totalScore: number;
    sentiment: number;
  };
  scores: {
    visual: VisualScores;
    hidden: HiddenScores;
  };
}
