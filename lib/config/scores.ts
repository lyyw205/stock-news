/**
 * Score Configuration
 * Centralized score thresholds and auto-publish settings
 */

/**
 * Core scoring thresholds
 */
export const SCORE_CONFIG = {
  /** Minimum score for auto-publishing to all social media platforms */
  AUTO_PUBLISH_THRESHOLD: 80,

  /** Grade thresholds */
  GRADE_S_THRESHOLD: 80,
  GRADE_A_THRESHOLD: 65,
  GRADE_B_THRESHOLD: 50,
  GRADE_C_THRESHOLD: 35,

  /** Platforms to auto-publish to when score ≥ AUTO_PUBLISH_THRESHOLD */
  AUTO_PUBLISH_PLATFORMS: ['telegram', 'twitter', 'threads', 'toss'] as const,
} as const;

/**
 * Check if an article should be auto-published based on its total score
 */
export function shouldAutoPublish(totalScore: number): boolean {
  return totalScore >= SCORE_CONFIG.AUTO_PUBLISH_THRESHOLD;
}

/**
 * Score grade type
 */
export type ScoreGrade = 'S' | 'A' | 'B' | 'C' | 'D';

/**
 * Get score grade based on total score
 */
export function getScoreGrade(totalScore: number): ScoreGrade {
  if (totalScore >= SCORE_CONFIG.GRADE_S_THRESHOLD) return 'S';
  if (totalScore >= SCORE_CONFIG.GRADE_A_THRESHOLD) return 'A';
  if (totalScore >= SCORE_CONFIG.GRADE_B_THRESHOLD) return 'B';
  if (totalScore >= SCORE_CONFIG.GRADE_C_THRESHOLD) return 'C';
  return 'D';
}

export const GRADE_LABELS: Record<ScoreGrade, string> = {
  S: '핵심 뉴스',
  A: '중요 뉴스',
  B: '일반 뉴스',
  C: '참고 뉴스',
  D: '낮은 중요도',
};

export const GRADE_COLORS: Record<ScoreGrade, string> = {
  S: '#7C3AED', // purple-600
  A: '#2563EB', // blue-600
  B: '#059669', // emerald-600
  C: '#D97706', // amber-600
  D: '#6B7280', // gray-500
};
