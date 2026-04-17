// RSS/Atom feed parser
import type { Article } from '../types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getTextContent(el: Element | null, tag: string): string {
  if (!el) return '';
  const node = el.querySelector(tag);
  return node?.textContent?.trim() || '';
}

function parseRSS(xml: string): Article[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const items = doc.querySelectorAll('item');
  const articles: Article[] = [];

  items.forEach((item) => {
    const title = getTextContent(item, 'title');
    const link = getTextContent(item, 'link');
    const description = getTextContent(item, 'description');
    const content = getTextContent(item, 'content\\:encoded') || getTextContent(item, 'content');
    const author = getTextContent(item, 'author') || getTextContent(item, 'dc\\:creator');
    const pubDate = getTextContent(item, 'pubDate') || new Date().toISOString();

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
    const title = getTextContent(entry, 'title');
    const linkEl = entry.querySelector('link[href]');
    const link = linkEl?.getAttribute('href') || '';
    const summary = getTextContent(entry, 'summary') || getTextContent(entry, 'content');
    const content = getTextContent(entry, 'content') || summary;
    const author = getTextContent(entry, 'author name');
    const pubDate = getTextContent(entry, 'published') || getTextContent(entry, 'updated') || new Date().toISOString();

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

export async function fetchFeed(url: string): Promise<Article[]> {
  try {
    // Use a CORS proxy for client-side fetching
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();

    // Detect feed type
    if (text.includes('<rss') || text.includes('<channel>')) {
      return parseRSS(text);
    } else if (text.includes('<feed') || text.includes('<entry>')) {
      return parseAtom(text);
    }
    throw new Error('Unknown feed format');
  } catch (err) {
    console.error(`Failed to fetch feed ${url}:`, err);
    throw err;
  }
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
