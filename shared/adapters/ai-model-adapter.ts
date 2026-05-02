/**
 * AI Model Adapter - Refactored to use callLLM
 * 
 * This adapter wraps the shared LLM layer (callLLM/streamLLM) to provide
 * backward-compatible summarize interface for the ai-subscription project.
 * 
 * Old: Direct fetch-based calls to each provider
 * New: Unified callLLM() using AI SDK (@ai-sdk/*)
 */

import type { SimpleMessage } from '../lib/ai/types/provider';
import { callLLM } from '../lib/ai/llm';
import type { GenerateTextResult } from 'ai';

export interface SummarizeOptions {
  modelPriority?: string[]; // 优先级顺序，默认 ['minimax', 'deepseek', 'kimi', 'openai', 'anthropic', 'google']
  summaryLength?: 'short' | 'medium' | 'long'; // 短(100字)/中(300字)/长(500字)
  sessionId?: string; // 会话ID（部分模型需要）
}

export interface SummarizeResult {
  success: boolean;
  summary: string;
  keywords: string[];
  modelUsed: string;
  error?: string;
}

// Default model priority order
const DEFAULT_PRIORITY = ['minimax', 'deepseek', 'kimi', 'openai', 'anthropic', 'google'];

// Summary length to character count mapping
const SUMMARY_LENGTH_MAP = {
  short: 100,
  medium: 300,
  long: 500,
};

/**
 * Build the summary prompt
 */
function buildPrompt(text: string, length: 'short' | 'medium' | 'long'): string {
  const maxChars = SUMMARY_LENGTH_MAP[length];
  return `请对以下内容生成一个约${maxChars}字的中文摘要，并提取5个关键词。

要求：
1. 摘要简洁、有信息量
2. 提取5个关键词
3. 用JSON格式输出：{"summary": "摘要内容", "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"]}

内容：
${text.slice(0, 3000)}`;
}

/**
 * Parse AI response JSON
 */
function parseAIResponse(content: string): { summary: string; keywords: string[] } {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || content,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
      };
    }
  } catch {
    // Parse failed, return content as-is
  }
  return {
    summary: content.slice(0, 500),
    keywords: [],
  };
}

// ============================================================
// Model Config (kept for backward compatibility)
// ============================================================

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  isEnabled: boolean;
  priority: number;
}

// Default model templates (API keys left empty)
export const DEFAULT_MODEL_CONFIGS: Omit<ModelConfig, 'id' | 'isEnabled'>[] = [
  {
    name: 'MiniMax M2.7',
    provider: 'minimax',
    apiBaseUrl: 'https://api.minimax.chat/v1',
    apiKey: '',
    modelName: 'MiniMax-Text-01',
    temperature: 0.3,
    maxTokens: 1000,
    priority: 0,
  },
  {
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    apiBaseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    modelName: 'deepseek-chat',
    temperature: 0.3,
    maxTokens: 1000,
    priority: 1,
  },
  {
    name: 'Kimi (Moonshot)',
    provider: 'kimi',
    apiBaseUrl: 'https://api.moonshot.cn/v1',
    apiKey: '',
    modelName: 'moonshot-v1-8k',
    temperature: 0.3,
    maxTokens: 1000,
    priority: 2,
  },
  {
    name: 'OpenAI GPT-4o Mini',
    provider: 'openai',
    apiBaseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    modelName: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1000,
    priority: 3,
  },
  {
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    apiBaseUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    modelName: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 1000,
    priority: 4,
  },
  {
    name: 'Google Gemini 2.0 Flash',
    provider: 'google',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    modelName: 'gemini-2.0-flash',
    temperature: 0.3,
    maxTokens: 1000,
    priority: 5,
  },
];

// ============================================================
// AISummarizer (refactored to use callLLM)
// ============================================================

let globalModels: ModelConfig[] = [];

export class AISummarizer {
  private models: ModelConfig[] = [];

  constructor(models: ModelConfig[] = []) {
    this.models = models;
  }

  setModels(models: ModelConfig[]): void {
    this.models = models;
  }

  getModels(): ModelConfig[] {
    return [...this.models];
  }

  getAvailableModels(): ModelConfig[] {
    return this.models.filter(m => m.apiKey && m.apiKey.trim().length > 0);
  }

  /**
   * Generate summary using callLLM internally
   * Tries models in priority order until one succeeds
   */
  async summarize(
    text: string,
    options: SummarizeOptions = {}
  ): Promise<SummarizeResult> {
    const length = options.summaryLength || 'medium';
    const prompt = buildPrompt(text, length);

    // Get available models sorted by priority
    const available = this.getAvailableModels();
    if (available.length === 0) {
      return {
        success: false,
        summary: '',
        keywords: [],
        modelUsed: '',
        error: '没有可用的 AI 模型，请先配置至少一个模型的 API Key',
      };
    }

    const errors: string[] = [];

    for (const model of available) {
      try {
        console.log(`[AISummarizer] Trying model: ${model.name} (${model.provider})`);

        const messages: SimpleMessage[] = [
          { role: 'user', content: prompt }
        ];

        const result = await callLLM(
          {
            model: `${model.provider}/${model.modelName}`,
            messages,
            temperature: model.temperature,
            maxTokens: model.maxTokens,
            apiKey: model.apiKey,
            baseURL: model.apiBaseUrl,
          },
          'ai-subscription-adapter',
          { retries: 1 }
        );

        const { summary, keywords } = parseAIResponse(result.text);
        return {
          success: true,
          summary,
          keywords,
          modelUsed: model.name,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[AISummarizer] Model ${model.name} failed: ${errorMsg}`);
        errors.push(`${model.name}: ${errorMsg}`);
      }
    }

    return {
      success: false,
      summary: '',
      keywords: [],
      modelUsed: '',
      error: `所有模型调用失败:\n${errors.join('\n')}`,
    };
  }

  /**
   * Test a specific model connection
   */
  async testModel(modelId: string): Promise<{ success: boolean; message: string }> {
    const model = this.models.find(m => m.id === modelId);
    if (!model) {
      return { success: false, message: '模型不存在' };
    }

    try {
      await callLLM(
        {
          model: `${model.provider}/${model.modelName}`,
          messages: [{ role: 'user', content: 'Hi' }],
          maxTokens: 10,
          apiKey: model.apiKey,
          baseURL: model.apiBaseUrl,
        },
        'ai-subscription-test',
        { retries: 0 }
      );
      return { success: true, message: '连接成功' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg };
    }
  }

  /**
   * Create default model configs
   */
  static createDefaultModels(): ModelConfig[] {
    return DEFAULT_MODEL_CONFIGS.map((cfg, index) => ({
      ...cfg,
      id: `model-${index + 1}`,
      isEnabled: index === 0,
    }));
  }
}

// ============================================================
// Singleton Export (backward compatibility)
// ============================================================

export const aiSummarizer = new AISummarizer();

/**
 * Initialize the global model list
 */
export function initModels(models: ModelConfig[]): void {
  globalModels = models;
  aiSummarizer.setModels(models);
}

/**
 * Get global models
 */
export function getGlobalModels(): ModelConfig[] {
  return [...globalModels];
}
