// AI Model Adapter - unified interface for multiple AI providers
import type { AIModel } from '../types';
import { parseStructuredSummary, type StructuredSummary, type ArticleSummary, SENTIMENT_LABELS } from '../../../shared/lib/ai/summary-schema';

export interface SummarizeResult {
  summary: string;
  keywords: string[];
  tokensUsed: number;
  modelId: string;
  success: boolean;
  error?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SUMMARY_PROMPTS = {
  short: '请用100字以内总结以下文章的核心内容，要求简洁明了：\n\n',
  medium: '请用300字以内总结以下文章的主要内容，包括关键事件、观点和结论：\n\n',
  long: '请用500字以内详细总结以下文章的主要内容，包括背景、关键事件、核心观点、影响和结论，并提取5个关键词：\n\n',
};

async function callOpenAICompatible(model: AIModel, messages: ChatMessage[]): Promise<{ content: string; tokensUsed: number }> {
  const response = await fetch(`${model.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${model.apiKey}`,
    },
    body: JSON.stringify({
      model: model.modelName,
      messages,
      temperature: model.temperature,
      max_tokens: model.maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

async function callAnthropic(model: AIModel, messages: ChatMessage[]): Promise<{ content: string; tokensUsed: number }> {
  // Convert messages to Anthropic format
  const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
  const userMsgs = messages.filter((m) => m.role !== 'system');
  const lastUserMsg = userMsgs[userMsgs.length - 1]?.content || '';

  const response = await fetch(`${model.apiBaseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': model.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: model.modelName,
      max_tokens: model.maxTokens,
      system: systemMsg,
      messages: [{ role: 'user', content: lastUserMsg }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return {
    content: data.content?.[0]?.text || '',
    tokensUsed: data.usage?.input_tokens + (data.usage?.output_tokens || 0),
  };
}

async function callGemini(model: AIModel, messages: ChatMessage[]): Promise<{ content: string; tokensUsed: number }> {
  const userMsg = messages.filter((m) => m.role !== 'system').map((m) => m.content).join('\n');
  const systemMsg = messages.find((m) => m.role === 'system')?.content || '';

  const response = await fetch(`${model.apiBaseUrl}/models/${model.modelName}:generateContent?key=${model.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemMsg}\n${userMsg}` }] }],
      generationConfig: { temperature: model.temperature, maxOutputTokens: model.maxTokens },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    tokensUsed: 0,
  };
}

async function callModel(model: AIModel, messages: ChatMessage[]): Promise<{ content: string; tokensUsed: number }> {
  switch (model.provider) {
    case 'claude':
      return callAnthropic(model, messages);
    case 'gemini':
      return callGemini(model, messages);
    default:
      return callOpenAICompatible(model, messages);
  }
}

export async function summarize(
  article: { title: string; content: string; description: string },
  model: AIModel,
  length: 'short' | 'medium' | 'long' = 'medium'
): Promise<SummarizeResult> {
  const content = article.content || article.description;
  if (!content || content.length < 50) {
    return { summary: '内容过短，无法生成摘要', keywords: [], tokensUsed: 0, modelId: model.id, success: false, error: 'Content too short' };
  }

  const prompt = SUMMARY_PROMPTS[length] + `标题：${article.title}\n\n内容：\n${content.slice(0, 8000)}`;
  const systemPrompt = '你是文章摘要助手。请根据用户提供的文章内容生成简洁准确的摘要。';

  try {
    const { content: summary, tokensUsed } = await callModel(model, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]);

    // Extract keywords (simple heuristic: look for quoted terms or repeated important words)
    const keywords = extractKeywords(summary, article.title);
    return { summary, keywords, tokensUsed, modelId: model.id, success: true };
  } catch (err: unknown) {
    return {
      summary: '',
      keywords: [],
      tokensUsed: 0,
      modelId: model.id,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function extractKeywords(summary: string, title: string): string[] {
  const words = (title + ' ' + summary)
    .replace(/[，。、！？；：「」『』（）【】《》〈〉""''（）]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && w.length < 15)
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(0, 5);
  return words;
}

// Priority model fallback: try models in order, skip if API key not set
export async function summarizeWithFallback(
  article: { title: string; content: string; description: string },
  models: AIModel[],
  length: 'short' | 'medium' | 'long' = 'medium'
): Promise<SummarizeResult> {
  // Sort by priority: minimax > xiaomi > zhipu > claude > gemini
  const priorityOrder = ['minimax', 'xiaomi', 'zhipu', 'claude', 'gemini'];
  const sorted = [...models].sort((a, b) => {
    return priorityOrder.indexOf(a.provider) - priorityOrder.indexOf(b.provider);
  });

  const available = sorted.filter((m) => m.apiKey && m.apiKey.trim());
  
  if (available.length === 0) {
    return {
      summary: '',
      keywords: [],
      tokensUsed: 0,
      modelId: '',
      success: false,
      error: '没有可用的AI模型（请先配置API Key）',
    };
  }

  let lastError = '';
  for (const model of available) {
    const result = await summarize(article, model, length);
    if (result.success) return result;
    lastError = result.error || 'Unknown error';
    console.warn(`Model ${model.name} failed, trying next:`, lastError);
  }

  return {
    summary: '',
    keywords: [],
    tokensUsed: 0,
    modelId: '',
    success: false,
    error: `所有模型均失败: ${lastError}`,
  };
}

// Structured Summary for P-20260506-008
const STRUCTURED_SUMMARY_PROMPT = `你是一个文章分析助手。请为以下文章生成结构化摘要：

## 文章内容
{content}

## 输出格式（严格遵循JSON）
{{
  "generated_title": "生成的优质标题（15-30字）",
  "key_points": ["关键点1", "关键点2", "关键点3"],
  "sentiment": "positive|negative|neutral|shocking|inspiring",
  "summary": "30字内的一句话概括"
}}

要求：
- generated_title 不要复述原文标题，要提炼核心观点
- key_points 必须是原文未明确说出的推理或延伸洞察
- sentiment 选择最贴合的一个标签`;

export interface StructuredSummarizeResult {
  success: boolean;
  structuredSummary?: ArticleSummary;
  error?: string;
}

export async function summarizeStructured(
  article: { title: string; content: string; description: string },
  model: AIModel
): Promise<StructuredSummarizeResult> {
  const content = article.content || article.description;
  if (!content || content.length < 50) {
    return { success: false, error: '内容过短，无法生成结构化摘要' };
  }

  const prompt = STRUCTURED_SUMMARY_PROMPT.replace('{content}', `${article.title}\n\n${content.slice(0, 6000)}`);

  try {
    const { content: responseText } = await callModel(model, [
      { role: 'system', content: '你是文章分析助手。你必须始终返回一个有效的JSON对象，不要包含其他内容。' },
      { role: 'user', content: prompt },
    ]);

    const parsed = parseStructuredSummary(responseText);
    if (!parsed) {
      return { success: false, error: 'AI返回格式解析失败' };
    }

    return {
      success: true,
      structuredSummary: {
        originalTitle: article.title,
        generatedTitle: parsed.generatedTitle,
        keyPoints: parsed.keyPoints,
        sentiment: parsed.sentiment,
        oneLineSummary: parsed.oneLineSummary,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function summarizeStructuredWithFallback(
  article: { title: string; content: string; description: string },
  models: AIModel[]
): Promise<StructuredSummarizeResult> {
  const priorityOrder = ['minimax', 'xiaomi', 'zhipu', 'claude', 'gemini'];
  const sorted = [...models].sort((a, b) => {
    return priorityOrder.indexOf(a.provider) - priorityOrder.indexOf(b.provider);
  });

  const available = sorted.filter((m) => m.apiKey && m.apiKey.trim());

  if (available.length === 0) {
    return { success: false, error: '没有可用的AI模型（请先配置API Key）' };
  }

  let lastError = '';
  for (const model of available) {
    const result = await summarizeStructured(article, model);
    if (result.success) return result;
    lastError = result.error || 'Unknown error';
    console.warn(`Model ${model.name} failed for structured summary, trying next:`, lastError);
  }

  return { success: false, error: `所有模型均失败: ${lastError}` };
}
