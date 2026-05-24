/**
 * Attention Scoring System
 * 
 * Calculates attention scores for memory entries based on:
 * - Cost score: Higher cost interactions get higher scores
 * - Frequency score: More frequently accessed items get higher scores
 * - Recency score: Recent items get higher scores
 */

import type { CostRecord } from '../ai/cost-tracker/types';

const COST_WEIGHT = 50;
const FREQUENCY_WEIGHT = 30;
const RECENCY_WEIGHT = 20;

const COST_NORMALIZER = 0.1;     // 0.1 USD = max cost score
const FREQUENCY_NORMALIZER = 10; // 10 accesses = max frequency score
const RECENCY_7_DAYS = 7 * 24 * 60 * 60 * 1000;
const RECENCY_1_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculate attention score for a memory entry
 * Score = cost_score + frequency_score + recency_score (0-100)
 */
export function getAttentionScore(
  costUSD: number,
  accessCount: number,
  createdAt: number,
  now: number = Date.now()
): number {
  const costScore = calculateCostScore(costUSD);
  const frequencyScore = calculateFrequencyScore(accessCount);
  const recencyScore = calculateRecencyScore(createdAt, now);
  
  return Math.min(100, Math.round(costScore + frequencyScore + recencyScore));
}

/**
 * Cost-based score: higher cost = higher attention
 * Math.min(costUSD / 0.1, 1) * 50
 */
export function calculateCostScore(costUSD: number): number {
  return Math.min(costUSD / COST_NORMALIZER, 1) * COST_WEIGHT;
}

/**
 * Frequency-based score: more accesses = higher attention
 * Math.min(accessCount / 10, 1) * 30
 */
export function calculateFrequencyScore(accessCount: number): number {
  return Math.min(accessCount / FREQUENCY_NORMALIZER, 1) * FREQUENCY_WEIGHT;
}

/**
 * Recency-based score: newer = higher attention
 * > 7 days: 20, > 1 day: 10, < 1 day: 5
 */
export function calculateRecencyScore(createdAt: number, now: number = Date.now()): number {
  const ageMs = now - createdAt;
  
  if (ageMs > RECENCY_7_DAYS) {
    return 20;
  } else if (ageMs > RECENCY_1_DAY) {
    return 10;
  } else {
    return 5;
  }
}

/**
 * Calculate attention score from a CostRecord
 */
export function scoreFromCostRecord(record: CostRecord): number {
  return getAttentionScore(
    record.costUSD,
    1, // First access
    record.timestamp
  );
}

/**
 * Check if a cost record is "high cost" (should trigger L0 creation)
 */
export function isHighCostRecord(record: CostRecord, threshold: number = 0.05): boolean {
  return record.costUSD > threshold;
}

/**
 * Score breakdown for debugging/analysis
 */
export interface ScoreBreakdown {
  costScore: number;
  frequencyScore: number;
  recencyScore: number;
  total: number;
}

export function getScoreBreakdown(
  costUSD: number,
  accessCount: number,
  createdAt: number,
  now: number = Date.now()
): ScoreBreakdown {
  return {
    costScore: calculateCostScore(costUSD),
    frequencyScore: calculateFrequencyScore(accessCount),
    recencyScore: calculateRecencyScore(createdAt, now),
    total: getAttentionScore(costUSD, accessCount, createdAt, now),
  };
}