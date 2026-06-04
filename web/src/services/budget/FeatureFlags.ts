/**
 * FeatureFlags — 19 feature flags with A/B test and context-aware evaluation
 *
 * Inspired by: claude-code-design Feature Flags (19 flags)
 * Source pattern: /home/hermes/projects/claude-code-design/docs-site/feature-flags.md
 *
 * 3 states per flag: enabled / disabled / ab-test (percentage-based).
 * FlagContext carries userId, plan, environment, custom attrs.
 * Uses 3 evaluation modes: static, percentage, plan-based.
 */

export type FlagState = 'enabled' | 'disabled' | 'ab-test';

export type FlagMode = 'static' | 'percentage' | 'plan';

export interface FlagDefinition {
  /** Unique flag name, lowercase, dot-separated */
  name: string;
  /** Default state if no override */
  defaultState: FlagState;
  /** Description shown in flag panel */
  description: string;
  /** When mode='percentage': probability of being enabled (0.0-1.0) */
  percentage?: number;
  /** When mode='plan': plans where this flag is enabled (e.g. ['pro', 'enterprise']) */
  plans?: string[];
  /** When mode='plan' + plans is empty: enabled for all plans (default-on) */
  tags?: string[];
  /** When mode='static': forced state */
  state?: 'enabled' | 'disabled';
  /** Optional list of userIds always-on (overrides everything) */
  allowList?: string[];
  /** Optional list of userIds always-off */
  blockList?: string[];
}

export interface FlagContext {
  userId: string;
  plan: 'free' | 'pro' | 'enterprise' | 'admin';
  environment: 'development' | 'staging' | 'production';
  custom?: Record<string, string | number | boolean>;
}

export interface FlagEvaluation {
  flag: string;
  state: 'enabled' | 'disabled';
  reason: string;
  context: FlagContext;
}

export class FeatureFlags {
  private flags: Map<string, FlagDefinition> = new Map();
  private contextOverrides: Map<string, FlagState> = new Map();
  private evaluationLog: FlagEvaluation[] = [];
  private maxLogSize: number = 1000;

  /**
   * Register a flag. Throws if name invalid or already exists.
   */
  register(definition: FlagDefinition): void {
    this.validateName(definition.name);
    if (this.flags.has(definition.name)) {
      throw new Error(`Flag "${definition.name}" already registered`);
    }
    this.flags.set(definition.name, { ...definition });
  }

  /**
   * Register multiple flags at once.
   */
  registerAll(definitions: FlagDefinition[]): void {
    for (const def of definitions) {
      this.register(def);
    }
  }

  /**
   * Check if a flag is enabled in the given context.
   * Returns boolean (deterministic for percentage mode via userId hash).
   */
  isEnabled(name: string, context: FlagContext): boolean {
    const evalResult = this.evaluate(name, context);
    return evalResult.state === 'enabled';
  }

  /**
   * Evaluate a flag with full reason (for debugging / audit).
   */
  evaluate(name: string, context: FlagContext): FlagEvaluation {
    if (!this.flags.has(name)) {
      const result: FlagEvaluation = {
        flag: name,
        state: 'disabled',
        reason: 'flag not registered',
        context,
      };
      this.logEvaluation(result);
      return result;
    }

    const def = this.flags.get(name)!;

    // 1) Check context-level override (highest priority)
    if (this.contextOverrides.has(name)) {
      const state = this.contextOverrides.get(name)!;
      const result: FlagEvaluation = {
        flag: name,
        state: state === 'enabled' ? 'enabled' : 'disabled',
        reason: 'context override',
        context,
      };
      this.logEvaluation(result);
      return result;
    }

    // 2) Check allow/block list
    if (def.allowList?.includes(context.userId)) {
      const result: FlagEvaluation = {
        flag: name,
        state: 'enabled',
        reason: 'user in allow list',
        context,
      };
      this.logEvaluation(result);
      return result;
    }
    if (def.blockList?.includes(context.userId)) {
      const result: FlagEvaluation = {
        flag: name,
        state: 'disabled',
        reason: 'user in block list',
        context,
      };
      this.logEvaluation(result);
      return result;
    }

    // 3) Static state
    if (def.state === 'enabled' || def.state === 'disabled') {
      const result: FlagEvaluation = {
        flag: name,
        state: def.state,
        reason: 'static state',
        context,
      };
      this.logEvaluation(result);
      return result;
    }

    // 4) Plan-based
    if (def.plans !== undefined) {
      const matched = def.plans.length === 0
        ? true
        : def.plans.includes(context.plan);
      const result: FlagEvaluation = {
        flag: name,
        state: matched ? 'enabled' : 'disabled',
        reason: matched
          ? `plan "${context.plan}" is in [${def.plans.join(', ')}]`
          : `plan "${context.plan}" not in [${def.plans.join(', ')}]`,
        context,
      };
      this.logEvaluation(result);
      return result;
    }

    // 5) Percentage-based A/B test
    if (def.percentage !== undefined) {
      const bucket = this.bucketForUser(name, context.userId);
      const enabled = bucket < def.percentage;
      const result: FlagEvaluation = {
        flag: name,
        state: enabled ? 'enabled' : 'disabled',
        reason: `percentage ${def.percentage}, bucket ${bucket.toFixed(4)}`,
        context,
      };
      this.logEvaluation(result);
      return result;
    }

    // 6) Default state
    const result: FlagEvaluation = {
      flag: name,
      state: def.defaultState === 'enabled' ? 'enabled' : 'disabled',
      reason: 'default state',
      context,
    };
    this.logEvaluation(result);
    return result;
  }

