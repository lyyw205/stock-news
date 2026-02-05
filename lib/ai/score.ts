/**
 * Score-Only News Analysis
 * Scores news articles without generating summaries (token optimization)
 */

import { generateContent } from './gemini';
import { formatScoreOnlyPrompt } from './prompts';
import {
  NewsScore,
  VisualScores,
  HiddenScores,
  Sentiment,
  calculateTotalScore,
} from '../types/scores';

export interface ScoreOnlyResult {
  scores: NewsScore;
}

/**
 * Score news article without generating summary
 * This is much more token-efficient than summarizeNewsWithScores
 */
export async function scoreNewsOnly(
  title: string,
  description: string,
): Promise<ScoreOnlyResult> {
  try {
    const prompt = formatScoreOnlyPrompt(title, description);
    const response = await generateContent(prompt);

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and extract scores
    const rawScores = parsed.scores;
    if (!rawScores) {
      throw new Error('No scores in response');
    }

    // Build visual scores with validation
    const visual: VisualScores = {
      impact: clampScore(rawScores.impact),
      urgency: clampScore(rawScores.urgency),
      certainty: clampScore(rawScores.certainty),
      durability: clampScore(rawScores.durability),
      attention: clampScore(rawScores.attention),
      relevance: clampScore(rawScores.relevance),
    };

    // Build hidden scores with validation
    const hidden: HiddenScores = {
      sectorImpact: clampScore(rawScores.sectorImpact),
      institutionalInterest: clampScore(rawScores.institutionalInterest),
      volatility: clampScore(rawScores.volatility),
    };

    // Validate sentiment
    const sentiment = clampSentiment(rawScores.sentiment);

    // Calculate total score
    const totalScore = calculateTotalScore(visual, hidden, sentiment);

    const scores: NewsScore = {
      visual,
      hidden,
      sentiment,
      totalScore,
      reasoning: parsed.reasoning || undefined,
    };

    return { scores };
  } catch (error) {
    console.error('Error scoring news:', error);

    // Fallback: default scores
    const defaultScores: NewsScore = {
      visual: {
        impact: 5,
        urgency: 5,
        certainty: 5,
        durability: 5,
        attention: 5,
        relevance: 5,
      },
      hidden: {
        sectorImpact: 5,
        institutionalInterest: 5,
        volatility: 5,
      },
      sentiment: 0 as Sentiment,
      totalScore: 50,
      reasoning: '점수 산출 실패로 기본값 적용',
    };

    return {
      scores: defaultScores,
    };
  }
}

/**
 * Clamp score to 1-10 range
 */
function clampScore(value: any): number {
  const num = Number(value) || 5;
  return Math.max(1, Math.min(10, Math.round(num)));
}

/**
 * Clamp sentiment to -2 to +2 range
 */
function clampSentiment(value: any): Sentiment {
  const num = Number(value) || 0;
  return Math.max(-2, Math.min(2, Math.round(num))) as Sentiment;
}
