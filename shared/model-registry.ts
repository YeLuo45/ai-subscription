/**
 * Model Registry - 统一模型管理
 * 
 * 设计参考：Hermes Agent 模型管理
 * - 中心化模型注册表
 * - Per-Model API Keys
 * - Priority/Fallback 机制
 * - Provider 抽象层统一调用
 */

// Internal message type (simpler than full Message type with id/timestamp)
interface SimpleMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ============================================================
// Types
// ============================================================

export interface ModelConfig {
  id: string;
  name: string;           // 显示名：MiniMax M2.7
  provider: string;       // minimax, openai, anthropic, zhipu, gemini, xiaomi
  modelName: string;      // API 模型名：MiniMax-Text-01
  apiBaseUrl: string;     // https://api.minimax.chat/v1
  apiKey: string;         // 独立 API Key
  temperature: number;
  maxTokens: number;
  isEnabled: boolean;
  priority: number;       // 越小越优先，0 = 默认
}

export interface CallOptions {
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  sessionId?: string;     // MiniMax 需要 session_id
}

export interface CallResult {
  success: boolean;
  content: string;
  modelUsed: string;
  modelId: string;
  error?: string;
}

// ============================================================
// Provider Base URLs
// ============================================================

export const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  minimax: 'https://api.minimax.chat/v1',
  'minimax-cn': 'https://api.minimaxi.com/anthropic',
  xiaomi: 'https://api.xiaomimimo.com/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  qwen: 'https://dashscope.aliyuncs.com/api/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  'azure-openai': '',
};

export const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  minimax: 'MiniMax',
  'minimax-cn': 'MiniMax CN',
  xiaomi: 'Xiaomi (Mimo)',
  zhipu: 'Zhipu (GLM)',
  qwen: 'Qwen (Alibaba)',
  gemini: 'Google Gemini',
  'azure-openai': 'Azure OpenAI',
  custom: 'Custom Endpoint',
};

// ============================================================
// Default Model Templates (未配置 API Key 的模板)
// ============================================================

export const DEFAULT_MODEL_TEMPLATES: Omit<ModelConfig, 'id' | 'apiKey' | 'isEnabled'>[] = [
  {
    name: 'MiniMax M2.7',
    provider: 'minimax',
    modelName: 'MiniMax-Text-01',
    apiBaseUrl: 'https://api.minimax.chat/v1',
    temperature: 0.7,
    maxTokens: 4096,
    priority: 0,
  },
  {
    name: 'OpenAI GPT-4o Mini',
    provider: 'openai',
    modelName: 'gpt-4o-mini',
    apiBaseUrl: 'https://api.openai.com/v1',
    temperature: 0.7,
    maxTokens: 4096,
    priority: 1,
  },
  {
    name: 'Anthropic Claude 3.5 Sonnet',
    provider: 'anthropic',
    modelName: 'claude-3-5-sonnet-20241022',
    apiBaseUrl: 'https://api.anthropic.com/v1',
    temperature: 0.7,
    maxTokens: 4096,
    priority: 2,
  },
  {
    name: 'Zhipu GLM-4',
    provider: 'zhipu',
    modelName: 'glm-4',
    apiBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    temperature: 0.7,
    maxTokens: 4096,
    priority: 3,
  },
  {
    name: 'Google Gemini 2.0 Flash',
    provider: 'gemini',
    modelName: 'gemini-2.0-flash',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    temperature: 0.7,
    maxTokens: 4096,
    priority: 4,
  },
  {
    name: 'Xiaomi MiLM',
    provider: 'xiaomi',
    modelName: 'MiLM',
    apiBaseUrl: 'https://api.xiaomimimo.com/v1',
    temperature: 0.7,
    maxTokens: 4096,
    priority: 5,
  },
];

// ============================================================
// Default Priority Order
// ============================================================

export const DEFAULT_PRIORITY: string[] = [
  'minimax',
  'openai',
  'anthropic',
  'zhipu',
  'gemini',
  'xiaomi',
];

// ============================================================
// Model Registry Class
// ============================================================

export class ModelRegistry {
  private models: Map<string, ModelConfig> = new Map();
  private priorityOrder: string[] = [...DEFAULT_PRIORITY];

