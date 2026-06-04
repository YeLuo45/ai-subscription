/**
 * BudgetController — 7-tier budget control with auto-degradation
 *
 * Inspired by: claude-code-design Budget Mode (穷鬼模式)
 * Source pattern: /home/hermes/projects/claude-code-design/docs-site/budget-mode.md
 *
 * 7 tiers: unlimited, standard, saver, budget, minimal, emergency, off
 * Auto-degrades when cumulative spending crosses tier thresholds.
 * Exposes `canAfford(estimatedCost)`, `recordSpending(amount)`, `getDegradedFeatures()`.
 */

export type BudgetTier =
  | 'unlimited'   // No budget cap
  | 'standard'    // Default tier — all features enabled
  | 'saver'       // Reduce heavy features
  | 'budget'      // Skip non-essential features
  | 'minimal'     // Only critical features
  | 'emergency'   // Bare minimum operation
  | 'off';        // No LLM calls allowed

export type BudgetPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface BudgetLimit {
  /** Period for budget reset */
  period: BudgetPeriod;
  /** Max USD allowed in the period (NaN = no cap) */
  maxUSD: number;
}

export interface BudgetState {
  tier: BudgetTier;
  spentUSD: number;
  limitUSD: number;
  periodStart: number;
  manualOverride: boolean;
}

export interface BudgetDecision {
  allowed: boolean;
  reason: string;
  tier: BudgetTier;
  remainingUSD: number;
  degradedFeatures: string[];
}

/**
 * Default tier thresholds: the LOWER bound of `spentUSD / limitUSD` at which
 * the tier becomes active. 0.0 = just started, 1.0 = at limit.
 *   0   <= ratio < 0.5  -> standard
 *   0.5 <= ratio < 0.7  -> saver
 *   0.7 <= ratio < 0.85 -> budget
 *   0.85<= ratio < 0.95 -> minimal
 *   0.95<= ratio < 1.0  -> emergency
 *   ratio >= 1.0        -> off
 */
export const TIER_THRESHOLDS: Record<BudgetTier, number> = {
  unlimited: Infinity,
  standard: 0,
  saver: 0.5,
  budget: 0.7,
  minimal: 0.85,
  emergency: 0.95,
  off: 1.0,
};

/**
 * Features to degrade per tier. Order matters — higher tier = more features disabled.
 * Inspired by claude-code-design budget-mode "What Gets Skipped" table.
 */
export const TIER_DEGRADED_FEATURES: Record<BudgetTier, string[]> = {
  unlimited: [],
  standard: [],
  saver: ['prompt_suggestion'],
  budget: ['prompt_suggestion', 'extract_memories', 'verification_agent'],
  minimal: ['prompt_suggestion', 'extract_memories', 'verification_agent', 'auto_summarize', 'background_reflection'],
  emergency: ['prompt_suggestion', 'extract_memories', 'verification_agent', 'auto_summarize', 'background_reflection', 'semantic_index', 'proactive_insight'],
  off: ['*'],
};

export class BudgetController {
  private state: BudgetState;
  private limit: BudgetLimit;

  constructor(limit: BudgetLimit, initialTier?: BudgetTier) {
    if (limit.maxUSD < 0) {
      throw new Error('maxUSD must be >= 0');
    }
    this.limit = limit;
    // Auto-detect unlimited tier when maxUSD is Infinity and no explicit tier given
    const autoInitial: BudgetTier =
      initialTier ?? (isFinite(limit.maxUSD) ? 'standard' : 'unlimited');
    this.state = {
      tier: autoInitial,
      spentUSD: 0,
      limitUSD: limit.maxUSD,
      periodStart: Date.now(),
      manualOverride: false,
    };
  }

  /** Get current state (read-only snapshot) */
  getState(): BudgetState {
    return { ...this.state };
  }

  /** Get current active tier */
  getCurrentTier(): BudgetTier {
    return this.state.tier;
  }

  /** Get features disabled at current tier */
  getDegradedFeatures(): string[] {
    return [...TIER_DEGRADED_FEATURES[this.state.tier]];
  }

