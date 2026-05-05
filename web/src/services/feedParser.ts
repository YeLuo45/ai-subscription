// RSS/Atom feed parser with smart parsing enhancement
import type { Article } from '../types';
import { detectFeedType, extractFavicon, extractSiteName, detectUpdateFrequency } from '../utils/feedDetector';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getTextContent(el: Element | null, tag: string): string {
  if (!el) return '';
  const node = el.querySelector(tag);
  return node?.textContent?.trim() || '';
}

// Enhanced field mapping - try multiple tag names
function getFieldText(el: Element, ...tags: string[]): string {
  for (const tag of tags) {
    const found = el.querySelector(tag);
    if (found) {
      const text = found.textContent?.trim();
      if (text) return text;
    }
  }
  return '';
}

// Extract image URL from media:content, media:thumbnail, or enclosure
function extractImageUrl(item: Element): string | undefined {
  // Try media:content
  const mediaContent = item.querySelector('media\\:content, media\\:thumbnail');
  if (mediaContent?.getAttribute('url')) {
    return mediaContent.getAttribute('url') || undefined;
  }
  // Try enclosure
  const enclosure = item.querySelector('enclosure');
  if (enclosure?.getAttribute('url') && enclosure.getAttribute('type')?.startsWith('image/')) {
    return enclosure.getAttribute('url') || undefined;
  }
  // Try to find img tag in content
  const content = getFieldText(item, 'content\\:encoded', 'content', 'description');
  if (content) {
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) return imgMatch[1];
  }
  return undefined;
}

function parseRSS(xml: string): Article[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const items = doc.querySelectorAll('item');
  const articles: Article[] = [];

  items.forEach((item) => {
    const title = getFieldText(item, 'title');
    const link = getFieldText(item, 'link');
    // Enhanced: try multiple fields for description/summary
    const description = getFieldText(item, 'description', 'summary', 'content:encoded');
    // Enhanced: try content:encoded first, then content
    const content = getFieldText(item, 'content:encoded', 'content');
    // Enhanced: try dc:creator, author, managingEditor
    const author = getFieldText(item, 'dc\\:creator', 'author', 'managingEditor');
    // Enhanced: try pubDate, dc:date, date
    const pubDate = getFieldText(item, 'pubDate', 'dc\\:date', 'date') || new Date().toISOString();
    // Extract image if available
    const imageUrl = extractImageUrl(item);

    if (title && link) {
      articles.push({
        id: generateId(),
        subscriptionId: '',
        title,
        link,
        description: description.replace(/<[^>]+>/g, '').slice(0, 500),
        content: content || description,
        author,
        pubDate: new Date(pubDate).toISOString(),
        fetchedAt: new Date().toISOString(),
        isRead: false,
        isStarred: false,
      });
    }
  });

  return articles;
}

function parseAtom(xml: string): Article[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const entries = doc.querySelectorAll('entry');
  const articles: Article[] = [];

  entries.forEach((entry) => {
    const title = getFieldText(entry, 'title');
    const linkEl = entry.querySelector('link[href]');
    const link = linkEl?.getAttribute('href') || '';
    // Enhanced: try summary first, then content
    const summary = getFieldText(entry, 'summary', 'content');
    const content = getFieldText(entry, 'content') || summary;
    // Enhanced: try author name, author, contributor
    const author = getFieldText(entry, 'author name', 'author name', 'author', 'contributor');
    // Enhanced: try published, updated
    const pubDate = getFieldText(entry, 'published', 'updated') || new Date().toISOString();

    if (title && link) {
      articles.push({
        id: generateId(),
        subscriptionId: '',
        title,
        link,
        description: summary.replace(/<[^>]+>/g, '').slice(0, 500),
        content: content || summary,
        author,
        pubDate: new Date(pubDate).toISOString(),
        fetchedAt: new Date().toISOString(),
        isRead: false,
        isStarred: false,
      });
    }
  });

  return articles;
}

// Fetch result with metadata
export interface FetchResult {
  articles: Article[];
  feedType: 'rss' | 'atom' | 'jsonfeed' | 'unknown';
  favicon: string | null;
  siteName: string | null;
  suggestedInterval: number;
}

export async function fetchFeedWithMetadata(url: string): Promise<FetchResult> {
  try {
    // Use a CORS proxy for client-side fetching
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();

    // Detect feed type
    const feedType = detectFeedType(text);
    
    let articles: Article[] = [];
    if (feedType === 'rss' || text.includes('<rss') || text.includes('<channel>')) {
      articles = parseRSS(text);
    } else if (feedType === 'atom' || text.includes('<feed') || text.includes('<entry>')) {
      articles = parseAtom(text);
    } else {
      throw new Error('Unknown feed format');
    }

    // Try to extract favicon and site name from the source page
    let favicon: string | null = null;
    let siteName: string | null = null;
    try {
      // Fetch the HTML page to extract favicon and site name
      const siteUrl = new URL(url);
      const baseUrl = `${siteUrl.protocol}//${siteUrl.host}`;
      const htmlProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(baseUrl)}`;
      try {
        const htmlResponse = await fetch(htmlProxyUrl, { signal: AbortSignal.timeout(10000) });
        if (htmlResponse.ok) {
          const htmlContent = await htmlResponse.text();
          favicon = extractFavicon(baseUrl, htmlContent);
          siteName = extractSiteName(htmlContent);
        }
      } catch {
        // Fallback to default favicon
        favicon = extractFavicon(baseUrl);
      }
    } catch {
      favicon = null;
    }

    // Detect suggested update frequency
    const suggestedInterval = detectUpdateFrequency(articles);

    return {
      articles,
      feedType,
      favicon,
      siteName,
      suggestedInterval,
    };
  } catch (err) {
    console.error(`Failed to fetch feed ${url}:`, err);
    throw err;
  }
}

export async function fetchFeed(url: string): Promise<Article[]> {
  const result = await fetchFeedWithMetadata(url);
  return result.articles;
}

// GitHub Trending scraper
export async function fetchGitHubTrending(): Promise<Article[]> {
  const proxyUrl = 'https://api.allorigins.win/raw?url=https://github.com/trending';
  try {
    const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const articles: Article[] = [];

    doc.querySelectorAll('article.Box-row').forEach((item) => {
      const titleEl = item.querySelector('h2 a');
      const title = titleEl?.textContent?.trim().replace(/\s+/g, ' ') || '';
      const link = 'https://github.com' + (titleEl?.getAttribute('href') || '');
      const description = item.querySelector('p')?.textContent?.trim() || '';
      const langEl = item.querySelector('[itemprop="programmingLanguage"]');
      const lang = langEl?.textContent?.trim() || '';

      if (title) {
        articles.push({
          id: generateId(),
          subscriptionId: '',
          title: `[GitHub Trending] ${title}${lang ? ` (${lang})` : ''}`,
          link,
          description: description.slice(0, 300),
          content: description,
          author: 'GitHub',
          pubDate: new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
          isRead: false,
          isStarred: false,
        });
      }
    });

    return articles;
  } catch (err) {
    console.error('Failed to fetch GitHub Trending:', err);
    throw err;
  }
}

export function attachSubscriptionId(articles: Article[], subscriptionId: string): Article[] {
  return articles.map((a) => ({ ...a, subscriptionId }));
}
