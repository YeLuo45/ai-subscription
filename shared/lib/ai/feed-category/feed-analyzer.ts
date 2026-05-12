/**
 * AI Feed Category Analyzer
 * Analyzes RSS feed topics and generates category classifications
 */

import { routeAndCall } from '../llm-router';
import type { TaskType } from '../providers-ai-subscription';

export interface CategoryAnalysisResult {
  categories: string[];
  confidence: number;
}

/**
 * Analyze RSS feed category using AI
 * @param feedUrl - The feed URL
 * @param feedTitle - The feed title
 * @param recentTitles - Recent article titles from the feed
 * @returns Category analysis result with categories and confidence score
 */
export async function analyzeFeedCategory(
  feedUrl: string,
  feedTitle: string,
  recentTitles: string[]
): Promise<CategoryAnalysisResult> {
  const prompt = `分析这个 RSS 订阅源的主题领域。
  订阅源标题: ${feedTitle}
  最近文章标题: ${recentTitles.join(', ')}
  请输出 1-3 个分类标签（如：科技、财经、教育、医疗、AI、小说等）
  按置信度排序。
  JSON: { "categories": [], "confidence": 0.0 }`;

  const result = await routeAndCall({
    taskType: 'standard-summary' as TaskType,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    maxTokens: 500,
  });

  const text = result.text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    // Fallback to basic analysis
    return {
      categories: ['未分类'],
      confidence: 0.0,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as CategoryAnalysisResult;
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories.slice(0, 3) : ['未分类'],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    };
  } catch {
    return {
      categories: ['未分类'],
      confidence: 0.0,
    };
  }
}