  /** Check if a feature is enabled at current tier */
  isFeatureEnabled(feature: string): boolean {
    const disabled = TIER_DEGRADED_FEATURES[this.state.tier];
    if (disabled.includes('*')) return false;
    return !disabled.includes(feature);
  }

  /** Check if a feature is enabled at a hypothetical tier (used for forecasting) */
  isFeatureEnabledAt(tier: BudgetTier, feature: string): boolean {
    const disabled = TIER_DEGRADED_FEATURES[tier];
    if (disabled.includes('*')) return false;
    return !disabled.includes(feature);
  }

  /** Check if we can afford an estimated cost. Returns decision with reasoning. */
  canAfford(estimatedCost: number): BudgetDecision {
    if (estimatedCost < 0) {
      throw new Error('estimatedCost must be >= 0');
    }
    const tier = this.state.tier;
    const remaining = Math.max(0, this.state.limitUSD - this.state.spentUSD);
    const degraded = this.getDegradedFeatures();

    if (tier === 'off') {
      return {
        allowed: false,
        reason: 'Budget tier is "off" — all LLM calls blocked',
        tier,
        remainingUSD: remaining,
        degradedFeatures: degraded,
      };
    }
    if (tier === 'unlimited') {
      return {
        allowed: true,
        reason: 'Budget tier is "unlimited" — no cap',
        tier,
        remainingUSD: Infinity,
        degradedFeatures: degraded,
      };
    }
    if (estimatedCost > remaining) {
      return {
        allowed: false,
        reason: `Cost ${estimatedCost.toFixed(4)} exceeds remaining ${remaining.toFixed(4)}`,
        tier,
        remainingUSD: remaining,
        degradedFeatures: degraded,
      };
    }
    return {
      allowed: true,
      reason: 'Within budget',
      tier,
      remainingUSD: remaining - estimatedCost,
      degradedFeatures: degraded,
    };
  }

  /** Record spending and auto-degrade if needed. Returns new tier. */
  recordSpending(amount: number): BudgetTier {
    if (amount < 0) {
      throw new Error('amount must be >= 0');
    }
    this.state.spentUSD += amount;

    // If manual override is on, do not auto-degrade
    if (this.state.manualOverride) {
      return this.state.tier;
    }

    const newTier = this.computeTierForSpent(this.state.spentUSD);
    this.state.tier = newTier;
    return newTier;
  }

  /** Manually set tier (overrides auto-degradation) */
  setManualTier(tier: BudgetTier): void {
    this.state.tier = tier;
    this.state.manualOverride = true;
  }

  /** Release manual override — re-enable auto-degradation */
  releaseManualOverride(): void {
    this.state.manualOverride = false;
    // Recompute tier from current spending
    this.state.tier = this.computeTierForSpent(this.state.spentUSD);
  }

  /** Reset period (e.g. start of new day) */
  resetPeriod(): void {
    this.state.spentUSD = 0;
    this.state.periodStart = Date.now();
    if (!this.state.manualOverride) {
      this.state.tier = 'standard';
    }
  }

  /** Update limit (e.g. user upgraded plan) */
  updateLimit(limit: BudgetLimit): void {
    this.limit = limit;
    this.state.limitUSD = limit.maxUSD;
  }

  /** Get current limit */
  getLimit(): BudgetLimit {
    return { ...this.limit };
  }

  /** Compute tier for a given spent amount (used internally) */
  private computeTierForSpent(spent: number): BudgetTier {
    if (this.state.limitUSD === 0) return 'off';
    if (!isFinite(this.state.limitUSD)) return 'unlimited';
    const ratio = spent / this.state.limitUSD;
    // Pick the highest tier whose threshold is <= ratio
    const tiers: BudgetTier[] = ['standard', 'saver', 'budget', 'minimal', 'emergency', 'off'];
    let result: BudgetTier = 'standard';
    for (const t of tiers) {
      if (ratio >= TIER_THRESHOLDS[t]) {
        result = t;
      }
    }
    return result;
  }
}
