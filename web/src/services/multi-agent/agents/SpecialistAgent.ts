/**
 * SpecialistAgent
 * Executes specific tasks within its domain of expertise
 */

import { BaseAgent } from './BaseAgent';
import type { AgentConfig, AgentMessage, AgentResult } from './types';
import { AgentRole, AgentStatus } from './types';

export interface SpecialistConfig extends AgentConfig {
  specialty: string;
  maxExecutionTime?: number;
}

export class SpecialistAgent extends BaseAgent {
  private specialty: string;
  private maxExecutionTime: number;
  private supportedTaskTypes: Set<string>;

  constructor(config: SpecialistConfig) {
    super({
      ...config,
      role: AgentRole.SPECIALIST,
    });
    this.specialty = config.specialty;
    this.maxExecutionTime = config.maxExecutionTime ?? 30000;
    this.supportedTaskTypes = new Set(config.capabilities);
  }

  /**
   * Get specialty domain
   */
  getSpecialty(): string {
    return this.specialty;
  }

  /**
   * Check if task type is supported
   */
  supportsTaskType(taskType: string): boolean {
    return this.supportedTaskTypes.has(taskType);
  }

  /**
   * Get supported task types
   */
  getSupportedTaskTypes(): string[] {
    return Array.from(this.supportedTaskTypes);
  }

  /**
   * Execute a specialized task
   */
  async executeTask(taskType: string, inputs: Record<string, unknown>): Promise<AgentResult> {
    if (!this.supportsTaskType(taskType)) {
      return this.createErrorResult(new Error(`Task type ${taskType} not supported`));
    }

    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);
    this.setCurrentTask(taskType);

    try {
      // Execute based on task type
      const result = await this.executeWithRetry(async () => {
        return this.performTask(taskType, inputs);
      });

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
   * Perform the actual task based on type
   */
  private async performTask(taskType: string, inputs: Record<string, unknown>): Promise<unknown> {
    // Simulate task execution with delay
    await this.delay(Math.random() * 100 + 50);

    // Return mock result based on specialty
    return {
      taskType,
      specialty: this.specialty,
      inputs,
      processed: true,
      timestamp: Date.now(),
    };
  }

  /**
   * Process input - delegate to task execution
   */
  async process(input: unknown): Promise<AgentResult> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);

    try {
      this.validateInput(input);

      const { taskType, inputs } = input as { taskType: string; inputs: Record<string, unknown> };
      const result = await this.executeTask(taskType, inputs);

      this.setStatus(AgentStatus.IDLE);
      return { ...result, duration: Date.now() - startTime };
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

    if (message.type === 'task') {
      const { taskType, inputs } = message.payload as {
        taskType: string;
        inputs: Record<string, unknown>;
      };
      await this.executeTask(taskType, inputs);
    }
  }

  /**
   * Reset specialist state
   */
  reset(): void {
    super.reset();
  }
}
