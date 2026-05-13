/**
 * Context Pool for Managing Multi-Agent Contexts
 * Allows parallel agent execution with shared context management
 * Zero dependencies - pure TypeScript implementation
 */

import type {
  AgentContext,
  AgentId,
  AgentStatus,
  ContextPoolOptions,
  AgentResult,
} from './types';

let contextIdCounter = 0;

function generateContextId(): string {
  return `ctx_${Date.now()}_${++contextIdCounter}`;
}

/**
 * Context Pool for managing concurrent agent execution contexts
 * Provides thread-safe context management with concurrency control
 */
export class ContextPool {
  private contexts: Map<string, AgentContext> = new Map();
  private maxConcurrent: number;
  private defaultTimeout: number;
  private enableMetrics: boolean;
  private runningCount = 0;

  constructor(options: ContextPoolOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 4;
    this.defaultTimeout = options.defaultTimeout ?? 30000;
    this.enableMetrics = options.enableMetrics ?? false;
  }

  /**
   * Create a new context for an agent
   */
  createContext(agent: AgentId, metadata?: Record<string, unknown>): AgentContext {
    const context: AgentContext = {
      id: generateContextId(),
      agent,
      status: 'pending',
      metadata,
    };
    this.contexts.set(context.id, context);

    if (this.enableMetrics) {
      console.log(`[ContextPool] Created context ${context.id} for agent ${agent.id}`);
    }

    return context;
  }

  /**
   * Get a context by ID
   */
  getContext(id: string): AgentContext | undefined {
    return this.contexts.get(id);
  }

  /**
   * Update context status and result
   */
  updateContext(id: string, updates: Partial<AgentContext>): void {
    const context = this.contexts.get(id);
    if (!context) {
      console.warn(`[ContextPool] Context ${id} not found`);
      return;
    }

    // Track running count
    if (context.status !== 'running' && updates.status === 'running') {
      this.runningCount++;
    }
    if (context.status === 'running' && updates.status !== 'running') {
      this.runningCount--;
    }

    // Apply updates
    Object.assign(context, updates);

    // Auto-set timestamps
    if (updates.status === 'running' && !context.startTime) {
      context.startTime = Date.now();
    }
    if (updates.status === 'completed' || updates.status === 'failed') {
      context.endTime = Date.now();
      if (context.startTime) {
        context.duration = context.endTime - context.startTime;
      }
    }

    if (this.enableMetrics) {
      console.log(`[ContextPool] Updated context ${id}: ${updates.status}`);
    }
  }

  /**
   * Mark context as started
   */
  startContext(id: string): void {
    this.updateContext(id, { status: 'running' });
  }

  /**
   * Mark context as completed with result
   */
  completeContext<T>(id: string, result: T): void {
    this.updateContext(id, { status: 'completed', result });
  }

  /**
   * Mark context as failed with error
   */
  failContext(id: string, error: string): void {
    this.updateContext(id, { status: 'failed', error });
  }

  /**
   * Set critic score for a context
   */
  setScore(id: string, score: number): void {
    this.updateContext(id, { score });
  }

  /**
   * Get all contexts for a specific agent
   */
  getContextsByAgent(agentId: AgentId): AgentContext[] {
    return Array.from(this.contexts.values()).filter(c => c.agent.id === agentId.id);
  }

  /**
   * Get all contexts with a specific status
   */
  getContextsByStatus(status: AgentStatus): AgentContext[] {
    return Array.from(this.contexts.values()).filter(c => c.status === status);
  }

  /**
   * Get running contexts count
   */
  getRunningCount(): number {
    return this.runningCount;
  }

  /**
   * Get pending contexts count
   */
  getPendingCount(): number {
    return Array.from(this.contexts.values()).filter(c => c.status === 'pending').length;
  }

  /**
   * Get completed contexts count
   */
  getCompletedCount(): number {
    return Array.from(this.contexts.values()).filter(c => c.status === 'completed').length;
  }

  /**
   * Get failed contexts count
   */
  getFailedCount(): number {
    return Array.from(this.contexts.values()).filter(c => c.status === 'failed').length;
  }

  /**
   * Check if we can start a new concurrent execution
   */
  canExecute(): boolean {
    return this.runningCount < this.maxConcurrent;
  }

  /**
   * Wait until a slot is available
   */
  async waitForSlot(timeout?: number): Promise<boolean> {
    const startTime = Date.now();
    const maxWait = timeout ?? this.defaultTimeout;

    while (this.runningCount >= this.maxConcurrent) {
      if (Date.now() - startTime > maxWait) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return true;
  }

  /**
   * Execute a task with automatic context management
   */
  async execute<TInput, TOutput>(
    agent: AgentId,
    task: (input: TInput) => Promise<TOutput> | TOutput,
    input: TInput,
    metadata?: Record<string, unknown>
  ): Promise<AgentResult<TOutput>> {
    const context = this.createContext(agent, metadata);

    if (!this.canExecute()) {
      const acquired = await this.waitForSlot();
      if (!acquired) {
        this.failContext(context.id, 'Timeout waiting for execution slot');
        return {
          agent,
          data: undefined as TOutput,
          success: false,
          error: 'Timeout waiting for execution slot',
        };
      }
    }

    this.startContext(context.id);
    const startTime = Date.now();

    try {
      const result = await task(input);
      const duration = Date.now() - startTime;
      this.completeContext(context.id, result);

      return {
        agent,
        data: result,
        success: true,
        duration,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.failContext(context.id, error);

      return {
        agent,
        data: undefined as TOutput,
        success: false,
        error,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get all contexts
   */
  getAllContexts(): AgentContext[] {
    return Array.from(this.contexts.values());
  }

  /**
   * Get context statistics
   */
  getStats(): {
    total: number;
    running: number;
    pending: number;
    completed: number;
    failed: number;
  } {
    const all = this.getAllContexts();
    return {
      total: all.length,
      running: this.getRunningCount(),
      pending: this.getPendingCount(),
      completed: this.getCompletedCount(),
      failed: this.getFailedCount(),
    };
  }

  /**
   * Clear completed/failed contexts
   */
  cleanup(): number {
    let count = 0;
    const entries = Array.from(this.contexts.entries());
    for (const [id, context] of entries) {
      if (context.status === 'completed' || context.status === 'failed') {
        this.contexts.delete(id);
        count++;
      }
    }

    if (this.enableMetrics && count > 0) {
      console.log(`[ContextPool] Cleaned up ${count} contexts`);
    }

    return count;
  }

  /**
   * Clear all contexts
   */
  clear(): void {
    this.contexts.clear();
    this.runningCount = 0;

    if (this.enableMetrics) {
      console.log('[ContextPool] All contexts cleared');
    }
  }

  /**
   * Set max concurrent limit
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
  }

  /**
   * Get max concurrent limit
   */
  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }
}

// Singleton instance
export const contextPool = new ContextPool();

/**
 * Create a new ContextPool instance (for isolated multi-agent environments)
 */
export function createContextPool(options?: ContextPoolOptions): ContextPool {
  return new ContextPool(options);
}