  /**
   * Set a context-level override (e.g. force-enable for a session).
   */
  setContextOverride(name: string, state: FlagState): void {
    this.contextOverrides.set(name, state);
  }

  /**
   * Remove a context-level override.
   */
  clearContextOverride(name: string): void {
    this.contextOverrides.delete(name);
  }

  /**
   * Clear all context-level overrides.
   */
  clearAllContextOverrides(): void {
    this.contextOverrides.clear();
  }

  /**
   * Get a snapshot of all registered flags.
   */
  listFlags(): FlagDefinition[] {
    return Array.from(this.flags.values()).map((f) => ({ ...f }));
  }

  /**
   * Get the most recent N evaluations.
   */
  getEvaluationLog(limit?: number): FlagEvaluation[] {
    const n = limit ?? this.evaluationLog.length;
    return this.evaluationLog.slice(-n);
  }

  /**
   * Clear the evaluation log.
   */
  clearEvaluationLog(): void {
    this.evaluationLog = [];
  }

  /**
   * Get a flag definition by name (or undefined).
   */
  getDefinition(name: string): FlagDefinition | undefined {
    const def = this.flags.get(name);
    return def ? { ...def } : undefined;
  }

  /**
   * Check if a flag is registered.
   */
  hasFlag(name: string): boolean {
    return this.flags.has(name);
  }

  /**
   * Remove a flag (mainly for testing).
   */
  unregister(name: string): boolean {
    return this.flags.delete(name);
  }

  /**
   * Number of registered flags.
   */
  size(): number {
    return this.flags.size;
  }

  /**
   * Deterministic bucket for percentage-based A/B.
   * Uses FNV-1a-like hash on flag+userId, mod 10000 for 4-decimal precision.
   */
  private bucketForUser(flag: string, userId: string): number {
    const key = `${flag}:${userId}`;
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    return (hash % 10000) / 10000;
  }

  private logEvaluation(ev: FlagEvaluation): void {
    this.evaluationLog.push(ev);
    if (this.evaluationLog.length > this.maxLogSize) {
      this.evaluationLog.shift();
    }
  }

  private validateName(name: string): void {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('Flag name must be a non-empty string');
    }
    if (!/^[a-z][a-z0-9._-]*$/.test(name)) {
      throw new Error(`Invalid flag name "${name}". Use lowercase, dots, underscores.`);
    }
  }
}

/**
 * 19 default feature flags inspired by claude-code-design feature-flags.md.
 * 5% / 25% / 50% / 100% rollout splits cover staged rollout patterns.
 */
export const DEFAULT_FLAGS: FlagDefinition[] = [
  {
    name: 'extract_memories',
    defaultState: 'enabled',
    description: 'Auto-extract memories from conversation',
    plans: ['pro', 'enterprise', 'admin'],
  },
  {
    name: 'prompt_suggestion',
    defaultState: 'enabled',
    description: 'Show proactive prompt suggestions',
    plans: ['pro', 'enterprise', 'admin'],
  },
  {
    name: 'verification_agent',
    defaultState: 'enabled',
    description: 'Run verification agent on outputs',
    plans: ['enterprise', 'admin'],
  },
  {
    name: 'auto_summarize',
    defaultState: 'enabled',
    description: 'Auto-summarize long articles',
    percentage: 1.0,
  },
  {
    name: 'background_reflection',
    defaultState: 'enabled',
    description: 'Background reflection for memory crystallization',
    percentage: 0.5,
  },
  {
    name: 'semantic_index',
    defaultState: 'enabled',
    description: 'Build semantic index for search',
    plans: ['pro', 'enterprise', 'admin'],
  },
  {
    name: 'proactive_insight',
    defaultState: 'enabled',
    description: 'Show proactive insights based on history',
    percentage: 0.25,
  },
  {
    name: 'cross_device_sync',
    defaultState: 'enabled',
    description: 'Sync state across devices',
    plans: ['pro', 'enterprise', 'admin'],
  },
  {
    name: 'live_dream',
    defaultState: 'enabled',
    description: 'Real-time dream memory consolidation',
    percentage: 0.05,
  },
  {
    name: 'cost_alert',
    defaultState: 'enabled',
    description: 'Cost usage alerts',
    plans: [],
  },
  {
    name: 'mcp_server',
    defaultState: 'enabled',
    description: 'MCP server exposed to clients',
    state: 'enabled',
  },
  {
    name: 'mcp_client_strict',
    defaultState: 'enabled',
    description: 'Strict validation of MCP client inputs',
    state: 'disabled',
  },
  {
    name: 'workflow_canvas_v2',
    defaultState: 'enabled',
    description: 'New workflow canvas UI',
    percentage: 0.5,
  },
  {
    name: 'recommendation_hybrid',
    defaultState: 'enabled',
    description: 'Hybrid recommendation (collaborative + content)',
    plans: ['pro', 'enterprise', 'admin'],
  },
  {
    name: 'voice_input',
    defaultState: 'enabled',
    description: 'Voice input for searches',
    percentage: 0.05,
  },
  {
    name: 'telegram_bot',
    defaultState: 'enabled',
    description: 'Telegram bot integration',
    plans: ['enterprise', 'admin'],
  },
  {
    name: 'email_digest',
    defaultState: 'enabled',
    description: 'Daily email digest',
    plans: [],
  },
  {
    name: 'plugin_marketplace',
    defaultState: 'enabled',
    description: 'Plugin marketplace access',
    plans: ['pro', 'enterprise', 'admin'],
  },
  {
    name: 'experimental_dag',
    defaultState: 'enabled',
    description: 'Experimental DAG workflow engine',
    percentage: 0.05,
  },
];
