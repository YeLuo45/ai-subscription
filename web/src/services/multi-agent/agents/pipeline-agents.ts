/**
 * Pipeline Agents
 * Four specialist agents for extraction, summarization, tagging, and translation
 * Extends SpecialistAgent abstract class for unified task execution interface
 */

import { SpecialistAgent } from './SpecialistAgent';
import type { SpecialistConfig } from './SpecialistAgent';
import { AgentStatus, AgentRole } from './types';

// Re-export result types from individual agents
export type { ExtractionResult } from './ExtractorAgent';
export type { SummaryResult } from './SummarizerAgent';
export type { TagResult } from './TaggerAgent';
export type { TranslationResult, Language } from './TranslatorAgent';

/**
 * Pipeline Agent Types
 */
export type PipelineAgentType = 'extractor' | 'summarizer' | 'tagger' | 'translator';

/**
 * Default agent configuration factory
 */
function createDefaultConfig(id: string, name: string, specialty: string, capabilities: string[]): SpecialistConfig {
  return {
    id,
    name,
    role: AgentRole.SPECIALIST,
    specialty,
    capabilities,
    maxRetries: 3,
    timeout: 30000,
  };
}

/**
 * Extractor Agent
 * Extracts title, summary, and entities from article content
 */
export class ExtractorPipelineAgent extends SpecialistAgent {
  private maxContentLength: number;

  constructor(config?: { maxContentLength?: number }) {
    const maxContentLength = config?.maxContentLength ?? 4000;
    super(createDefaultConfig('extractor', 'Extractor', 'extraction', ['extraction']));
    this.maxContentLength = maxContentLength;
  }

  /**
   * Execute extraction on content
   */
  async execute(content: string): Promise<{ title: string; summary: string; entities: string[] }> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);
    this.setCurrentTask('extraction');

    try {
      const truncatedContent = content.slice(0, this.maxContentLength);
      const result = await this.performExtraction(truncatedContent);

      this.setStatus(AgentStatus.IDLE);
      this.setCurrentTask(undefined);
      return result;
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      this.setLastError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async performExtraction(content: string): Promise<{ title: string; summary: string; entities: string[] }> {
    await this.delay(150); // Simulate async work

    const lines = content.split('\n').filter(line => line.trim());
    const firstLine = lines[0] || 'Untitled';
    const title = firstLine.slice(0, 50);
    const summary = content.slice(0, 200).trim() + (content.length > 200 ? '...' : '');

    const words = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    const uniqueEntities = Array.from(new Set(words)).slice(0, 5);

    return {
      title,
      summary: summary || 'No summary available',
      entities: uniqueEntities.length > 0 ? uniqueEntities : ['General'],
    };
  }
}

/**
 * Summarizer Agent
 * Generates structured key points from extraction result
 */
export class SummarizerPipelineAgent extends SpecialistAgent {
  private maxKeyPoints: number;

  constructor(config?: { maxKeyPoints?: number }) {
    const maxKeyPoints = config?.maxKeyPoints ?? 5;
    super(createDefaultConfig('summarizer', 'Summarizer', 'summarization', ['summarization']));
    this.maxKeyPoints = maxKeyPoints;
  }

  /**
   * Execute summarization on extraction result
   */
  async execute(extraction: { title: string; summary: string; entities: string[] }): Promise<{ keyPoints: string[] }> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);
    this.setCurrentTask('summarization');

    try {
      const result = await this.performSummarization(extraction);

      this.setStatus(AgentStatus.IDLE);
      this.setCurrentTask(undefined);
      return result;
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      this.setLastError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async performSummarization(extraction: { title: string; summary: string; entities: string[] }): Promise<{ keyPoints: string[] }> {
    await this.delay(150);

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

    for (const sentence of sentences.slice(0, this.maxKeyPoints - keyPoints.length)) {
      const trimmed = sentence.trim().slice(0, 50);
      if (trimmed.length > 20) {
        keyPoints.push(trimmed);
      }
    }

    return { keyPoints: keyPoints.slice(0, this.maxKeyPoints) };
  }
}

/**
 * Tagger Agent
 * Generates tags for article categorization
 */
export class TaggerPipelineAgent extends SpecialistAgent {
  private maxTags: number;

  constructor(config?: { maxTags?: number }) {
    const maxTags = config?.maxTags ?? 3;
    super(createDefaultConfig('tagger', 'Tagger', 'tagging', ['tagging']));
    this.maxTags = maxTags;
  }

