/**
 * AI Model Adapter - 统一 AI 摘要生成适配器
 * 支持多模型优先级切换：MiniMax → 小米 → 智谱 → Claude → Gemini
 * 
 * 该文件为核心共享逻辑，需复制到各端项目中。
 * 各端调用统一入口：AISummarizer.summarize(text, options)
 */

import type { ModelConfig, CallOptions, CallResult } from './model-registry';
import { ModelRegistry } from './model-registry';

export interface SummarizeOptions {
  modelPriority?: string[]; // 优先级顺序，默认 ['minimax', 'xiaomi', 'zhipu', 'claude', 'gemini']
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

// 默认模型配置模板
export const DEFAULT_MODEL_CONFIGS: Omit<ModelConfig, 'id' | 'isEnabled'>[] = [
  {
    name: 'MiniMax M2.7',
    provider: 'minimax',
    apiBaseUrl: 'https://api.minimax.chat/v1', // Fixed: was 'https://api.minimax.chat/v' (missing '1')
    apiKey: '',
    modelName: 'MiniMax-Text-01',
    temperature: 0.3,
    maxTokens: 1000,
    priority: 0,
  },
  {
    name: '小米 MiLM',
    provider: 'xiaomi',
    apiBaseUrl: 'https://api.xiaomimimo.com/v1',
    apiKey: '',
    modelName: 'MiLM',
    temperature: 0.3,
    maxTokens: 1000,
    priority: 1,
  },
  {
    name: '智谱 GLM-4',
    provider: 'zhipu',
    apiBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: '',
    modelName: 'glm-4',
    temperature: 0.3,
    maxTokens: 1000,
    priority: 2,
  },
  {
    name: 'Claude',
    provider: 'anthropic',
    apiBaseUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    modelName: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 1000,
    priority: 3,
  },
  {
    name: 'Gemini',
    provider: 'gemini',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    modelName: 'gemini-2.0-flash',
    temperature: 0.3,
    maxTokens: 1000,
    priority: 4,
  },
];

// 默认优先级
const DEFAULT_PRIORITY = ['minimax', 'xiaomi', 'zhipu', 'anthropic', 'gemini'];

// 摘要长度映射
const SUMMARY_LENGTH_MAP = {
  short: 100,
  medium: 300,
  long: 500,
};

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
 * 解析 AI 返回的 JSON 内容
 */
function parseAIResponse(content: string): { summary: string; keywords: string[] } {
  try {
    // 尝试提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || content,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
      };
    }
  } catch {
    // 解析失败，尝试直接返回内容
  }
  return {
    summary: content.slice(0, 500),
    keywords: [],
  };
}

// ============================================================
// Model Registry Singleton
// ============================================================

let registry: ModelRegistry | null = null;

function getRegistry(models?: ModelConfig[]): ModelRegistry {
  if (!registry) {
    registry = ModelRegistry.fromJSON(models || []);
  }
  return registry;
}

function initRegistry(models: ModelConfig[]): void {
  registry = ModelRegistry.fromJSON(models);
}

/**
 * AI 摘要生成器主类
 */
export class AISummarizer {
  private models: ModelConfig[] = [];

  constructor(models: ModelConfig[] = []) {
    this.models = models;
  }

  /**
   * 设置模型列表
   */
  setModels(models: ModelConfig[]): void {
    this.models = models;
    initRegistry(models);
  }

  /**
   * 添加或更新模型
   */
  addModel(config: ModelConfig): void {
    const existing = this.models.findIndex(m => m.id === config.id);
    if (existing >= 0) {
      this.models[existing] = config;
    } else {
      this.models.push(config);
    }
    initRegistry(this.models);
  }

  /**
   * 删除模型
   */
  removeModel(modelId: string): boolean {
    const index = this.models.findIndex(m => m.id === modelId);
    if (index < 0) return false;
    this.models.splice(index, 1);
    initRegistry(this.models);
    return true;
  }

  /**
   * 获取已配置的模型列表
   */
  getModels(): ModelConfig[] {
    return [...this.models];
  }

  /**
   * 获取已配置且有效的模型
   */
  getAvailableModels(): ModelConfig[] {
    return this.models.filter(m => m.apiKey && m.apiKey.trim().length > 0);
  }

  /**
   * 生成摘要（核心方法）
   * 按优先级顺序尝试调用各模型，失败自动切换
   */
  async summarize(
    text: string,
    options: SummarizeOptions = {}
  ): Promise<SummarizeResult> {
    const length = options.summaryLength || 'medium';
    const sessionId = options.sessionId;
    const prompt = buildPrompt(text, length);

    // Get models sorted by priority
    const registry = getRegistry(this.models);
    const modelsByPriority = registry.getModelsByPriority();

    const available = modelsByPriority.filter(m => m.apiKey && m.apiKey.trim().length > 0);

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
        console.log(`[AISummarizer] 尝试使用模型: ${model.name} (${model.provider})`);
        
        const callOptions: CallOptions = {
          sessionId,
          maxTokens: 1000,
          temperature: 0.3,
        };
        
        const result = await registry.call([
          { role: 'user', content: prompt }
        ], callOptions);

        if (result.success) {
          const { summary, keywords } = parseAIResponse(result.content);
          return {
            success: true,
            summary,
            keywords,
            modelUsed: model.name,
          };
        }

        errors.push(`${model.name}: ${result.error}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[AISummarizer] 模型 ${model.name} 调用失败: ${errorMsg}`);
        errors.push(`${model.name}: ${errorMsg}`);
        continue;
      }
    }

    // 所有模型都失败了
    return {
      success: false,
      summary: '',
      keywords: [],
      modelUsed: '',
      error: `所有模型调用失败:\n${errors.join('\n')}`,
    };
  }

  /**
   * 测试单个模型连接
   */
  async testModel(modelId: string): Promise<{ success: boolean; message: string }> {
    const registry = getRegistry(this.models);
    return registry.testModel(modelId);
  }

  /**
   * 生成默认模型配置
   */
  static createDefaultModels(): ModelConfig[] {
    return DEFAULT_MODEL_CONFIGS.map((cfg, index) => ({
      ...cfg,
      id: `model-${index + 1}`,
      isEnabled: index === 0, // 第一个为默认启用
    }));
  }
}

// 导出单例（全局状态）
export const aiSummarizer = new AISummarizer();
