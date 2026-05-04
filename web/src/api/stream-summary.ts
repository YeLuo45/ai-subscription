/**
 * SSE Stream Summary Endpoint
 * Streams AI summary results as Server-Sent Events
 * 
 * POST /api/stream-summary
 * Body: { text: string, modelId?: string, summaryLength?: 'short' | 'medium' | 'long', enabledTools?: ToolName[] }
 * 
 * SSE Events:
 * - connected: { model: string }
 * - text_delta: { content: string }
 * - tool_call: { toolName: string, params: object }
 * - tool_result: { toolName: string, result: object }
 * - tool_error: { toolName: string, error: string }
 * - done: { keywords: string[] }
 */

import type { SimpleMessage } from '../../../shared/lib/ai/types/provider';
import type { ToolName } from '../../../shared/lib/ai/types/tool';
import { streamLLM } from '../../../shared/lib/ai/llm';
import { toolList, toolExecutors } from '../../../shared/lib/ai/tools';

// ============================================================
// Prompt & Keyword Helpers
// ============================================================

const SUMMARY_LENGTH_MAP = {
  short: 100,
  medium: 300,
  long: 500,
};

function buildPrompt(text: string, length: 'short' | 'medium' | 'long'): string {
  const maxChars = SUMMARY_LENGTH_MAP[length];
  return `请对以下内容生成一个约${maxChars}字的中文摘要，并提取5个关键词。

要求：
1. 摘要简洁、有信息量
2. 提取5个关键词
3. 用JSON格式输出：{"summary": "摘要内容", "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"]}

内容：
${text.slice(0, 3000)}`;
}

function extractKeywordsFromText(text: string): string[] {
  // Simple keyword extraction: most frequent meaningful words
  const words = text
    .replace(/[，。、！？；：「」『』（）【】《》〈〉""''（）\n\r\t]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && w.length < 15)
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(0, 5);
  return words;
}

// ============================================================
// Model Resolution
// ============================================================

function resolveModelFromId(modelId?: string): { provider: string; modelName: string } {
  if (!modelId) {
    // Default to first available provider
    return { provider: 'minimax', modelName: 'MiniMax-Text-01' };
  }

  // Try to find matching provider
  if (modelId.includes('/')) {
    const [provider, modelName] = modelId.split('/');
    return { provider, modelName };
  }

  // Try to match by model name prefix
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
    text?: string; 
    modelId?: string; 
    summaryLength?: 'short' | 'medium' | 'long'; 
    apiKey?: string;
    enabledTools?: ToolName[];
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { text, modelId, summaryLength = 'medium', apiKey, enabledTools = [] } = body;

  if (!text || text.trim().length < 50) {
    return new Response(JSON.stringify({ error: 'Text too short (min 50 chars)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { provider, modelName } = resolveModelFromId(modelId);
  const prompt = buildPrompt(text, summaryLength);

  // Build model string for streamLLM
  const modelString = `${provider}/${modelName}`;

  // Get API key from request body or provider default
  const effectiveApiKey = apiKey || '';

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial connection event
        controller.enqueue(
          encoder.encode(`event: connected\ndata: ${JSON.stringify({ model: modelString })}\n\n`)
        );

        const messages: SimpleMessage[] = [{ role: 'user', content: prompt }];

        // Filter tools based on enabledTools
        const availableTools = toolList.filter(t => enabledTools.includes(t.name as ToolName));

        const generator = streamLLM(
          {
            model: modelString,
            messages,
            temperature: 0.3,
            maxTokens: 1000,
            apiKey: effectiveApiKey,
          },
          'stream-summary'
        );

        let fullText = '';

        for await (const chunk of generator) {
          if (chunk.type === 'text_delta' && chunk.content) {
            fullText += chunk.content;
            controller.enqueue(
              encoder.encode(`event: text_delta\ndata: ${JSON.stringify({ content: chunk.content })}\n\n`)
            );
          } else if (chunk.type === 'tool_call' && chunk.toolName && availableTools.some(t => t.name === chunk.toolName)) {
            // Emit tool_call event
            controller.enqueue(
              encoder.encode(`event: tool_call\ndata: ${JSON.stringify({ toolName: chunk.toolName, params: JSON.parse(chunk.toolArgs || '{}') })}\n\n`)
            );
            
            // Execute tool and emit result
            const executor = toolExecutors[chunk.toolName as ToolName];
            if (executor) {
              try {
                const params = JSON.parse(chunk.toolArgs || '{}');
                const result = await executor(params);
                controller.enqueue(
                  encoder.encode(`event: tool_result\ndata: ${JSON.stringify({ toolName: chunk.toolName, result })}\n\n`)
                );
              } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                controller.enqueue(
                  encoder.encode(`event: tool_error\ndata: ${JSON.stringify({ toolName: chunk.toolName, error: errorMsg })}\n\n`)
                );
              }
            }
          } else if (chunk.type === 'error') {
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ error: chunk.error })}\n\n`)
            );
          } else if (chunk.type === 'done') {
            // Extract keywords from the original text
            const keywords = extractKeywordsFromText(text);
            controller.enqueue(
              encoder.encode(`event: done\ndata: ${JSON.stringify({ keywords })}\n\n`)
            );
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errorMsg })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
