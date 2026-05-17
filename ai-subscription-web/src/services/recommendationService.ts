/**
 * Recommendation Service - 个性化推荐 + 相似文章推荐
 * 基于用户阅读历史、内容关键词相似度实现智能推荐
 */
import { ContentItem } from '../types';

export interface UserPreference {
  /** 用户偏好的关键词及其权重 */
  keywordWeights: Record<string, number>;
  /** 用户偏好类别统计 */
  categoryCounts: Record<string, number>;
  /** 阅读历史（记录点击过的内容ID） */
  readHistory: string[];
  /** 已生成摘要的内容ID */
  summarizedIds: string[];
  /** 最近更新时间 */
  updatedAt: string;
}

export interface RecommendedItem extends ContentItem {
  /** 推荐得分 */
  score: number;
  /** 推荐理由 */
  reason: 'personalized' | 'similar' | 'trending' | 'fresh';
}

export interface SimilarItem {
  item: ContentItem;
  similarity: number; // 0-1
  matchedKeywords: string[];
}

const STORAGE_KEY = 'ai_recommendation_prefs';
const MAX_READ_HISTORY = 100;
const MAX_SUMMARIZED = 200;

/** 加载用户偏好 */
export function loadUserPreferences(): UserPreference {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {}
  return {
    keywordWeights: {},
    categoryCounts: {},
    readHistory: [],
    summarizedIds: [],
    updatedAt: new Date().toISOString(),
  };
}

/** 保存用户偏好 */
function saveUserPreferences(prefs: UserPreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

/**
 * 从文本提取关键词（简单分词 + 词频统计）
 */
function extractKeywords(text: string, topN = 10): string[] {
  // 去除HTML标签
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  
  // 停用词
  const stopWords = new Set([
    '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
    '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
    '自己', '这', '那', '他', '她', '它', '们', '这个', '那个', '什么', '怎么',
    '为', '与', '或', '但', '以', '及', '等', '被', '让', '把', '从', '对', '被',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
    'might', 'must', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
  ]);

  // 英文和中文混合分词
  const words: string[] = [];
  const chineseRegex = /[\u4e00-\u9fa5]+/g;
  const englishRegex = /[a-zA-Z0-9_]+/g;
  
  let match;
  while ((match = chineseRegex.exec(plain)) !== null) {
    if (match[0].length >= 2) {
      words.push(match[0]);
    }
  }
  while ((match = englishRegex.exec(plain)) !== null) {
    const w = match[0].toLowerCase();
    if (w.length >= 3 && !stopWords.has(w)) {
      words.push(w);
    }
  }

  // 词频统计
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  // 排序取topN
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([w]) => w);
}

/**
 * 计算两个关键词集合的相似度（Jaccard）
 */
function keywordSimilarity(kw1: string[], kw2: string[]): number {
  if (kw1.length === 0 || kw2.length === 0) return 0;
  const set1 = new Set(kw1);
  const set2 = new Set(kw2);
  const set1Arr = Array.from(set1);
  const intersection = set1Arr.filter(w => set2.has(w)).length;
  return intersection / Math.sqrt(set1.size * set2.size);
}

/**
 * 获取内容关键词
 */
function getContentKeywords(item: ContentItem): string[] {
  const text = `${item.title} ${item.description || ''} ${(item.keywords || []).join(' ')}`;
  return extractKeywords(text, 15);
}

/**
 * 更新用户偏好（每次阅读/生成摘要时调用）
 */
export function updateUserPreferences(
  item: ContentItem,
  action: 'read' | 'summarize'
): UserPreference {
  const prefs = loadUserPreferences();
  const keywords = getContentKeywords(item);
  const category = 'general'; // 后续可从订阅源category获取

  if (action === 'read') {
    // 更新阅读历史
    prefs.readHistory = [
      item.id,
      ...prefs.readHistory.filter(id => id !== item.id),
    ].slice(0, MAX_READ_HISTORY);
  } else if (action === 'summarize') {
    // 更新摘要历史，关键词权重提升
    prefs.summarizedIds = [
      item.id,
      ...prefs.summarizedIds.filter(id => id !== item.id),
    ].slice(0, MAX_SUMMARIZED);
    
    for (const kw of keywords) {
      prefs.keywordWeights[kw] = (prefs.keywordWeights[kw] || 0) + 2;
    }
  }

  // 同时用阅读行为更新权重（较轻）
  if (action === 'read') {
    for (const kw of keywords) {
      prefs.keywordWeights[kw] = (prefs.keywordWeights[kw] || 0) + 0.5;
    }
  }

  prefs.categoryCounts[category] = (prefs.categoryCounts[category] || 0) + 1;
  prefs.updatedAt = new Date().toISOString();

  saveUserPreferences(prefs);
  return prefs;
}

/**
 * 计算单篇文章对用户的推荐得分
 */
