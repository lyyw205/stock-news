/**
 * Unit tests for score types and utilities
 */

import {
  calculateTotalScore,
  getScoreGrade,
  VisualScores,
  HiddenScores,
  Sentiment,
  SENTIMENT_LABELS,
  GRADE_LABELS,
} from '@/lib/types/scores';

describe('Score Types and Utilities', () => {
  describe('calculateTotalScore', () => {
    it('should calculate total score with all max values', () => {
      const visual: VisualScores = {
        impact: 10,
        urgency: 10,
        certainty: 10,
        durability: 10,
        attention: 10,
        relevance: 10,
      };

      const hidden: HiddenScores = {
        sectorImpact: 10,
        institutionalInterest: 10,
        volatility: 10,
      };

      const sentiment: Sentiment = 2;

      const score = calculateTotalScore(visual, hidden, sentiment);

      expect(score).toBe(100);
    });

    it('should calculate total score with all min values', () => {
      const visual: VisualScores = {
        impact: 1,
        urgency: 1,
        certainty: 1,
        durability: 1,
        attention: 1,
        relevance: 1,
      };

      const hidden: HiddenScores = {
        sectorImpact: 1,
        institutionalInterest: 1,
        volatility: 1,
      };

      const sentiment: Sentiment = -2;

      const score = calculateTotalScore(visual, hidden, sentiment);

      // Should be low but at least 1
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThan(20);
    });

    it('should calculate moderate score with average values', () => {
      const visual: VisualScores = {
        impact: 5,
        urgency: 5,
        certainty: 5,
        durability: 5,
        attention: 5,
        relevance: 5,
      };

      const hidden: HiddenScores = {
        sectorImpact: 5,
        institutionalInterest: 5,
        volatility: 5,
      };

      const sentiment: Sentiment = 0;

      const score = calculateTotalScore(visual, hidden, sentiment);

      expect(score).toBeGreaterThan(40);
      expect(score).toBeLessThan(60);
    });

    it('should weight sentiment correctly', () => {
      const visual: VisualScores = {
        impact: 5,
        urgency: 5,
        certainty: 5,
        durability: 5,
        attention: 5,
        relevance: 5,
      };

      const hidden: HiddenScores = {
        sectorImpact: 5,
        institutionalInterest: 5,
        volatility: 5,
      };

      const positiveScore = calculateTotalScore(visual, hidden, 2);
      const negativeScore = calculateTotalScore(visual, hidden, -2);

      // Positive sentiment should result in higher score
      expect(positiveScore).toBeGreaterThan(negativeScore);
    });
  });

  describe('getScoreGrade', () => {
    it('should return S for scores >= 80', () => {
      expect(getScoreGrade(80)).toBe('S');
      expect(getScoreGrade(90)).toBe('S');
      expect(getScoreGrade(100)).toBe('S');
    });

    it('should return A for scores 65-79', () => {
      expect(getScoreGrade(65)).toBe('A');
      expect(getScoreGrade(70)).toBe('A');
      expect(getScoreGrade(79)).toBe('A');
    });

    it('should return B for scores 50-64', () => {
      expect(getScoreGrade(50)).toBe('B');
      expect(getScoreGrade(57)).toBe('B');
      expect(getScoreGrade(64)).toBe('B');
    });

    it('should return C for scores 35-49', () => {
      expect(getScoreGrade(35)).toBe('C');
      expect(getScoreGrade(42)).toBe('C');
      expect(getScoreGrade(49)).toBe('C');
    });

    it('should return D for scores < 35', () => {
      expect(getScoreGrade(1)).toBe('D');
      expect(getScoreGrade(20)).toBe('D');
      expect(getScoreGrade(34)).toBe('D');
    });
  });

  describe('SENTIMENT_LABELS', () => {
    it('should have labels for all sentiment values', () => {
      expect(SENTIMENT_LABELS[-2]).toBe('매우 악재');
      expect(SENTIMENT_LABELS[-1]).toBe('악재');
      expect(SENTIMENT_LABELS[0]).toBe('중립');
      expect(SENTIMENT_LABELS[1]).toBe('호재');
      expect(SENTIMENT_LABELS[2]).toBe('매우 호재');
    });
  });

  describe('GRADE_LABELS', () => {
    it('should have labels for all grades', () => {
      expect(GRADE_LABELS.S).toBe('핵심 뉴스');
      expect(GRADE_LABELS.A).toBe('중요 뉴스');
      expect(GRADE_LABELS.B).toBe('일반 뉴스');
      expect(GRADE_LABELS.C).toBe('참고 뉴스');
      expect(GRADE_LABELS.D).toBe('낮은 중요도');
    });
  });
});
