/**
 * Search Services - Barrel export
 * Reuses offline-search from Direction H
 */

export { SearchService, getSearchService } from './search-service';
export type { SearchResult, FilterOptions } from './search-service';
export { 
  applyFilters, 
  buildFilterURL, 
  parseFilterURL, 
  filtersToQueryString,
  getFiltersFromURL,
} from './filter-engine';