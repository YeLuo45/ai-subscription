/**
 * HookLifecycle — 17 typed hooks with async fire-and-forget execution
 *
 * Inspired by: ruflo-design Hooks (17 hooks + 12 background workers)
 * Source pattern: /home/hermes/projects/ruflo-design/docs-site/hooks.md
 *
 * Hook taxonomy (subset of ruflo's 17, focusing on lifecycle):
 *   - pre-task: before task starts (validation, setup)
 *   - post-task: after task completes (cleanup, logging)
 *   - tool-error: when a tool call fails (retry, alert)
 *   - agent-spawn: when a subagent is created (init, register)
 *   - agent-despawn: when subagent is destroyed (cleanup)
 *   - memory-store: when memory is written (cache, broadcast)
 *   - memory-retrieve: when memory is read (audit, prefetch)
 *   - security-violation: when a security check fails (alert, block)
 *   - config-change: when config is updated (reload, notify)
 *   - workflow-start: when a workflow begins
 *   - workflow-end: when a workflow completes
 *   - skill-register: when a skill is registered
 *   - skill-invoke: when a skill is invoked
 *   - budget-degrade: when budget tier changes
 *   - sync-conflict: when sync conflict detected
 *   - llm-before-call: before LLM call (context injection)
 *   - llm-after-call: after LLM call (logging)
 *
 * Hooks can be:
 *   - sync (return value) or async (Promise)
 *   - blocking (await) or non-blocking (fire-and-forget)
 *   - chained (next hook sees prev result)
 *   - filtered (only fire for matching context)
 *
 * 12 background workers (cleanup, telemetry, learning, etc.) also supported.
 */

export type HookName =
  | 'pre-task'
  | 'post-task'
  | 'tool-error'
  | 'agent-spawn'
  | 'agent-despawn'
  | 'memory-store'
  | 'memory-retrieve'
  | 'security-violation'
  | 'config-change'
  | 'workflow-start'
  | 'workflow-end'
  | 'skill-register'
  | 'skill-invoke'
  | 'budget-degrade'
  | 'sync-conflict'
  | 'llm-before-call'
  | 'llm-after-call';

export const ALL_HOOKS: HookName[] = [
  'pre-task',
  'post-task',
  'tool-error',
  'agent-spawn',
  'agent-despawn',
  'memory-store',
  'memory-retrieve',
  'security-violation',
  'config-change',
  'workflow-start',
  'workflow-end',
  'skill-register',
  'skill-invoke',
  'budget-degrade',
  'sync-conflict',
  'llm-before-call',
  'llm-after-call',
];

export interface HookContext {
  hook: HookName;
  timestamp: number;
  /** Hook-specific payload */
  payload: Record<string, unknown>;
  /** For chained hooks: previous result */
  previous?: unknown;
  /** Correlation ID for trace linking */
  correlationId?: string;
}

export type HookHandler = (ctx: HookContext) => void | Promise<void> | unknown | Promise<unknown>;

export interface HookRegistration {
  id: string;
  hook: HookName;
  handler: HookHandler;
  /** If true, runs in background (fire-and-forget) */
  async: boolean;
  /** Priority: lower runs first (default 100) */
  priority: number;
  /** Optional filter — return false to skip this hook for the context */
  filter?: (ctx: HookContext) => boolean;
  /** Optional name for debugging */
  name?: string;
  /** Number of times invoked */
  invocationCount: number;
  /** Last error if any */
  lastError?: string;
}

export interface HookFireResult {
  hook: HookName;
  totalHandlers: number;
  successful: number;
  failed: number;
  durationMs: number;
  /** Final chained result (if any handler returned non-undefined) */
  chainedResult?: unknown;
}

export interface BackgroundWorker {
  id: string;
  name: string;
  /** Worker function — receives a stop signal */
  handler: (stopSignal: { stopped: boolean }) => Promise<void>;
  /** Run interval in ms */
  intervalMs: number;
  /** Last run timestamp */
  lastRun?: number;
  /** Total runs */
  totalRuns: number;
  /** Last error */
  lastError?: string;
}

export class HookLifecycle {
  private hooks: Map<HookName, HookRegistration[]> = new Map();
  private workers: Map<string, BackgroundWorker> = new Map();
  private workerTimers: Map<string, NodeJS.Timeout> = new Map();
  private fireLog: Array<{ hook: HookName; timestamp: number; result: HookFireResult }> = [];
  private counter: number = 0;
  private stopped: boolean = false;

