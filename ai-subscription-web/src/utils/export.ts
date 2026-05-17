/**
 * 数据导出/导入工具
 * 支持 OPML 导出、JSON 备份、订阅源迁移
 */
import { AppSettings, Subscription } from '../types';

const STORAGE_PREFIX = 'ai_subscription_';

/**
 * 生成 OPML 文件内容
 */
export function generateOPML(settings: AppSettings): string {
  const now = new Date().toISOString();
  const subscriptions = settings.subscriptions;

  let outlineItems = '';
  for (const sub of subscriptions) {
    const xmlAttrs = `type="rss" version="RSS" title="${escapeXml(sub.name)}" xmlUrl="${escapeXml(sub.url)}" htmlUrl="" category="${escapeXml(sub.category)}"`;
    outlineItems += `      <outline ${xmlAttrs}/>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>AI Subscription Export - ${new Date().toLocaleDateString()}</title>
    <dateCreated>${now}</dateCreated>
    <dateModified>${now}</dateModified>
  </head>
  <body>
    <outline text="AI 订阅源" title="AI 订阅源">
${outlineItems}    </outline>
  </body>
</opml>`;
}

/**
 * 生成 JSON 备份文件内容
 */
export function generateJSONBackup(settings: AppSettings): string {
  const backup = {
    version: '1.0',
    exportTime: new Date().toISOString(),
    subscriptions: settings.subscriptions.map(sub => ({
      name: sub.name,
      url: sub.url,
      type: sub.type,
      category: sub.category,
      enabled: sub.enabled,
      aiSummaryEnabled: sub.aiSummaryEnabled,
      fetchIntervalMinutes: sub.fetchIntervalMinutes,
    })),
    models: settings.models.map(m => ({
      name: m.name,
      provider: m.provider,
      apiBaseUrl: m.apiBaseUrl,
      apiKey: m.apiKey ? '***' : '', // 脱敏
      modelName: m.modelName,
      temperature: m.temperature,
      maxTokens: m.maxTokens,
      isDefault: m.isDefault,
    })),
    pushSettings: { ...settings.pushSettings },
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * 解析 OPML 文件
 */
export function parseOPML(opmlText: string): Array<{
  name: string;
  url: string;
  type: 'rss' | 'atom' | 'api';
  category: string;
}> {
  const results: Array<{
    name: string;
    url: string;
    type: 'rss' | 'atom' | 'api';
    category: string;
  }> = [];

  // 提取所有 outline 元素
  const outlineRegex = /<outline[^>]*>/gi;
  let match;

  while ((match = outlineRegex.exec(opmlText)) !== null) {
    const outline = match[0];

    // 提取 xmlUrl 属性
    const xmlUrlMatch = /xmlUrl=["']([^"']+)["']/i.exec(outline);
    const titleMatch = /title=["']([^"']+)["']/i.exec(outline);
    const categoryMatch = /category=["']([^"']+)["']/i.exec(outline);

    if (xmlUrlMatch && titleMatch) {
      const url = xmlUrlMatch[1];
      const name = titleMatch[1];
      const category = categoryMatch ? categoryMatch[1] : '未分类';

      // 检测类型
      let type: 'rss' | 'atom' | 'api' = 'rss';
      if (url.includes('atom')) type = 'atom';

      results.push({ name, url, type, category });
    }
  }

  return results;
}

/**
 * 解析 JSON 备份文件
 */
export function parseJSONBackup(jsonText: string): Partial<AppSettings> | null {
  try {
    const data = JSON.parse(jsonText);
    return {
      subscriptions: (data.subscriptions || []).map((s: {
        name: string;
        url: string;
        type?: string;
        category?: string;
        enabled?: boolean;
        aiSummaryEnabled?: boolean;
        fetchIntervalMinutes?: number;
      }) => ({
        id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: s.name,
        url: s.url,
        type: (s.type as 'rss' | 'atom' | 'api') || 'rss',
        category: s.category || '未分类',
        enabled: s.enabled !== undefined ? s.enabled : true,
        aiSummaryEnabled: s.aiSummaryEnabled !== undefined ? s.aiSummaryEnabled : true,
        fetchIntervalMinutes: s.fetchIntervalMinutes || 60,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      models: data.models || [],
      pushSettings: data.pushSettings || {
        enabled: false,
        pushTime: '09:00',
        pushChannel: 'notification',
        contentType: 'title_summary',
      },
    };
  } catch {
    return null;
  }
}

/**
 * 触发文件下载
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 读取文件内容
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// 辅助函数：XML 转义
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}