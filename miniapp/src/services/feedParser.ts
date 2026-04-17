// Feed parser for uni-app
import type { Article } from '../types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getTextContent(el: UniApp.NodeInfo | null, tag: string): string {
  if (!el || !el.children) return '';
  const node = el.children.find((c: UniApp.NodeInfo) => c.name === tag);
  return node?.children?.[0]?.text?.trim() || '';
}

export function parseRSS(xml: string): Article[] {
  // Simple regex-based parsing for uni-app compatibility
  const items: Article[] = [];
  const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
  
  for (const itemXml of itemMatches) {
    const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || itemXml.match(/<link[^>]*href=["']([^"']+)["']/i);
    const descMatch = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const pubDateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
    
    const title = titleMatch?.[1]?.replace(/<!\[CDATA\[|\]\]>/gi, '').trim() || '';
    const link = linkMatch?.[1]?.trim() || linkMatch?.[2]?.trim() || '';
    const description = descMatch?.[1]?.replace(/<[^>]+>/g, '').replace(/<!\[CDATA\[|\]\]>/gi, '').trim().slice(0, 500) || '';
    const pubDate = pubDateMatch?.[1]?.trim() || new Date().toISOString();
    
    if (title && link) {
      items.push({
        id: generateId(),
        subscriptionId: '',
        title,
        link,
        description,
        content: description,
        pubDate: new Date(pubDate).toISOString(),
        fetchedAt: new Date().toISOString(),
        isRead: false,
        isStarred: false,
      });
    }
  }
  return items;
}

export function parseAtom(xml: string): Article[] {
  const entries: Article[] = [];
  const entryMatches = xml.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];
  
  for (const entryXml of entryMatches) {
    const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
    const summaryMatch = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
    const pubDateMatch = entryXml.match(/<published[^>]*>([\s\S]*?)<\/published>/i) || entryXml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
    
    const title = titleMatch?.[1]?.replace(/<!\[CDATA\[|\]\]>/gi, '').trim() || '';
    const link = linkMatch?.[1]?.trim() || '';
    const description = summaryMatch?.[1]?.replace(/<[^>]+>/g, '').replace(/<!\[CDATA\[|\]\]>/gi, '').trim().slice(0, 500) || '';
    const pubDate = pubDateMatch?.[1]?.trim() || new Date().toISOString();
    
    if (title && link) {
      entries.push({
        id: generateId(),
        subscriptionId: '',
        title,
        link,
        description,
        content: description,
        pubDate: new Date(pubDate).toISOString(),
        fetchedAt: new Date().toISOString(),
        isRead: false,
        isStarred: false,
      });
    }
  }
  return entries;
}

export async function fetchFeed(url: string): Promise<Article[]> {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      timeout: 15000,
      success: (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        let articles: Article[];
        if (text.includes('<rss') || text.includes('<channel>')) {
          articles = parseRSS(text);
        } else if (text.includes('<feed') || text.includes('<entry>')) {
          articles = parseAtom(text);
        } else {
          reject(new Error('Unknown feed format'));
          return;
        }
        resolve(articles);
      },
      fail: (err) => reject(new Error(err.errMsg || 'Request failed')),
    });
  });
}

export async function fetchGitHubTrending(): Promise<Article[]> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: 'https://github.com/trending',
      method: 'GET',
      timeout: 15000,
      success: (res) => {
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
        const html = typeof res.data === 'string' ? res.data : '';
        const articles: Article[] = [];
        // Simple regex parsing for GitHub trending
        const repoMatches = html.match(/<article[^>]*class="Box-row"[^>]*>[\s\S]*?<\/article>/gi) || [];
        for (const repoHtml of repoMatches.slice(0, 20)) {
          const titleMatch = repoHtml.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="\/([^"]+)"[^>]*>([^<]+)<\/a>/i);
          const descMatch = repoHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
          const langMatch = repoHtml.match(/<span[^>]*itemprop="programmingLanguage"[^>]*>([^<]+)<\/span>/i);
          if (titleMatch) {
            const authorRepo = titleMatch[1];
            const title = titleMatch[2]?.trim().replace(/\s+/g, ' ');
            const link = `https://github.com/${authorRepo}`;
            const description = descMatch?.[1]?.trim().replace(/<[^>]+>/g, '').slice(0, 300) || '';
            const lang = langMatch?.[1]?.trim() || '';
            articles.push({
              id: generateId(),
              subscriptionId: '',
              title: `[GitHub] ${title}${lang ? ` (${lang})` : ''}`,
              link,
              description,
              content: description,
              author: authorRepo.split('/')[0],
              pubDate: new Date().toISOString(),
              fetchedAt: new Date().toISOString(),
              isRead: false,
              isStarred: false,
            });
          }
        }
        resolve(articles);
      },
      fail: (err) => reject(new Error(err.errMsg || 'Request failed')),
    });
  });
}

export function attachSubscriptionId(articles: Article[], subscriptionId: string): Article[] {
  return articles.map((a) => ({ ...a, subscriptionId }));
}
