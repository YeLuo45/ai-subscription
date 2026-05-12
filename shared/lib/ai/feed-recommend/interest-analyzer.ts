/**
 * Interest Analyzer
 * Analyzes user reading history to generate interest vectors and keyword profiles
 */

import { routeAndCall } from '../llm-router';
import type { TaskType } from '../providers-ai-subscription';

interface ArticleForAnalysis {
  title: string;
  content: string;
  categories: string[];
}

/**
 * Analyze user reading history and generate interest profile
 */
export async function analyzeUserInterest(
  readArticles: ArticleForAnalysis[]
): Promise<{
  interestVector: { [category: string]: number };
  topCategories: string[];
  topKeywords: string[];
}> {
  if (readArticles.length === 0) {
    return {
      interestVector: {},
      topCategories: [],
      topKeywords: [],
    };
  }

  // Step 1: Count category frequencies
  const categoryCounts: { [category: string]: number } = {};
  for (const article of readArticles) {
    for (const cat of article.categories) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }

  // Step 2: Normalize to create interest vector
  const totalArticles = readArticles.length;
  const interestVector: { [category: string]: number } = {};
  
  for (const [category, count] of Object.entries(categoryCounts)) {
    interestVector[category] = count / totalArticles;
  }

  // Step 3: Extract top categories
  const sortedCategories = Object.entries(interestVector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const topCategories = sortedCategories.map(([cat]) => cat);

  // Step 4: Extract keywords using AI or fallback to TF-IDF-like approach
  const topKeywords = await extractKeywords(readArticles, topCategories);

  return {
    interestVector,
    topCategories,
    topKeywords,
  };
}

/**
 * Extract top keywords from articles using AI or fallback method
 */
async function extractKeywords(
  readArticles: ArticleForAnalysis[],
  topCategories: string[]
): Promise<string[]> {
  // Prepare content summary
  const contentSummary = readArticles
    .slice(0, 20) // Limit to recent 20 articles
    .map(a => `标题: ${a.title}\n分类: ${a.categories.join(', ')}`)
    .join('\n---\n');

  const prompt = `根据用户阅读历史，提取5-8个最感兴趣的关键词。

用户阅读的 文章摘要：
${contentSummary}

已知兴趣分类：${topCategories.join(', ')}

要求：提取能反映用户持续关注方向的关键词（如：AI、投资、育儿、健康等）
JSON格式：{ "keywords": ["关键词1", "关键词2", ...] }`;

  try {
    const result = await routeAndCall({
      taskType: 'tag-generation' as TaskType,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      maxTokens: 200,
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as { keywords?: string[] };
        if (parsed.keywords && Array.isArray(parsed.keywords)) {
          return parsed.keywords.slice(0, 8);
        }
      } catch {
        // Fall through to keyword extraction
      }
    }
  } catch {
    // AI extraction failed, use fallback
  }

  // Fallback: TF-IDF-like keyword extraction
  return extractKeywordsFallback(readArticles, topCategories);
}

/**
 * Fallback keyword extraction using simple frequency analysis
 */
function extractKeywordsFallback(
  readArticles: ArticleForAnalysis[],
  topCategories: string[]
): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    '的', '了', '是', '在', '和', '与', '对', '为', '有', '这', '个', '们', '中',
    'of', 'the', 'and', 'in', 'to', 'is', 'for', 'on', 'with', 'that', 'this',
    'a', 'an', 'by', 'from', 'as', 'at', 'by', 'be', 'are', 'was', 'were',
  ]);

  // Category-specific keywords to look for
  const categoryKeywords: { [category: string]: string[] } = {
    '科技': ['AI', '人工智能', '技术', '软件', '硬件', '编程', '代码', '互联网', '数字', '智能'],
    '财经': ['投资', '金融', '股票', '经济', '市场', '银行', '货币', '基金', '理财', '美元'],
    '教育': ['学习', '教育', '学校', '课程', '培训', '大学', '学生', '老师', '教学', '考试'],
    '医疗': ['健康', '医学', '医院', '医生', '疾病', '治疗', '药物', '医疗', '保健', '养生'],
    '新闻': ['事件', '报道', '最新', '今日', '热点', '国际', '国内', '政治', '社会'],
    '体育': ['比赛', '运动', '球队', '球员', '冠军', '联赛', '足球', '篮球', '奥运', '体育'],
    '娱乐': ['明星', '电影', '音乐', '综艺', '演出', '娱乐', '明星', '票房', '综艺', '演员'],
    '游戏': ['游戏', '玩家', '电竞', 'Steam', '主机', '游戏', '手游', '端游', '网游'],
    '文学': ['小说', '书籍', '阅读', '作者', '作品', '文学', '出版', '书评', '读书'],
  };

  // Count keyword occurrences
  const keywordCounts: { [keyword: string]: number } = {};
  
  for (const article of readArticles) {
    const text = (article.title + ' ' + article.content).toLowerCase();
    
    // Check category-specific keywords
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      // Boost if article is in this category
      const isInCategory = article.categories.includes(category);
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + (isInCategory ? 2 : 1);
        }
      }
    }
  }

  // Sort by count and return top keywords
  const sorted = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .filter(([kw]) => !stopWords.has(kw.toLowerCase()))
    .slice(0, 8);

  return sorted.map(([kw]) => kw);
}

/**
 * Calculate category distribution from articles
 */
export function calculateCategoryDistribution(
  articles: ArticleForAnalysis[]
): { [category: string]: number } {
  const counts: { [category: string]: number } = {};
  
  for (const article of articles) {
    for (const cat of article.categories) {
      counts[cat] = (counts[cat] || 0) + 1;
    }
  }

  // Normalize to probabilities
  const total = articles.length;
  const distribution: { [category: string]: number } = {};
  
  for (const [cat, count] of Object.entries(counts)) {
    distribution[cat] = count / total;
  }

  return distribution;
}
