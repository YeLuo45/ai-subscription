/**
 * Budget Controller
 * Manages budget limits and enforces fallback strategies
 */

import type { BudgetPolicy } from './types';
import { aggregateRecords } from '../cost-tracker/aggregator';
import { getRecordsByTimeRange } from '../cost-tracker/storage';

const DEFAULT_POLICY: BudgetPolicy = {
  dailyLimitUSD: 5.0,
  monthlyLimitUSD: 50.0,
  fallbackWhenExceeded: 'free-tier',
};

export class BudgetController {
  private policy: BudgetPolicy;
  private cachedDailyCost: number | null = null;
  private cachedMonthlyCost: number | null = null;
  private cacheTimestamp: number = 0;
  private cacheValidityMs: number = 60000; // 1 minute cache

  constructor(policy?: Partial<BudgetPolicy>) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
  }

  /**
   * Update budget policy
   */
  setPolicy(policy: Partial<BudgetPolicy>): void {
    this.policy = { ...this.policy, ...policy };
    this.invalidateCache();
  }

  /**
   * Get current policy
   */
  getPolicy(): BudgetPolicy {
    return { ...this.policy };
  }

  /**
   * Check if we should throttle based on current spending
   */
  async shouldThrottle(): Promise<{ throttle: boolean; reason?: string }> {
    const { dailyCost, monthlyCost } = await this.getCurrentSpending();

    if (dailyCost >= this.policy.dailyLimitUSD) {
      return {
        throttle: true,
        reason: `Daily budget exceeded: $${dailyCost.toFixed(4)} / $${this.policy.dailyLimitUSD}`,
      };
    }

    if (monthlyCost >= this.policy.monthlyLimitUSD) {
      return {
        throttle: true,
        reason: `Monthly budget exceeded: $${monthlyCost.toFixed(4)} / $${this.policy.monthlyLimitUSD}`,
      };
    }

    return { throttle: false };
  }

  /**
   * Get the fallback strategy when budget is exceeded
   */
  getFallbackStrategy(): 'free-tier' | 'local' | 'reject' {
    return this.policy.fallbackWhenExceeded;
  }

  /**
   * Get current spending totals
   */
  async getCurrentSpending(): Promise<{ dailyCost: number; monthlyCost: number }> {
    // Return cached values if still valid
    if (this.cachedDailyCost !== null &&
        this.cachedMonthlyCost !== null &&
        Date.now() - this.cacheTimestamp < this.cacheValidityMs) {
      return {
        dailyCost: this.cachedDailyCost,
        monthlyCost: this.cachedMonthlyCost,
      };
    }

    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartMs = monthStart.getTime();

    try {
      const [todayRecords, monthRecords] = await Promise.all([
        getRecordsByTimeRange(todayStartMs, now),
        getRecordsByTimeRange(monthStartMs, now),
      ]);

      const todaySummary = aggregateRecords(todayRecords);
      const monthSummary = aggregateRecords(monthRecords);

      this.cachedDailyCost = todaySummary.totalCost;
      this.cachedMonthlyCost = monthSummary.totalCost;
      this.cacheTimestamp = Date.now();

      return {
        dailyCost: this.cachedDailyCost,
        monthlyCost: this.cachedMonthlyCost,
      };
    } catch (error) {
      console.warn('[Budget Controller] Failed to get spending:', error);
      return { dailyCost: 0, monthlyCost: 0 };
    }
  }

  /**
   * Get spending as percentage of limits
   */
  async getSpendingPercent(): Promise<{ dailyPercent: number; monthlyPercent: number }> {
    const { dailyCost, monthlyCost } = await this.getCurrentSpending();

    return {
      dailyPercent: (dailyCost / this.policy.dailyLimitUSD) * 100,
      monthlyPercent: (monthlyCost / this.policy.monthlyLimitUSD) * 100,
    };
  }

  /**
   * Invalidate cache to force fresh lookup
   */
  invalidateCache(): void {
    this.cachedDailyCost = null;
    this.cachedMonthlyCost = null;
    this.cacheTimestamp = 0;
  }
}

// Singleton instance
let globalBudgetController: BudgetController | null = null;

export function getBudgetController(policy?: Partial<BudgetPolicy>): BudgetController {
  if (!globalBudgetController) {
    globalBudgetController = new BudgetController(policy);
  } else if (policy) {
    globalBudgetController.setPolicy(policy);
  }
  return globalBudgetController;
}
