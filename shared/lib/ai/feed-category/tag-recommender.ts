/**
 * AI Tag Recommender
 * Generates tag recommendations for articles based on feed categories and content
 */

import { routeAndCall } from '../llm-router';
import type { TagRecommendation } from './types';
import type { TaskType } from '../providers-ai-subscription';

/**
 * Article input for tag recommendation
 */
export interface ArticleForTagging {
  title: string;
  content: string;
  feedCategories: string[];
}

/**
 * Recommend tags for an article
 * @param article - Article with title, content, and feed categories
 * @returns Array of tag recommendations with scores
 */
export async function recommendTags(
  article: ArticleForTagging
): Promise<TagRecommendation[]> {
  const prompt = `为这篇 文章生成 3-5 个标签。
  文章标题: ${article.title}
  订阅源分类: ${article.feedCategories.join(', ')}
  要求：标签简洁（2-4字）
  JSON: { "tags": [{"tag": "", "score": 0.0}] }`;

  const result = await routeAndCall({
    taskType: 'tag-generation' as TaskType,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    maxTokens: 300,
  });

  const text = result.text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return generateKeywordBasedTags(article);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { tags: Array<{ tag?: string; score?: number }> };
    if (parsed.tags && Array.isArray(parsed.tags)) {
      return parsed.tags.slice(0, 5).map(t => ({
        tag: typeof t === 'string' ? t : (t.tag || ''),
        score: typeof t === 'object' && typeof t.score === 'number' ? t.score : 0.5,
        source: 'ai' as const,
      })) as TagRecommendation[];
    }
  } catch {
    // Fall through to keyword-based tagging
  }

  return generateKeywordBasedTags(article);
}

/**
 * Generate tags based on keywords when AI fails
 */
function generateKeywordBasedTags(article: ArticleForTagging): TagRecommendation[] {
  const tags: TagRecommendation[] = [];
  const text = (article.title + ' ' + article.content).toLowerCase();

  const keywordMap: Record<string, string[]> = {
    '科技': ['技术', 'AI', '人工智能', '软件', '硬件', '编程', '代码'],
    '财经': ['金融', '投资', '股票', '经济', '市场', '银行', '货币'],
    '教育': ['学习', '学校', '课程', '教育', '培训', '大学', '学生'],
    '医疗': ['健康', '医学', '医院', '医生', '疾病', '治疗', '药物'],
    '新闻': ['事件', '报道', '最新', '今日', '热点'],
    '体育': ['比赛', '运动', '球队', '球员', '冠军', '联赛'],
    '娱乐': ['明星', '电影', '音乐', '综艺', '综艺', '演出'],
    '游戏': ['游戏', '玩家', '电竞', 'Steam', '主机'],
    '文学': ['小说', '书籍', '阅读', '作者', '作品', '文学'],
  };

  for (const [category, keywords] of Object.entries(keywordMap)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        tags.push({ tag: category, score: 0.6, source: 'keyword' });
        break;
      }
    }
  }

  if (tags.length < 3) {
    tags.push({ tag: '其他', score: 0.3, source: 'keyword' });
  }

  return tags.slice(0, 5);
}
