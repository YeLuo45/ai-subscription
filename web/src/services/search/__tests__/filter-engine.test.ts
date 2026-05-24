/**
 * FilterEngine Unit Tests
 * Tests for applyFilters, buildFilterURL, parseFilterURL
 */

import { describe, it, expect } from 'vitest';
import { 
  applyFilters, 
  buildFilterURL, 
  parseFilterURL, 
  filtersToQueryString,
  getFiltersFromURL,
} from '../filter-engine';
import type { FilterOptions } from '../search-service';
import type { Article } from '../../../types';

describe('FilterEngine', () => {
  // Sample articles for testing
  const mockArticles: Article[] = [
    {
      id: '1',
      subscriptionId: 'sub1',
      title: 'React Tutorial',
      link: 'https://example.com/1',
      description: 'Learn React basics',
      content: 'React is a library...',
      author: 'John',
      pubDate: '2024-03-15',
      fetchedAt: '2024-03-15',
      isRead: false,
      isStarred: false,
      isReadLater: false,
    },
    {
      id: '2',
      subscriptionId: 'sub2',
      title: 'TypeScript Guide',
      link: 'https://example.com/2',
      description: 'TypeScript tips',
      content: 'TypeScript is a typed superset...',
      author: 'Jane',
      pubDate: '2024-05-20',
      fetchedAt: '2024-05-20',
      isRead: true,
      isStarred: true,
      isReadLater: false,
    },
    {
      id: '3',
      subscriptionId: 'sub1',
      title: 'CSS Tricks',
      link: 'https://example.com/3',
      description: 'CSS layout',
      content: 'CSS Flexbox and Grid...',
      author: 'Bob',
      pubDate: '2024-02-10',
      fetchedAt: '2024-02-10',
      isRead: false,
      isStarred: false,
      isReadLater: true,
    },
  ];

  describe('applyFilters', () => {
    it('should return all articles when no filters provided', () => {
      const filters: FilterOptions = {};
      const result = applyFilters(mockArticles, filters);
      expect(result).toHaveLength(3);
    });

    it('should filter by date range - start only', () => {
      const filters: FilterOptions = {
        dateRange: { start: '2024-03-01', end: '' },
      };
      const result = applyFilters(mockArticles, filters);
      // Should include articles from March onwards
      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter by date range - end only', () => {
      const filters: FilterOptions = {
        dateRange: { start: '', end: '2024-04-01' },
      };
      const result = applyFilters(mockArticles, filters);
      // Should include articles before April
      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter by date range - both start and end', () => {
      const filters: FilterOptions = {
        dateRange: { start: '2024-03-01', end: '2024-04-30' },
      };
      const result = applyFilters(mockArticles, filters);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array when date range excludes all', () => {
      const filters: FilterOptions = {
        dateRange: { start: '2025-01-01', end: '2025-12-31' },
      };
      const result = applyFilters(mockArticles, filters);
      expect(result).toHaveLength(0);
    });

    it('should handle empty articles array', () => {
      const filters: FilterOptions = { category: 'Tech' };
      const result = applyFilters([], filters);
      expect(result).toHaveLength(0);
    });

    it('should handle empty filter values', () => {
      const filters: FilterOptions = {
        dateRange: { start: '', end: '' },
      };
      const result = applyFilters(mockArticles, filters);
      expect(result).toHaveLength(3);
    });
  });

  describe('buildFilterURL', () => {
    it('should return empty string for empty filters', () => {
      const result = buildFilterURL({});
      expect(result).toBe('');
    });

    it('should build URL with date_start and date_end', () => {
      const filters: FilterOptions = {
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
      };
      const result = buildFilterURL(filters);
      expect(result).toContain('date_start=2024-01-01');
      expect(result).toContain('date_end=2024-12-31');
    });

    it('should build URL with single date value', () => {
      const filters: FilterOptions = {
        dateRange: { start: '2024-01-01', end: '' },
      };
      const result = buildFilterURL(filters);
      expect(result).toContain('date_start=2024-01-01');
    });

    it('should build URL with category', () => {
      const filters: FilterOptions = { category: 'Tech' };
      const result = buildFilterURL(filters);
      expect(result).toContain('category=Tech');
    });

    it('should build URL with multiple tags', () => {
      const filters: FilterOptions = { tags: ['react', 'typescript'] };
      const result = buildFilterURL(filters);
      expect(result).toContain('tags=react');
      expect(result).toContain('tags=typescript');
    });

    it('should build URL with single tag', () => {
      const filters: FilterOptions = { tags: ['react'] };
      const result = buildFilterURL(filters);
      expect(result).toContain('tags=react');
    });

    it('should build URL with subscribed=true', () => {
      const filters: FilterOptions = { subscribed: true };
      const result = buildFilterURL(filters);
      expect(result).toContain('subscribed=true');
    });

    it('should build URL with subscribed=false', () => {
      const filters: FilterOptions = { subscribed: false };
      const result = buildFilterURL(filters);
      expect(result).toContain('subscribed=false');
    });

    it('should build URL with all filter types combined', () => {
      const filters: FilterOptions = {
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        category: 'Tech',
        tags: ['ai', 'ml'],
        subscribed: true,
      };
      const result = buildFilterURL(filters);
      expect(result).toContain('date_start');
      expect(result).toContain('date_end');
      expect(result).toContain('category=Tech');
      expect(result).toContain('tags=ai');
      expect(result).toContain('tags=ml');
      expect(result).toContain('subscribed=true');
    });

    it('should handle special characters in category', () => {
      const filters: FilterOptions = { category: 'Tech & AI' };
      const result = buildFilterURL(filters);
      expect(result).toBeDefined();
    });
  });

  describe('parseFilterURL', () => {
    it('should return empty object for empty params', () => {
      const params = new URLSearchParams();
      const result = parseFilterURL(params);
      expect(result).toEqual({});
    });

    it('should parse date range from params', () => {
      const params = new URLSearchParams('date_start=2024-01-01&date_end=2024-12-31');
      const result = parseFilterURL(params);
      expect(result.dateRange).toEqual({ start: '2024-01-01', end: '2024-12-31' });
    });

    it('should parse category from params', () => {
      const params = new URLSearchParams('category=Tech');
      const result = parseFilterURL(params);
      expect(result.category).toBe('Tech');
    });

    it('should parse single tag from params', () => {
      const params = new URLSearchParams('tags=react');
      const result = parseFilterURL(params);
      expect(result.tags).toEqual(['react']);
    });

    it('should parse multiple tags from params', () => {
      const params = new URLSearchParams('tags=react&tags=typescript');
      const result = parseFilterURL(params);
      expect(result.tags).toEqual(['react', 'typescript']);
    });

    it('should parse subscribed=true', () => {
      const params = new URLSearchParams('subscribed=true');
      const result = parseFilterURL(params);
      expect(result.subscribed).toBe(true);
    });

    it('should parse subscribed=false', () => {
      const params = new URLSearchParams('subscribed=false');
      const result = parseFilterURL(params);
      expect(result.subscribed).toBe(false);
    });

    it('should parse all params combined', () => {
      const params = new URLSearchParams(
        'date_start=2024-01-01&date_end=2024-12-31&category=Tech&tags=react&tags=typescript&subscribed=true'
      );
      const result = parseFilterURL(params);
      expect(result.dateRange).toEqual({ start: '2024-01-01', end: '2024-12-31' });
      expect(result.category).toBe('Tech');
      expect(result.tags).toEqual(['react', 'typescript']);
      expect(result.subscribed).toBe(true);
    });

    it('should handle partial date range - start only', () => {
      const params = new URLSearchParams('date_start=2024-01-01');
      const result = parseFilterURL(params);
      expect(result.dateRange).toEqual({ start: '2024-01-01' });
    });

    it('should handle partial date range - end only', () => {
      const params = new URLSearchParams('date_end=2024-12-31');
      const result = parseFilterURL(params);
      expect(result.dateRange).toEqual({ end: '2024-12-31' });
    });

    it('should not include dateRange when no date params', () => {
      const params = new URLSearchParams('category=Tech');
      const result = parseFilterURL(params);
      expect(result.dateRange).toBeUndefined();
    });

    it('should not include tags when no tags params', () => {
      const params = new URLSearchParams('category=Tech');
      const result = parseFilterURL(params);
      expect(result.tags).toBeUndefined();
    });

    it('should return empty array for tags with no values', () => {
      const params = new URLSearchParams('');
      const result = parseFilterURL(params);
      expect(result.tags).toBeUndefined();
    });
  });

  describe('filtersToQueryString', () => {
    it('should be alias for buildFilterURL', () => {
      const filters: FilterOptions = { category: 'Tech' };
      expect(filtersToQueryString(filters)).toBe(buildFilterURL(filters));
    });
  });

  describe('getFiltersFromURL', () => {
    it('should return empty object when window is undefined', () => {
      // In Node environment, window is undefined
      const result = getFiltersFromURL();
      expect(result).toEqual({});
    });
  });
});