function computePersonalizedScore(item: ContentItem, prefs: UserPreference): number {
  const keywords = getContentKeywords(item);
  if (keywords.length === 0) return 0;

  let score = 0;
  for (const kw of keywords) {
    score += prefs.keywordWeights[kw] || 0;
  }
  return score;
}

/**
 * 个性化推荐 - 从所有内容中推荐用户可能感兴趣的
 */
export function getPersonalizedRecommendations(
  allContents: Record<string, ContentItem[]>,
  options: {
    maxItems?: number;
    minScore?: number;
    excludeRead?: boolean;
  } = {}
): RecommendedItem[] {
  const { maxItems = 20, minScore = 0.5, excludeRead = true } = options;
  const prefs = loadUserPreferences();
  
  const items: RecommendedItem[] = [];

  for (const [, contents] of Object.entries(allContents)) {
    for (const item of contents) {
      // 排除已读
      if (excludeRead && prefs.readHistory.includes(item.id)) continue;
      // 排除已摘要（可选）
      if (prefs.summarizedIds.includes(item.id)) continue;

      const score = computePersonalizedScore(item, prefs);
      const freshness = computeFreshnessScore(item.pubDate);

      // 综合得分 = 个性化得分 * 0.7 + 新鲜度 * 0.3
      const totalScore = score * 0.7 + freshness * 30 * 0.3;

      if (totalScore >= minScore) {
        items.push({
          ...item,
          score: totalScore,
          reason: score > 0 ? 'personalized' : 'fresh',
        });
      }
    }
  }

  // 排序并返回
  return items
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems);
}

/**
 * 计算新鲜度得分（时间越近分数越高）
 */
function computeFreshnessScore(pubDate: string): number {
  const now = Date.now();
  const then = new Date(pubDate).getTime();
  const ageHours = (now - then) / (1000 * 60 * 60);

  if (ageHours < 1) return 1.0;
  if (ageHours < 6) return 0.9;
  if (ageHours < 24) return 0.7;
  if (ageHours < 72) return 0.5;
  if (ageHours < 168) return 0.3;
  return 0.1;
}

/**
 * 相似文章推荐 - 找到与当前文章最相似的其他文章
 */
export function findSimilarArticles(
  targetItem: ContentItem,
  allContents: Record<string, ContentItem[]>,
  options: {
    maxItems?: number;
    minSimilarity?: number;
  } = {}
): SimilarItem[] {
  const { maxItems = 10, minSimilarity = 0.2 } = options;
  
  const targetKeywords = getContentKeywords(targetItem);
  const results: SimilarItem[] = [];

  for (const [, contents] of Object.entries(allContents)) {
    for (const item of contents) {
      if (item.id === targetItem.id) continue;

      const itemKeywords = getContentKeywords(item);
      const similarity = keywordSimilarity(targetKeywords, itemKeywords);

      if (similarity >= minSimilarity) {
        // 找出匹配的关键词
        const matchedKeywords = targetKeywords.filter(kw =>
          itemKeywords.includes(kw)
        );
        results.push({ item, similarity, matchedKeywords });
      }
    }
  }

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxItems);
}

/**
 * 热门推荐 - 按阅读量/互动率排序
 */
export function getTrendingRecommendations(
  allContents: Record<string, ContentItem[]>,
  maxItems = 10
): RecommendedItem[] {
  const prefs = loadUserPreferences();
  
  const items: RecommendedItem[] = [];

  for (const [, contents] of Object.entries(allContents)) {
    for (const item of contents) {
      const recency = computeFreshnessScore(item.pubDate);
      // 热门权重：有摘要的、已读的视为高互动
      const interaction = prefs.summarizedIds.includes(item.id) ? 0.3 : 
                         prefs.readHistory.includes(item.id) ? 0.1 : 0;

      items.push({
        ...item,
        score: recency + interaction,
        reason: recency > 0.7 ? 'trending' : 'fresh',
      });
    }
  }

  return items
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems);
}

/**
 * 混合推荐 - 结合个性化 + 热门 + 新鲜度
 */
export function getHybridRecommendations(
  allContents: Record<string, ContentItem[]>,
  maxItems = 20
): RecommendedItem[] {
  const prefs = loadUserPreferences();
  const items: RecommendedItem[] = [];

  for (const [, contents] of Object.entries(allContents)) {
    for (const item of contents) {
      const personalizedScore = computePersonalizedScore(item, prefs);
      const freshness = computeFreshnessScore(item.pubDate);
      const interaction = prefs.summarizedIds.includes(item.id) ? 0.3 :
                         prefs.readHistory.includes(item.id) ? 0.1 : 0;

      // 混合权重
      const totalScore = personalizedScore * 0.5 + freshness * 30 * 0.3 + interaction * 10;

      let reason: RecommendedItem['reason'] = 'fresh';
      if (personalizedScore > 2) reason = 'personalized';
      else if (freshness > 0.5) reason = 'trending';

      items.push({ ...item, score: totalScore, reason });
    }
  }

  return items
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems);
}