/**
 * SummarizerAgent
 * Generates structured key points from extraction result
 */

import { BaseAgent } from './BaseAgent';
import type { AgentConfig, AgentMessage, AgentResult } from './types';
import { AgentRole, AgentStatus } from './types';
import type { ExtractionResult } from './ExtractorAgent';

export interface SummaryResult {
  keyPoints: string[];
}

export interface SummarizerConfig extends AgentConfig {
  maxKeyPoints?: number;
}

export class SummarizerAgent extends BaseAgent {
  private maxKeyPoints: number;

  constructor(config: SummarizerConfig) {
    super({
      ...config,
      role: AgentRole.PIPELINE,
      capabilities: [...(config.capabilities || []), 'summarization'],
    });
    this.maxKeyPoints = config.maxKeyPoints ?? 5;
  }

  /**
   * Summarize extraction result into key points
   */
  async summarize(extraction: ExtractionResult): Promise<AgentResult<SummaryResult>> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);
    this.setCurrentTask('summarization');

    try {
      this.validateInput(extraction);

      const result = await this.performSummarization(extraction);

      this.setStatus(AgentStatus.IDLE);
      this.setCurrentTask(undefined);
      return this.createSuccessResult(result, Date.now() - startTime);
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      this.setLastError(error instanceof Error ? error.message : String(error));
      return this.createErrorResult(error, Date.now() - startTime) as AgentResult<SummaryResult>;
    }
  }

  /**
   * Perform summarization logic
   */
  private async performSummarization(extraction: ExtractionResult): Promise<SummaryResult> {
    // Simulate summarization delay
    await this.delay(150);

    // Generate mock key points based on summary content
    const summaryText = extraction.summary || '';
    const sentences = summaryText.split(/[.!?]+/).filter(s => s.trim().length > 10);

    const keyPoints: string[] = [];

    if (extraction.title) {
      keyPoints.push(`主题：${extraction.title.slice(0, 30)}`);
    }

    if (summaryText.length > 0) {
      keyPoints.push(`核心内容：${summaryText.slice(0, 50)}...`);
    }

    if (extraction.entities.length > 0) {
      keyPoints.push(`关键实体：${extraction.entities.slice(0, 3).join('、')}`);
    }

    // Add sentences as key points
    for (const sentence of sentences.slice(0, this.maxKeyPoints - keyPoints.length)) {
      const trimmed = sentence.trim().slice(0, 50);
      if (trimmed.length > 20) {
        keyPoints.push(trimmed);
      }
    }

    return {
      keyPoints: keyPoints.slice(0, this.maxKeyPoints),
    };
  }

  /**
   * Process input - summarize extraction
   */
  async process(input: unknown): Promise<AgentResult> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);

    try {
      this.validateInput(input);

      const extraction = input as ExtractionResult;
      const result = await this.summarize(extraction);

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
      const extraction = message.payload as ExtractionResult;
      await this.summarize(extraction);
    }
  }

  /**
   * Reset summarizer state
   */
  reset(): void {
    super.reset();
  }
}
