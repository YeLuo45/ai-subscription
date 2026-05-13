/**
 * CriticAgent
 * Evaluates and scores agent outputs for quality assurance
 */

import { BaseAgent } from './BaseAgent';
import type { AgentConfig, AgentMessage, AgentResult } from './types';
import { AgentRole, AgentStatus } from './types';

export interface CriticScore {
  overall: number;
  accuracy: number;
  coherence: number;
  relevance: number;
  details: string;
}

export interface AgentOutput {
  extraction?: {
    title?: string;
    summary?: string;
    entities?: string[];
  };
  summary?: {
    keyPoints?: string[];
  };
  tags?: {
    tags?: string[];
  };
  translation?: {
    translatedTitle?: string;
    translatedDescription?: string;
  };
}

const DEFAULT_SCORE: CriticScore = {
  overall: 70,
  accuracy: 70,
  coherence: 70,
  relevance: 70,
  details: 'Fallback score due to evaluation error',
};

export interface CriticConfig extends AgentConfig {
  minAcceptableScore?: number;
}

export class CriticAgent extends BaseAgent {
  private minAcceptableScore: number;

  constructor(config: CriticConfig) {
    super({
      ...config,
      role: AgentRole.CRITIC,
    });
    this.minAcceptableScore = config.minAcceptableScore ?? 50;
  }

  /**
   * Get minimum acceptable score threshold
   */
  getMinAcceptableScore(): number {
    return this.minAcceptableScore;
  }

  /**
   * Set minimum acceptable score threshold
   */
  setMinAcceptableScore(score: number): void {
    this.minAcceptableScore = Math.min(100, Math.max(0, score));
  }

  /**
   * Evaluate agent output and return scores
   */
  async evaluate(output: AgentOutput): Promise<AgentResult<CriticScore>> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);
    this.setCurrentTask('evaluation');

    try {
      const score = await this.performEvaluation(output);

      this.setStatus(AgentStatus.IDLE);
      this.setCurrentTask(undefined);
      return this.createSuccessResult(score, Date.now() - startTime);
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      this.setLastError(error instanceof Error ? error.message : String(error));
      return this.createErrorResult(error, Date.now() - startTime) as AgentResult<CriticScore>;
    }
  }

  /**
   * Perform actual evaluation logic
   */
  private async performEvaluation(output: AgentOutput): Promise<CriticScore> {
    // Simulate evaluation delay
    await this.delay(100);

    // Basic validation scoring
    let accuracy = 70;
    let coherence = 70;
    let relevance = 70;
    let details = 'Basic evaluation completed';

    // Check extraction quality
    if (output.extraction) {
      if (output.extraction.title && output.extraction.title.length > 0) {
        accuracy += 10;
      }
      if (output.extraction.summary && output.extraction.summary.length > 50) {
        coherence += 5;
      }
      if (output.extraction.entities && output.extraction.entities.length > 0) {
        relevance += 5;
      }
    }

    // Check summary quality
    if (output.summary) {
      if (output.summary.keyPoints && output.summary.keyPoints.length > 0) {
        accuracy += 5;
        coherence += 5;
      }
    }

    // Check tags quality
    if (output.tags) {
      if (output.tags.tags && output.tags.tags.length > 0) {
        relevance += 5;
      }
    }

    // Check translation quality
    if (output.translation) {
      if (
        output.translation.translatedTitle &&
        output.translation.translatedTitle !== output.extraction?.title
      ) {
        accuracy += 5;
      }
    }

    const overall = Math.round((accuracy + coherence + relevance) / 3);

    return {
      overall,
      accuracy: Math.min(100, accuracy),
      coherence: Math.min(100, coherence),
      relevance: Math.min(100, relevance),
      details,
    };
  }

  /**
   * Check if score indicates quality fallback is needed
   */
  needsFallback(score: CriticScore): boolean {
    return score.overall < this.minAcceptableScore || score.accuracy < 40;
  }

  /**
   * Compare two scores and return the better one
   */
  compareScores(a: CriticScore, b: CriticScore): CriticScore {
    return a.overall >= b.overall ? a : b;
  }

  /**
   * Process input - evaluate as critic
   */
  async process(input: unknown): Promise<AgentResult> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);

    try {
      this.validateInput(input);
      const output = input as AgentOutput;
      const result = await this.evaluate(output);

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
      const output = message.payload as AgentOutput;
      await this.evaluate(output);
    }
  }

  /**
   * Reset critic state
   */
  reset(): void {
    super.reset();
  }
}
