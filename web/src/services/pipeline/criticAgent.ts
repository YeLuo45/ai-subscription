/**
 * Critic Agent
 * Evaluates and scores agent outputs for quality assurance
 */

import { routeAndCall } from '@shared/lib/ai/llm-router';
import type { ExtractionResult, SummaryResult, TagResult, TranslationResult } from './types';

export interface CriticScore {
  overall: number; // 0-100
  accuracy: number;
  coherence: number;
  relevance: number;
  details: string;
}

export interface AgentOutput {
  extraction?: ExtractionResult;
  summary?: SummaryResult;
  tags?: TagResult;
  translation?: TranslationResult;
}

const DEFAULT_SCORE: CriticScore = {
  overall: 70,
  accuracy: 70,
  coherence: 70,
  relevance: 70,
  details: 'Fallback score due to evaluation error',
};

/**
 * Create a CriticAgent that evaluates agent outputs
 */
export function createCriticAgent() {
  return async (output: AgentOutput): Promise<{ agent: string; data: CriticScore }> => {
    const prompt = `评估以下AI处理结果的质量。

评估维度：
1. 准确性 (accuracy): 信息是否准确、完整
2. 连贯性 (coherence): 结果是否逻辑清晰、表达流畅
3. 相关性 (relevance): 结果是否与内容主题相关

被评估的内容：
- 提取结果：${output.extraction ? JSON.stringify(output.extraction) : 'N/A'}
- 摘要结果：${output.summary ? JSON.stringify(output.summary) : 'N/A'}
- 标签结果：${output.tags ? JSON.stringify(output.tags) : 'N/A'}
- 翻译结果：${output.translation ? JSON.stringify(output.translation) : 'N/A'}

请返回JSON格式的评分：
{
  "accuracy": 0-100,
  "coherence": 0-100,
  "relevance": 0-100,
  "overall": 0-100,
  "details": "评估说明（中文50字以内）"
}`;

    try {
      const result = await routeAndCall({
        taskType: 'standard-summary',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 300,
      });

      const text = result.text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return { agent: 'critic', data: DEFAULT_SCORE };
      }

      try {
        const parsed = JSON.parse(jsonMatch[0]) as CriticScore;
        return {
          agent: 'critic',
          data: {
            accuracy: Math.min(100, Math.max(0, parsed.accuracy ?? 70)),
            coherence: Math.min(100, Math.max(0, parsed.coherence ?? 70)),
            relevance: Math.min(100, Math.max(0, parsed.relevance ?? 70)),
            overall: Math.min(100, Math.max(0, parsed.overall ?? 70)),
            details: parsed.details || '评估完成',
          },
        };
      } catch {
        return { agent: 'critic', data: DEFAULT_SCORE };
      }
    } catch {
      return { agent: 'critic', data: DEFAULT_SCORE };
    }
  };
}

/**
 * Check if a score indicates quality fallback is needed
 */
export function needsFallback(score: CriticScore): boolean {
  return score.overall < 50 || score.accuracy < 40;
}
