/**
 * BaseAgent - Abstract base class for all agents
 * Provides common functionality for all agent types
 */

import type { AgentConfig, AgentMessage, AgentResult, AgentState, AgentStatus } from './types';
import { AgentStatus as Status } from './types';

export abstract class BaseAgent {
  protected id: string;
  protected name: string;
  protected role: string;
  protected capabilities: string[];
  protected status: AgentStatus;
  protected currentTask?: string;
  protected lastError?: string;
  protected messageCount: number;
  protected startTime?: number;
  protected model?: string;
  protected maxRetries: number;
  protected timeout: number;

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.capabilities = config.capabilities;
    this.status = Status.IDLE;
    this.messageCount = 0;
    this.model = config.model;
    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout ?? 30000;
  }

  /**
   * Get agent ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get agent role
   */
  getRole(): string {
    return this.role;
  }

  /**
   * Get current status
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Get current task
   */
  getCurrentTask(): string | undefined {
    return this.currentTask;
  }

  /**
   * Get last error
   */
  getLastError(): string | undefined {
    return this.lastError;
  }

  /**
   * Check if agent has a specific capability
   */
  hasCapability(capability: string): boolean {
    return this.capabilities.includes(capability);
  }

  /**
   * Get agent state
   */
  getState(): AgentState {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      currentTask: this.currentTask,
      lastError: this.lastError,
      messageCount: this.messageCount,
      startTime: this.startTime,
    };
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return {
      id: this.id,
      name: this.name,
      role: this.role as AgentConfig['role'],
      capabilities: this.capabilities,
      model: this.model,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
    };
  }

  /**
   * Set agent status
   */
  protected setStatus(status: AgentStatus): void {
    this.status = status;
  }

  /**
   * Set current task
   */
  protected setCurrentTask(task?: string): void {
    this.currentTask = task;
  }

  /**
   * Set last error
   */
  protected setLastError(error?: string): void {
    this.lastError = error;
  }

  /**
   * Increment message count
   */
  protected incrementMessageCount(): void {
    this.messageCount++;
  }

  /**
   * Reset agent state
   */
  reset(): void {
    this.status = Status.IDLE;
    this.currentTask = undefined;
    this.lastError = undefined;
    this.messageCount = 0;
    this.startTime = undefined;
  }

  /**
   * Abstract method to process a task
   */
  abstract process(input: unknown): Promise<AgentResult>;

  /**
   * Abstract method to handle incoming messages
   */
  abstract handleMessage(message: AgentMessage): Promise<void>;

  /**
   * Validate input before processing
   */
  protected validateInput(input: unknown): void {
    if (input === null || input === undefined) {
      throw new Error('Input cannot be null or undefined');
    }
  }

  /**
   * Create error result
   */
  protected createErrorResult(error: unknown, duration?: number): AgentResult {
    return {
      agent: this.id,
      data: null,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration,
    };
  }

  /**
   * Create success result
   */
  protected createSuccessResult<T>(data: T, duration?: number): AgentResult<T> {
    return {
      agent: this.id,
      data,
      success: true,
      duration,
    };
  }

  /**
   * Execute with retry logic
   */
  protected async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries?: number
  ): Promise<T> {
    const maxAttempts = retries ?? this.maxRetries;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await this.delay(100 * attempt); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * Delay helper
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if operation timed out
   */
  protected isTimedOut(startTime: number): boolean {
    return Date.now() - startTime > this.timeout;
  }
}
