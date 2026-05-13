/**
 * Context Pool for Managing Concurrent Agent Contexts
 * Allows parallel agent execution with shared context
 */

export interface AgentContext {
  id: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  startTime?: number;
  endTime?: number;
  score?: number; // For critic evaluation
}

let contextIdCounter = 0;

function generateContextId(): string {
  return `ctx_${Date.now()}_${++contextIdCounter}`;
}

/**
 * Context Pool for managing concurrent agent execution contexts
 */
export class ContextPool {
  private contexts: Map<string, AgentContext> = new Map();
  private maxConcurrent: number;

  constructor(maxConcurrent = 4) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Create a new context for an agent
   */
  createContext(agent: string): AgentContext {
    const context: AgentContext = {
      id: generateContextId(),
      agent,
      status: 'pending',
    };
    this.contexts.set(context.id, context);
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
    if (context) {
      Object.assign(context, updates);
      if (updates.status === 'running' && !context.startTime) {
        context.startTime = Date.now();
      }
      if (updates.status === 'completed' || updates.status === 'failed') {
        context.endTime = Date.now();
      }
    }
  }

  /**
   * Get all contexts for a specific agent
   */
  getContextsByAgent(agent: string): AgentContext[] {
    return Array.from(this.contexts.values()).filter(c => c.agent === agent);
  }

  /**
   * Get running contexts count
   */
  getRunningCount(): number {
    return Array.from(this.contexts.values()).filter(c => c.status === 'running').length;
  }

  /**
   * Check if we can start a new concurrent execution
   */
  canExecute(): boolean {
    return this.getRunningCount() < this.maxConcurrent;
  }

  /**
   * Wait until a slot is available
   */
  async waitForSlot(): Promise<void> {
    while (!this.canExecute()) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Get all contexts
   */
  getAllContexts(): AgentContext[] {
    return Array.from(this.contexts.values());
  }

  /**
   * Clear completed/failed contexts
   */
  cleanup(): void {
    for (const [id, context] of this.contexts) {
      if (context.status === 'completed' || context.status === 'failed') {
        this.contexts.delete(id);
      }
    }
  }

  /**
   * Clear all contexts
   */
  clear(): void {
    this.contexts.clear();
  }
}

// Singleton instance with higher concurrency for parallel tagger+translator
export const contextPool = new ContextPool(4);
