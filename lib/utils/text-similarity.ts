/**
 * 텍스트 유사도 계산 유틸리티
 */

/**
 * 자카드 유사도 계산 (0-1 사이 값, 1에 가까울수록 유사)
 * 두 텍스트를 단어 집합으로 변환하여 교집합/합집합 비율 계산
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  // 텍스트를 소문자로 변환하고 단어로 분리
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  // 교집합 계산
  const intersection = new Set([...words1].filter((word) => words2.has(word)));

  // 합집합 계산
  const union = new Set([...words1, ...words2]);

  // 자카드 유사도 = 교집합 / 합집합
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * 레벤슈타인 거리 계산 (편집 거리)
 * 두 문자열 간의 차이를 나타내는 값 (낮을수록 유사)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // DP 테이블 초기화
  const dp: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // 첫 행과 열 초기화
  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;

  // DP 테이블 채우기
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // 삭제
          dp[i][j - 1] + 1, // 삽입
          dp[i - 1][j - 1] + 1, // 교체
        );
      }
    }
  }

  return dp[len1][len2];
}

/**
 * 레벤슈타인 거리를 0-1 사이 유사도로 변환
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

/**
 * 종합 텍스트 유사도 계산
 * 자카드와 레벤슈타인을 조합하여 더 정확한 유사도 계산
 */
export function textSimilarity(text1: string, text2: string): number {
  const jaccard = jaccardSimilarity(text1, text2);
  const levenshtein = levenshteinSimilarity(text1, text2);

  // 가중 평균: 자카드 70%, 레벤슈타인 30%
  return jaccard * 0.7 + levenshtein * 0.3;
}

/**
 * 뉴스 기사 유사도 계산
 * 제목과 설명을 모두 고려하여 중복 여부 판단
 */
export interface NewsItem {
  title: string;
  description?: string;
}

export function newsSimilarity(news1: NewsItem, news2: NewsItem): number {
  // 제목 유사도 (가중치 80%)
  const titleSim = textSimilarity(news1.title, news2.title);

  // 설명이 있으면 설명 유사도도 계산 (가중치 20%)
  let descSim = 0;
  if (news1.description && news2.description) {
    descSim = textSimilarity(news1.description, news2.description);
  }

  // 설명이 없으면 제목만으로 판단
  return news1.description && news2.description
    ? titleSim * 0.8 + descSim * 0.2
    : titleSim;
}

/**
 * 중복 뉴스 판단 임계값
 * 유사도가 이 값 이상이면 중복으로 간주
 */
export const DUPLICATE_THRESHOLD = 0.75; // 75% 이상 유사하면 중복

/**
 * 유사 뉴스 판단 임계값
 * 완전 중복은 아니지만 관련된 뉴스
 */
export const SIMILAR_THRESHOLD = 0.6; // 60% 이상 유사하면 관련 뉴스
