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
 * Related stock impact type
 */
export type StockImpactType = 'beneficiary' | 'victim' | 'competitor' | 'supply_chain';

export const STOCK_IMPACT_LABELS: Record<StockImpactType, string> = {
  beneficiary: '수혜주',
  victim: '피해주',
  competitor: '경쟁사',
  supply_chain: '공급망',
};

export const STOCK_IMPACT_COLORS: Record<StockImpactType, { bg: string; text: string }> = {
  beneficiary: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  victim: { bg: 'bg-red-50', text: 'text-red-700' },
  competitor: { bg: 'bg-blue-50', text: 'text-blue-700' },
  supply_chain: { bg: 'bg-purple-50', text: 'text-purple-700' },
};

/**
 * Related stock
 */
export interface RelatedStock {
  name: string;
  ticker?: string;
  impactType: StockImpactType;
  reasoning: string;
  expectedImpact: 'positive' | 'negative' | 'mixed';
}

/**
 * Timeline catalyst urgency
 */
export type CatalystUrgency = 'imminent' | 'near_term' | 'medium_term';

export const CATALYST_URGENCY_LABELS: Record<CatalystUrgency, string> = {
  imminent: '임박',
  near_term: '단기',
  medium_term: '중기',
};

export const CATALYST_URGENCY_COLORS: Record<CatalystUrgency, { dot: string; line: string; text: string }> = {
  imminent: { dot: 'bg-red-500', line: 'border-red-300', text: 'text-red-600' },
  near_term: { dot: 'bg-orange-500', line: 'border-orange-300', text: 'text-orange-600' },
  medium_term: { dot: 'bg-blue-500', line: 'border-blue-300', text: 'text-blue-600' },
};

/**
 * Timeline catalyst event
 */
export interface CatalystEvent {
  event: string;
  expectedDate: string;
  urgency: CatalystUrgency;
  potentialImpact: string;
}

/**
 * Key term definition
 */
export interface KeyTerm {
  term: string;
  definition: string;
}

/**
 * Investor checklist item
 */
export type CheckImportance = 'high' | 'medium' | 'low';

export const CHECK_IMPORTANCE_COLORS: Record<CheckImportance, { bg: string; text: string; dot: string }> = {
  high: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  low: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
};

export interface InvestorCheckItem {
  item: string;
  importance: CheckImportance;
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
  newsBackground: string | null;
  relatedStocks: RelatedStock[];
  timelineCatalysts: CatalystEvent[];
  keyTerms: KeyTerm[];
  investorChecklist: InvestorCheckItem[];
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
  newsBackground: string;
  relatedStocks: RelatedStock[];
  timelineCatalysts: CatalystEvent[];
  keyTerms: KeyTerm[];
  investorChecklist: InvestorCheckItem[];
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
