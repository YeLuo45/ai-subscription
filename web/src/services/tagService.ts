/**
 * Tag Service - Business logic for tag operations
 */

import type { Tag, ArticleTag, FeedTag } from '../types/tag';
import { TAG_COLORS, createTag, generateTagId } from '../types/tag';
import * as db from '../db/indexeddb';

// Re-export types
export type { Tag, ArticleTag, FeedTag } from '../types/tag';

// ============================================================
// AI Tag Generation
// ============================================================

interface AITagResult {
  topic: string[];
  format: string[];
  sentiment: string[];
}

/**
 * Generate tags for a feed using AI
 * @param feedTitle Feed title
 * @param feedDescription Feed description
 * @param apiKey Optional API key
 * @returns Array of generated tags (max 3)
 */
export async function generateFeedTags(
  feedTitle: string,
  feedDescription: string,
  apiKey?: string
): Promise<Tag[]> {
  try {
    const { callLLM } = await import('@shared/lib/ai/llm');
    
    const prompt = `分析以下RSS订阅源，生成3个标签：1个主题标签、1个形式标签、1个情绪标签。
每个标签应该是简短的中文词汇（2-4字）。

要求：
- 主题标签：描述内容主题（如：科技、财经、教育、新闻、娱乐等）
- 形式标签：描述内容形式（如：资讯、教程、评论、分析、访谈等）
- 情绪标签：描述内容调性（如：轻松、严肃、深度、热点、深度等）

只返回JSON格式，格式如下：
{"topic":["主题标签"],"format":["形式标签"],"sentiment":["情绪标签"]}

订阅源信息：
标题：${feedTitle}
描述：${feedDescription || '无'}`;

    const result = await callLLM(
      {
        model: 'minimax/MiniMax-Text-01',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        maxTokens: 200,
        apiKey: apiKey || '',
      },
      'tag-generation'
    );

    const text = result.text.trim();
    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return generateFallbackTags(feedTitle);
    }

    const parsed = JSON.parse(jsonMatch[0]) as AITagResult;
    const tags: Tag[] = [];

    // Topic
    if (parsed.topic?.[0]) {
      tags.push(createTag({
        name: parsed.topic[0],
        color: TAG_COLORS[tags.length % TAG_COLORS.length],
        type: 'topic',
      }));
    }

    // Format
    if (parsed.format?.[0]) {
      tags.push(createTag({
        name: parsed.format[0],
        color: TAG_COLORS[tags.length % TAG_COLORS.length],
        type: 'format',
      }));
    }

    // Sentiment
    if (parsed.sentiment?.[0]) {
      tags.push(createTag({
        name: parsed.sentiment[0],
        color: TAG_COLORS[tags.length % TAG_COLORS.length],
        type: 'sentiment',
      }));
    }

    // Save to DB
    await db.bulkSaveTags(tags);

    return tags;
  } catch (err) {
    console.error('Failed to generate feed tags:', err);
    return generateFallbackTags(feedTitle);
  }
}

/**
 * Generate tags for an article using AI
 */
export async function generateArticleTags(
  articleTitle: string,
  articleContent: string,
  feedTags: Tag[],
  apiKey?: string
): Promise<Tag[]> {
  try {
    const { callLLM } = await import('@shared/lib/ai/llm');
    
    const existingTags = feedTags.map(t => t.name).join('、');
    const content = (articleTitle + ' ' + articleContent).slice(0, 2000);

    const prompt = `根据已有的订阅源标签，分析这篇新文章是否匹配这些标签，并推荐最合适的标签。

已有的订阅源标签：${existingTags || '暂无'}

文章标题：${articleTitle}
文章内容摘要：${content}

要求：
1. 从已有标签中选择最匹配的1-2个标签
2. 如果文章明显偏离已有标签，可以不推荐任何标签
3. 只返回已有标签中的标签名，不要创建新标签
4. 用JSON格式返回：{"recommendedTags":["标签1","标签2"]}
5. 如果没有合适的标签，返回{"recommendedTags":[]}`;

    const result = await callLLM(
      {
        model: 'minimax/MiniMax-Text-01',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 100,
        apiKey: apiKey || '',
      },
      'article-tag-recommendation'
    );

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as { recommendedTags: string[] };
    const recommendedTagNames = parsed.recommendedTags || [];

    // Match with existing tags
    const allTags = await db.getAllTags();
    const matchedTags = allTags.filter(t => recommendedTagNames.includes(t.name));

    return matchedTags.slice(0, 2);
  } catch (err) {
    console.error('Failed to generate article tags:', err);
    return [];
  }
}

