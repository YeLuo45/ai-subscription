/**
 * RSS / Atom / JSON API 内容抓取工具
 */

export interface ParsedItem {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

export interface FetchResult {
  items: ParsedItem[];
  title: string;
  type: 'rss' | 'atom' | 'api' | 'unknown';
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
  const response = await fetch(url, {
    headers: {
      'Accept': type === 'rss' ? 'application/rss+xml, application/xml, text/xml' : 'application/atom+xml, application/xml, text/xml',
      'User-Agent': 'AI Subscription Web/1.0',
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const xmlText = await response.text();
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
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'AI Subscription Web/1.0',
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  
  // 尝试解析常见 JSON API 格式
  let items: ParsedItem[] = [];
  let title = 'JSON API';
  
  // GitHub API 格式
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
 * 自动检测类型并抓取
 */
export async function fetchContent(url: string, type: 'rss' | 'atom' | 'api' | 'auto' = 'auto'): Promise<FetchResult> {
  if (type === 'api' || url.includes('/api/')) {
    return fetchJSONApi(url);
  }
  
  if (type === 'rss' || type === 'atom') {
    return fetchRSSOrAtom(url, type);
  }
  
  // 自动检测：尝试获取 Content-Type
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'AI Subscription Web/1.0',
      },
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
    
    // 默认尝试 RSS
    return fetchRSSOrAtom(url, 'rss');
  } catch {
    return fetchRSSOrAtom(url, 'rss');
  }
}

/**
 * 预设 RSS 列表
 */
export const PRESET_SUBSCRIPTIONS = [
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', type: 'rss' as const, category: '技术' },
  { name: 'GitHub Trending', url: 'https://github.com/trending.atom', type: 'atom' as const, category: '技术' },
  { name: '36氪', url: 'https://36kr.com/feed', type: 'rss' as const, category: '科技' },
  { name: '少数派', url: 'https://sspai.com/feed', type: 'rss' as const, category: '科技' },
  { name: 'InfoQ', url: 'https://feed.infoq.com/', type: 'rss' as const, category: '技术' },
  { name: 'AI 科技媒体', url: 'https://news.ycombinator.com/rss', type: 'rss' as const, category: 'AI' },
];
