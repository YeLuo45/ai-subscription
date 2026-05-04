/**
 * AI Provider - PC 端新架构
 * 基于 callLLM/streamLLM + Tool-use，复用 shared/ 代码
 */

import { callLLM, streamLLM } from '../../../shared/lib/ai/llm';
import { toolExecutors, toolList } from '../../../shared/lib/ai/tools';
import type { ToolName } from '../../../shared/lib/ai/types/tool';

export interface SummarizeOptions {
  summaryLength?: 'short' | 'medium' | 'long';
}

export interface SummarizeResult {
  success: boolean;
  summary: string;
  keywords: string[];
  modelUsed: string;
  error?: string;
}

function buildPrompt(text: string, length: 'short' | 'medium' | 'long'): string {
  const len = { short: 100, medium: 300, long: 500 }[length];
  return `请对以下内容生成一个约${len}字的中文摘要，并提取5个关键词。要求用JSON格式输出：{"summary":"摘要","keywords":["关键词1","关键词2"]}。内容：${text.slice(0, 3000)}`;
}

export async function summarizeForPC(text: string, options?: SummarizeOptions): Promise<SummarizeResult> {
  try {
    const result = await callLLM({
      model: 'minimax/MiniMax-Text-01',
      messages: [{ role: 'user', content: buildPrompt(text, options?.summaryLength ?? 'medium') }],
    }, 'pc-summarize');
    
    // Try parse JSON from result.text
    let summary = result.text;
    let keywords: string[] = [];
    try {
      const parsed = JSON.parse(result.text);
      summary = parsed.summary ?? result.text;
      keywords = parsed.keywords ?? [];
    } catch {}
    
    return { success: true, summary, keywords, modelUsed: 'MiniMax-Text-01' };
  } catch (err) {
    return { success: false, summary: '', keywords: [], modelUsed: 'MiniMax-Text-01', error: String(err) };
  }
}

// Re-export tool utilities for potential future use
export { toolExecutors, toolList };
export type { ToolName };