  /**
   * Execute tagging on content
   */
  async execute(content: string): Promise<{ tags: string[] }> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);
    this.setCurrentTask('tagging');

    try {
      const result = await this.performTagging(content);

      this.setStatus(AgentStatus.IDLE);
      this.setCurrentTask(undefined);
      return result;
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      this.setLastError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async performTagging(content: string): Promise<{ tags: string[] }> {
    await this.delay(100);

    const lowerContent = content.toLowerCase();
    const tags: string[] = [];

    // Topic detection
    if (lowerContent.includes('科技') || lowerContent.includes('技术') || lowerContent.includes('software') || lowerContent.includes('ai')) {
      tags.push('科技');
    } else if (lowerContent.includes('财经') || lowerContent.includes('金融') || lowerContent.includes('投资') || lowerContent.includes('股票')) {
      tags.push('财经');
    } else if (lowerContent.includes('教育') || lowerContent.includes('学习') || lowerContent.includes('学校')) {
      tags.push('教育');
    } else if (lowerContent.includes('新闻') || lowerContent.includes('事件') || lowerContent.includes('报道')) {
      tags.push('新闻');
    } else if (lowerContent.includes('娱乐') || lowerContent.includes('明星') || lowerContent.includes('电影')) {
      tags.push('娱乐');
    } else {
      tags.push('综合');
    }

    // Form detection
    if (lowerContent.includes('教程') || lowerContent.includes('how to') || lowerContent.includes('指南')) {
      tags.push('教程');
    } else if (lowerContent.includes('评论') || lowerContent.includes('分析') || lowerContent.includes('观点')) {
      tags.push('评论');
    } else if (lowerContent.includes('资讯') || lowerContent.includes('新闻')) {
      tags.push('资讯');
    } else {
      tags.push('内容');
    }

    // Tone detection
    if (lowerContent.includes('深度') || lowerContent.includes('分析') || lowerContent.includes('研究')) {
      tags.push('深度');
    } else if (lowerContent.includes('轻松') || lowerContent.includes('有趣') || lowerContent.includes('搞笑')) {
      tags.push('轻松');
    } else if (lowerContent.includes('热点') || lowerContent.includes('热门') || lowerContent.includes('最新')) {
      tags.push('热点');
    } else {
      tags.push('一般');
    }

    return { tags: tags.slice(0, this.maxTags) };
  }
}

/**
 * Translator Agent
 * Translates title and description to target language
 */
export class TranslatorPipelineAgent extends SpecialistAgent {
  private defaultTargetLang: 'ZH' | 'EN' | 'JA' | 'KO' | 'FR' | 'DE' | 'ES';
  private languageNames: Record<string, string> = {
    ZH: '中文', EN: '英文', JA: '日文', KO: '韩文', FR: '法文', DE: '德文', ES: '西班牙文',
  };

  constructor(config?: { defaultTargetLang?: 'ZH' | 'EN' | 'JA' | 'KO' | 'FR' | 'DE' | 'ES' }) {
    const defaultTargetLang = config?.defaultTargetLang ?? 'EN';
    super(createDefaultConfig('translator', 'Translator', 'translation', ['translation']));
    this.defaultTargetLang = defaultTargetLang;
  }

  /**
   * Execute translation on article
   */
  async execute(
    article: { title: string; description?: string },
    targetLang?: 'ZH' | 'EN' | 'JA' | 'KO' | 'FR' | 'DE' | 'ES'
  ): Promise<{ translatedTitle: string; translatedDescription: string }> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);
    this.setCurrentTask('translation');

    try {
      const lang = targetLang ?? this.defaultTargetLang;
      const result = await this.performTranslation(article, lang);

      this.setStatus(AgentStatus.IDLE);
      this.setCurrentTask(undefined);
      return result;
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      this.setLastError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async performTranslation(
    article: { title: string; description?: string },
    targetLang: string
  ): Promise<{ translatedTitle: string; translatedDescription: string }> {
    await this.delay(200);

    const langName = this.languageNames[targetLang] || '英文';
    const translatedTitle = `[${langName}] ${article.title}`;
    const translatedDescription = article.description ? `[${langName}] ${article.description}` : '';

    return {
      translatedTitle: translatedTitle.slice(0, 50),
      translatedDescription: translatedDescription.slice(0, 200),
    };
  }
}

/**
 * Factory functions to create pipeline agents
 */
export function createExtractorAgent(config?: { maxContentLength?: number }): ExtractorPipelineAgent {
  return new ExtractorPipelineAgent(config);
}

export function createSummarizerAgent(config?: { maxKeyPoints?: number }): SummarizerPipelineAgent {
  return new SummarizerPipelineAgent(config);
}

export function createTaggerAgent(config?: { maxTags?: number }): TaggerPipelineAgent {
  return new TaggerPipelineAgent(config);
}

export function createTranslatorAgent(
  config?: { defaultTargetLang?: 'ZH' | 'EN' | 'JA' | 'KO' | 'FR' | 'DE' | 'ES' }
): TranslatorPipelineAgent {
  return new TranslatorPipelineAgent(config);
}

/**
 * Get all pipeline agent types
 */
export function getPipelineAgentTypes(): PipelineAgentType[] {
  return ['extractor', 'summarizer', 'tagger', 'translator'];
}
