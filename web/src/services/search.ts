import { getSubscriptions, getArticles, getSummaries, getNoteByArticleId } from './storage';
import type { Subscription, Article, Summary, ArticleNote } from '../types';

export interface SearchResult {
  type: 'subscription' | 'article' | 'summary' | 'note';
  id: string;
  title: string;
  excerpt: string;     // The matched snippet
  matchedField: string; // Which field matched
  url?: string;        // For navigation
}

function highlightMatch(text: string, query: string): string {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function excerpt(text: string, query: string, maxLen = 100): string {
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return text.slice(0, maxLen);
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + query.length + 70);
  let result = text.slice(start, end);
  if (start > 0) result = '...' + result;
  if (end < text.length) result = result + '...';
  return result;
}

export async function search(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  // Search subscriptions
  const subs = await getSubscriptions();
  for (const sub of subs) {
    if (sub.name.toLowerCase().includes(q)) {
      results.push({
        type: 'subscription',
        id: sub.id,
        title: sub.name,
        excerpt: highlightMatch(sub.name, query),
        matchedField: 'name',
        url: sub.url,
      });
    } else if (sub.url.toLowerCase().includes(q)) {
      results.push({
        type: 'subscription',
        id: sub.id,
        title: sub.name,
        excerpt: highlightMatch(sub.url, query),
        matchedField: 'url',
        url: sub.url,
      });
    } else if (sub.category?.toLowerCase().includes(q)) {
      results.push({
        type: 'subscription',
        id: sub.id,
        title: sub.name,
        excerpt: `分类: ${highlightMatch(sub.category, query)}`,
        matchedField: 'category',
        url: sub.url,
      });
    }
  }

  // Search articles
  const arts = await getArticles();
  for (const art of arts) {
    if (art.title.toLowerCase().includes(q)) {
      results.push({
        type: 'article',
        id: art.id,
        title: art.title,
        excerpt: highlightMatch(excerpt(art.title, query), query),
        matchedField: 'title',
      });
    } else if (art.description?.toLowerCase().includes(q)) {
      results.push({
        type: 'article',
        id: art.id,
        title: art.title,
        excerpt: highlightMatch(excerpt(art.description, query), query),
        matchedField: 'description',
      });
    }
  }

  // Search summaries
  const sums = await getSummaries();
  for (const sum of sums) {
    if (sum.content.toLowerCase().includes(q)) {
      results.push({
        type: 'summary',
        id: sum.id,
        title: `摘要 ${new Date(sum.createdAt).toLocaleDateString('zh-CN')}`,
        excerpt: highlightMatch(excerpt(sum.content, query), query),
        matchedField: 'content',
      });
    } else if (sum.keywords.some(k => k.toLowerCase().includes(q))) {
      const matchedKw = sum.keywords.find(k => k.toLowerCase().includes(q));
      results.push({
        type: 'summary',
        id: sum.id,
        title: `摘要 ${new Date(sum.createdAt).toLocaleDateString('zh-CN')}`,
        excerpt: `关键词: ${highlightMatch(matchedKw || '', query)}`,
        matchedField: 'keywords',
      });
    } else if (sum.tags?.some(t => t.toLowerCase().includes(q))) {
      const matchedTag = sum.tags.find(t => t.toLowerCase().includes(q));
      results.push({
        type: 'summary',
        id: sum.id,
        title: `摘要 ${new Date(sum.createdAt).toLocaleDateString('zh-CN')}`,
        excerpt: `标签: ${highlightMatch(matchedTag || '', query)}`,
        matchedField: 'tags',
      });
    }
  }

  // Search notes (need to get all notes)
  // Since we don't have getAllNotes, iterate through articles and get their notes
  for (const art of arts) {
    try {
      const note = await getNoteByArticleId(art.id);
      if (note && note.content.toLowerCase().includes(q)) {
        results.push({
          type: 'note',
          id: note.id,
          title: `笔记: ${art.title}`,
          excerpt: highlightMatch(excerpt(note.content, query), query),
          matchedField: 'content',
        });
      }
    } catch {}
  }

  return results;
}
