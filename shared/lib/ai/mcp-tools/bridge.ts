/**
 * MCP Tool Bridge
 * Bridge for calling MCP tools (both built-in and external)
 */

import type { ToolCallRequest, ToolCallResult } from './types';
import { toolRegistry } from './registry';

/**
 * Built-in tool implementations
 */
const builtInImplementations: Record<string, (params: Record<string, any>) => Promise<any>> = {
  'builtin-web-search': async (params) => {
    // Web search implementation - uses native fetch
    const { query } = params;
    // In a real implementation, this would call an actual search API
    // For now, return a mock response
    return {
      query,
      results: [
        { title: `Result for "${query}"`, url: `https://example.com/search?q=${encodeURIComponent(query)}` }
      ],
      timestamp: Date.now(),
    };
  },

  'builtin-fetch-rss': async (params) => {
    // RSS fetch implementation
    const { url } = params;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const text = await response.text();
      return {
        url,
        content: text,
        items: parseRSSExtract(text),
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to fetch RSS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  'builtin-calculate': async (params) => {
    // Math evaluation implementation
    const { expression } = params;
    try {
      // Safe math evaluation using Function constructor
      const result = safeEvaluate(expression);
      return {
        expression,
        result,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(`Math evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

/**
 * Parse RSS XML and extract items (simple implementation)
 */
function parseRSSExtract(xml: string): Array<{ title: string; link: string; pubDate?: string }> {
  const items: Array<{ title: string; link: string; pubDate?: string }> = [];
  const itemRegex = /<item[^>]*>(.*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const titleMatch = /<title[^>]*>(.*?)<\/title>/i.exec(itemXml);
    const linkMatch = /<link[^>]*>(.*?)<\/link>/i.exec(itemXml);
    const dateMatch = /<pubDate[^>]*>(.*?)<\/pubDate>/i.exec(itemXml);
    
    if (titleMatch && linkMatch) {
      items.push({
        title: stripHtml(titleMatch[1]),
        link: linkMatch[1].trim(),
        pubDate: dateMatch ? dateMatch[1].trim() : undefined,
      });
    }
  }
  
  return items;
}

/**
 * Strip HTML tags from string
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Safe math evaluation (prevents code injection)
 */
function safeEvaluate(expr: string): number {
  // Only allow safe math characters
  if (!/^[\d\s+\-*/().sqrtpow,]+$/i.test(expr)) {
    throw new Error('Invalid characters in expression');
  }
  
  // Replace common math functions
  let safeExpr = expr
    .replace(/sqrt/gi, 'Math.sqrt')
    .replace(/pow/gi, 'Math.pow')
    .replace(/\^/g, '**');
  
  // Evaluate using Function constructor (safer than eval)
  const result = new Function(`return ${safeExpr}`)();
  
  if (typeof result !== 'number' || !isFinite(result)) {
    throw new Error('Expression did not produce a valid number');
  }
  
  return result;
}

/**
 * Call an MCP tool
 */
export async function callTool(request: ToolCallRequest): Promise<ToolCallResult> {
  const startTime = Date.now();
  
  try {
    const { toolId, parameters, timeoutMs = 30000 } = request;
    
    // Check if it's a built-in tool
    if (builtInImplementations[toolId]) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Tool call timed out after ${timeoutMs}ms`)), timeoutMs);
      });
      
      const result = await Promise.race([
        builtInImplementations[toolId](parameters),
        timeoutPromise,
      ]);
      
      return {
        success: true,
        result,
        latencyMs: Date.now() - startTime,
      };
    }
    
    // Check registry for external tool
    const tool = toolRegistry.getTool(toolId);
    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolId} not found`,
        latencyMs: Date.now() - startTime,
      };
    }
    
    // Call external MCP tool via endpoint
    if (tool.endpoint) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Tool call timed out after ${timeoutMs}ms`)), timeoutMs);
      });
      
      const response = await Promise.race([
        fetch(tool.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            toolId,
            parameters,
          }),
        }),
        timeoutPromise,
      ]);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        result,
        latencyMs: Date.now() - startTime,
      };
    }
    
    // Check for registered executor
    const executor = toolRegistry.getExecutor(toolId);
    if (executor) {
      const result = await executor(parameters);
      return {
        success: true,
        result,
        latencyMs: Date.now() - startTime,
      };
    }
    
    return {
      success: false,
      error: `Tool ${toolId} has no executable implementation`,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime,
    };
  }
}
