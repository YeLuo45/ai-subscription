/**
 * TaggerAgent
 * Generates tags for article categorization
 */

import { BaseAgent } from './BaseAgent';
import type { AgentConfig, AgentMessage, AgentResult } from './types';
import { AgentRole, AgentStatus } from './types';

export interface TagResult {
  tags: string[];
}

export interface TaggerConfig extends AgentConfig {
  maxTags?: number;
}

export class TaggerAgent extends BaseAgent {
  private maxTags: number;

  constructor(config: TaggerConfig) {
    super({
      ...config,
      role: AgentRole.PIPELINE,
      capabilities: [...(config.capabilities || []), 'tagging'],
    });
    this.maxTags = config.maxTags ?? 3;
  }

  /**
   * Generate tags for content categorization
   */
  async tag(content: string): Promise<AgentResult<TagResult>> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);
    this.setCurrentTask('tagging');

    try {
      this.validateInput(content);

      const result = await this.performTagging(content);

      this.setStatus(AgentStatus.IDLE);
      this.setCurrentTask(undefined);
      return this.createSuccessResult(result, Date.now() - startTime);
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      this.setLastError(error instanceof Error ? error.message : String(error));
      return this.createErrorResult(error, Date.now() - startTime) as AgentResult<TagResult>;
    }
  }

  /**
   * Perform tagging logic
   */
  private async performTagging(content: string): Promise<TagResult> {
    // Simulate tagging delay
    await this.delay(100);

    // Simple keyword-based tagging
    const lowerContent = content.toLowerCase();
    const tags: string[] = [];

    // Topic detection
    if (
      lowerContent.includes('科技') ||
      lowerContent.includes('技术') ||
      lowerContent.includes('software') ||
      lowerContent.includes('ai')
    ) {
      tags.push('科技');
    } else if (
      lowerContent.includes('财经') ||
      lowerContent.includes('金融') ||
      lowerContent.includes('投资') ||
      lowerContent.includes('股票')
    ) {
      tags.push('财经');
    } else if (
      lowerContent.includes('教育') ||
      lowerContent.includes('学习') ||
      lowerContent.includes('学校')
    ) {
      tags.push('教育');
    } else if (
      lowerContent.includes('新闻') ||
      lowerContent.includes('事件') ||
      lowerContent.includes('报道')
    ) {
      tags.push('新闻');
    } else if (
      lowerContent.includes('娱乐') ||
      lowerContent.includes('明星') ||
      lowerContent.includes('电影')
    ) {
      tags.push('娱乐');
    } else {
      tags.push('综合');
    }

    // Form detection
    if (
      lowerContent.includes('教程') ||
      lowerContent.includes('how to') ||
      lowerContent.includes('指南')
    ) {
      tags.push('教程');
    } else if (
      lowerContent.includes('评论') ||
      lowerContent.includes('分析') ||
      lowerContent.includes('观点')
    ) {
      tags.push('评论');
    } else if (
      lowerContent.includes('资讯') ||
      lowerContent.includes('新闻')
    ) {
      tags.push('资讯');
    } else {
      tags.push('内容');
    }

    // Tone detection
    if (
      lowerContent.includes('深度') ||
      lowerContent.includes('分析') ||
      lowerContent.includes('研究')
    ) {
      tags.push('深度');
    } else if (
      lowerContent.includes('轻松') ||
      lowerContent.includes('有趣') ||
      lowerContent.includes('搞笑')
    ) {
      tags.push('轻松');
    } else if (
      lowerContent.includes('热点') ||
      lowerContent.includes('热门') ||
      lowerContent.includes('最新')
    ) {
      tags.push('热点');
    } else {
      tags.push('一般');
    }

    return {
      tags: tags.slice(0, this.maxTags),
    };
  }

  /**
   * Process input - tag content
   */
  async process(input: unknown): Promise<AgentResult> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);

    try {
      this.validateInput(input);

      const { content } = input as { content: string };
      const result = await this.tag(content);

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
      await this.tag(content);
    }
  }

  /**
   * Reset tagger state
   */
  reset(): void {
    super.reset();
  }
}
