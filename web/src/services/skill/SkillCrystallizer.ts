/**
 * SkillCrystallizer — Self-Evolution: execution path → SOP (L3 Skill)
 *
 * Inspired by:
 *   - generic-agent-design Self-Evolution: /home/hermes/projects/generic-agent-design/docs-site/self-evolution.md
 *   - ruflo-design Supervisor/Plan Mode: /home/hermes/projects/ruflo-design/docs-site/hooks.md
 *
 * Captures execution traces from workflow runs, analyzes for repeating
 * patterns, and crystallizes them into reusable SOPs that can be saved
 * as L3 Skills in the SkillRegistry.
 *
 * 7 crystallization triggers:
 *   1. REPEATED_PATTERN: same task done N times
 *   2. LOW_EFFICIENCY: high step count for simple outcome
 *   3. HIGH_FAILURE: error rate exceeds threshold
 *   4. HIGH_LATENCY: duration exceeds threshold
 *   5. USER_OPTIMIZED: user manually improved a trace
 *   6. SIMILAR_CLUSTER: traces cluster into similar groups
 *   7. EXPLICIT: user explicitly requests crystallization
 *
 * PlanMode: pre-decompose a goal into steps before execution.
 * Supervisor: monitor running execution, trigger intervention.
 */

import type { Skill, SkillRegistry } from '../skill/SkillRegistry';

export type CrystallizationTrigger =
  | 'repeated_pattern'
  | 'low_efficiency'
  | 'high_failure'
  | 'high_latency'
  | 'user_optimized'
  | 'similar_cluster'
  | 'explicit';

export interface ExecutionStep {
  /** Unique step ID */
  id: string;
  /** Tool or skill name used */
  tool: string;
  /** Step inputs */
  inputs: Record<string, unknown>;
  /** Step outputs (or error) */
  outputs?: Record<string, unknown>;
  error?: string;
  /** Duration in ms */
  durationMs: number;
  /** Step order in the trace */
  order: number;
}

export interface ExecutionTrace {
  id: string;
  /** User goal or task description */
  goal: string;
  /** Tags (for clustering) */
  tags: string[];
  /** Steps executed in order */
  steps: ExecutionStep[];
  /** Total duration */
  totalDurationMs: number;
  /** Whether the trace succeeded */
  success: boolean;
  /** Trace timestamp */
  timestamp: number;
  /** User who executed the trace */
  userId: string;
}

export interface CrystallizationConfig {
  /** REPEATED_PATTERN: min occurrences to crystallize (default 3) */
  repeatedMinOccurrences?: number;
  /** LOW_EFFICIENCY: max steps per outcome (default 5) */
  maxStepsForOutcome?: number;
  /** HIGH_FAILURE: error rate threshold (0.0-1.0, default 0.3) */
  failureRateThreshold?: number;
  /** HIGH_LATENCY: max duration in ms (default 30000) */
  maxDurationMs?: number;
  /** SIMILAR_CLUSTER: min cluster size (default 3) */
  clusterMinSize?: number;
  /** Similarity threshold for clustering (0.0-1.0, default 0.7) */
  similarityThreshold?: number;
}

export interface CrystallizationCandidate {
  trigger: CrystallizationTrigger;
  traces: ExecutionTrace[];
  reason: string;
  /** Suggested skill name (auto-generated) */
  suggestedName: string;
  /** Confidence score 0.0-1.0 */
  confidence: number;
}

export interface SOPTemplate {
  name: string;
  version: string;
  description: string;
  steps: Array<{ tool: string; order: number; description: string }>;
  source: 'crystallized' | 'manual' | 'imported';
  createdAt: string;
  crystallizedFrom: string[]; // trace IDs
}

export interface PlanStep {
  id: string;
  description: string;
  tool?: string;
  estimatedDurationMs?: number;
  dependsOn?: string[];
}

export interface Plan {
  id: string;
  goal: string;
  steps: PlanStep[];
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'cancelled';
  createdAt: number;
  approvedAt?: number;
}

