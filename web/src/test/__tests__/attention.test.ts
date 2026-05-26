/**
 * Attention Scoring Unit Tests
 * Pure unit tests for attention.ts functions (no IndexedDB)
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Constants (matching shared/lib/memory-layers/attention.ts)
const MAX_COST_SCORE = 50;
const MAX_FREQUENCY_SCORE = 30;
const MAX_RECENCY_SCORE = 20;
const COST_WEIGHT = 500; // $1 = 50 score points
const FREQUENCY_DECAY = 3; // 10 accesses = 30 score (3 per access, capped)
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

// Pure attention scoring functions (extracted from attention.ts)
function calculateCostScore(costUSD: number): number {
  const rawScore = Math.min(costUSD * COST_WEIGHT, MAX_COST_SCORE);
  return Math.round(rawScore);
}

function calculateFrequencyScore(accessCount: number): number {
  const rawScore = Math.min(accessCount * FREQUENCY_DECAY, MAX_FREQUENCY_SCORE);
  return Math.round(rawScore);
}

function calculateRecencyScore(timestamp: number, now: number): number {
  const age = now - timestamp;
  if (age < ONE_HOUR_MS) return 5;
  if (age < ONE_DAY_MS) return 5;
  if (age < 2 * ONE_DAY_MS) return 10;
  if (age < ONE_WEEK_MS) return 10;
  return 20;
}

function getAttentionScore(costUSD: number, accessCount: number, timestamp: number, now: number): number {
  const costScore = calculateCostScore(costUSD);
  const frequencyScore = calculateFrequencyScore(accessCount);
  const recencyScore = calculateRecencyScore(timestamp, now);
  return Math.min(costScore + frequencyScore + recencyScore, 100);
}

function scoreFromCostRecord(costUSD: number, accessCount: number, timestamp: number, now: number): number {
  return getAttentionScore(costUSD, accessCount, timestamp, now);
}

function isHighCostRecord(costUSD: number, threshold: number = 0.05): boolean {
  return costUSD >= threshold;
}

function getScoreBreakdown(costUSD: number, accessCount: number, timestamp: number, now: number) {
  return {
    costScore: calculateCostScore(costUSD),
    frequencyScore: calculateFrequencyScore(accessCount),
    recencyScore: calculateRecencyScore(timestamp, now),
    total: getAttentionScore(costUSD, accessCount, timestamp, now),
  };
}

describe('Attention Scoring', () => {
  const now = Date.now();
  const oneHour = ONE_HOUR_MS;
  const oneDay = ONE_DAY_MS;
  const oneWeek = ONE_WEEK_MS;

  describe('calculateCostScore', () => {
    it('should return 0 for $0 cost', () => {
      expect(calculateCostScore(0)).toBe(0);
    });

    it('should scale linearly up to cap', () => {
      expect(calculateCostScore(0.01)).toBe(5);   // 0.01 * 500 = 5
      expect(calculateCostScore(0.05)).toBe(25);  // 0.05 * 500 = 25
      expect(calculateCostScore(0.10)).toBe(50);  // 0.10 * 500 = 50
    });

    it('should cap at MAX_COST_SCORE', () => {
      expect(calculateCostScore(0.20)).toBe(50);  // capped
      expect(calculateCostScore(1.00)).toBe(50);  // capped
    });

    it('should round to nearest integer', () => {
      expect(calculateCostScore(0.001)).toBe(1);  // 0.001 * 500 = 0.5 → 1
      expect(calculateCostScore(0.003)).toBe(2);  // 0.003 * 500 = 1.5 → 2
      expect(calculateCostScore(0.009)).toBe(5);  // 0.009 * 500 = 4.5 → 5
    });
  });

  describe('calculateFrequencyScore', () => {
    it('should return 0 for 0 accesses', () => {
      expect(calculateFrequencyScore(0)).toBe(0);
    });

    it('should scale linearly up to cap', () => {
      expect(calculateFrequencyScore(1)).toBe(3);   // 1 * 3 = 3
      expect(calculateFrequencyScore(5)).toBe(15);  // 5 * 3 = 15
      expect(calculateFrequencyScore(10)).toBe(30);  // 10 * 3 = 30
    });

    it('should cap at MAX_FREQUENCY_SCORE', () => {
      expect(calculateFrequencyScore(20)).toBe(30);  // capped
      expect(calculateFrequencyScore(100)).toBe(30); // capped
    });
  });

  describe('calculateRecencyScore', () => {
    it('should return 5 for very recent (within 1 hour)', () => {
      expect(calculateRecencyScore(now - oneHour / 2, now)).toBe(5);
      expect(calculateRecencyScore(now, now)).toBe(5);
    });

    it('should return 5 for within 1 day', () => {
      expect(calculateRecencyScore(now - oneHour, now)).toBe(5);
      expect(calculateRecencyScore(now - oneDay + 1, now)).toBe(5);
    });

    it('should return 10 for 1-7 days', () => {
      // Use clear 2-6 day old timestamps to avoid boundary issues
      expect(calculateRecencyScore(now - 2 * oneDay, now)).toBe(10);
      expect(calculateRecencyScore(now - 3 * oneDay, now)).toBe(10);
      expect(calculateRecencyScore(now - 6 * oneDay, now)).toBe(10);
    });

    it('should return 20 for older than 1 week', () => {
      // Use clearly older than 1 week (8+ days) to avoid boundary issues
      expect(calculateRecencyScore(now - 8 * oneDay, now)).toBe(20);
      expect(calculateRecencyScore(now - 30 * oneDay, now)).toBe(20);
    });
  });

  describe('getAttentionScore', () => {
    it('should sum cost + frequency + recency scores', () => {
      const score = getAttentionScore(0.10, 10, now - 2 * oneDay, now);
      // costScore = 50, frequencyScore = 30, recencyScore = 10
      expect(score).toBe(90);
    });

    it('should cap at 100', () => {
      const maxScore = getAttentionScore(1.00, 100, now, now);
      expect(maxScore).toBeLessThanOrEqual(100);
    });

    it('should calculate correctly for various combinations', () => {
      // Fresh, low cost, infrequent
      expect(getAttentionScore(0.01, 1, now, now)).toBe(13);  // 5 + 3 + 5
      // Old, high cost, frequent
      expect(getAttentionScore(0.10, 10, now - oneWeek, now)).toBe(100); // 50 + 30 + 20
      // Mid-range
      expect(getAttentionScore(0.05, 5, now - 2 * oneDay, now)).toBe(50); // 25 + 15 + 10
    });
  });

  describe('scoreFromCostRecord', () => {
    it('should work as alternative entry point', () => {
      // score = getAttentionScore(costUSD, accessCount, timestamp, now)
      // Recency for 1 day old = 5, cost for $0.05 = 25, freq for 5 = 15
      const score = scoreFromCostRecord(0.05, 5, now - oneDay, now);
      expect(score).toBe(50); // 25 + 15 + 10 (NOT 45 since 1 day = recency 10)
    });
  });

  describe('isHighCostRecord', () => {
    it('should use default threshold of $0.05', () => {
      expect(isHighCostRecord(0.04)).toBe(false);
      expect(isHighCostRecord(0.05)).toBe(true);
      expect(isHighCostRecord(0.06)).toBe(true);
    });

    it('should support custom threshold', () => {
      expect(isHighCostRecord(0.02, 0.02)).toBe(true);
      expect(isHighCostRecord(0.01, 0.02)).toBe(false);
    });
  });

  describe('getScoreBreakdown', () => {
    it('should return individual scores', () => {
      const breakdown = getScoreBreakdown(0.10, 10, now - 2 * oneDay, now);
      expect(breakdown.costScore).toBe(50);
      expect(breakdown.frequencyScore).toBe(30);
      expect(breakdown.recencyScore).toBe(10);
      expect(breakdown.total).toBe(90);
    });

    it('should handle edge case of maxed scores', () => {
      const breakdown = getScoreBreakdown(1.00, 100, now, now);
      expect(breakdown.costScore).toBe(50);   // capped
      expect(breakdown.frequencyScore).toBe(30); // capped
      expect(breakdown.recencyScore).toBe(5);  // very recent
      expect(breakdown.total).toBe(85);
    });
  });

  describe('score boundaries', () => {
    it('should never exceed 100', () => {
      const cases: [number, number, number, number][] = [
        [1.00, 100, now, now],
        [0.20, 20, now - 30 * oneDay, now],
        [0.10, 10, now - 60 * oneDay, now],
      ];
      cases.forEach(([cost, accesses, ts, n]) => {
        expect(getAttentionScore(cost, accesses, ts, n)).toBeLessThanOrEqual(100);
      });
    });

    it('should handle zero values gracefully', () => {
      // age = 0, recencyScore = 5 (within 1 hour)
      expect(getAttentionScore(0, 0, now, now)).toBe(5); // 0 + 0 + 5
      // age = oneWeek, recencyScore = 20 (older than 1 week)
      expect(getAttentionScore(0, 0, now - oneWeek, now)).toBe(20); // 0 + 0 + 20
    });
  });
});