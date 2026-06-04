/**
 * BudgetController.test.ts — Pure unit tests for 7-tier budget control
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BudgetController,
  TIER_THRESHOLDS,
  TIER_DEGRADED_FEATURES,
  type BudgetTier,
  type BudgetLimit,
} from '../BudgetController';

describe('BudgetController — initialization', () => {
  it('initializes with default standard tier', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 10 });
    expect(ctrl.getCurrentTier()).toBe('standard');
    expect(ctrl.getLimit()).toEqual({ period: 'daily', maxUSD: 10 });
  });

  it('accepts initialTier argument', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 10 }, 'saver');
    expect(ctrl.getCurrentTier()).toBe('saver');
  });

  it('throws on negative maxUSD', () => {
    expect(() => new BudgetController({ period: 'daily', maxUSD: -1 })).toThrow('maxUSD must be >= 0');
  });

  it('throws on Infinity maxUSD is OK (means unlimited)', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: Infinity });
    expect(ctrl.getCurrentTier()).toBe('unlimited');
  });

  it('exposes state snapshot via getState', () => {
    const ctrl = new BudgetController({ period: 'monthly', maxUSD: 100 });
    const state = ctrl.getState();
    expect(state.tier).toBe('standard');
    expect(state.spentUSD).toBe(0);
    expect(state.limitUSD).toBe(100);
    expect(state.manualOverride).toBe(false);
  });
});

describe('BudgetController — canAfford decisions', () => {
  let ctrl: BudgetController;

  beforeEach(() => {
    ctrl = new BudgetController({ period: 'daily', maxUSD: 10 });
  });

  it('allows cost when within budget', () => {
    const decision = ctrl.canAfford(2);
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('Within budget');
    expect(decision.remainingUSD).toBe(8);
  });

  it('blocks cost exceeding remaining budget', () => {
    ctrl.recordSpending(8);
    const decision = ctrl.canAfford(5);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('exceeds remaining');
    expect(decision.remainingUSD).toBe(2);
  });

  it('throws on negative estimated cost', () => {
    expect(() => ctrl.canAfford(-1)).toThrow('estimatedCost must be >= 0');
  });

  it('blocks all costs when tier is "off"', () => {
    ctrl.setManualTier('off');
    const decision = ctrl.canAfford(0.001);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('"off"');
  });

  it('allows all costs when tier is "unlimited"', () => {
    ctrl.setManualTier('unlimited');
    const decision = ctrl.canAfford(9999);
    expect(decision.allowed).toBe(true);
    expect(decision.remainingUSD).toBe(Infinity);
  });
});

describe('BudgetController — recordSpending and auto-degradation', () => {
  it('does not auto-degrade below 50% of limit', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 });
    expect(ctrl.recordSpending(40)).toBe('standard');
    expect(ctrl.getCurrentTier()).toBe('standard');
  });

  it('degrades to saver at 50%', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 });
    expect(ctrl.recordSpending(50)).toBe('saver');
  });

  it('degrades to budget at 70%', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 });
    expect(ctrl.recordSpending(70)).toBe('budget');
  });

  it('degrades to minimal at 85%', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 });
    expect(ctrl.recordSpending(85)).toBe('minimal');
  });

  it('degrades to emergency at 95%', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 });
    expect(ctrl.recordSpending(95)).toBe('emergency');
  });

  it('degrades to off at 100%', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 });
    expect(ctrl.recordSpending(100)).toBe('off');
  });

  it('accumulates spending across multiple recordSpending calls', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 });
    ctrl.recordSpending(30);
    ctrl.recordSpending(25);
    expect(ctrl.getState().spentUSD).toBe(55);
    expect(ctrl.getCurrentTier()).toBe('saver');
  });

  it('throws on negative amount', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 });
    expect(() => ctrl.recordSpending(-1)).toThrow('amount must be >= 0');
  });
});

describe('BudgetController — manual tier override', () => {
  it('setManualTier changes tier and locks auto-degradation', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 });
    ctrl.setManualTier('saver');
    expect(ctrl.getCurrentTier()).toBe('saver');
    ctrl.recordSpending(80); // would normally go to minimal
    expect(ctrl.getCurrentTier()).toBe('saver'); // locked
  });

  it('releaseManualOverride re-enables auto-degradation', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 });
    ctrl.setManualTier('saver');
    ctrl.releaseManualOverride();
    ctrl.recordSpending(96); // 96/100 = 0.96 -> emergency
    expect(ctrl.getCurrentTier()).toBe('emergency');
  });
});

describe('BudgetController — feature gating', () => {
  it('returns empty degraded features for standard tier', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 });
    expect(ctrl.getDegradedFeatures()).toEqual([]);
    expect(ctrl.isFeatureEnabled('extract_memories')).toBe(true);
  });

  it('disables prompt_suggestion at saver tier', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 }, 'saver');
    expect(ctrl.isFeatureEnabled('prompt_suggestion')).toBe(false);
    expect(ctrl.isFeatureEnabled('extract_memories')).toBe(true);
  });

  it('disables multiple features at budget tier', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 }, 'budget');
    expect(ctrl.isFeatureEnabled('prompt_suggestion')).toBe(false);
    expect(ctrl.isFeatureEnabled('extract_memories')).toBe(false);
    expect(ctrl.isFeatureEnabled('verification_agent')).toBe(false);
  });

  it('disables all features at off tier (wildcard)', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 }, 'off');
    expect(ctrl.isFeatureEnabled('anything')).toBe(false);
    expect(ctrl.isFeatureEnabled('critical_feature')).toBe(false);
  });

  it('isFeatureEnabledAt forecasts a hypothetical tier', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 });
    expect(ctrl.isFeatureEnabledAt('emergency', 'auto_summarize')).toBe(false);
    expect(ctrl.isFeatureEnabledAt('standard', 'auto_summarize')).toBe(true);
  });
});

describe('BudgetController — reset and limit update', () => {
  it('resetPeriod clears spending and returns to standard', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 });
    ctrl.recordSpending(96); // 96/100 = 0.96 -> emergency
    expect(ctrl.getCurrentTier()).toBe('emergency');
    ctrl.resetPeriod();
    expect(ctrl.getState().spentUSD).toBe(0);
    expect(ctrl.getCurrentTier()).toBe('standard');
  });

  it('resetPeriod preserves manual override', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 });
    ctrl.setManualTier('saver');
    ctrl.resetPeriod();
    expect(ctrl.getCurrentTier()).toBe('saver');
  });

  it('updateLimit changes the spending cap', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 100 });
    ctrl.updateLimit({ period: 'daily', maxUSD: 200 });
    expect(ctrl.getLimit().maxUSD).toBe(200);
    expect(ctrl.getState().limitUSD).toBe(200);
  });
});

describe('BudgetController — TIER_THRESHOLDS and TIER_DEGRADED_FEATURES', () => {
  it('threshold table is monotonically non-decreasing', () => {
    const tiers: BudgetTier[] = ['standard', 'saver', 'budget', 'minimal', 'emergency', 'off'];
    let last = -Infinity;
    for (const t of tiers) {
      expect(TIER_THRESHOLDS[t]).toBeGreaterThanOrEqual(last);
      last = TIER_THRESHOLDS[t];
    }
  });

  it('unlimited has Infinity threshold', () => {
    expect(TIER_THRESHOLDS.unlimited).toBe(Infinity);
  });

  it('every tier has a degraded-features array', () => {
    const tiers: BudgetTier[] = ['unlimited', 'standard', 'saver', 'budget', 'minimal', 'emergency', 'off'];
    for (const t of tiers) {
      expect(Array.isArray(TIER_DEGRADED_FEATURES[t])).toBe(true);
    }
  });

  it('off tier contains wildcard *', () => {
    expect(TIER_DEGRADED_FEATURES.off).toContain('*');
  });
});

describe('BudgetController — edge cases', () => {
  it('handles zero-USD limit (immediately off tier)', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 0 });
    expect(ctrl.recordSpending(0.0001)).toBe('off');
    expect(ctrl.canAfford(0.0001).allowed).toBe(false);
  });

  it('handles very small spending (fractional cents)', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 10 });
    ctrl.recordSpending(0.0001);
    expect(ctrl.getCurrentTier()).toBe('standard');
  });

  it('canAfford at exact remaining boundary returns allowed', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 10 });
    ctrl.recordSpending(7);
    const decision = ctrl.canAfford(3);
    expect(decision.allowed).toBe(true);
    expect(decision.remainingUSD).toBe(0);
  });

  it('canAfford one cent over remaining returns blocked', () => {
    const ctrl = new BudgetController({ period: 'daily', maxUSD: 10 });
    ctrl.recordSpending(7);
    const decision = ctrl.canAfford(3.01);
    expect(decision.allowed).toBe(false);
  });
});