  /** Generate a unique registration ID. */
  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${Date.now().toString(36)}-${this.counter}`;
  }

  /** Register a hook handler. */
  register(
    hook: HookName,
    handler: HookHandler,
    options: Partial<Omit<HookRegistration, 'id' | 'hook' | 'handler' | 'invocationCount'>> = {},
  ): string {
    if (!ALL_HOOKS.includes(hook)) {
      throw new Error(`Unknown hook "${hook}". Valid: ${ALL_HOOKS.join(', ')}`);
    }
    const id = this.nextId('hook');
    const reg: HookRegistration = {
      id,
      hook,
      handler,
      async: options.async ?? false,
      priority: options.priority ?? 100,
      filter: options.filter,
      name: options.name,
      invocationCount: 0,
    };
    if (!this.hooks.has(hook)) this.hooks.set(hook, []);
    const list = this.hooks.get(hook)!;
    list.push(reg);
    list.sort((a, b) => a.priority - b.priority);
    return id;
  }

  /** Unregister a hook by id. Returns true if removed. */
  unregister(id: string): boolean {
    for (const list of this.hooks.values()) {
      const idx = list.findIndex((r) => r.id === id);
      if (idx >= 0) {
        list.splice(idx, 1);
        return true;
      }
    }
    return false;
  }

  /** Unregister all hooks for a given hook name. Returns count removed. */
  unregisterAll(hook: HookName): number {
    const list = this.hooks.get(hook);
    if (!list) return 0;
    const n = list.length;
    this.hooks.delete(hook);
    return n;
  }

  /** Get all registrations for a hook. */
  getRegistrations(hook: HookName): HookRegistration[] {
    return [...(this.hooks.get(hook) ?? [])];
  }

  /** Get total registration count. */
  totalRegistrations(): number {
    let total = 0;
    for (const list of this.hooks.values()) total += list.length;
    return total;
  }

  /**
   * Fire a hook. Runs handlers in priority order.
   * - Sync handlers: awaited sequentially
   * - Async handlers: fire-and-forget (return immediately)
   * - Filter: if returns false, skip that handler
   * - Chained: next handler sees previous result
   */
  async fire(
    hook: HookName,
    payload: Record<string, unknown> = {},
    options: { chained?: boolean; correlationId?: string } = {},
  ): Promise<HookFireResult> {
    if (!ALL_HOOKS.includes(hook)) {
      throw new Error(`Unknown hook "${hook}"`);
    }
    const start = Date.now();
    const ctx: HookContext = {
      hook,
      timestamp: start,
      payload: { ...payload },
      correlationId: options.correlationId,
    };
    const regs = this.hooks.get(hook) ?? [];
    let successful = 0;
    let failed = 0;
    let chainedResult: unknown = undefined;

    for (const reg of regs) {
      // Apply filter
      if (reg.filter && !reg.filter({ ...ctx, previous: chainedResult })) continue;

      reg.invocationCount += 1;
      try {
        if (reg.async) {
          // Fire and forget — do not await
          Promise.resolve()
            .then(() => reg.handler({ ...ctx, previous: chainedResult }))
            .catch((err) => {
              reg.lastError = err instanceof Error ? err.message : String(err);
            });
          successful += 1;
        } else {
          const result = await Promise.resolve(reg.handler({ ...ctx, previous: chainedResult }));
          if (result !== undefined && options.chained) {
            chainedResult = result;
          }
          successful += 1;
        }
      } catch (err) {
        failed += 1;
        reg.lastError = err instanceof Error ? err.message : String(err);
      }
    }

    const result: HookFireResult = {
      hook,
      totalHandlers: regs.length,
      successful,
      failed,
      durationMs: Date.now() - start,
      chainedResult,
    };
    this.fireLog.push({ hook, timestamp: start, result });
    // Bound log to last 1000 entries
    if (this.fireLog.length > 1000) this.fireLog.shift();
    return result;
  }

  /**
   * Fire and forget (don't await handlers in the foreground).
   * Useful for "fire a hook" without blocking the caller.
   */
  fireAndForget(hook: HookName, payload: Record<string, unknown> = {}): void {
    this.fire(hook, payload).catch(() => {
      // swallow — async handlers manage their own errors
    });
  }

  /** Get the fire log. */
  getFireLog(limit?: number): Array<{ hook: HookName; timestamp: number; result: HookFireResult }> {
    if (limit === undefined) return [...this.fireLog];
    return this.fireLog.slice(-limit);
  }

  /** Clear the fire log. */
  clearFireLog(): void {
    this.fireLog = [];
  }

  /**
   * Register a background worker (ruflo pattern: 12 background workers).
   * Worker runs `handler` every `intervalMs` until stopped.
   */
  registerWorker(
    name: string,
    handler: BackgroundWorker['handler'],
    intervalMs: number,
  ): string {
    if (intervalMs < 100) {
      throw new Error('intervalMs must be >= 100ms');
    }
    const id = this.nextId('worker');
    const worker: BackgroundWorker = {
      id,
      name,
      handler,
      intervalMs,
      totalRuns: 0,
    };
    this.workers.set(id, worker);

    // Start the worker
    if (!this.stopped) {
      const stopSignal = { stopped: false };
      const timer = setInterval(async () => {
        if (stopSignal.stopped || this.stopped) return;
        try {
          await worker.handler(stopSignal);
          worker.totalRuns += 1;
          worker.lastRun = Date.now();
        } catch (err) {
          worker.lastError = err instanceof Error ? err.message : String(err);
        }
      }, intervalMs);
      this.workerTimers.set(id, timer);
      // Store stopSignal on the worker for cleanup
      (worker as BackgroundWorker & { _stopSignal?: typeof stopSignal })._stopSignal = stopSignal;
    }
    return id;
  }

  /** Stop and remove a worker. */
  unregisterWorker(id: string): boolean {
    const timer = this.workerTimers.get(id);
    if (timer) clearInterval(timer);
    this.workerTimers.delete(id);
    return this.workers.delete(id);
  }

  /** List all workers. */
  listWorkers(): BackgroundWorker[] {
    return Array.from(this.workers.values()).map((w) => ({ ...w }));
  }

  /** Stop all workers and clear hooks. */
  shutdown(): void {
    this.stopped = true;
    for (const [id, timer] of this.workerTimers) {
      const worker = this.workers.get(id);
      if (worker) {
        const sig = (worker as BackgroundWorker & { _stopSignal?: { stopped: boolean } })._stopSignal;
        if (sig) sig.stopped = true;
      }
      clearInterval(timer);
    }
    this.workerTimers.clear();
    this.hooks.clear();
    this.workers.clear();
  }

  /** Resume after shutdown (creates a new instance, basically). */
  isShutdown(): boolean {
    return this.stopped;
  }
}
