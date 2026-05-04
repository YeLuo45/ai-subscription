/**
 * AI API Service - uni-app 小程序调用 Web 端 API
 * 小程序无法在本地运行 AI SDK，必须通过 API 调用
 */

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
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/api/stream-summary`,
      method: 'POST',
      data: { text, summaryLength },
      success: (res: any) => {
        // SSE response parsing - collect all text_delta events
        const textContent: string[] = [];
        const dataStr = res.data as string;
        if (!dataStr) {
          resolve({ summary: '', keywords: [] });
          return;
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
        resolve({ summary: textContent.join(''), keywords: [] });
      },
      fail: (err: any) => {
        reject(new Error(err?.message || 'Request failed'));
      },
    });
  });
}
