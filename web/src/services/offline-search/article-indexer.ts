/**
 * Article Indexer for Offline Search
 * Provides utilities to index articles into the offline search index
 */

import type { Article } from '../../types';
import { getSearchIndex, type IndexedArticle } from './search-index';

/**
 * Index a single article into the offline search index
 */
export async function indexArticle(article: Article): Promise<void> {
  const searchIndex = getSearchIndex();
  
  const indexedArticle: IndexedArticle = {
    id: article.id,
    title: article.title,
    content: article.content || article.description,
    tags: extractTags(article),
    summary: article.description,
    link: article.link,
    author: article.author,
    pubDate: article.pubDate,
  };

  await searchIndex.indexArticle(indexedArticle);
}

/**
 * Remove an article from the offline search index
 */
export async function removeArticle(articleId: string): Promise<void> {
  const searchIndex = getSearchIndex();
  await searchIndex.remove(articleId);
}

/**
 * Index multiple articles into the offline search index
 */
export async function indexArticles(articles: Article[]): Promise<void> {
  const searchIndex = getSearchIndex();
  
  const indexedArticles: IndexedArticle[] = articles.map(article => ({
    id: article.id,
    title: article.title,
    content: article.content || article.description,
    tags: extractTags(article),
    summary: article.description,
    link: article.link,
    author: article.author,
    pubDate: article.pubDate,
  }));

  await searchIndex.indexArticles(indexedArticles);
}

/**
 * Extract tags from an article (placeholder - extend based on actual article structure)
 */
function extractTags(article: Article): string[] {
  // Articles may have tags through summaries or other metadata
  // This is a placeholder that can be extended based on actual app requirements
  return [];
}

/**
 * Rebuild the entire search index from stored articles
 * This is useful when the index gets corrupted or on first setup
 */
export async function rebuildIndex(articles: Article[]): Promise<void> {
  const searchIndex = getSearchIndex();
  await searchIndex.clear();
  await indexArticles(articles);
}

/**
 * Get search results for a query
 */
export async function searchArticles(query: string, limit = 20) {
  const searchIndex = getSearchIndex();
  return searchIndex.search(query, limit);
}