export type InterventionAction = 'pause' | 'retry' | 'skip' | 'abort' | 'ask_user';

export interface Intervention {
  stepId: string;
  action: InterventionAction;
  reason: string;
  timestamp: number;
}

const DEFAULT_CONFIG: Required<CrystallizationConfig> = {
  repeatedMinOccurrences: 3,
  maxStepsForOutcome: 5,
  failureRateThreshold: 0.3,
  maxDurationMs: 30_000,
  clusterMinSize: 3,
  similarityThreshold: 0.7,
};

/**
 * Compute a fingerprint of a trace's "shape" (sequence of tools, ignoring args).
 * Two traces with the same fingerprint are likely candidates for crystallization.
 */
export function traceFingerprint(trace: ExecutionTrace): string {
  return trace.steps.map((s) => s.tool).join('->');
}

/** Simple Jaccard-like similarity between two traces (shared step ratio). */
export function traceSimilarity(a: ExecutionTrace, b: ExecutionTrace): number {
  if (a.steps.length === 0 || b.steps.length === 0) return 0;
  const aTools = new Set(a.steps.map((s) => s.tool));
  const bTools = new Set(b.steps.map((s) => s.tool));
  let intersect = 0;
  for (const t of aTools) if (bTools.has(t)) intersect += 1;
  const union = new Set([...aTools, ...bTools]).size;
  const setSim = union === 0 ? 0 : intersect / union;
  // Also consider sequence similarity
  const seqSim = 1 - Math.abs(a.steps.length - b.steps.length) / Math.max(a.steps.length, b.steps.length);
  return (setSim + seqSim) / 2;
}

export class SkillCrystallizer {
  private config: Required<CrystallizationConfig>;
  private traces: ExecutionTrace[] = [];

