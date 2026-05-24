/**
 * FilterEngine - URL-based filtering for search
 * Zero new dependencies - uses built-in Web APIs only
 */

import type { FilterOptions } from './search-service';

export interface ArticleBase {
  id: string;
  subscriptionId: string;
  title: string;
  pubDate: string;
  [key: string]: unknown;
}

/**
 * Apply filters to a list of articles (generic version)
 */
export function applyFilters<T extends ArticleBase>(articles: T[], filters: FilterOptions): T[] {
  return articles.filter(article => {
    // Date range filter
    if (filters.dateRange) {
      const articleDate = new Date(article.pubDate).getTime();
      const startDate = new Date(filters.dateRange.start).getTime();
      const endDate = new Date(filters.dateRange.end).getTime();
      
      if (filters.dateRange.start && articleDate < startDate) return false;
      if (filters.dateRange.end && articleDate > endDate) return false;
    }
    
    // Category filter - use subscriptionId if available
    if (filters.category && article.subscriptionId !== filters.category) {
      // Subscription ID check - in real app would look up subscription
      return false;
    }
    
    // Tags filter - articles must have ALL given tags
    if (filters.tags && filters.tags.length > 0) {
      const articleTags = (article.tags as string[]) || [];
      const hasAllTags = filters.tags.every(tag => articleTags.includes(tag));
      if (!hasAllTags) return false;
    }
    
    // Subscribed filter - check via subscriptionId pattern
    if (filters.subscribed !== undefined) {
      // In real app, would check if subscription is subscribed
      // For now, just pass through
    }
    
    return true;
  });
}

/**
 * Build a URL query string from filter options
 */
export function buildFilterURL(filters: FilterOptions): string {
  const params = new URLSearchParams();
  
  if (filters.dateRange) {
    if (filters.dateRange.start) {
      params.set('date_start', filters.dateRange.start);
    }
    if (filters.dateRange.end) {
      params.set('date_end', filters.dateRange.end);
    }
  }
  
  if (filters.category) {
    params.set('category', filters.category);
  }
  
  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach(tag => {
      params.append('tags', tag);
    });
  }
  
  if (filters.subscribed !== undefined) {
    params.set('subscribed', String(filters.subscribed));
  }
  
  return params.toString();
}

/**
 * Parse filter options from URL search params
 */
export function parseFilterURL(urlSearchParams: URLSearchParams): FilterOptions {
  const filters: FilterOptions = {};
  
  // Parse date range
  const dateStart = urlSearchParams.get('date_start');
  const dateEnd = urlSearchParams.get('date_end');
  if (dateStart || dateEnd) {
    const dateRange: { start?: string; end?: string } = {};
    if (dateStart) dateRange.start = dateStart;
    if (dateEnd) dateRange.end = dateEnd;
    filters.dateRange = dateRange as { start: string; end: string };
  }
  
  // Parse category
  const category = urlSearchParams.get('category');
  if (category) {
    filters.category = category;
  }
  
  // Parse tags (multiple values)
  const tags = urlSearchParams.getAll('tags');
  if (tags.length > 0) {
    filters.tags = tags;
  }
  
  // Parse subscribed
  const subscribed = urlSearchParams.get('subscribed');
  if (subscribed !== null) {
    filters.subscribed = subscribed === 'true';
  }
  
  return filters;
}

/**
 * Build a filter object from current filter state for URL
 */
export function filtersToQueryString(filters: FilterOptions): string {
  return buildFilterURL(filters);
}

/**
 * Extract filters from current location search params
 */
export function getFiltersFromURL(): FilterOptions {
  if (typeof window === 'undefined') return {};
  return parseFilterURL(new URLSearchParams(window.location.search));
}