/**
 * 뉴스 중복 제거 서비스
 */

import {
  newsSimilarity,
  DUPLICATE_THRESHOLD,
  type NewsItem,
} from '@/lib/utils/text-similarity';

export interface NewsArticleForDedup {
  id?: string;
  url: string;
  title: string;
  description: string;
  pub_date: string;
  ticker: string;
  source_count?: number; // 동일 뉴스 출처 수
}

export interface DuplicateGroup {
  primary: NewsArticleForDedup; // 대표 기사 (가장 신뢰도 높은 것)
  duplicates: NewsArticleForDedup[]; // 중복 기사들
  sourceCount: number; // 총 출처 수
  avgSimilarity: number; // 평균 유사도
}

/**
 * 중복 뉴스 그룹핑
 * 유사한 뉴스끼리 묶고, 각 그룹의 대표 기사를 선정
 */
export function groupDuplicateNews(
  articles: NewsArticleForDedup[],
): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < articles.length; i++) {
    const article1 = articles[i];
    const key1 = article1.url;

    // 이미 처리된 기사는 스킵
    if (processed.has(key1)) continue;

    // 새 그룹 생성
    const group: DuplicateGroup = {
      primary: article1,
      duplicates: [],
      sourceCount: 1,
      avgSimilarity: 1,
    };

    const similarities: number[] = [1]; // 자기 자신은 1

    // 나머지 기사들과 비교
    for (let j = i + 1; j < articles.length; j++) {
      const article2 = articles[j];
      const key2 = article2.url;

      // 이미 처리된 기사는 스킵
      if (processed.has(key2)) continue;

      // 같은 티커의 뉴스만 비교
      if (article1.ticker !== article2.ticker) continue;

      // 유사도 계산
      const similarity = newsSimilarity(
        { title: article1.title, description: article1.description },
        { title: article2.title, description: article2.description },
      );

      // 중복으로 판단되면 그룹에 추가
      if (similarity >= DUPLICATE_THRESHOLD) {
        group.duplicates.push(article2);
        similarities.push(similarity);
        processed.add(key2);
      }
    }

    // 중복이 있으면 대표 기사 선정
    if (group.duplicates.length > 0) {
      // 출처 수 계산
      group.sourceCount = 1 + group.duplicates.length;

      // 평균 유사도 계산
      group.avgSimilarity =
        similarities.reduce((a, b) => a + b, 0) / similarities.length;

      // 대표 기사 선정: 가장 긴 제목/설명을 가진 것 (정보가 가장 많은 것)
      const allArticles = [article1, ...group.duplicates];
      group.primary = allArticles.reduce((prev, curr) => {
        const prevLen = prev.title.length + (prev.description?.length || 0);
        const currLen = curr.title.length + (curr.description?.length || 0);
        return currLen > prevLen ? curr : prev;
      });
    }

    groups.push(group);
    processed.add(key1);
  }

  return groups;
}

/**
 * 중복 제거된 뉴스 목록 반환
 * 각 그룹의 대표 기사만 반환하되, source_count 정보 포함
 */
export function deduplicateNews(
  articles: NewsArticleForDedup[],
): NewsArticleForDedup[] {
  const groups = groupDuplicateNews(articles);

  return groups.map((group) => ({
    ...group.primary,
    source_count: group.sourceCount,
  }));
}

/**
 * 신뢰도 점수 계산
 * 출처 수가 많을수록 신뢰도가 높음
 */
export function calculateCredibility(sourceCount: number): number {
  // 출처 1개: 0.5
  // 출처 2개: 0.7
  // 출처 3개: 0.85
  // 출처 4개 이상: 0.95
  if (sourceCount >= 4) return 0.95;
  if (sourceCount === 3) return 0.85;
  if (sourceCount === 2) return 0.7;
  return 0.5;
}

/**
 * DB에서 기존 뉴스와 비교하여 중복 여부 확인
 */
export async function findExistingDuplicate(
  newArticle: NewsArticleForDedup,
  existingArticles: NewsArticleForDedup[],
): Promise<NewsArticleForDedup | null> {
  // 같은 티커의 최근 뉴스만 비교 (7일 이내)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentArticles = existingArticles.filter((article) => {
    return (
      article.ticker === newArticle.ticker &&
      new Date(article.pub_date) >= sevenDaysAgo
    );
  });

  // 유사도 계산하여 중복 찾기
  for (const existing of recentArticles) {
    const similarity = newsSimilarity(
      { title: newArticle.title, description: newArticle.description },
      { title: existing.title, description: existing.description },
    );

    if (similarity >= DUPLICATE_THRESHOLD) {
      return existing;
    }
  }

  return null;
}