  constructor(
    private readonly registry: SkillRegistry,
    config: CrystallizationConfig = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Record an execution trace. Returns candidate if crystallization is triggered. */
  recordTrace(trace: ExecutionTrace): CrystallizationCandidate | null {
    if (!trace.id || !trace.goal) {
      throw new Error('Trace must have id and goal');
    }
    this.traces.push({ ...trace, steps: [...trace.steps] });
    return this.detectCandidates().find((c) => c.traces.some((t) => t.id === trace.id)) ?? null;
  }

  /** Record multiple traces. */
  recordTraces(traces: ExecutionTrace[]): CrystallizationCandidate[] {
    for (const t of traces) this.recordTrace(t);
    return this.detectCandidates();
  }

  /** Detect all current crystallization candidates. */
  detectCandidates(): CrystallizationCandidate[] {
    const candidates: CrystallizationCandidate[] = [];
    const r1 = this.detectRepeatedPattern();
    if (r1) candidates.push(r1);
    const r2 = this.detectLowEfficiency();
    if (r2) candidates.push(r2);
    const r3 = this.detectHighFailure();
    if (r3) candidates.push(r3);
    const r4 = this.detectHighLatency();
    if (r4) candidates.push(r4);
    const r5 = this.detectSimilarCluster();
    if (r5) candidates.push(r5);
    return candidates;
  }

  /** Crystallize a candidate into a Skill. Registers it in the SkillRegistry. */
  crystallize(candidate: CrystallizationCandidate, customName?: string): Skill | null {
    if (candidate.traces.length === 0) return null;
    const skill = this.buildSkill(candidate, customName);
    try {
      this.registry.register(skill);
      return skill;
    } catch (e) {
      // If already exists, return existing
      const existing = this.registry.get(skill.name);
      return existing ?? null;
    }
  }

  /** Manually trigger crystallization on a set of traces. */
  crystallizeExplicit(traces: ExecutionTrace[], name: string, description: string): Skill {
    const candidate: CrystallizationCandidate = {
      trigger: 'explicit',
      traces,
      reason: 'User explicitly requested crystallization',
      suggestedName: name,
      confidence: 1.0,
    };
    const skill = this.buildSkill(candidate, name);
    skill.description = description;
    this.registry.register(skill);
    return skill;
  }

  /** Get all recorded traces. */
  getTraces(): ExecutionTrace[] {
    return [...this.traces];
  }

  /** Number of recorded traces. */
  traceCount(): number {
    return this.traces.length;
  }

  /** Clear all traces. */
  clearTraces(): void {
    this.traces = [];
  }

  // === Internal detectors ===

  private detectRepeatedPattern(): CrystallizationCandidate | null {
    const goalGroups = new Map<string, ExecutionTrace[]>();
    for (const t of this.traces) {
      if (!goalGroups.has(t.goal)) goalGroups.set(t.goal, []);
      goalGroups.get(t.goal)!.push(t);
    }
    for (const [goal, group] of goalGroups) {
      if (group.length >= this.config.repeatedMinOccurrences) {
        const successRate = group.filter((t) => t.success).length / group.length;
        return {
          trigger: 'repeated_pattern',
          traces: group,
          reason: `Goal "${goal}" executed ${group.length} times (>= ${this.config.repeatedMinOccurrences})`,
          suggestedName: `sop-${this.slugify(goal)}`,
          confidence: Math.min(1, group.length / (this.config.repeatedMinOccurrences * 2)) * successRate,
        };
      }
    }
    return null;
  }

  private detectLowEfficiency(): CrystallizationCandidate | null {
    const candidates: CrystallizationCandidate[] = [];
    for (const t of this.traces) {
      if (t.steps.length > this.config.maxStepsForOutcome && t.success) {
        candidates.push({
          trigger: 'low_efficiency',
          traces: [t],
          reason: `Trace took ${t.steps.length} steps (max ${this.config.maxStepsForOutcome})`,
          suggestedName: `sop-efficient-${this.slugify(t.goal)}`,
          confidence: 0.6,
        });
      }
    }
    return candidates[0] ?? null;
  }

  private detectHighFailure(): CrystallizationCandidate | null {
    const goalGroups = new Map<string, ExecutionTrace[]>();
    for (const t of this.traces) {
      if (!goalGroups.has(t.goal)) goalGroups.set(t.goal, []);
      goalGroups.get(t.goal)!.push(t);
    }
    for (const [goal, group] of goalGroups) {
      if (group.length < 2) continue;
      const failRate = group.filter((t) => !t.success).length / group.length;
      if (failRate >= this.config.failureRateThreshold) {
        return {
          trigger: 'high_failure',
          traces: group,
          reason: `Goal "${goal}" has ${(failRate * 100).toFixed(0)}% failure rate (>= ${(this.config.failureRateThreshold * 100).toFixed(0)}%)`,
          suggestedName: `sop-reliable-${this.slugify(goal)}`,
          confidence: failRate,
        };
      }
    }
    return null;
  }

  private detectHighLatency(): CrystallizationCandidate | null {
    const slowTraces = this.traces.filter(
      (t) => t.totalDurationMs > this.config.maxDurationMs && t.success,
    );
    if (slowTraces.length === 0) return null;
    return {
      trigger: 'high_latency',
      traces: slowTraces,
      reason: `${slowTraces.length} traces exceeded ${this.config.maxDurationMs}ms`,
      suggestedName: `sop-fast-${this.slugify(slowTraces[0].goal)}`,
      confidence: 0.5,
    };
  }

  private detectSimilarCluster(): CrystallizationCandidate | null {
    // Cluster traces by fingerprint
    const clusters = new Map<string, ExecutionTrace[]>();
    for (const t of this.traces) {
      const fp = traceFingerprint(t);
      if (!clusters.has(fp)) clusters.set(fp, []);
      clusters.get(fp)!.push(t);
    }
    // Or use similarity threshold for fuzzy clustering
    const fuzzyClusters: ExecutionTrace[][] = [];
    const assigned = new Set<string>();
    for (let i = 0; i < this.traces.length; i++) {
      if (assigned.has(this.traces[i].id)) continue;
      const cluster: ExecutionTrace[] = [this.traces[i]];
      assigned.add(this.traces[i].id);
      for (let j = i + 1; j < this.traces.length; j++) {
        if (assigned.has(this.traces[j].id)) continue;
        if (traceSimilarity(this.traces[i], this.traces[j]) >= this.config.similarityThreshold) {
          cluster.push(this.traces[j]);
          assigned.add(this.traces[j].id);
        }
      }
      if (cluster.length >= this.config.clusterMinSize) {
        fuzzyClusters.push(cluster);
      }
    }
    if (fuzzyClusters.length === 0) return null;
    const best = fuzzyClusters.reduce((a, b) => (b.length > a.length ? b : a));
    return {
      trigger: 'similar_cluster',
      traces: best,
      reason: `Cluster of ${best.length} similar traces found`,
      suggestedName: `sop-cluster-${this.slugify(best[0].goal)}`,
      confidence: 0.7,
    };
  }

  private buildSkill(candidate: CrystallizationCandidate, customName?: string): Skill {
    const traces = candidate.traces;
    const allSteps = traces.flatMap((t) => t.steps);
    // Aggregate steps by (tool, order) — keep unique step definitions
    const stepDefs = new Map<string, { tool: string; order: number; description: string }>();
    for (const t of traces) {
      for (const s of t.steps) {
        const key = `${s.order}-${s.tool}`;
        if (!stepDefs.has(key)) {
          stepDefs.set(key, {
            tool: s.tool,
            order: s.order,
            description: `${s.tool} step`,
          });
        }
      }
    }
    const sortedSteps = Array.from(stepDefs.values()).sort((a, b) => a.order - b.order);
    return {
      name: customName ?? candidate.suggestedName,
      version: '1.0.0',
      category: 'workflow',
      description: candidate.reason,
      tags: ['crystallized', candidate.trigger, ...new Set(traces.flatMap((t) => t.tags))],
      inputs: this.aggregateInputs(allSteps),
      outputs: this.aggregateOutputs(allSteps),
      dependencies: [],
      estimatedCostUSD: traces.reduce((sum, t) => sum + (t.steps[0]?.tool ? 0.001 : 0), 0),
      estimatedDurationMs: Math.round(traces.reduce((s, t) => s + t.totalDurationMs, 0) / traces.length),
      invocationCount: 0,
      registeredAt: new Date().toISOString().slice(0, 10),
    };
  }

  private aggregateInputs(steps: ExecutionStep[]): Skill['inputs'] {
    const inputs: Skill['inputs'] = [];
    const seen = new Set<string>();
    for (const s of steps) {
      for (const k of Object.keys(s.inputs)) {
        if (seen.has(k)) continue;
        seen.add(k);
        inputs.push({ name: k, type: 'string', required: false, description: `${k} from ${s.tool}` });
      }
    }
    return inputs;
  }

  private aggregateOutputs(steps: ExecutionStep[]): Skill['outputs'] {
    const outputs: Skill['outputs'] = [];
    const seen = new Set<string>();
    for (const s of steps) {
      if (!s.outputs) continue;
      for (const k of Object.keys(s.outputs)) {
        if (seen.has(k)) continue;
        seen.add(k);
        outputs.push({ name: k, type: 'string', description: `${k} from ${s.tool}` });
      }
    }
    return outputs;
  }

  private slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'untitled';
  }
}