  constructor(models: ModelConfig[] = []) {
    for (const model of models) {
      this.models.set(model.id, model);
    }
  }

  // --------------------------------
  // CRUD Operations
  // --------------------------------

  addModel(config: ModelConfig): void {
    this.models.set(config.id, config);
  }

  updateModel(id: string, updates: Partial<ModelConfig>): boolean {
    const existing = this.models.get(id);
    if (!existing) return false;
    this.models.set(id, { ...existing, ...updates });
    return true;
  }

  removeModel(id: string): boolean {
    return this.models.delete(id);
  }

  getModel(id: string): ModelConfig | undefined {
    return this.models.get(id);
  }

  getAllModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  getEnabledModels(): ModelConfig[] {
    return this.getAllModels()
      .filter(m => m.isEnabled && m.apiKey && m.apiKey.trim().length > 0)
      .sort((a, b) => a.priority - b.priority);
  }

  // --------------------------------
  // Priority-based Access
  // --------------------------------

  setPriorityOrder(order: string[]): void {
    this.priorityOrder = order;
  }

  getModelsByPriority(): ModelConfig[] {
    const enabled = this.getEnabledModels();
    const sorted: ModelConfig[] = [];

    // 按 priorityOrder 排序
    for (const provider of this.priorityOrder) {
      const found = enabled.find(m => m.provider === provider);
      if (found) sorted.push(found);
    }

    // 追加其他启用的模型（未在 priorityOrder 中的）
    for (const m of enabled) {
      if (!sorted.find(s => s.id === m.id)) {
        sorted.push(m);
      }
    }

    return sorted;
  }

  getDefaultModel(): ModelConfig | undefined {
    const enabled = this.getEnabledModels();
    // priority = 0 的模型优先
    return enabled.find(m => m.priority === 0) || enabled[0];
  }

  // --------------------------------
  // Persistence
  // --------------------------------

  toJSON(): ModelConfig[] {
    return this.getAllModels();
  }

  static fromJSON(data: ModelConfig[]): ModelRegistry {
    return new ModelRegistry(data);
  }

  // --------------------------------
  // Model Calling with Fallback
  // --------------------------------

  async call(
    messages: SimpleMessage[],
    options: CallOptions = {}
  ): Promise<CallResult> {
    const modelsToTry = this.getModelsByPriority();

    if (modelsToTry.length === 0) {
      return {
        success: false,
        content: '',
        modelUsed: '',
        modelId: '',
        error: '没有可用的 AI 模型，请先配置至少一个模型的 API Key',
      };
    }

    const errors: string[] = [];

    for (const model of modelsToTry) {
      try {
        console.log(`[ModelRegistry] 尝试使用模型: ${model.name} (${model.provider})`);
        const result = await callModel(model, messages, options);

        if (result.success) {
          return {
            success: true,
            content: result.content,
            modelUsed: model.name,
            modelId: model.id,
          };
        }

        errors.push(`${model.name}: ${result.error}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[ModelRegistry] 模型 ${model.name} 调用失败: ${errorMsg}`);
        errors.push(`${model.name}: ${errorMsg}`);
      }
    }

    return {
      success: false,
      content: '',
      modelUsed: '',
      modelId: '',
      error: `所有模型调用失败:\n${errors.join('\n')}`,
    };
  }

  /**
   * 简化的单 prompt 调用（用于 AI 摘要等场景）
   */
  async callWithPrompt(
    prompt: string,
    options: CallOptions = {}
  ): Promise<CallResult> {
    return this.call([{ role: 'user', content: prompt }], options);
  }

  /**
   * 测试单个模型连接
   */
  async testModel(modelId: string): Promise<{ success: boolean; message: string }> {
    const model = this.models.get(modelId);
    if (!model) {
      return { success: false, message: '模型不存在' };
    }

    try {
      const result = await callModel(
        model,
        [{ role: 'user', content: 'Hi' }],
        { maxTokens: 10 }
      );
      return { success: result.success, message: result.success ? '连接成功' : result.error || '未知错误' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg };
    }
  }

