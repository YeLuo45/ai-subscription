/**
 * Feed Discovery - RSS/Atom 自动发现工具
 * 通过探测常见路径和解析 HTML <link> 标签发现订阅源
 */

/** 常见 feed 路径 */
export const COMMON_FEED_PATHS = [
  '/feed', '/feed/', '/rss', '/rss.xml', '/feed.xml',
  '/atom', '/atom.xml', '/index.xml', '/blog/feed',
  '/posts/feed', '/feed/rss', '/content/feed'
];

/** CORS 代理列表 */
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
];

/** 发现的 feed 类型 */
export interface DiscoveredFeed {
  url: string;
  title: string;
  description?: string;
  type: 'rss' | 'atom';
  detectedFrom: string;
}

/**
 * 规范化 URL
 */
function normalizeUrl(url: string): string {
  if (!url) return '';
  let normalized = url.trim();
  // 补全协议
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  // 移除末尾斜杠
  normalized = normalized.replace(/\/+$/, '');
  return normalized;
}

/**
 * 获取基础 URL（去除路径，只保留域名）
 */
function getBaseUrl(url: string): string {
  const normalized = normalizeUrl(url);
  try {
    const urlObj = new URL(normalized);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    return normalized;
  }
}

/**
 * 获取带路径的基础 URL
 */
