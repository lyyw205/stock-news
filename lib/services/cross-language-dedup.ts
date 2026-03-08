/**
 * 크로스 언어 중복 제거 (한국어 ↔ 영어)
 * Gemini AI를 사용하여 서로 다른 언어의 뉴스가 같은 사건을 다루는지 판별
 */

import { generateContent } from '@/lib/ai/gemini';

const CROSS_LANGUAGE_DEDUP_PROMPT = `당신은 뉴스 중복 판별 전문가입니다.

아래 두 뉴스 기사가 동일한 사건/이슈를 다루고 있는지 판단하세요.
언어가 다를 수 있습니다 (한국어, 영어).

## 기사 A
제목: {titleA}
내용: {descriptionA}

## 기사 B
제목: {titleB}
내용: {descriptionB}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "isDuplicate": true 또는 false,
  "confidence": 0.0에서 1.0 사이의 숫자,
  "reasoning": "판단 이유 한 문장"
}`;

export interface CrossLanguageDedupResult {
  isDuplicate: boolean;
  confidence: number;
  reasoning: string;
}

/**
 * 두 기사가 크로스 언어 중복인지 AI로 판별
 */
export async function checkCrossLanguageDuplicate(
  titleA: string,
  descriptionA: string,
  titleB: string,
  descriptionB: string,
): Promise<CrossLanguageDedupResult> {
  try {
    const prompt = CROSS_LANGUAGE_DEDUP_PROMPT
      .replace('{titleA}', titleA)
      .replace('{descriptionA}', descriptionA)
      .replace('{titleB}', titleB)
      .replace('{descriptionB}', descriptionB);

    const response = await generateContent(prompt, 1); // 1 retry only for speed
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return { isDuplicate: false, confidence: 0, reasoning: 'JSON 파싱 실패' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      isDuplicate: !!parsed.isDuplicate,
      confidence: Number(parsed.confidence) || 0,
      reasoning: parsed.reasoning || '',
    };
  } catch (error) {
    console.error('Cross-language dedup check failed:', error);
    return { isDuplicate: false, confidence: 0, reasoning: '판별 실패' };
  }
}

/**
 * 언어가 다른 기사인지 간단히 판별
 * (한글 포함 여부로 판단)
 */
function isKorean(text: string): boolean {
  return /[가-힣]/.test(text);
}

/**
 * 두 기사의 언어가 다른지 확인
 */
export function isDifferentLanguage(textA: string, textB: string): boolean {
  return isKorean(textA) !== isKorean(textB);
}
