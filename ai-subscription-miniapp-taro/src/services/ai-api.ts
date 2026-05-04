/**
 * AI API Service - Taro 小程序调用 Web 端 API
 * 小程序无法在本地运行 AI SDK，必须通过 API 调用
 */

import Taro from '@tarojs/taro';

// Web 端已部署在 GitHub Pages，API 路径为相对路径或代理
const API_BASE = 'https://yeluo45.github.io/ai-subscription';

export interface SummarizeResult {
  summary: string;
  keywords: string[];
}

export async function summarizeArticle(
  text: string, 
  summaryLength: 'short' | 'medium' | 'long' = 'medium'
): Promise<SummarizeResult> {
  try {
    const res = await Taro.request({
      url: `${API_BASE}/api/stream-summary`,
      method: 'POST',
      data: { text, summaryLength },
    });
    
    // SSE response parsing - collect all text_delta events
    const textContent: string[] = [];
    const dataStr = res.data as string;
    if (!dataStr) {
      return { summary: '', keywords: [] };
    }
    const lines = dataStr.split('\n');
    for (const line of lines) {
      if (line.startsWith('event: text_delta\ndata: ')) {
        const jsonStr = line.replace('event: text_delta\ndata: ', '');
        try {
          const { content } = JSON.parse(jsonStr);
          textContent.push(content);
        } catch {}
      }
    }
    return { summary: textContent.join(''), keywords: [] };
  } catch (err: any) {
    throw new Error(err?.message || 'Request failed');
  }
}