function generateFallbackTags(feedTitle: string): Tag[] {
  // Simple fallback based on title keywords
  const keywords = extractKeywords(feedTitle);
  const tags: Tag[] = [];

  const typeMap: Record<string, Tag['type']> = {
    'news': 'topic', '新闻': 'topic',
    'tech': 'topic', '技术': 'topic', '科技': 'topic',
    'finance': 'topic', '财经': 'topic', '金融': 'topic',
  };

  const formatMap: Record<string, Tag['type']> = {
    'blog': 'format', '博客': 'format',
    'tutorial': 'format', '教程': 'format',
    'video': 'format', '视频': 'format',
    'podcast': 'format', '播客': 'format',
  };

  for (const kw of keywords.slice(0, 2)) {
    const lower = kw.toLowerCase();
    if (typeMap[lower]) {
      tags.push(createTag({
        name: kw,
        color: TAG_COLORS[tags.length % TAG_COLORS.length],
        type: 'topic',
      }));
    } else if (formatMap[lower]) {
      tags.push(createTag({
        name: kw,
        color: TAG_COLORS[tags.length % TAG_COLORS.length],
        type: 'format',
      }));
    }
  }

  if (tags.length < 3) {
    tags.push(createTag({
      name: '资讯',
      color: TAG_COLORS[tags.length % TAG_COLORS.length],
      type: 'format',
    }));
  }

  if (tags.length < 3) {
    tags.push(createTag({
      name: '一般',
      color: TAG_COLORS[tags.length % TAG_COLORS.length],
      type: 'sentiment',
    }));
  }

  return tags.slice(0, 3);
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['的', '了', '和', '是', '在', '与', '以及', 'the', 'a', 'an', 'of', 'and', 'or']);
  const words = text.split(/[\s\-_:,，。【】\[\]（）\(\)]+/)
    .filter(w => w.length >= 2 && w.length <= 6 && !stopWords.has(w.toLowerCase()));
  
  // Dedupe and limit
  return [...new Set(words)].slice(0, 5);
}

// ============================================================
// Tag CRUD Operations
// ============================================================

export async function getAllTags(): Promise<Tag[]> {
  return db.getAllTags();
}

export async function getTagById(id: string): Promise<Tag | undefined> {
  return db.getTagById(id);
}

export async function renameTag(tagId: string, newName: string): Promise<void> {
  const tag = await db.getTagById(tagId);
  if (tag) {
    tag.name = newName;
    tag.updatedAt = Date.now();
    await db.saveTag(tag);
  }
}

export async function updateTagColor(tagId: string, color: string): Promise<void> {
  const tag = await db.getTagById(tagId);
  if (tag) {
    tag.color = color;
    tag.updatedAt = Date.now();
    await db.saveTag(tag);
  }
}

export async function deleteTagById(tagId: string): Promise<void> {
  // Clean up article_tags
  const { getArticlesByTagId } = await import('../db/indexeddb');
  const articleTags = await getArticlesByTagId(tagId);
  for (const at of articleTags) {
    await db.deleteArticleTag(at.id);
  }

  // Clean up feed_tags
  const feedTags = await db.getFeedsByTagId(tagId);
  for (const ft of feedTags) {
    await db.deleteFeedTag(ft.id);
  }

  // Delete tag itself
  await db.deleteTag(tagId);
}

export async function mergeTags(sourceTagId: string, targetTagId: string): Promise<void> {
  await db.mergeTags(sourceTagId, targetTagId);
}

// ============================================================
// Feed Tag Operations
// ============================================================

export async function getTagsForFeed(feedId: string): Promise<Tag[]> {
  const feedTags = await db.getFeedTags(feedId);
  const tagIds = feedTags.map(ft => ft.tagId);
  const allTags = await db.getAllTags();
  return allTags.filter(t => tagIds.includes(t.id));
}

export async function addTagToFeed(feedId: string, tagId: string, source: 'ai' | 'manual' = 'manual'): Promise<void> {
  const feedTag: FeedTag = {
    id: `ft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    feedId,
    tagId,
    source,
    createdAt: Date.now(),
  };
  await db.saveFeedTag(feedTag);
}

export async function removeTagFromFeed(feedId: string, tagId: string): Promise<void> {
  const feedTags = await db.getFeedTags(feedId);
  const ft = feedTags.find(t => t.tagId === tagId);
  if (ft) {
    await db.deleteFeedTag(ft.id);
  }
}

// ============================================================
// Article Tag Operations
// ============================================================

export async function getTagsForArticle(articleId: string): Promise<Tag[]> {
  const articleTags = await db.getArticleTags(articleId);
  const tagIds = articleTags.map(at => at.tagId);
  const allTags = await db.getAllTags();
  return allTags.filter(t => tagIds.includes(t.id));
}

export async function addTagToArticle(articleId: string, tagId: string, source: 'ai' | 'manual' = 'manual'): Promise<void> {
  const articleTag: ArticleTag = {
    id: `at_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    articleId,
    tagId,
    source,
    createdAt: Date.now(),
  };
  await db.saveArticleTag(articleTag);
}

export async function removeTagFromArticle(articleId: string, tagId: string): Promise<void> {
  const articleTags = await db.getArticleTags(articleId);
  const at = articleTags.find(t => t.tagId === tagId);
  if (at) {
    await db.deleteArticleTag(at.id);
  }
}

// ============================================================
// Filter State
// ============================================================

const FILTER_STATE_KEY = 'article-filter-tags';

export async function saveSelectedTags(tagIds: string[]): Promise<void> {
  await db.saveFilterState(FILTER_STATE_KEY, tagIds);
}

export async function getSelectedTags(): Promise<string[]> {
  return db.getFilterState(FILTER_STATE_KEY);
}
