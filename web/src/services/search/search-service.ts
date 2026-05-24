/**
 * SearchService - Advanced search with semantic capabilities
 * Reuses offline-search/search-index from Direction H
 * Zero new dependencies - uses built-in Web APIs only
 */

import { getSearchIndex, type SearchResult as IndexSearchResult } from '../offline-search/search-index';
import type { Article } from '../../types';

// Extended search result with category and tags
export interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  score: number;
  category?: string;
  tags: string[];
  subscribed: boolean;
  date?: string;
}

// Filter options for advanced search
export interface FilterOptions {
  dateRange?: {
    start: string;
    end: string;
  };
  category?: string;
  tags?: string[];
  subscribed?: boolean;
}

// Local article cache for filtering
let articleCache: Article[] = [];

// Initialize article cache from IndexedDB via search index
async function loadArticleCache(): Promise<void> {
  if (articleCache.length > 0) return;
  
  // We need to get actual articles - stored via article-indexer
  // For now, we'll store articles when they're indexed
}

// Store articles for filtering
export function setArticleCache(articles: Article[]): void {
  articleCache = articles;
}

// SearchService class
export class SearchService {
  /**
   * Search with optional filters
   */
  async search(query: string, filters?: FilterOptions): Promise<SearchResult[]> {
    const searchIndex = getSearchIndex();
    
    // Perform semantic search
    const results = await searchIndex.search(query, 50);
    
    // Map to our extended SearchResult
    let mappedResults: SearchResult[] = results.map(r => ({
      id: r.id,
      title: r.title,
      excerpt: r.excerpt,
      score: r.score,
      category: undefined,
      tags: [],
      subscribed: false,
      date: undefined,
    }));
    
    // Apply filters if provided
    if (filters) {
      mappedResults = this.applyFilters(mappedResults, filters);
    }
    
    return mappedResults;
  }
  
  /**
   * Apply filters to search results
   */
  private applyFilters(results: SearchResult[], filters: FilterOptions): SearchResult[] {
    return results.filter(result => {
      // Date range filter
      if (filters.dateRange) {
        const resultDate = result.date ? new Date(result.date).getTime() : 0;
        const startDate = new Date(filters.dateRange.start).getTime();
        const endDate = new Date(filters.dateRange.end).getTime();
        
        if (resultDate < startDate || resultDate > endDate) {
          return false;
        }
      }
      
      // Category filter
      if (filters.category && result.category !== filters.category) {
        return false;
      }
      
      // Tags filter - ALL tags must match
      if (filters.tags && filters.tags.length > 0) {
        const hasAllTags = filters.tags.every(tag => 
          result.tags.includes(tag)
        );
        if (!hasAllTags) return false;
      }
      
      // Subscribed filter
      if (filters.subscribed !== undefined && result.subscribed !== filters.subscribed) {
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Get search suggestions based on prefix
   */
  async getSuggestions(prefix: string): Promise<string[]> {
    if (!prefix || prefix.length < 2) return [];
    
    const searchIndex = getSearchIndex();
    const results = await searchIndex.search(prefix, 10);
    
    // Extract unique titles as suggestions
    const suggestions = results
      .map(r => r.title)
      .filter((title, index, self) => 
        title.toLowerCase().includes(prefix.toLowerCase()) &&
        self.indexOf(title) === index
      )
      .slice(0, 5);
    
    return suggestions;
  }
  
  /**
   * Get recent searches from localStorage
   */
  getRecentSearches(): string[] {
    try {
      const stored = localStorage.getItem('search_history');
      if (!stored) return [];
      
      const history = JSON.parse(stored) as string[];
      return Array.isArray(history) ? history.slice(0, 10) : [];
    } catch {
      return [];
    }
  }
  
  /**
   * Add a search term to history
   */
  addRecentSearch(term: string): void {
    if (!term.trim()) return;
    
    try {
      const history = this.getRecentSearches();
      
      // Remove if already exists (to move to front)
      const filtered = history.filter(h => h.toLowerCase() !== term.toLowerCase());
      
      // Add to front
      filtered.unshift(term.trim());
      
      // Keep only last 10
      const trimmed = filtered.slice(0, 10);
      
      localStorage.setItem('search_history', JSON.stringify(trimmed));
    } catch {
      // localStorage not available
    }
  }
  
  /**
   * Clear all recent searches
   */
  clearRecentSearches(): void {
    try {
      localStorage.removeItem('search_history');
    } catch {
      // localStorage not available
    }
  }
}

// Singleton instance
let searchServiceInstance: SearchService | null = null;

export function getSearchService(): SearchService {
  if (!searchServiceInstance) {
    searchServiceInstance = new SearchService();
  }
  return searchServiceInstance;
}

export default getSearchService;