function getBaseUrlWithPath(url: string): string {
  const normalized = normalizeUrl(url);
  try {
    const urlObj = new URL(normalized);
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.replace(/\/[^/]*$/, '')}`;
  } catch {
    return normalized;
  }
}

interface FetchResult {
  ok: boolean;
  text?: string;
  reason?: string;
}

/**
 * 通过 CORS 代理获取 HTML 内容
 */
async function fetchHtml(url: string, timeout = 8000): Promise<string> {
  const strategies: Array<() => Promise<FetchResult>> = [
    // 直连
    async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'AI Subscription Discovery/1.0' }
        });
        clearTimeout(timer);
        if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
        const text = await response.text();
        return { ok: true, text };
      } catch (e) {
        clearTimeout(timer);
        return { ok: false, reason: e instanceof Error ? e.message : String(e) };
      }
    },
    // allorigins 代理
    async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout + 2000);
      try {
        const response = await fetch(`${CORS_PROXIES[0]}${encodeURIComponent(url)}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'AI Subscription Discovery/1.0' }
        });
        clearTimeout(timer);
        if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
        const text = await response.text();
        if (text.includes('<html') || text.includes('<!DOCTYPE')) {
          return { ok: false, reason: 'HTML error page' };
        }
        return { ok: true, text };
      } catch (e) {
        clearTimeout(timer);
        return { ok: false, reason: e instanceof Error ? e.message : String(e) };
      }
    },
    // codetabs 代理
    async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout + 2000);
      try {
        const response = await fetch(`${CORS_PROXIES[1]}${encodeURIComponent(url)}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'AI Subscription Discovery/1.0' }
        });
        clearTimeout(timer);
        if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
        const text = await response.text();
        if (text.includes('<html') || text.includes('<!DOCTYPE')) {
          return { ok: false, reason: 'HTML error page' };
        }
        return { ok: true, text };
      } catch (e) {
        clearTimeout(timer);
        return { ok: false, reason: e instanceof Error ? e.message : String(e) };
      }
    }
  ];

  const results = await Promise.all(strategies.map(fn => fn()));
  const success = results.find(r => r.ok);
  if (success && success.text) return success.text;
  throw new Error(`All fetch strategies failed: ${results.map(r => r.reason).join('; ')}`);
}

interface LinkFeed {
  href: string;
  type: string;
  title: string;
}

/**
 * 解析 HTML 中的 <link> 标签，提取 feed 链接
 */
function parseLinkTags(html: string): LinkFeed[] {
  const feeds: LinkFeed[] = [];
  const linkRegex = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const tag = match[0];
    const href = match[1];

    // 检查是否是 feed 链接
    if (tag.includes('rel="alternate"') || tag.includes("rel='alternate'")) {
      const type = tag.match(/type=["']([^"']+)["']/)?.[1] || '';
      const title = tag.match(/title=["']([^"']+)["']/)?.[1] || '';

      if (type.includes('rss') || type.includes('atom') || type.includes('xml')) {
        feeds.push({ href, type, title });
      }
    }
  }

  return feeds;
}

interface ProbeResult {
  text: string;
  contentType: string;
  url: string;
}

/**
 * 探测单个路径是否是有效的 feed
 */
async function probeFeedUrl(baseUrl: string, path: string): Promise<DiscoveredFeed | null> {
  const fullUrl = `${baseUrl}${path}`;

  try {
    const strategies: Array<() => Promise<ProbeResult | null>> = [
      // 直连尝试
      async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        try {
          const response = await fetch(fullUrl, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
              'User-Agent': 'AI Subscription Discovery/1.0'
            }
          });
          clearTimeout(timer);
          if (!response.ok) return null;
          const contentType = response.headers.get('content-type') || '';
          const text = await response.text();
          if (!text || text.trim() === '') return null;
          if (text.includes('<html') || text.includes('<!DOCTYPE')) return null;
          return { text, contentType, url: fullUrl };
        } catch {
          clearTimeout(timer);
          return null;
        }
      },
      // allorigins
      async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch(`${CORS_PROXIES[0]}${encodeURIComponent(fullUrl)}`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'AI Subscription Discovery/1.0' }
          });
          clearTimeout(timer);
          if (!response.ok) return null;
          const text = await response.text();
          if (!text || text.trim() === '') return null;
          if (text.includes('<html') || text.includes('<!DOCTYPE')) return null;
          const contentType = response.headers.get('content-type') || '';
          return { text, contentType, url: fullUrl };
        } catch {
          clearTimeout(timer);
          return null;
        }
      },
      // codetabs
      async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch(`${CORS_PROXIES[1]}${encodeURIComponent(fullUrl)}`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'AI Subscription Discovery/1.0' }
          });
          clearTimeout(timer);
          if (!response.ok) return null;
          const text = await response.text();
          if (!text || text.trim() === '') return null;
          if (text.includes('<html') || text.includes('<!DOCTYPE')) return null;
          const contentType = response.headers.get('content-type') || '';
          return { text, contentType, url: fullUrl };
        } catch {
          clearTimeout(timer);
          return null;
        }
      }
    ];

    const results = await Promise.all(strategies.map(fn => fn()));
    const success = results.find(r => r !== null);
    if (!success) return null;

    const { text, contentType, url } = success;

    // 解析 feed 内容获取标题
    let title = '';
    let type: 'rss' | 'atom' = 'rss';

    if (contentType.includes('atom') || text.includes('<feed ') || text.includes('xmlns="http://www.w3.org/2005/Atom"')) {
      type = 'atom';
      const titleMatch = text.match(/<feed[^>]*>[\s\S]*?<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch?.[1] || '';
    } else {
      const titleMatch = text.match(/<channel>[\s\S]*?<title>([^<]+)<\/title>/i);
      title = titleMatch?.[1] || '';
    }

    title = title.trim();

    return {
      url,
      title: title || '未命名订阅源',
      type,
      detectedFrom: `路径探测: ${path}`
    };
  } catch {
    return null;
  }
}

/**
 * 从 HTML 页面解析发现 feed（通过 link 标签）
 */
async function discoverFromHtmlPage(pageUrl: string): Promise<DiscoveredFeed[]> {
  const baseUrl = getBaseUrlWithPath(pageUrl);

  try {
    const html = await fetchHtml(normalizeUrl(pageUrl));
    const linkFeeds = parseLinkTags(html);

    const discoveredFeeds: DiscoveredFeed[] = [];

    for (const feed of linkFeeds) {
      let feedUrl = feed.href;

      // 相对路径转绝对路径
      if (feedUrl.startsWith('/')) {
        feedUrl = `${getBaseUrl(pageUrl)}${feedUrl}`;
      } else if (!feedUrl.startsWith('http://') && !feedUrl.startsWith('https://')) {
        feedUrl = `${baseUrl}/${feedUrl}`;
      }

      const type: 'rss' | 'atom' = feed.type.includes('atom') ? 'atom' : 'rss';

      discoveredFeeds.push({
        url: feedUrl,
        title: feed.title || '未命名订阅源',
        type,
        detectedFrom: `HTML link 标签`
      });
    }

    return discoveredFeeds;
  } catch {
    return [];
  }
}

/**
 * 探测常见 feed 路径
 */
async function discoverFromCommonPaths(pageUrl: string): Promise<DiscoveredFeed[]> {
  const baseUrl = getBaseUrlWithPath(pageUrl);

  const probes = COMMON_FEED_PATHS.map(path => probeFeedUrl(baseUrl, path));
  const results = await Promise.allSettled(probes);

  const validFeeds: DiscoveredFeed[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      validFeeds.push(result.value);
    }
  }

  return validFeeds;
}

/**
 * 主函数：发现 URL 的所有可用 feed
 * @param url - 网站 URL 或 feed URL
 * @returns 发现的所有 feed
 */
export async function discoverFeeds(url: string): Promise<DiscoveredFeed[]> {
  if (!url) return [];

  const normalized = normalizeUrl(url);
  const discovered: DiscoveredFeed[] = [];

  // 检查输入本身是否是 feed URL
  const isFeedUrl = /\.(rss|atom|xml|feed)$/i.test(normalized) ||
    normalized.includes('/feed') ||
    normalized.includes('/rss');

  if (isFeedUrl) {
    const result = await probeFeedUrl(getBaseUrlWithPath(normalized), '/' + normalized.split('/').pop());
    if (result) {
      discovered.push(result);
    }
  }

  // 1. 先尝试从 HTML 页面解析 link 标签
  const fromHtml = await discoverFromHtmlPage(normalized);
  discovered.push(...fromHtml);

  // 2. 探测常见路径
  const fromPaths = await discoverFromCommonPaths(normalized);
  discovered.push(...fromPaths);

  // 去重（基于 URL）
  const seen = new Set<string>();
  const unique = discovered.filter(feed => {
    if (seen.has(feed.url)) return false;
    seen.add(feed.url);
    return true;
  });

  return unique;
}
