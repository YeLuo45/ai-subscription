/**
 * Content Transform API Endpoint
 * Transforms summary content into different formats: tweet, newsletter, mindmap, slides
 * 
 * POST /api/transform
 * Body: { summary: string, format: 'tweet' | 'newsletter' | 'mindmap' | 'slides', keywords: string[] }
 * Response: { content: string } or { slides: [{ title, content }] } for slides
 */

import { callLLM } from '../../../shared/lib/ai/llm';
import type { SimpleMessage } from '../../../shared/lib/ai/types/provider';

// ============================================================
// Prompt Builders
// ============================================================

function buildTransformPrompt(summary: string, format: string, keywords: string[]): string {
  const keywordStr = keywords.length > 0 ? keywords.join('、') : '';
  
  if (format === 'tweet') {
    return `将以下内容改写成一条适合Twitter/微博的推文，140~280字，口语化，适合社交媒体传播。

要求：
1. 长度控制在140~280个中文字符
2. 添加2~3个#话题标签
3. 末尾附上[来源链接]
4. 口语化，有吸引力

关键词：${keywordStr}

内容：
${summary}`;
  } else if (format === 'newsletter') {
    return `将以下内容改写成Newsletter格式的 Markdown 文档。

要求：
1. 标题：简洁有力，概括核心主题
2. 导语：1段引入文字，1~2句话
3. 要点：3~5个核心要点，每个要点1~2句话
4. 结语：1段总结性文字

关键词：${keywordStr}

内容：
${summary}`;
  } else if (format === 'mindmap') {
    return `将以下内容提取为思维导图，用 Markdown 树状结构表示。

要求：
1. 根节点：主题（一级标题 #）
2. 二级节点：各关键词（##）
3. 三级节点：每个关键词下的核心内容要点（###）
4. 使用 - 嵌套列表表示树状结构
5. 结构清晰，层次分明

关键词：${keywordStr}

内容：
${summary}`;
  } else if (format === 'slides') {
    return `将以下内容拆分为5~10张幻灯片，每张幻灯片包含标题和1~2句话的要点内容。

要求：
1. 每张幻灯片有标题和内容
2. 内容简洁，每张1~2句话
3. 总共5~10张幻灯片
4. 结构清晰，逻辑连贯
5. 直接返回JSON格式，不要有其他文字：
{
  "slides": [
    { "title": "标题1", "content": "内容1" },
    { "title": "标题2", "content": "内容2" }
  ]
}

关键词：${keywordStr}

内容：
${summary}`;
  }
  
  return summary;
}

// ============================================================
// Model Resolution
// ============================================================

function resolveModelFromId(modelId?: string): { provider: string; modelName: string } {
  if (!modelId) {
    return { provider: 'minimax', modelName: 'MiniMax-Text-01' };
  }

  if (modelId.includes('/')) {
    const [provider, modelName] = modelId.split('/');
    return { provider, modelName };
  }

  if (modelId.startsWith('gpt-')) return { provider: 'openai', modelName: modelId };
  if (modelId.startsWith('claude-')) return { provider: 'anthropic', modelName: modelId };
  if (modelId.startsWith('gemini-')) return { provider: 'google', modelName: modelId };
  if (modelId.startsWith('deepseek-')) return { provider: 'deepseek', modelName: modelId };
  if (modelId.startsWith('moonshot-') || modelId.startsWith('kimi')) return { provider: 'kimi', modelName: modelId };

  return { provider: 'minimax', modelName: modelId };
}

// ============================================================
// Handler
// ============================================================

export async function POST(req: Request): Promise<Response> {
  let body: {
    summary?: string;
    format?: 'tweet' | 'newsletter' | 'mindmap' | 'slides';
    keywords?: string[];
    modelId?: string;
    apiKey?: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { summary, format = 'tweet', keywords = [], modelId, apiKey } = body;

  if (!summary || summary.trim().length < 10) {
    return new Response(JSON.stringify({ error: 'Summary too short (min 10 chars)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!['tweet', 'newsletter', 'mindmap', 'slides'].includes(format)) {
    return new Response(JSON.stringify({ error: 'Invalid format. Must be tweet, newsletter, mindmap, or slides' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { provider, modelName } = resolveModelFromId(modelId);
  const modelString = `${provider}/${modelName}`;
  const prompt = buildTransformPrompt(summary, format, keywords);

  const messages: SimpleMessage[] = [{ role: 'user', content: prompt }];
  const effectiveApiKey = apiKey || '';

  try {
    const result = await callLLM(
      {
        model: modelString,
        messages,
        temperature: 0.7,
        maxTokens: format === 'tweet' ? 500 : 1500,
        apiKey: effectiveApiKey,
      },
      'transform'
    );

    // For slides format, parse JSON response
    if (format === 'slides') {
      try {
        // Try to parse the response as JSON
        let slidesData = JSON.parse(result.text);
        
        // Handle case where response might be wrapped in markdown code block
        if (typeof slidesData === 'string') {
          const jsonMatch = slidesData.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            slidesData = JSON.parse(jsonMatch[1]);
          }
        }
        
        // Handle nested slides object
        if (slidesData.slides) {
          slidesData = slidesData.slides;
        }
        
        return new Response(JSON.stringify({ slides: slidesData }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (parseError) {
        return new Response(JSON.stringify({ 
          error: 'Failed to parse slides response',
          raw: result.text 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ content: result.text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: `Transform failed: ${errorMsg}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
