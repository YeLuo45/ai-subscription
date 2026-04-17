/**
 * AI Model Adapter - 统一 AI 摘要生成适配器（Taro 小程序适配版）
 * 复用自 shared/ai-model-adapter.ts，使用 Taro.request 替代 fetch
 * 支持多模型优先级切换：miniMax → 小米 → 智谱 → Claude → Gemini
 */
import Taro from '@tarojs/taro'

export interface ModelConfig {
  id: string
  name: string
  provider: 'minimax' | 'xiaomi' | 'zhipu' | 'claude' | 'gemini'
  apiBaseUrl: string
  apiKey: string
  modelName: string
  temperature: number
  maxTokens: number
  isDefault: boolean
}

export interface SummarizeOptions {
  modelPriority?: string[]
  summaryLength?: 'short' | 'medium' | 'long'
  sessionId?: string
}

export interface SummarizeResult {
  success: boolean
  summary: string
  keywords: string[]
  modelUsed: string
  error?: string
}

const DEFAULT_PRIORITY = ['minimax', 'xiaomi', 'zhipu', 'claude', 'gemini']

const SUMMARY_LENGTH_MAP = {
  short: 100,
  medium: 300,
  long: 500,
}

function buildPrompt(text: string, length: 'short' | 'medium' | 'long'): string {
  const maxChars = SUMMARY_LENGTH_MAP[length]
  return `请对以下内容生成一个约${maxChars}字的中文摘要，并提取5个关键词。

要求：
1. 摘要简洁、有信息量
2. 提取5个关键词
3. 用JSON格式输出：{"summary": "摘要内容", "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"]}

内容：
${text.slice(0, 3000)}`
}

/**
 * 使用 Taro.request 调用 OpenAI 兼容接口
 */
async function callOpenAICompatible(
  config: ModelConfig,
  prompt: string,
  sessionId?: string
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  }

  if (config.provider === 'claude') {
    headers['x-api-key'] = config.apiKey
    headers['anthropic-version'] = '2023-06-01'
    delete headers['Authorization']
  }

  if (sessionId && config.provider === 'minimax') {
    headers['session_id'] = sessionId
  }

  const body: Record<string, unknown> = {
    model: config.modelName,
    messages: [{ role: 'user', content: prompt }],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  }

  const url = `${config.apiBaseUrl}/chat/completions`

  return new Promise((resolve, reject) => {
    Taro.request({
      url,
      method: 'POST',
      header: headers,
      data: body,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const data = res.data as any
          if (data?.choices?.[0]?.message?.content) {
            resolve(data.choices[0].message.content)
          } else if (data?.content?.[0]?.text) {
            resolve(data.content[0].text)
          } else {
            reject(new Error('未知响应格式'))
          }
        } else {
          reject(new Error(`API调用失败 (${res.statusCode}): ${JSON.stringify(res.data)}`))
        }
      },
      fail(err) {
        reject(new Error(`网络请求失败: ${err.errMsg}`))
      }
    })
  })
}

function parseAIResponse(content: string): { summary: string; keywords: string[] } {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        summary: parsed.summary || content,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
      }
    }
  } catch {
    // ignore
  }
  return {
    summary: content.slice(0, 500),
    keywords: [],
  }
}

export class AISummarizer {
  private models: ModelConfig[] = []
  private defaultPriority: string[] = DEFAULT_PRIORITY

  constructor(models: ModelConfig[] = []) {
    this.models = models
  }

  setModels(models: ModelConfig[]): void {
    this.models = models
  }

  addModel(config: ModelConfig): void {
    const existing = this.models.findIndex(m => m.id === config.id)
    if (existing >= 0) {
      this.models[existing] = config
    } else {
      this.models.push(config)
    }
  }

  getModels(): ModelConfig[] {
    return [...this.models]
  }

  getAvailableModels(): ModelConfig[] {
    return this.models.filter(m => m.apiKey && m.apiKey.trim().length > 0)
  }

  private getModelsByPriority(priority: string[]): ModelConfig[] {
    const available = this.getAvailableModels()
    const sorted: ModelConfig[] = []

    for (const p of priority) {
      const found = available.find(m => m.provider === p)
      if (found) sorted.push(found)
    }

    for (const m of available) {
      if (!sorted.find(s => s.id === m.id)) {
        sorted.push(m)
      }
    }

    return sorted
  }

  async summarize(
    text: string,
    options: SummarizeOptions = {}
  ): Promise<SummarizeResult> {
    const priority = options.modelPriority || this.defaultPriority
    const length = options.summaryLength || 'medium'
    const sessionId = options.sessionId

    const prompt = buildPrompt(text, length)
    const modelsToTry = this.getModelsByPriority(priority)

    if (modelsToTry.length === 0) {
      return {
        success: false,
        summary: '',
        keywords: [],
        modelUsed: '',
        error: '没有可用的 AI 模型，请先配置至少一个模型的 API Key',
      }
    }

    const errors: string[] = []

    for (const model of modelsToTry) {
      try {
        const content = await callOpenAICompatible(model, prompt, sessionId)
        const { summary, keywords } = parseAIResponse(content)

        return {
          success: true,
          summary,
          keywords,
          modelUsed: model.name,
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.warn(`[AISummarizer] 模型 ${model.name} 调用失败: ${errorMsg}`)
        errors.push(`${model.name}: ${errorMsg}`)
        continue
      }
    }

    return {
      success: false,
      summary: '',
      keywords: [],
      modelUsed: '',
      error: `所有模型调用失败:\n${errors.join('\n')}`,
    }
  }

  async testModel(config: ModelConfig): Promise<{ success: boolean; message: string }> {
    try {
      const prompt = '请回复JSON格式：{"status": "ok", "message": "连接测试成功"}'
      await callOpenAICompatible(config, prompt)
      return { success: true, message: '连接成功' }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, message: msg }
    }
  }
}

export const aiSummarizer = new AISummarizer()