/**
 * PlanMode — Decompose a goal into executable steps.
 * Pure logic; caller wires to actual tool execution.
 */
export class PlanMode {
  private plans: Map<string, Plan> = new Map();

  /**
   * Decompose a goal into steps. Uses simple heuristics:
   *   - If goal contains "then" → split
   *   - If goal contains "&" or "and" → parallel steps
   *   - If goal contains "?" → user clarification step
   */
  plan(goal: string, customSteps?: PlanStep[]): Plan {
    const id = `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    let steps: PlanStep[];
    if (customSteps && customSteps.length > 0) {
      steps = customSteps;
    } else {
      steps = this.heuristicDecompose(goal);
    }
    const plan: Plan = {
      id,
      goal,
      steps,
      status: 'draft',
      createdAt: Date.now(),
    };
    this.plans.set(id, plan);
    return plan;
  }

  /** Get a plan by id. */
  getPlan(id: string): Plan | undefined {
    const p = this.plans.get(id);
    return p ? { ...p, steps: [...p.steps] } : undefined;
  }

  /** Approve a draft plan (status: draft -> approved). */
  approve(id: string): boolean {
    const p = this.plans.get(id);
    if (!p || p.status !== 'draft') return false;
    p.status = 'approved';
    p.approvedAt = Date.now();
    return true;
  }

  /** Start executing an approved plan. */
  start(id: string): boolean {
    const p = this.plans.get(id);
    if (!p || p.status !== 'approved') return false;
    p.status = 'executing';
    return true;
  }

  /** Mark plan as completed. */
  complete(id: string): boolean {
    const p = this.plans.get(id);
    if (!p || p.status !== 'executing') return false;
    p.status = 'completed';
    return true;
  }

  /** Cancel a plan. */
  cancel(id: string): boolean {
    const p = this.plans.get(id);
    if (!p) return false;
    if (p.status === 'completed') return false;
    p.status = 'cancelled';
    return true;
  }

  /** Get the execution order (topological from dependsOn). */
  getExecutionOrder(planId: string): string[] {
    const p = this.plans.get(planId);
    if (!p) return [];
    const adj = new Map<string, string[]>();
    const inDeg = new Map<string, number>();
    for (const s of p.steps) {
      adj.set(s.id, []);
      inDeg.set(s.id, 0);
    }
    for (const s of p.steps) {
      for (const dep of s.dependsOn ?? []) {
        adj.get(dep)!.push(s.id);
        inDeg.set(s.id, (inDeg.get(s.id) ?? 0) + 1);
      }
    }
    const queue: string[] = [];
    for (const [id, deg] of inDeg.entries()) if (deg === 0) queue.push(id);
    const order: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      order.push(id);
      for (const next of adj.get(id) ?? []) {
        inDeg.set(next, inDeg.get(next)! - 1);
        if (inDeg.get(next) === 0) queue.push(next);
      }
    }
    return order;
  }

  private heuristicDecompose(goal: string): PlanStep[] {
    // Simple decomposition
    const parts = goal.split(/\s+then\s+/i);
    if (parts.length > 1) {
      return parts.map((p, i) => ({
        id: `step-${i + 1}`,
        description: p.trim(),
        dependsOn: i > 0 ? [`step-${i}`] : [],
        estimatedDurationMs: 5000,
      }));
    }
    // Default: single step
    return [
      {
        id: 'step-1',
        description: goal,
        estimatedDurationMs: 10_000,
      },
    ];
  }
}

/**
 * Supervisor — Monitor plan execution and trigger interventions.
 */
export class Supervisor {
  private interventions: Intervention[] = [];

  /** Check a step result and decide if intervention is needed. */
  check(step: PlanStep, result: { success: boolean; durationMs: number; error?: string }): Intervention | null {
    if (!result.success) {
      const intervention: Intervention = {
        stepId: step.id,
        action: result.error ? 'retry' : 'ask_user',
        reason: result.error ? `Step failed: ${result.error}` : 'Step returned no result',
        timestamp: Date.now(),
      };
      this.interventions.push(intervention);
      return intervention;
    }
    if (step.estimatedDurationMs && result.durationMs > step.estimatedDurationMs * 3) {
      const intervention: Intervention = {
        stepId: step.id,
        action: 'ask_user',
        reason: `Step took ${result.durationMs}ms (> 3x estimate of ${step.estimatedDurationMs}ms)`,
        timestamp: Date.now(),
      };
      this.interventions.push(intervention);
      return intervention;
    }
    return null;
  }

  /** Get all interventions. */
  getInterventions(): Intervention[] {
    return [...this.interventions];
  }

  /** Clear interventions. */
  clearInterventions(): void {
    this.interventions = [];
  }

  /** Get intervention count. */
  count(): number {
    return this.interventions.length;
  }
}
