/**
 * Offline Search Services
 * Barrel export for offline search functionality
 */

export { OfflineSearchIndex, getSearchIndex } from './search-index';
export type { IndexedArticle, SearchResult } from './search-index';
export { indexArticle, removeArticle, indexArticles, rebuildIndex, searchArticles } from './article-indexer';