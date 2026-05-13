/**
 * TranslatorAgent
 * Translates title and description to target language
 */

import { BaseAgent } from './BaseAgent';
import type { AgentConfig, AgentMessage, AgentResult } from './types';
import { AgentRole, AgentStatus } from './types';

export type Language = 'ZH' | 'EN' | 'JA' | 'KO' | 'FR' | 'DE' | 'ES';

export interface TranslationResult {
  translatedTitle: string;
  translatedDescription: string;
}

export interface TranslatorConfig extends AgentConfig {
  defaultTargetLang?: Language;
}

const LANGUAGE_NAMES: Record<Language, string> = {
  ZH: '中文',
  EN: '英文',
  JA: '日文',
  KO: '韩文',
  FR: '法文',
  DE: '德文',
  ES: '西班牙文',
};

export class TranslatorAgent extends BaseAgent {
  private defaultTargetLang: Language;

  constructor(config: TranslatorConfig) {
    super({
      ...config,
      role: AgentRole.PIPELINE,
      capabilities: [...(config.capabilities || []), 'translation'],
    });
    this.defaultTargetLang = config.defaultTargetLang ?? 'EN';
  }

  /**
   * Get default target language
   */
  getDefaultTargetLang(): Language {
    return this.defaultTargetLang;
  }

  /**
   * Set default target language
   */
  setDefaultTargetLang(lang: Language): void {
    this.defaultTargetLang = lang;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Language[] {
    return Object.keys(LANGUAGE_NAMES) as Language[];
  }

  /**
   * Translate content to target language
   */
  async translate(
    article: { title: string; description?: string },
    targetLang?: Language
  ): Promise<AgentResult<TranslationResult>> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);
    this.setCurrentTask('translation');

    try {
      this.validateInput(article);

      const lang = targetLang ?? this.defaultTargetLang;
      const result = await this.performTranslation(article, lang);

      this.setStatus(AgentStatus.IDLE);
      this.setCurrentTask(undefined);
      return this.createSuccessResult(result, Date.now() - startTime);
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      this.setLastError(error instanceof Error ? error.message : String(error));
      return this.createErrorResult(error, Date.now() - startTime) as AgentResult<TranslationResult>;
    }
  }

  /**
   * Perform translation logic
   */
  private async performTranslation(
    article: { title: string; description?: string },
    targetLang: Language
  ): Promise<TranslationResult> {
    // Simulate translation delay
    await this.delay(200);

    const langName = LANGUAGE_NAMES[targetLang] || '英文';

    // Mock translation - in real implementation, this would call a translation service
    // For demonstration, we'll create mock translated content
    const translatedTitle = `[${langName}] ${article.title}`;
    const translatedDescription = article.description
      ? `[${langName}] ${article.description}`
      : '';

    return {
      translatedTitle: translatedTitle.slice(0, 50),
      translatedDescription: translatedDescription.slice(0, 200),
    };
  }

  /**
   * Detect source language (mock implementation)
   */
  detectLanguage(text: string): Language {
    // Simple heuristic-based detection
    const hasChinese = /[\u4e00-\u9fff]/.test(text);
    const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
    const hasKorean = /[\uac00-\ud7af]/.test(text);

    if (hasChinese) return 'ZH';
    if (hasJapanese) return 'JA';
    if (hasKorean) return 'KO';

    return 'EN';
  }

  /**
   * Process input - translate article
   */
  async process(input: unknown): Promise<AgentResult> {
    const startTime = Date.now();
    this.setStatus(AgentStatus.RUNNING);

    try {
      this.validateInput(input);

      const { article, targetLang } = input as {
        article: { title: string; description?: string };
        targetLang?: Language;
      };
      const result = await this.translate(article, targetLang);

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
      const { article, targetLang } = message.payload as {
        article: { title: string; description?: string };
        targetLang?: Language;
      };
      await this.translate(article, targetLang);
    }
  }

  /**
   * Reset translator state
   */
  reset(): void {
    super.reset();
  }
}
