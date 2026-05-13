/**
 * ExtractorAgent
 * Extracts title, summary, and entities from article content
 */

import { BaseAgent } from './BaseAgent';
import type { AgentConfig, AgentMessage, AgentResult } from './types';
import { AgentRole, AgentStatus } from './types';

export interface ExtractionResult {
  title: string;
  summary: string;
  entities: string[];
}

export interface ExtractorConfig extends AgentConfig {
  maxContentLength?: number;
}

export class ExtractorAgent extends BaseAgent {
  private maxContentLength: number;

  constructor(config: ExtractorConfig) {
    super({
      ...config,
      role: AgentRole.PIPELINE,
      capabilities: [...(config.capabilities || []), 'extraction'],
    });
    this.maxContentLength = config.maxContentLength ?? 4000;
  }

  /**
   * Extract key information from content
   */
  async extract(content: string): Promise<AgentResult<ExtractionResult>> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);
    this.setCurrentTask('extraction');

    try {
      this.validateInput(content);

      const truncatedContent = content.slice(0, this.maxContentLength);
      const result = await this.performExtraction(truncatedContent);

      this.setStatus(AgentStatus.IDLE);
      this.setCurrentTask(undefined);
      return this.createSuccessResult(result, Date.now() - startTime);
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      this.setLastError(error instanceof Error ? error.message : String(error));
      return this.createErrorResult(error, Date.now() - startTime) as AgentResult<ExtractionResult>;
    }
  }

  /**
   * Perform extraction logic
   */
  private async performExtraction(content: string): Promise<ExtractionResult> {
    // Simulate extraction delay
    await this.delay(150);

    // Basic extraction logic - in real implementation, this would call an LLM
    const lines = content.split('\n').filter(line => line.trim());
    const firstLine = lines[0] || 'Untitled';
    const title = firstLine.slice(0, 50);

    // Generate mock summary
    const summary = content.slice(0, 200).trim() + (content.length > 200 ? '...' : '');

    // Extract mock entities (simple word frequency approach)
    const words = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    const uniqueEntities = Array.from(new Set(words)).slice(0, 5);

    return {
      title,
      summary: summary || 'No summary available',
      entities: uniqueEntities.length > 0 ? uniqueEntities : ['General'],
    };
  }

  /**
   * Process input - extract from article
   */
  async process(input: unknown): Promise<AgentResult> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);

    try {
      this.validateInput(input);

      const { content } = input as { content: string };
      const result = await this.extract(content);

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
      const { content } = message.payload as { content: string };
      await this.extract(content);
    }
  }

  /**
   * Reset extractor state
   */
  reset(): void {
    super.reset();
  }
}
