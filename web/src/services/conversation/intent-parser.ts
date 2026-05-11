import { routeAndCall } from '@shared/lib/ai/llm-router';
import { inferWithFallback } from '../local-inference';
import { Intent, IntentResult } from './types';

const INTENT_PROMPT = `你是一个订阅管理助手。用户输入自然语言，解析为结构化意图。

支持的意图：
- add_source: 添加订阅源（需要URL、名称、分类）
- delete_source: 删除订阅源（需要名称或URL）
- pause_source: 暂停订阅源（需要名称）
- resume_source: 恢复订阅源（需要名称）
- create_tag: 创建标签（需要名称、颜色）
- delete_tag: 删除标签（需要名称）
- rename_tag: 重命名标签（需要旧名称、新名称）
- batch_tag: 批量打标（需要标签名、筛选条件）
- batch_delete: 批量删除（需要筛选条件）
- start_pipeline: 启动流水线
- stop_pipeline: 停止流水线
- update_pipeline: 更新流水线配置
- search_articles: 搜索文章（需要关键词）
- unknown: 无法解析

输出JSON格式：
{"intent": "意图名", "entities": {...}, "confidence": 0.0-1.0, "response": "初步回复", "needsConfirmation": true/false, "confirmationMessage": "确认信息"}`;

export async function parseIntent(userMessage: string): Promise<IntentResult> {
  try {
    // Try local inference first, fallback to cloud
    const localResult = await inferWithFallback({
      taskType: 'intent-classification',
      input: userMessage,
    });

    if (localResult.success) {
      const parsed = typeof localResult.output === 'string' 
        ? JSON.parse(localResult.output) 
        : localResult.output;

      console.log(`[IntentParser] ${localResult.model === 'local-classifier' ? 'Local' : 'Cloud'} inference:`, localResult.latencyMs, 'ms');

      return {
        intent: parsed.intent || Intent.UNKNOWN,
        entities: parsed.entities || {},
        confidence: parsed.confidence || 0,
        response: parsed.response || '收到你的指令了',
        needsConfirmation: parsed.needsConfirmation || false,
        confirmationMessage: parsed.confirmationMessage,
      };
    }

    // If local fails, fallback to simple regex
    return parseIntentSimple(userMessage);
  } catch {
    return parseIntentSimple(userMessage);
  }
}

export function parseIntentSimple(userMessage: string): IntentResult {
  const lower = userMessage.toLowerCase();

  if (lower.includes('添加') && (lower.includes('订阅源') || lower.includes('源'))) {
    const urlMatch = userMessage.match(/https?:\/\/[^\s]+/);
    return {
      intent: Intent.ADD_SOURCE,
      entities: { sourceUrl: urlMatch?.[0], sourceName: extractName(userMessage) },
      confidence: urlMatch ? 0.9 : 0.5,
      response: urlMatch ? `好的，要添加订阅源 ${urlMatch[0]}，请问叫什么名字？` : '请提供订阅源的URL',
      needsConfirmation: true,
      confirmationMessage: '确认添加这个订阅源？',
    };
  }

  if (lower.includes('删除') && lower.includes('订阅源')) {
    return {
      intent: Intent.DELETE_SOURCE,
      entities: { sourceName: extractName(userMessage) },
      confidence: 0.7,
      response: '确定要删除这个订阅源吗？',
      needsConfirmation: true,
      confirmationMessage: '确认删除此订阅源？',
    };
  }

  if (lower.includes('搜索') || lower.includes('查找')) {
    const keyword = userMessage.replace(/搜索|查找/gi, '').trim();
    return {
      intent: Intent.SEARCH_ARTICLES,
      entities: { articleFilter: { keyword } },
      confidence: keyword ? 0.9 : 0.5,
      response: `好的，搜索"${keyword || '相关内容'}"...`,
      needsConfirmation: false,
    };
  }

  if (lower.includes('创建') && (lower.includes('标签') || lower.includes('tag'))) {
    return {
      intent: Intent.CREATE_TAG,
      entities: { tagName: extractName(userMessage), tagColor: '#3B82F6' },
      confidence: 0.8,
      response: '好的，创建一个新标签',
      needsConfirmation: false,
    };
  }

  return {
    intent: Intent.UNKNOWN,
    entities: {},
    confidence: 0,
    response: '抱歉，我不太理解你的意思。你可以尝试说"添加订阅源"、"搜索文章"、"创建标签"等。',
    needsConfirmation: false,
  };
}

function extractName(text: string): string | undefined {
  const patterns = [/"([^"]+)"/, /'([^']+)'/, /（([^）]+））/];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return undefined;
}
