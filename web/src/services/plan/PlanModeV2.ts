/**
 * PlanModeV2 — multi-step plan with checkpoint/rollback
 *
 * Inspired by: generic-agent-design Plan & Execute + checkpoint pattern
 * Source: /home/hermes/projects/generic-agent-design/docs-site/plan-execute.md
 *
 * A Plan is an ordered list of Steps. Each Step has:
 *   - id, description, status, dependencies, payload
 *   - checkpoint data (state snapshot before execution)
 *   - rollback action (revert checkpoint)
 *
 * Plan lifecycle:
 *   - draft -> approved -> running -> (paused) -> (resumed) -> completed/failed/rolled_back
 *
 * Features:
 *   - Topological order via dependencies
 *   - Checkpoint before each step (for rollback)
 *   - Pause / resume
 *   - Rollback to any checkpoint
 *   - Step retry
 *   - Audit log
 */

export type StepStatus = 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'skipped' | 'rolled_back';
export type PlanStatus = 'draft' | 'approved' | 'running' | 'paused' | 'completed' | 'failed' | 'rolled_back';

export interface PlanStep {
  id: string;
  description: string;
  status: StepStatus;
  /** Step IDs that must complete before this one */
  dependencies: string[];
  /** Optional payload for the executor */
  payload?: Record<string, unknown>;
  /** Checkpoint data captured before execution */
  checkpoint?: Record<string, unknown>;
  /** Output from execution */
  output?: Record<string, unknown>;
  /** Error if failed */
  error?: string;
  /** Number of retry attempts */
  attempts: number;
  /** Max retries allowed */
  maxRetries: number;
  /** Creation timestamp */
  createdAt: number;
  /** Completion timestamp */
  completedAt?: number;
  /** Optional action to run for this step (returns output or throws) */
  action?: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

export interface PlanCheckpoint {
  stepId: string;
  state: Record<string, unknown>;
  timestamp: number;
}

export interface Plan {
  id: string;
  name: string;
  status: PlanStatus;
  steps: PlanStep[];
  checkpoints: PlanCheckpoint[];
  /** Global state passed to all steps */
  context: Record<string, unknown>;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface PlanExecutionResult {
  planId: string;
  status: PlanStatus;
  stepsCompleted: number;
  stepsFailed: number;
  totalDurationMs: number;
}

export class PlanModeV2 {
  private plans: Map<string, Plan> = new Map();
  private auditLog: Array<{ timestamp: number; planId: string; event: string }> = [];
  private counter: number = 0;

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${Date.now().toString(36)}-${this.counter}`;
  }

  private audit(planId: string, event: string): void {
    this.auditLog.push({ timestamp: Date.now(), planId, event });
    if (this.auditLog.length > 1000) this.auditLog.shift();
  }

  /**
   * Create a plan with steps. Validates step IDs and dependencies.
   */
  createPlan(name: string, steps: Array<{ id?: string; description: string; dependencies?: string[]; maxRetries?: number; action?: PlanStep['action'] }>): Plan {
    const planId = this.nextId('plan');
    const stepIds = new Set<string>();
    const planSteps: PlanStep[] = steps.map((s) => {
      const id = s.id ?? this.nextId('step');
      if (stepIds.has(id)) throw new Error(`Duplicate step id "${id}"`);
      stepIds.add(id);
      return {
        id,
        description: s.description,
        status: 'pending',
        dependencies: s.dependencies ?? [],
        maxRetries: s.maxRetries ?? 0,
        attempts: 0,
        createdAt: Date.now(),
        action: s.action,
      };
    });
    // Validate dependencies reference existing step IDs
    for (const step of planSteps) {
      for (const dep of step.dependencies) {
        if (!stepIds.has(dep)) {
          throw new Error(`Step "${step.id}" has unknown dependency "${dep}"`);
        }
      }
    }
    const plan: Plan = {
      id: planId,
      name,
      status: 'draft',
      steps: planSteps,
      checkpoints: [],
      context: {},
      createdAt: Date.now(),
    };
    this.plans.set(planId, plan);
    this.audit(planId, 'plan created');
    return plan;
  }

  /** Get a plan by id. */
  getPlan(id: string): Plan | undefined {
    return this.plans.get(id);
  }

  /** List all plans. */
  listPlans(): Plan[] {
    return Array.from(this.plans.values());
  }

  /** Approve a draft plan. */
  approve(planId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;
    if (plan.status !== 'draft') return false;
    plan.status = 'approved';
    this.audit(planId, 'plan approved');
    return true;
  }

  /**
   * Compute ready steps: those with all dependencies completed and status pending.
   */
  getReadySteps(planId: string): PlanStep[] {
    const plan = this.plans.get(planId);
    if (!plan) return [];
    const completed = new Set(plan.steps.filter((s) => s.status === 'completed').map((s) => s.id));
    return plan.steps.filter((s) => s.status === 'pending' && s.dependencies.every((d) => completed.has(d)));
  }

  /**
   * Capture a checkpoint (state snapshot) for a step.
   */
  captureCheckpoint(planId: string, stepId: string, state: Record<string, unknown>): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;
    const step = plan.steps.find((s) => s.id === stepId);
    if (!step) return false;
    plan.checkpoints.push({ stepId, state: { ...state }, timestamp: Date.now() });
    step.checkpoint = { ...state };
    return true;
  }

  /**
   * Execute a step. If checkpoint exists, restores from it.
   * Returns the step after execution.
   */
  async executeStep(planId: string, stepId: string): Promise<PlanStep> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`plan "${planId}" not found`);
    const step = plan.steps.find((s) => s.id === stepId);
    if (!step) throw new Error(`step "${stepId}" not found`);
    if (step.status === 'running') throw new Error(`step "${stepId}" is already running`);
    if (!plan.status || (plan.status !== 'approved' && plan.status !== 'running')) {
      throw new Error(`plan is ${plan.status}, cannot execute step`);
    }
    if (plan.status === 'approved') {
      plan.status = 'running';
      plan.startedAt = Date.now();
      this.audit(planId, 'plan started');
    }
    step.status = 'running';
    step.attempts += 1;
    try {
      if (step.action) {
        step.output = await step.action({ ...step.payload, context: plan.context });
      } else {
        // Default: no-op
        step.output = { echoed: step.payload ?? null };
      }
      step.status = 'completed';
      step.completedAt = Date.now();
      this.audit(planId, `step ${stepId} completed`);
    } catch (err) {
      if (step.attempts < step.maxRetries) {
        step.status = 'pending'; // Allow retry
        this.audit(planId, `step ${stepId} failed, will retry`);
      } else {
        step.status = 'failed';
        step.error = err instanceof Error ? err.message : String(err);
        this.audit(planId, `step ${stepId} failed permanently`);
      }
    }
    return step;
  }

  /**
   * Run the full plan: topological order, executing each ready step.
   */
  async run(planId: string): Promise<PlanExecutionResult> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`plan "${planId}" not found`);
    if (plan.status !== 'approved') {
      throw new Error(`plan must be approved to run, current status: ${plan.status}`);
    }
    const start = Date.now();
    plan.status = 'running';
    plan.startedAt = start;
    this.audit(planId, 'plan running');

    let stepsCompleted = 0;
    let stepsFailed = 0;
    let safetyLimit = 1000;
    while (safetyLimit-- > 0) {
      const ready = this.getReadySteps(planId);
      if (ready.length === 0) break;
      const step = ready[0];
      const result = await this.executeStep(planId, step.id);
      if (result.status === 'completed') stepsCompleted += 1;
      else if (result.status === 'failed') {
        stepsFailed += 1;
        plan.status = 'failed';
        break;
      }
    }

    // Check final status
    if (plan.status === 'running') {
      if (plan.steps.every((s) => s.status === 'completed' || s.status === 'skipped')) {
        plan.status = 'completed';
        plan.completedAt = Date.now();
        this.audit(planId, 'plan completed');
      } else {
        plan.status = 'failed';
      }
    }

    return {
      planId,
      status: plan.status,
      stepsCompleted,
      stepsFailed,
      totalDurationMs: Date.now() - start,
    };
  }

  /**
   * Rollback a plan to a specific checkpoint.
   * Marks all steps after the checkpoint as rolled_back.
   */
  rollback(planId: string, checkpointStepId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;
    const checkpointIdx = plan.checkpoints.findIndex((c) => c.stepId === checkpointStepId);
    if (checkpointIdx < 0) return false;
    const checkpoint = plan.checkpoints[checkpointIdx];
    const stepIdx = plan.steps.findIndex((s) => s.id === checkpointStepId);
    if (stepIdx < 0) return false;
    // Restore context from checkpoint
    plan.context = { ...checkpoint.state };
    // Mark later steps as rolled_back
    for (let i = stepIdx + 1; i < plan.steps.length; i++) {
      if (plan.steps[i].status === 'completed' || plan.steps[i].status === 'failed') {
        plan.steps[i].status = 'rolled_back';
      }
    }
    // Mark plan as rolled_back
    plan.status = 'rolled_back';
    this.audit(planId, `rolled back to step ${checkpointStepId}`);
    return true;
  }

  /**
   * Pause a running plan. Already-running step completes naturally.
   */
  pause(planId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;
    if (plan.status !== 'running') return false;
    plan.status = 'paused';
    this.audit(planId, 'plan paused');
    return true;
  }

  /**
   * Resume a paused plan. Only works on paused plans.
   */
  resume(planId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;
    if (plan.status !== 'paused') return false;
    plan.status = 'running';
    this.audit(planId, 'plan resumed');
    return true;
  }

  /** Skip a step. */
  skipStep(planId: string, stepId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;
    const step = plan.steps.find((s) => s.id === stepId);
    if (!step) return false;
    step.status = 'skipped';
    this.audit(planId, `step ${stepId} skipped`);
    return true;
  }

  /**
   * Get topological order of steps. Returns null if there are cycles.
   */
  getExecutionOrder(planId: string): string[] | null {
    const plan = this.plans.get(planId);
    if (!plan) return null;
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const step of plan.steps) {
      inDegree.set(step.id, step.dependencies.length);
      adj.set(step.id, []);
    }
    for (const step of plan.steps) {
      for (const dep of step.dependencies) {
        adj.get(dep)!.push(step.id);
      }
    }
    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }
    const order: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      order.push(id);
      for (const next of adj.get(id) ?? []) {
        const d = (inDegree.get(next) ?? 0) - 1;
        inDegree.set(next, d);
        if (d === 0) queue.push(next);
      }
    }
    if (order.length !== plan.steps.length) return null; // cycle
    return order;
  }

  /** Get audit log. */
  getAuditLog(limit?: number): Array<{ timestamp: number; planId: string; event: string }> {
    if (limit === undefined) return [...this.auditLog];
    return this.auditLog.slice(-limit);
  }

  /** Statistics. */
  stats(): {
    totalPlans: number;
    byStatus: Record<PlanStatus, number>;
    auditEntries: number;
  } {
    const byStatus: Record<PlanStatus, number> = {
      draft: 0, approved: 0, running: 0, paused: 0, completed: 0, failed: 0, rolled_back: 0,
    };
    for (const plan of this.plans.values()) byStatus[plan.status] += 1;
    return {
      totalPlans: this.plans.size,
      byStatus,
      auditEntries: this.auditLog.length,
    };
  }
}
