/**
 * Feed Parser Service - Web 端 RSS/Atom/JSON API 内容抓取
 * 支持多 CORS 代理 fallback 绕过跨域限制
 */
import { ParsedItem, FetchResult, SubscriptionType } from '../types';

/** CORS 代理列表，按优先级尝试 */
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
];

/**
 * 并发尝试多个 CORS 代理 + 直连，最快成功者胜出
 */
async function fetchWithProxyFallback(
  url: string,
  options: RequestInit
): Promise<Response> {
  // 策略：直连 + 两个代理，同时竞争
  const strategies: Array<() => Promise<Response>> = [
    // 策略 1：直接 fetch（有些源没有 CORS 问题）
    () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      return fetch(url, { ...options, signal: controller.signal }).finally(() =>
        clearTimeout(timeout)
      );
    },
    // 策略 2：allorigins 代理
    () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      return fetch(`${CORS_PROXIES[0]}${encodeURIComponent(url)}`, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
    },
    // 策略 3：codetabs 代理
    () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      return fetch(`${CORS_PROXIES[1]}${encodeURIComponent(url)}`, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
    },
  ];

  // Promise.allSettled 收集所有结果（不提前 rejection）
  const settled = await Promise.all(
    strategies.map(async (strategy) => {
      try {
        const response = await strategy();
        // 只有 2xx 才算成功
        return response.ok ? { ok: true, response } : { ok: false, response };
      } catch {
        return { ok: false, response: null };
      }
    })
  );

  // 找第一个成功的
  const firstOk = settled.find((r) => r.ok);
  if (firstOk?.response) {
    return firstOk.response;
  }

  // 全部失败，抛出最后一个错误
  throw new Error('All fetch strategies failed');
}

/**
 * 解析 XML 文档（RSS / Atom）
 */
function parseXML(xmlText: string, type: 'rss' | 'atom'): ParsedItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const items: ParsedItem[] = [];

  if (type === 'rss') {
    const itemNodes = doc.querySelectorAll('item');
    itemNodes.forEach((item) => {
      const title = item.querySelector('title')?.textContent?.trim() || '无标题';
      const link = item.querySelector('link')?.textContent?.trim() || '';
      const description = item.querySelector('description')?.textContent?.trim() || '';
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() || new Date().toISOString();
      const guid = item.querySelector('guid')?.textContent?.trim() || link || title;
      items.push({ id: guid, title, link, description, pubDate });
    });
  } else {
    // Atom
    const entryNodes = doc.querySelectorAll('entry');
    entryNodes.forEach((entry) => {
      const title = entry.querySelector('title')?.textContent?.trim() || '无标题';
      const linkEl = entry.querySelector('link[rel="alternate"]') || entry.querySelector('link');
      const link = linkEl?.getAttribute('href') || '';
      const summary = entry.querySelector('summary')?.textContent?.trim() || '';
      const content = entry.querySelector('content')?.textContent?.trim() || '';
      const published = entry.querySelector('published')?.textContent?.trim()
        || entry.querySelector('updated')?.textContent?.trim()
        || new Date().toISOString();
      const id = entry.querySelector('id')?.textContent?.trim() || link || title;
      items.push({ id, title, link, description: summary || content, pubDate: published });
    });
  }

  return items;
}

/**
 * 获取 feed 标题
 */
function getFeedTitle(doc: Document, type: 'rss' | 'atom'): string {
  if (type === 'rss') {
    return doc.querySelector('channel > title')?.textContent?.trim() || '未知来源';
  }
  return doc.querySelector('feed > title')?.textContent?.trim() || '未知来源';
}

/**
 * 抓取 RSS / Atom 源
 */
async function fetchRSSOrAtom(url: string, type: 'rss' | 'atom'): Promise<FetchResult> {
  const response = await fetchWithProxyFallback(url, {
    headers: {
      'Accept': type === 'rss' ? 'application/rss+xml, application/xml, text/xml' : 'application/atom+xml, application/xml, text/xml',
      'User-Agent': 'AI Subscription Web/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const xmlText = await response.text();

  // 检查是否返回了错误页面（如 allorigins 404/500 页面）
  if (xmlText.includes('<html') || xmlText.includes('<!DOCTYPE')) {
    throw new Error('Proxy returned HTML error page');
  }

  const items = parseXML(xmlText, type);
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const title = getFeedTitle(doc, type);

  return { items, title, type };
}

/**
 * 抓取 JSON API
 */
async function fetchJSONApi(url: string): Promise<FetchResult> {
  const response = await fetchWithProxyFallback(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'AI Subscription Web/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  let items: ParsedItem[] = [];
  let title = 'JSON API';

  if (Array.isArray(data)) {
    items = data.slice(0, 20).map((item: Record<string, unknown>, index: number) => ({
      id: String(item.id || index),
      title: String(item.title || item.name || item.full_name || '无标题'),
      link: String(item.html_url || item.url || item.link || ''),
      description: String(item.description || item.body || ''),
      pubDate: String(item.created_at || item.updated_at || new Date().toISOString()),
    }));
    title = 'JSON API 数据';
  } else if (data.data && Array.isArray(data.data)) {
    items = data.data.slice(0, 20).map((item: Record<string, unknown>, index: number) => ({
      id: String(item.id || index),
      title: String(item.title || item.name || '无标题'),
      link: String(item.url || item.link || item.html_url || ''),
      description: String(item.description || item.content || item.summary || ''),
      pubDate: String(item.pubDate || item.created_at || item.updated_at || new Date().toISOString()),
    }));
    title = String(data.title || 'JSON API 数据');
  }

  return { items, title, type: 'api' };
}

/**
 * GitHub Trending 抓取（Atom 格式）
 */
export async function fetchGitHubTrending(language?: string): Promise<FetchResult> {
  const url = language
    ? `https://github.com/trending/${language}.atom`
    : 'https://github.com/trending.atom';
  return fetchRSSOrAtom(url, 'atom');
}

/**
 * 自动检测类型并抓取
 */
export async function fetchFeed(
  url: string,
  type: SubscriptionType | 'auto' = 'auto'
): Promise<FetchResult> {
  if (type === 'api' || url.includes('/api/')) {
    return fetchJSONApi(url);
  }

  if (type === 'rss' || type === 'atom') {
    return fetchRSSOrAtom(url, type);
  }

  // 自动检测
  try {
    const response = await fetchWithProxyFallback(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'AI Subscription Web/1.0' },
    });

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('atom') || url.includes('atom')) {
      return fetchRSSOrAtom(url, 'atom');
    }
    if (contentType.includes('rss') || contentType.includes('xml')) {
      return fetchRSSOrAtom(url, 'rss');
    }
    if (contentType.includes('json')) {
      return fetchJSONApi(url);
    }

    return fetchRSSOrAtom(url, 'rss');
  } catch {
    return fetchRSSOrAtom(url, 'rss');
  }
}
