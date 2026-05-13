/**
 * CoordinatorAgent
 * Orchestrates task distribution and manages specialist agents
 */

import { BaseAgent } from './BaseAgent';
import type { AgentConfig, AgentMessage, AgentResult, AgentTask } from './types';
import { AgentRole, AgentStatus } from './types';
import { AgentRegistry } from './agent-registry';

export interface CoordinatorConfig extends AgentConfig {
  maxConcurrentTasks?: number;
  taskTimeout?: number;
  registry?: AgentRegistry;
}

export class CoordinatorAgent extends BaseAgent {
  private pendingTasks: Map<string, AgentTask> = new Map();
  private completedTasks: Map<string, AgentTask> = new Map();
  private taskQueue: string[] = [];
  private maxConcurrentTasks: number;
  private taskTimeout: number;
  private registry?: AgentRegistry;

  constructor(config: CoordinatorConfig) {
    super({
      ...config,
      role: AgentRole.COORDINATOR,
    });
    this.maxConcurrentTasks = config.maxConcurrentTasks ?? 4;
    this.taskTimeout = config.taskTimeout ?? 60000;
    this.registry = config.registry;
  }

  /**
   * Set agent registry
   */
  setRegistry(registry: AgentRegistry): void {
    this.registry = registry;
  }

  /**
   * Find agent by capability - checks custom registry first
   */
  findAgentByCapability(capability: string): string | null {
    // Check custom registry first
    const customAgents = this.registry?.findByCapability(capability);
    if (customAgents && customAgents.length > 0) {
      return customAgents[0].id;
    }
    return null;
  }

  /**
   * Add a task to the queue
   */
  addTask(task: AgentTask): void {
    this.pendingTasks.set(task.id, task);
    this.taskQueue.push(task.id);
  }

  /**
   * Get next task from queue
   */
  getNextTask(): AgentTask | undefined {
    while (this.taskQueue.length > 0) {
      const taskId = this.taskQueue.shift()!;
      const task = this.pendingTasks.get(taskId);
      if (task && task.status === 'pending') {
        // Check dependencies
        if (this.checkDependencies(task)) {
          return task;
        }
      }
    }
    return undefined;
  }

  /**
   * Check if task dependencies are met
   */
  private checkDependencies(task: AgentTask): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }
    return task.dependencies.every(depId => {
      const depTask = this.completedTasks.get(depId);
      return depTask && depTask.status === 'completed';
    });
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId: string, status: AgentTask['status'], result?: unknown): void {
    const task = this.pendingTasks.get(taskId);
    if (task) {
      task.status = status;
      task.result = result;
      if (status === 'completed' || status === 'failed') {
        task.completedAt = Date.now();
        this.completedTasks.set(taskId, task);
        this.pendingTasks.delete(taskId);
      }
    }
  }

  /**
   * Get pending tasks count
   */
  getPendingCount(): number {
    return this.pendingTasks.size;
  }

  /**
   * Get completed tasks count
   */
  getCompletedCount(): number {
    return this.completedTasks.size;
  }

  /**
   * Get all pending tasks
   */
  getPendingTasks(): AgentTask[] {
    return Array.from(this.pendingTasks.values());
  }

  /**
   * Get all completed tasks
   */
  getCompletedTasks(): AgentTask[] {
    return Array.from(this.completedTasks.values());
  }

  /**
   * Check if can accept more tasks
   */
  canAcceptTask(): boolean {
    return this.pendingTasks.size < this.maxConcurrentTasks * 2;
  }

  /**
   * Check if can start new execution
   */
  canExecute(): boolean {
    const runningCount = Array.from(this.pendingTasks.values()).filter(
      t => t.status === 'in_progress'
    ).length;
    return runningCount < this.maxConcurrentTasks;
  }

  /**
   * Process input - coordinate tasks
   */
  async process(input: unknown): Promise<AgentResult> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);
    this.setCurrentTask('coordination');

    try {
      this.validateInput(input);

      const task = input as AgentTask;
      this.addTask(task);

      // Simulate coordination processing
      await this.delay(50);

      const result = {
        taskId: task.id,
        status: 'queued',
        queuePosition: this.pendingTasks.size,
      };

      this.setStatus(AgentStatus.IDLE);
      this.setCurrentTask(undefined);
      return this.createSuccessResult(result, Date.now() - startTime);
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      this.setLastError(error instanceof Error ? error.message : String(error));
      return this.createErrorResult(error, Date.now() - startTime);
    }
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(message: AgentMessage): Promise<void> {
    this.incrementMessageCount();

    switch (message.type) {
      case 'task':
        await this.handleTaskMessage(message);
        break;
      case 'result':
        await this.handleResultMessage(message);
        break;
      case 'error':
        await this.handleErrorMessage(message);
        break;
      case 'status':
        await this.handleStatusMessage(message);
        break;
    }
  }

  private async handleTaskMessage(message: AgentMessage): Promise<void> {
    const task = message.payload as AgentTask;
    this.addTask(task);
  }

  private async handleResultMessage(message: AgentMessage): Promise<void> {
    const { taskId, result } = message.payload as { taskId: string; result: unknown };
    this.updateTaskStatus(taskId, 'completed', result);
  }

  private async handleErrorMessage(message: AgentMessage): Promise<void> {
    const { taskId, error } = message.payload as { taskId: string; error: string };
    this.updateTaskStatus(taskId, 'failed');
    this.setLastError(error);
  }

  private async handleStatusMessage(message: AgentMessage): Promise<void> {
    // Handle status updates
    console.log(`[Coordinator] Status update from ${message.from}:`, message.payload);
  }

  /**
   * Reset coordinator state
   */
  reset(): void {
    super.reset();
    this.pendingTasks.clear();
    this.completedTasks.clear();
    this.taskQueue = [];
  }
}
