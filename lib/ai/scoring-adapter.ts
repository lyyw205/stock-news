/**
 * Scoring Adapter
 * Abstracts Gemini and Claude scoring behind a common interface.
 */

import { scoreNewsOnly, ScoreOnlyResult } from './score';
import { formatScoreOnlyPrompt } from './prompts';
import {
  VisualScores,
  HiddenScores,
  Sentiment,
  calculateTotalScore,
} from '../types/scores';

export type ScoringEngine = 'gemini' | 'claude';

function clampScore(value: unknown): number {
  const num = Number(value) || 5;
  return Math.max(1, Math.min(10, Math.round(num)));
}

function clampSentiment(value: unknown): Sentiment {
  const num = Number(value) || 0;
  return Math.max(-2, Math.min(2, Math.round(num))) as Sentiment;
}

async function scoreWithClaude(
  title: string,
  description: string,
  category?: 'stock' | 'crypto',
): Promise<ScoreOnlyResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY is not set; Claude scoring unavailable');
    return null;
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const prompt = formatScoreOnlyPrompt(title, description, category);

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('');

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('No JSON found in Claude response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const rawScores = parsed.scores;
    if (!rawScores) {
      console.warn('No scores in Claude response');
      return null;
    }

    const visual: VisualScores = {
      impact: clampScore(rawScores.impact),
      urgency: clampScore(rawScores.urgency),
      certainty: clampScore(rawScores.certainty),
      durability: clampScore(rawScores.durability),
      attention: clampScore(rawScores.attention),
      relevance: clampScore(rawScores.relevance),
    };

    const hidden: HiddenScores = {
      sectorImpact: clampScore(rawScores.sectorImpact),
      institutionalInterest: clampScore(rawScores.institutionalInterest),
      volatility: clampScore(rawScores.volatility),
    };

    const sentiment = clampSentiment(rawScores.sentiment);
    const totalScore = calculateTotalScore(visual, hidden, sentiment);

    return {
      scores: {
        visual,
        hidden,
        sentiment,
        totalScore,
        reasoning: parsed.reasoning || undefined,
      },
    };
  } catch (error) {
    console.error('Error scoring with Claude:', error);
    return null;
  }
}

export const scoringAdapter = {
  async score(
    title: string,
    description: string,
    category: 'stock' | 'crypto' | undefined,
    engine: ScoringEngine,
  ): Promise<ScoreOnlyResult | null> {
    if (engine === 'gemini') {
      try {
        return await scoreNewsOnly(title, description, category);
      } catch (error) {
        console.error('Error scoring with Gemini:', error);
        return null;
      }
    }

    return scoreWithClaude(title, description, category);
  },
};
