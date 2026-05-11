/**
 * Pipeline Agents
 * Individual AI agents for extraction, summarization, tagging, and translation
 */

import { routeAndCall } from '@shared/lib/ai/llm-router';
import type { ExtractionResult, SummaryResult, TagResult, TranslationResult, Language } from './types';

// ============================================================
// Agent Result Wrapper
// ============================================================

export interface AgentResult<T = unknown> {
  agent: string;
  data: T;
}

// ============================================================
// Extractor Agent
// Extracts title, summary, and entities from article content
// ============================================================

/**
 * Create an ExtractorAgent that extracts key information from article content
 * Uses 'standard-summary' task type for content analysis and entity extraction
 */
export function createExtractorAgent() {
  return async (content: string): Promise<AgentResult<ExtractionResult>> => {
    const prompt = `分析以下文章内容，提取关键信息。

要求：
1. 标题：从文章中提取或生成一个简洁准确的标题（中文，不超过50字）
2. 摘要：生成一段简洁的摘要（中文，100-200字），概括文章主要内容
3. 实体：列出文章中提到的关键实体（人名、地点、组织、技术术语等），最多5个

返回JSON格式：
{
  "title": "提取的标题",
  "summary": "生成的摘要",
  "entities": ["实体1", "实体2", "实体3"]
}

文章内容：
${content.slice(0, 4000)}`;

    const result = await routeAndCall({
      taskType: 'standard-summary',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 1000,
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      // Fallback: return basic extraction
      return {
        agent: 'extractor',
        data: {
          title: '标题提取失败',
          summary: content.slice(0, 200) + '...',
          entities: [],
        },
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as ExtractionResult;
      return {
        agent: 'extractor',
        data: {
          title: parsed.title || '无标题',
          summary: parsed.summary || content.slice(0, 200),
          entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 5) : [],
        },
      };
    } catch {
      return {
        agent: 'extractor',
        data: {
          title: '解析失败',
          summary: content.slice(0, 200) + '...',
          entities: [],
        },
      };
    }
  };
}

// ============================================================
// Summarizer Agent
// Generates structured key points from extraction result
// ============================================================

/**
 * Create a SummarizerAgent that generates structured key points
 * Uses 'structured-summary' task type for multi-dimensional output
 */
export function createSummarizerAgent() {
  return async (extraction: ExtractionResult): Promise<AgentResult<SummaryResult>> => {
    const prompt = `基于以下文章提取的信息，生成结构化的要点列表。

原文摘要：
${extraction.summary}

要求：
- 生成3-5个关键要点
- 每个要点简洁明了（中文，20-50字）
- 要点应涵盖文章的主要观点和信息

返回JSON格式：
{
  "keyPoints": ["要点1", "要点2", "要点3"]
}`;

    const result = await routeAndCall({
      taskType: 'structured-summary',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 500,
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        agent: 'summarizer',
        data: { keyPoints: [extraction.summary] },
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as SummaryResult;
      return {
        agent: 'summarizer',
        data: {
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 5) : [extraction.summary],
        },
      };
    } catch {
      return {
        agent: 'summarizer',
        data: { keyPoints: [extraction.summary] },
      };
    }
  };
}

// ============================================================
// Tagger Agent
// Generates tags for article categorization
// ============================================================

/**
 * Create a TaggerAgent that generates tags for article categorization
 * Uses 'tag-generation' task type
 */
export function createTaggerAgent() {
  return async (content: string): Promise<AgentResult<TagResult>> => {
    const prompt = `分析以下文章内容，生成3个标签用于分类。

要求：
1. 主题标签：描述内容主题（如：科技、财经、教育、新闻、娱乐等）
2. 形式标签：描述内容形式（如：资讯、教程、评论、分析、访谈等）
3. 情绪标签：描述内容调性（如：轻松、严肃、深度、热点等）

每个标签应该是简短的中文词汇（2-4字）。

返回JSON格式：
{
  "tags": ["主题标签", "形式标签", "情绪标签"]
}

文章内容：
${content.slice(0, 2000)}`;

    const result = await routeAndCall({
      taskType: 'tag-generation',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 200,
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        agent: 'tagger',
        data: { tags: ['未分类'] },
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as TagResult;
      return {
        agent: 'tagger',
        data: {
          tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 3) : ['未分类'],
        },
      };
    } catch {
      return {
        agent: 'tagger',
        data: { tags: ['未分类'] },
      };
    }
  };
}

// ============================================================
// Translator Agent
// Translates title and description to target language
// ============================================================

/**
 * Language name mapping
 */
const LANGUAGE_NAMES: Record<Language, string> = {
  ZH: '中文',
  EN: '英文',
  JA: '日文',
  KO: '韩文',
  FR: '法文',
  DE: '德文',
  ES: '西班牙文',
};

/**
 * Create a TranslatorAgent that translates content to target language
 * Uses 'translation' task type
 */
export function createTranslatorAgent() {
  return async (
    article: { title: string; description?: string },
    targetLang: Language = 'ZH'
  ): Promise<AgentResult<TranslationResult>> => {
    const targetLangName = LANGUAGE_NAMES[targetLang] || '中文';
    const sourceText = `标题：${article.title}\n描述：${article.description || '无'}`;

    const prompt = `将以下内容翻译成${targetLangName}。

要求：
- 标题和描述分别翻译
- 保持原意，通顺自然
- 标题不超过50字

返回JSON格式：
{
  "translatedTitle": "翻译后的标题",
  "translatedDescription": "翻译后的描述"
}

内容：
${sourceText}`;

    const result = await routeAndCall({
      taskType: 'translation',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 500,
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        agent: 'translator',
        data: {
          translatedTitle: article.title,
          translatedDescription: article.description || '',
        },
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as TranslationResult;
      return {
        agent: 'translator',
        data: {
          translatedTitle: parsed.translatedTitle || article.title,
          translatedDescription: parsed.translatedDescription || article.description || '',
        },
      };
    } catch {
      return {
        agent: 'translator',
        data: {
          translatedTitle: article.title,
          translatedDescription: article.description || '',
        },
      };
    }
  };
}
