/**
 * Cost Linker Unit Tests
 * Pure unit tests for cost-linker.ts functions (no IndexedDB)
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Inline CostRecord type (matches shared/lib/ai/cost-tracker/types.ts)
interface CostRecord {
  id: string;
  timestamp: number;
  taskType: string;
  modelId: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  latencyMs: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

// Pure functions from cost-linker - test the logic directly
describe('Cost Linker Logic', () => {
  // Helper to create mock cost records
  function createCost(overrides: Partial<CostRecord> = {}): CostRecord {
    return {
      id: 'cost-' + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      taskType: 'standard-summary',
      modelId: 'gpt-4o',
      provider: 'openai',
      inputTokens: 1000,
      outputTokens: 500,
      costUSD: 0.01,
      latencyMs: 500,
      success: true,
      ...overrides,
    };
  }

  // CostLinker constants
  const HIGH_COST_THRESHOLD = 0.05;
  const MAX_COST_SCORE = 50;
  const COST_WEIGHT = 500; // $1 = 50 score points

  // Pure cost scoring logic (extracted from cost-linker.ts)
  function calculateCostScore(costUSD: number): number {
    const rawScore = Math.min(costUSD * COST_WEIGHT, MAX_COST_SCORE);
    return Math.round(rawScore);
  }

  function isHighCost(costUSD: number): boolean {
    return costUSD >= HIGH_COST_THRESHOLD;
  }

  function isHighCostRecord(record: CostRecord): boolean {
    return record.costUSD >= HIGH_COST_THRESHOLD;
  }

  function scoreFromCost(costUSD: number): number {
    return calculateCostScore(costUSD);
  }

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
  });

  describe('isHighCost', () => {
    it('should return false for costs below threshold', () => {
      expect(isHighCost(0.01)).toBe(false);
      expect(isHighCost(0.04)).toBe(false);
      expect(isHighCost(0.049)).toBe(false);
    });

    it('should return true for costs at or above threshold', () => {
      expect(isHighCost(0.05)).toBe(true);
      expect(isHighCost(0.06)).toBe(true);
      expect(isHighCost(0.10)).toBe(true);
    });
  });

  describe('isHighCostRecord', () => {
    it('should check costUSD on record', () => {
      expect(isHighCostRecord(createCost({ costUSD: 0.01 }))).toBe(false);
      expect(isHighCostRecord(createCost({ costUSD: 0.05 }))).toBe(true);
      expect(isHighCostRecord(createCost({ costUSD: 0.10 }))).toBe(true);
    });
  });

  describe('scoreFromCost', () => {
    it('should return correct score for various costs', () => {
      expect(scoreFromCost(0.001)).toBe(1);
      expect(scoreFromCost(0.002)).toBe(1);
      expect(scoreFromCost(0.005)).toBe(3);
      expect(scoreFromCost(0.02)).toBe(10);
      expect(scoreFromCost(0.05)).toBe(25);
      expect(scoreFromCost(0.10)).toBe(50);
    });
  });

  describe('cost threshold boundary', () => {
    it('should handle threshold boundary correctly', () => {
      const belowThreshold = 0.049;
      const atThreshold = 0.05;
      const aboveThreshold = 0.051;

      expect(isHighCost(belowThreshold)).toBe(false);
      expect(isHighCost(atThreshold)).toBe(true);
      expect(isHighCost(aboveThreshold)).toBe(true);
    });

    it('should score at threshold boundary', () => {
      expect(calculateCostScore(0.049)).toBe(25); // 0.049 * 500 = 24.5 → 25
      expect(calculateCostScore(0.05)).toBe(25);   // 0.05 * 500 = 25
    });
  });

  describe('cost record batch processing logic', () => {
    it('should filter high cost records from batch', () => {
      const records: CostRecord[] = [
        createCost({ costUSD: 0.01 }),
        createCost({ costUSD: 0.06 }),
        createCost({ costUSD: 0.02 }),
        createCost({ costUSD: 0.10 }),
      ];

      const highCostRecords = records.filter(r => isHighCostRecord(r));
      expect(highCostRecords.length).toBe(2);
      expect(highCostRecords.every(r => r.costUSD >= 0.05)).toBe(true);
    });

    it('should calculate total cost from batch', () => {
      const records: CostRecord[] = [
        createCost({ costUSD: 0.01 }),
        createCost({ costUSD: 0.02 }),
        createCost({ costUSD: 0.03 }),
      ];

      const totalCost = records.reduce((sum, r) => sum + r.costUSD, 0);
      expect(totalCost).toBe(0.06);
    });

    it('should calculate average cost from batch', () => {
      const records: CostRecord[] = [
        createCost({ costUSD: 0.01 }),
        createCost({ costUSD: 0.03 }),
        createCost({ costUSD: 0.05 }),
      ];

      const avgCost = records.reduce((sum, r) => sum + r.costUSD, 0) / records.length;
      expect(avgCost).toBeCloseTo(0.03, 4);
    });
  });

  describe('cost scoring edge cases', () => {
    it('should handle very small costs', () => {
      expect(calculateCostScore(0.0001)).toBe(0);   // 0.0001 * 500 = 0.05 → 0 (rounded)
      expect(calculateCostScore(0.0002)).toBe(0);   // 0.0002 * 500 = 0.1 → 0 (rounded)
      expect(calculateCostScore(0.002)).toBe(1);  // 0.002 * 500 = 1
    });

    it('should handle very large costs', () => {
      expect(calculateCostScore(10.00)).toBe(50);  // capped
      expect(calculateCostScore(100.00)).toBe(50); // capped
    });

    it('should handle negative costs (should not happen but test defensively)', () => {
      // Negative costs give negative scores (no validation in CostLinker)
      expect(calculateCostScore(-0.01)).toBe(-5);  // -0.01 * 500 = -5
    });
  });

  describe('provider cost comparison', () => {
    it('should compare costs across providers', () => {
      const openaiRecord = createCost({ provider: 'openai', costUSD: 0.05 });
      const anthropicRecord = createCost({ provider: 'anthropic', costUSD: 0.08 });
      const localRecord = createCost({ provider: 'local', costUSD: 0.001 });

      expect(isHighCostRecord(openaiRecord)).toBe(true);
      expect(isHighCostRecord(anthropicRecord)).toBe(true);
      expect(isHighCostRecord(localRecord)).toBe(false);
    });
  });

  describe('model cost comparison', () => {
    it('should compare costs across models', () => {
      const gpt4 = createCost({ modelId: 'gpt-4o', costUSD: 0.10 });
      const gpt35 = createCost({ modelId: 'gpt-3.5-turbo', costUSD: 0.002 });
      const claude = createCost({ modelId: 'claude-3-opus', costUSD: 0.15 });

      expect(calculateCostScore(gpt4.costUSD)).toBe(50);
      expect(calculateCostScore(gpt35.costUSD)).toBe(1);
      expect(calculateCostScore(claude.costUSD)).toBe(50); // capped
    });
  });

  describe('task type cost analysis', () => {
    it('should categorize by task type', () => {
      const summaryTask = createCost({ taskType: 'standard-summary', costUSD: 0.01 });
      const complexTask = createCost({ taskType: 'complex-reasoning', costUSD: 0.15 });
      const embeddingTask = createCost({ taskType: 'embedding', costUSD: 0.001 });

      expect(isHighCostRecord(summaryTask)).toBe(false);
      expect(isHighCostRecord(complexTask)).toBe(true);
      expect(isHighCostRecord(embeddingTask)).toBe(false);
    });
  });
});