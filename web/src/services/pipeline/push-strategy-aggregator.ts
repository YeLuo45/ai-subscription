/**
 * Push Strategy Aggregator
 * Aggregates multiple content items into a single push notification strategy
 */

import { routeAndCall } from '@shared/lib/ai/llm-router';
import type {
  PushStrategyItem,
  PushStrategyResult,
  AggregatedPushContent,
  BatchPushStrategyRequest,
  PushContentAnalysis,
} from './push-strategy-types';

/**
 * Analyze single item for push strategy
 */
async function analyzeForPush(
  item: PushStrategyItem
): Promise<PushContentAnalysis> {
  const content = item.description || item.content || item.title;

  const prompt = `分析以下内容，生成推送通知策略。

内容：
标题：${item.title}
描述：${content.slice(0, 500)}

要求：
1. pushTitle：生成一个吸引点击的推送标题（中文，不超过50字，能引起用户好奇心）
2. previewText：简短的预览文本（不超过100字）
3. category：内容分类（科技/财经/教育/娱乐/新闻/其他）
4. urgencyLevel：紧急程度（low/medium/high）
5. soundType：通知声音类型（default/urgent/gentle/none）

返回JSON格式：
{
  "pushTitle": "吸引人的标题",
  "previewText": "预览文本",
  "category": "分类",
  "urgencyLevel": "medium",
  "soundType": "default"
}`;

  const result = await routeAndCall({
    taskType: 'push-strategy',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    maxTokens: 500,
  });

  const text = result.text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return {
      pushTitle: item.title.slice(0, 50),
      previewText: content.slice(0, 100),
      category: 'other',
      urgencyLevel: 'medium',
      soundType: 'default',
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      pushTitle: parsed.pushTitle || item.title.slice(0, 50),
      previewText: parsed.previewText || content.slice(0, 100),
      category: parsed.category || 'other',
      urgencyLevel: parsed.urgencyLevel || 'medium',
      soundType: parsed.soundType || 'default',
    };
  } catch {
    return {
      pushTitle: item.title.slice(0, 50),
      previewText: content.slice(0, 100),
      category: 'other',
      urgencyLevel: 'medium',
      soundType: 'default',
    };
  }
}

/**
 * Aggregate multiple items into a single push content
 */
async function aggregateContent(
  items: PushStrategyItem[],
  analysis: PushContentAnalysis[]
): Promise<AggregatedPushContent> {
  const sourceNames = items
    .map((item) => item.source)
    .filter((s): s is string => !!s);
  const uniqueSource = [...new Set(sourceNames)].join(', ') || '综合';

  const combinedContent = items
    .map((item) => `【${item.title}】${(item.description || item.content || '').slice(0, 200)}`)
    .join('\n\n');

  const prompt = `你是一个内容聚合专家，将多条内容合并成一条推送。

原始内容：
${combinedContent.slice(0, 2000)}

要求：
1. title：生成一条综合推送标题（中文，不超过40字，能概括全部内容）
2. body：生成推送正文（100-200字），概括最重要内容，吸引用户点击
3. highlights：提取3-5个关键亮点/要点（每个不超过30字）
4. tags：生成3个标签用于分类

返回JSON格式：
{
  "title": "综合标题",
  "body": "推送正文",
  "highlights": ["亮点1", "亮点2", "亮点3"],
  "tags": ["标签1", "标签2", "标签3"]
}`;

  const result = await routeAndCall({
    taskType: 'push-strategy',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    maxTokens: 800,
  });

  const text = result.text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  let aggregated = {
    title: analysis[0]?.pushTitle || items[0]?.title.slice(0, 40) || '今日内容更新',
    body: analysis[0]?.previewText || items[0]?.description?.slice(0, 150) || '',
    highlights: analysis.slice(0, 3).map((a) => a.pushTitle),
    tags: [analysis[0]?.category || 'other'],
  };

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      aggregated = {
        title: parsed.title || aggregated.title,
        body: parsed.body || aggregated.body,
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 5) : aggregated.highlights,
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 3) : aggregated.tags,
      };
    } catch {
      // Keep aggregated defaults
    }
  }

  return {
    ...aggregated,
    source: uniqueSource,
    itemCount: items.length,
    analysis: analysis[0] || {
      pushTitle: aggregated.title,
      previewText: aggregated.body.slice(0, 100),
      category: aggregated.tags[0] || 'other',
      urgencyLevel: 'medium',
      soundType: 'default',
    },
  };
}

/**
 * Determine if content should be pushed based on user preferences
 */
function shouldPushContent(
  analysis: PushContentAnalysis[],
  preferences?: BatchPushStrategyRequest['userPreferences']
): { shouldPush: boolean; reasoning: string } {
  if (!preferences) {
    return { shouldPush: true, reasoning: '无偏好设置，默认推送' };
  }

  // Check urgency - always push high urgency
  const hasHighUrgency = analysis.some((a) => a.urgencyLevel === 'high');
  if (hasHighUrgency) {
    return { shouldPush: true, reasoning: '包含高紧急程度内容' };
  }

  // Check preferred categories
  if (preferences.preferredCategories && preferences.preferredCategories.length > 0) {
    const hasPreferredCategory = analysis.some((a) =>
      preferences.preferredCategories!.includes(a.category)
    );
    if (!hasPreferredCategory) {
      return { shouldPush: false, reasoning: '内容不符合用户偏好分类' };
    }
  }

  // Check quiet hours (simplified - just check if current time is in quiet hours)
  if (preferences.quietHoursStart && preferences.quietHoursEnd) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    if (currentTime >= preferences.quietHoursStart && currentTime <= preferences.quietHoursEnd) {
      return { shouldPush: false, reasoning: '当前时间在免打扰时段内' };
    }
  }

  return { shouldPush: true, reasoning: '内容符合推送条件' };
}

/**
 * Generate push strategy for a batch of content items
 */
export async function generatePushStrategy(
  request: BatchPushStrategyRequest
): Promise<PushStrategyResult> {
  const { items, userPreferences } = request;

  if (items.length === 0) {
    return {
      shouldPush: false,
      content: {
        title: '无内容',
        body: '暂无新内容可推送',
        source: '',
        highlights: [],
        tags: [],
        analysis: {
          pushTitle: '无内容',
          previewText: '暂无新内容',
          category: 'other',
          urgencyLevel: 'low',
          soundType: 'none',
        },
      },
      reasoning: '无内容输入',
    };
  }

  // Analyze each item
  const analysisPromises = items.map((item) => analyzeForPush(item));
  const analysisResults = await Promise.all(analysisPromises);

  // Check if we should push
  const { shouldPush, reasoning } = shouldPushContent(analysisResults, userPreferences);

  // Aggregate content
  const aggregatedContent = await aggregateContent(items, analysisResults);

  // Determine recommended push time (simplified - return next available slot)
  let recommendedTime: string | undefined;
  if (!shouldPush && userPreferences?.quietHoursStart && userPreferences?.quietHoursEnd) {
    // If in quiet hours, recommend time after quiet hours
    recommendedTime = userPreferences.quietHoursEnd;
  }

  return {
    shouldPush,
    content: aggregatedContent,
    recommendedTime,
    reasoning,
  };
}

/**
 * Generate push strategy for a single item (convenience function)
 */
export async function generateSinglePushStrategy(
  item: PushStrategyItem,
  preferences?: BatchPushStrategyRequest['userPreferences']
): Promise<PushStrategyResult> {
  return generatePushStrategy({ items: [item], userPreferences: preferences });
}
