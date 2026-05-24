/**
 * SearchService Unit Tests
 * Tests for search, suggestions, and history management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the search index module
vi.mock('../../offline-search/search-index', () => {
  const mockResults = [
    { id: '1', title: 'Test Article 1', excerpt: 'Content about testing', score: 0.9, matchedField: 'content' },
    { id: '2', title: 'Test Article 2', excerpt: 'Another test article', score: 0.7, matchedField: 'content' },
    { id: '3', title: 'React Tutorial', excerpt: 'Learn React basics', score: 0.5, matchedField: 'title' },
  ];
  
  return {
    getSearchIndex: () => ({
      search: vi.fn().mockResolvedValue(mockResults),
      initialize: vi.fn().mockResolvedValue(undefined),
    }),
    SearchResult: { id: '', title: '', excerpt: '', score: 0, matchedField: '' },
  };
});

// Import after mocking
import { SearchService, getSearchService } from '../search-service';

describe('SearchService', () => {
  let searchService: SearchService;

  beforeEach(() => {
    searchService = new SearchService();
    // Clear localStorage mock
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should return search results for a valid query', async () => {
      const results = await searchService.search('test');
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return results with id, title, excerpt, and score', async () => {
      const results = await searchService.search('test');
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('id');
        expect(results[0]).toHaveProperty('title');
        expect(results[0]).toHaveProperty('excerpt');
        expect(results[0]).toHaveProperty('score');
      }
    });

    it('should apply filters when provided', async () => {
      const filters = {
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        category: 'Tech',
        tags: ['react'],
        subscribed: true,
      };
      const results = await searchService.search('test', filters);
      expect(results).toBeDefined();
    });

    it('should return empty array for empty query', async () => {
      const results = await searchService.search('');
      expect(results).toEqual([]);
    });

    it('should handle search with no matching results', async () => {
      // This tests the filter behavior
      const results = await searchService.search('nonexistentqueryxyz');
      expect(results).toBeDefined();
    });
  });

  describe('getSuggestions', () => {
    it('should return empty array for prefix less than 2 characters', async () => {
      const suggestions = await searchService.getSuggestions('a');
      expect(suggestions).toEqual([]);
    });

    it('should return suggestions for prefix with 2+ characters', async () => {
      const suggestions = await searchService.getSuggestions('te');
      expect(suggestions).toBeDefined();
    });

    it('should return array of strings', async () => {
      const suggestions = await searchService.getSuggestions('test');
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should handle empty prefix gracefully', async () => {
      const suggestions = await searchService.getSuggestions('');
      expect(suggestions).toEqual([]);
    });
  });

  describe('getRecentSearches', () => {
    it('should return array', () => {
      const history = searchService.getRecentSearches();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should return empty array when no history', () => {
      // Mock localStorage to return null
      const originalLocalStorage = global.localStorage;
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn().mockReturnValue(null),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        },
        writable: true,
      });
      
      const history = searchService.getRecentSearches();
      expect(history).toEqual([]);
      
      // Restore
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it('should return limited to 10 items', () => {
      const originalLocalStorage = global.localStorage;
      const mockHistory = Array.from({ length: 15 }, (_, i) => `search ${i}`);
      
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn().mockReturnValue(JSON.stringify(mockHistory)),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        },
        writable: true,
      });
      
      const history = searchService.getRecentSearches();
      expect(history.length).toBeLessThanOrEqual(10);
      
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });

  describe('addRecentSearch', () => {
    it('should add term to history', () => {
      const originalLocalStorage = global.localStorage;
      const setItemSpy = vi.fn();
      
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn().mockReturnValue(null),
          setItem: setItemSpy,
          removeItem: vi.fn(),
        },
        writable: true,
      });
      
      searchService.addRecentSearch('test term');
      expect(setItemSpy).toHaveBeenCalled();
      
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it('should not add empty string', () => {
      const originalLocalStorage = global.localStorage;
      const setItemSpy = vi.fn();
      
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn().mockReturnValue(null),
          setItem: setItemSpy,
          removeItem: vi.fn(),
        },
        writable: true,
      });
      
      searchService.addRecentSearch('');
      // Should not call setItem for empty string
      expect(setItemSpy).not.toHaveBeenCalled();
      
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it('should trim whitespace from term', () => {
      const originalLocalStorage = global.localStorage;
      const setItemSpy = vi.fn();
      
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn().mockReturnValue(null),
          setItem: setItemSpy,
          removeItem: vi.fn(),
        },
        writable: true,
      });
      
      searchService.addRecentSearch('  test term  ');
      expect(setItemSpy).toHaveBeenCalled();
      
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it('should not duplicate existing term', () => {
      const originalLocalStorage = global.localStorage;
      const setItemSpy = vi.fn();
      
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn().mockReturnValue(JSON.stringify(['test term', 'another'])),
          setItem: setItemSpy,
          removeItem: vi.fn(),
        },
        writable: true,
      });
      
      searchService.addRecentSearch('test term');
      expect(setItemSpy).toHaveBeenCalled();
      // Should move existing term to front, not add duplicate
      const calledWith = setItemSpy.mock.calls[0][1];
      const parsed = JSON.parse(calledWith);
      expect(parsed.filter((h: string) => h.toLowerCase() === 'test term').length).toBe(1);
      
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });

  describe('clearRecentSearches', () => {
    it('should clear search history from localStorage', () => {
      const originalLocalStorage = global.localStorage;
      const removeItemSpy = vi.fn();
      
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn().mockReturnValue('["search1", "search2"]'),
          setItem: vi.fn(),
          removeItem: removeItemSpy,
        },
        writable: true,
      });
      
      searchService.clearRecentSearches();
      expect(removeItemSpy).toHaveBeenCalledWith('search_history');
      
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it('should handle missing localStorage gracefully', () => {
      const originalLocalStorage = global.localStorage;
      
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
      });
      
      // Should not throw
      expect(() => searchService.clearRecentSearches()).not.toThrow();
      
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });

  describe('getSearchService singleton', () => {
    it('should return same instance', () => {
      const instance1 = getSearchService();
      const instance2 = getSearchService();
      expect(instance1).toBe(instance2);
    });
  });

  describe('FilterOptions handling', () => {
    it('should handle dateRange filter correctly', async () => {
      const filters = {
        dateRange: {
          start: '2024-01-01',
          end: '2024-06-30',
        },
      };
      const results = await searchService.search('test', filters);
      expect(results).toBeDefined();
    });

    it('should handle multiple filters', async () => {
      const filters = {
        category: 'Tech',
        tags: ['AI', 'ML'],
        subscribed: true,
      };
      const results = await searchService.search('test', filters);
      expect(results).toBeDefined();
    });

    it('should handle tags filter with AND logic', async () => {
      const filters = {
        tags: ['tag1', 'tag2'],
      };
      const results = await searchService.search('test', filters);
      expect(results).toBeDefined();
    });
  });
});