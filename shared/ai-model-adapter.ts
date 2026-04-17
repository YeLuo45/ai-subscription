/**
 * AI Model Adapter - 统一 AI 摘要生成适配器
 * 支持多模型优先级切换：miniMax → 小米 → 智谱 → Claude → Gemini
 * 
 * 该文件为核心共享逻辑，需复制到各端项目中。
 * 各端调用统一入口：AISummarizer.summarize(text, options)
 */

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'minimax' | 'xiaomi' | 'zhipu' | 'claude' | 'gemini';
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  isDefault: boolean;
}

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
export const DEFAULT_MODEL_CONFIGS: Omit<ModelConfig, 'id' | 'isDefault'>[] = [
  {
    name: 'MiniMax M2.7',
    provider: 'minimax',
    apiBaseUrl: 'https://api.minimax.chat/v',
    apiKey: '',
    modelName: 'MiniMax-M2.7',
    temperature: 0.3,
    maxTokens: 1000,
  },
  {
    name: '小米 MiLM',
    provider: 'xiaomi',
    apiBaseUrl: 'https://account.platform.minimax.io/...',
    apiKey: '',
    modelName: 'MiLM',
    temperature: 0.3,
    maxTokens: 1000,
  },
  {
    name: '智谱 GLM-4',
    provider: 'zhipu',
    apiBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: '',
    modelName: 'glm-4',
    temperature: 0.3,
    maxTokens: 1000,
  },
  {
    name: 'Claude',
    provider: 'claude',
    apiBaseUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    modelName: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 1000,
  },
  {
    name: 'Gemini',
    provider: 'gemini',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    modelName: 'gemini-2.0-flash',
    temperature: 0.3,
    maxTokens: 1000,
  },
];

// 默认优先级
const DEFAULT_PRIORITY = ['minimax', 'xiaomi', 'zhipu', 'claude', 'gemini'];

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
 * 调用 OpenAI 兼容接口
 */
async function callOpenAICompatible(
  config: ModelConfig,
  prompt: string,
  sessionId?: string
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  };

  // 部分提供商需要特殊 Header
  if (config.provider === 'claude') {
    headers['x-api-key'] = config.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    delete headers['Authorization'];
  }

  if (sessionId && config.provider === 'minimax') {
    headers['session_id'] = sessionId;
  }

  const body: Record<string, unknown> = {
    model: config.modelName,
    messages: [{ role: 'user', content: prompt }],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  };

  // Claude 需要不同的消息格式
  if (config.provider === 'claude') {
    body.messages = [
      { role: 'user', content: prompt }
    ];
  }

  const response = await fetch(`${config.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API调用失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  // 兼容不同格式
  if (data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  if (data.content?.[0]?.text) {
    return data.content[0].text;
  }
  throw new Error('未知响应格式');
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

/**
 * AI 摘要生成器主类
 */
export class AISummarizer {
  private models: ModelConfig[] = [];
  private defaultPriority: string[] = DEFAULT_PRIORITY;

  constructor(models: ModelConfig[] = []) {
    this.models = models;
  }

  /**
   * 设置模型列表
   */
  setModels(models: ModelConfig[]): void {
    this.models = models;
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
  }

  /**
   * 删除模型
   */
  removeModel(modelId: string): boolean {
    const index = this.models.findIndex(m => m.id === modelId);
    if (index < 0) return false;
    const model = this.models[index];
    if (model.isDefault) return false; // 默认模型不可删除
    this.models.splice(index, 1);
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
   * 按优先级顺序获取模型
   */
  private getModelsByPriority(priority: string[]): ModelConfig[] {
    const available = this.getAvailableModels();
    const sorted: ModelConfig[] = [];
    
    for (const p of priority) {
      const found = available.find(m => m.provider === p);
      if (found) sorted.push(found);
    }
    
    // 追加未指定的已配置模型
    for (const m of available) {
      if (!sorted.find(s => s.id === m.id)) {
        sorted.push(m);
      }
    }
    
    return sorted;
  }

  /**
   * 生成摘要（核心方法）
   * 按优先级顺序尝试调用各模型，失败自动切换
   */
  async summarize(
    text: string,
    options: SummarizeOptions = {}
  ): Promise<SummarizeResult> {
    const priority = options.modelPriority || this.defaultPriority;
    const length = options.summaryLength || 'medium';
    const sessionId = options.sessionId;

    const prompt = buildPrompt(text, length);
    const modelsToTry = this.getModelsByPriority(priority);

    if (modelsToTry.length === 0) {
      return {
        success: false,
        summary: '',
        keywords: [],
        modelUsed: '',
        error: '没有可用的 AI 模型，请先配置至少一个模型的 API Key',
      };
    }

    const errors: string[] = [];

    for (const model of modelsToTry) {
      try {
        console.log(`[AISummarizer] 尝试使用模型: ${model.name} (${model.provider})`);
        
        const content = await callOpenAICompatible(model, prompt, sessionId);
        const { summary, keywords } = parseAIResponse(content);

        return {
          success: true,
          summary,
          keywords,
          modelUsed: model.name,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[AISummarizer] 模型 ${model.name} 调用失败: ${errorMsg}`);
        errors.push(`${model.name}: ${errorMsg}`);
        // 自动切换到下一个模型
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
  async testModel(config: ModelConfig): Promise<{ success: boolean; message: string }> {
    try {
      const prompt = '请回复JSON格式：{"status": "ok", "message": "连接测试成功"}';
      await callOpenAICompatible(config, prompt);
      return { success: true, message: '连接成功' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg };
    }
  }

  /**
   * 生成默认模型配置
   */
  static createDefaultModels(): ModelConfig[] {
    return DEFAULT_MODEL_CONFIGS.map((cfg, index) => ({
      ...cfg,
      id: `model-${index + 1}`,
      isDefault: index === 0, // 第一个为默认
    }));
  }
}

// 导出单例（全局状态）
export const aiSummarizer = new AISummarizer();