  /**
   * 创建默认模型配置（用于初始化）
   */
  static createDefaults(): ModelConfig[] {
    return DEFAULT_MODEL_TEMPLATES.map((template, index) => ({
      ...template,
      id: `model-${index + 1}`,
      apiKey: '',
      isEnabled: index === 0, // 只有第一个默认启用
    }));
  }
}

// ============================================================
// Provider-specific API Callers
// ============================================================

async function callModel(
  config: ModelConfig,
  messages: SimpleMessage[],
  options: CallOptions
): Promise<{ success: boolean; content: string; error?: string }> {
  const { provider } = config;

  switch (provider) {
    case 'minimax':
      return callMiniMax(config, messages, options);
    case 'anthropic':
      return callAnthropic(config, messages, options);
    case 'openai':
    case 'zhipu':
    case 'xiaomi':
    case 'qwen':
    case 'azure-openai':
      return callOpenAICompatible(config, messages, options);
    case 'gemini':
      return callGemini(config, messages, options);
    case 'custom':
      return callOpenAICompatible(config, messages, options);
    default:
      return { success: false, content: '', error: `Unknown provider: ${provider}` };
  }
}

async function callMiniMax(
  config: ModelConfig,
  messages: SimpleMessage[],
  options: CallOptions
): Promise<{ success: boolean; content: string; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  };

  // MiniMax 需要 session_id（可选）
  if (options.sessionId) {
    headers['session_id'] = options.sessionId;
  }

  const body: Record<string, unknown> = {
    model: config.modelName,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature: options.temperature ?? config.temperature,
    max_tokens: options.maxTokens ?? config.maxTokens,
  };

  const response = await fetch(`${config.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, content: '', error: `HTTP ${response.status}: ${errorText}` };
  }

  const data = await response.json();

  // OpenAI 兼容格式
  if (data.choices?.[0]?.message?.content) {
    return { success: true, content: data.choices[0].message.content };
  }

  return { success: false, content: '', error: '未知响应格式' };
}

async function callAnthropic(
  config: ModelConfig,
  messages: SimpleMessage[],
  options: CallOptions
): Promise<{ success: boolean; content: string; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey,
    'anthropic-version': '2023-06-01',
  };

  const body: Record<string, unknown> = {
    model: config.modelName,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature: options.temperature ?? config.temperature,
    max_tokens: options.maxTokens ?? config.maxTokens,
  };

  const response = await fetch(`${config.apiBaseUrl}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, content: '', error: `HTTP ${response.status}: ${errorText}` };
  }

  const data = await response.json();

  if (data.content?.[0]?.text) {
    return { success: true, content: data.content[0].text };
  }

  return { success: false, content: '', error: '未知响应格式' };
}

async function callOpenAICompatible(
  config: ModelConfig,
  messages: SimpleMessage[],
  options: CallOptions
): Promise<{ success: boolean; content: string; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  };

  const body: Record<string, unknown> = {
    model: config.modelName,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature: options.temperature ?? config.temperature,
    max_tokens: options.maxTokens ?? config.maxTokens,
  };

  if (options.stop) {
    body.stop = options.stop;
  }

  const response = await fetch(`${config.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, content: '', error: `HTTP ${response.status}: ${errorText}` };
  }

  const data = await response.json();

  if (data.choices?.[0]?.message?.content) {
    return { success: true, content: data.choices[0].message.content };
  }

  return { success: false, content: '', error: '未知响应格式' };
}

async function callGemini(
  config: ModelConfig,
  messages: SimpleMessage[],
  options: CallOptions
): Promise<{ success: boolean; content: string; error?: string }> {
  // Gemini 使用不同的 API 格式
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const params = new URLSearchParams({
    key: config.apiKey,
  });

  const body = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? config.temperature,
      maxOutputTokens: options.maxTokens ?? config.maxTokens,
    },
  };

  const url = `${config.apiBaseUrl}/models/${config.modelName}:generateContent?${params}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, content: '', error: `HTTP ${response.status}: ${errorText}` };
  }

  const data = await response.json();

  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    return { success: true, content: data.candidates[0].content.parts[0].text };
  }

  return { success: false, content: '', error: '未知响应格式' };
}

// ============================================================
// Singleton Export
// ============================================================

export const modelRegistry = new ModelRegistry();
