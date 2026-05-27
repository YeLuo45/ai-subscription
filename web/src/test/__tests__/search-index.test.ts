/**
 * Offline Search Index Pure Unit Tests
 * Tests search indexing logic without IndexedDB dependencies
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';

// ============================================================
// Pure search indexing logic (extracted from search-index.ts)
// ============================================================

interface IndexedArticle {
  id: string;
  title: string;
  content: string;
  tags: string[];
  summary: string;
}

interface SearchResult {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  score: number;
  matchType: 'exact' | 'prefix' | 'fuzzy';
}

// Tokenization: split text into searchable terms
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

// Calculate TF-IDF style score for a term in a document
function termFrequency(term: string, text: string): number {
  const terms = tokenize(text);
  if (terms.length === 0) return 0;
  const count = terms.filter(t => t.includes(term.toLowerCase())).length;
  return count / terms.length;
}

// Calculate inverse document frequency
function inverseDocumentFrequency(term: string, documents: string[]): number {
  const docsWithTerm = documents.filter(doc => 
    tokenize(doc).some(t => t.includes(term.toLowerCase()))
  ).length;
  if (docsWithTerm === 0) return 0;
  return Math.log(documents.length / docsWithTerm);
}

// Calculate relevance score between query and document
function calculateRelevanceScore(query: string, article: IndexedArticle): number {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return 0;

  const titleTerms = tokenize(article.title);
  const contentTerms = tokenize(article.content);
  const tagTerms = article.tags.map(t => t.toLowerCase());

  let score = 0;

  for (const qt of queryTerms) {
    // Title match (highest weight)
    if (titleTerms.some(t => t.includes(qt) || qt.includes(t))) {
      score += 10;
    }

    // Tag match (high weight)
    if (tagTerms.some(t => t.includes(qt) || qt.includes(t))) {
      score += 5;
    }

    // Content match (lower weight)
    const contentTF = termFrequency(qt, article.content);
    if (contentTF > 0) {
      score += contentTF * 3;
    }
  }

  return Math.round(score * 100) / 100;
}

// Match type detection
function detectMatchType(query: string, article: IndexedArticle): 'exact' | 'prefix' | 'fuzzy' {
  const queryTerms = tokenize(query);
  const titleTerms = tokenize(article.title);
  const tagTerms = article.tags.map(t => t.toLowerCase());

  // Exact: query term matches title or tag exactly
  for (const qt of queryTerms) {
    if (titleTerms.some(t => t === qt) || tagTerms.some(t => t === qt)) {
      return 'exact';
    }
  }

  // Prefix: query term is prefix of title or tag
  for (const qt of queryTerms) {
    if (titleTerms.some(t => t.startsWith(qt)) || tagTerms.some(t => t.startsWith(qt))) {
      return 'prefix';
    }
  }

  return 'fuzzy';
}

// Filter articles by tag
function filterByTags(articles: IndexedArticle[], tags: string[]): IndexedArticle[] {
  if (tags.length === 0) return articles;
  const lowerTags = tags.map(t => t.toLowerCase());
  return articles.filter(a => 
    a.tags.some(t => lowerTags.includes(t.toLowerCase()))
  );
}

// Sort results by score descending
function sortByScore(results: SearchResult[]): SearchResult[] {
  return [...results].sort((a, b) => b.score - a.score);
}

// Deduplicate results by id
function deduplicateById(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

// Paginate results
function paginate(results: SearchResult[], page: number, pageSize: number): SearchResult[] {
  const start = (page - 1) * pageSize;
  return results.slice(start, start + pageSize);
}

// Highlight matching terms in text (returns marked text)
function highlightMatches(text: string, queryTerms: string[]): string {
  let result = text;
  for (const term of queryTerms) {
    const regex = new RegExp(`(${term})`, 'gi');
    result = result.replace(regex, '**$1**');
  }
  return result;
}

// ============================================================
// Pure function tests
// ============================================================

describe('OfflineSearchIndex Pure Logic', () => {
  const sampleArticles: IndexedArticle[] = [
    {
      id: 'article-1',
      title: 'React Testing Guide',
      content: 'Learn how to test React components with Vitest and Testing Library.',
      tags: ['react', 'testing', 'javascript'],
      summary: 'Complete guide to React testing.',
    },
    {
      id: 'article-2',
      title: 'TypeScript Best Practices',
      content: 'TypeScript patterns and best practices for large codebases.',
      tags: ['typescript', 'javascript', 'programming'],
      summary: 'TypeScript best practices guide.',
    },
    {
      id: 'article-3',
      title: 'React Performance Optimization',
      content: 'Optimize your React app with useMemo, useCallback, and React.memo.',
      tags: ['react', 'performance', 'optimization'],
      summary: 'React performance tips.',
    },
  ];

  describe('tokenize', () => {
    it('should split text into lowercase terms', () => {
      expect(tokenize('Hello World Test')).toEqual(['hello', 'world', 'test']);
    });

    it('should remove punctuation', () => {
      expect(tokenize('Hello, World!')).toEqual(['hello', 'world']);
    });

    it('should filter single characters', () => {
      expect(tokenize('a b c')).toEqual([]);
    });

    it('should handle empty string', () => {
      expect(tokenize('')).toEqual([]);
    });

    it('should handle multiple spaces', () => {
      expect(tokenize('hello    world')).toEqual(['hello', 'world']);
    });
  });

  describe('termFrequency', () => {
    it('should return 0 for empty text', () => {
      expect(termFrequency('test', '')).toBe(0);
    });

    it('should calculate frequency correctly', () => {
      const text = 'test test hello world test';
      expect(termFrequency('test', text)).toBeCloseTo(0.6, 2); // 3/5
      expect(termFrequency('hello', text)).toBeCloseTo(0.2, 2); // 1/5
      expect(termFrequency('world', text)).toBeCloseTo(0.2, 2); // 1/5
    });

    it('should be case insensitive', () => {
      const text = 'TEST test Test';
      expect(termFrequency('test', text)).toBe(1); // 3/3
    });
  });

  describe('inverseDocumentFrequency', () => {
    it('should return 0 when no documents contain term', () => {
      // When no docs contain the term, return 0 to avoid infinite IDF
      expect(inverseDocumentFrequency('xyz', ['hello world', 'foo bar'])).toBe(0);
    });

    it('should return 0 when all documents contain term', () => {
      // When all documents contain term, IDF = log(n/n) = log(1) = 0
      expect(inverseDocumentFrequency('test', ['test test', 'test'])).toBe(0);
    });

    it('should calculate IDF correctly', () => {
      const docs = ['hello world', 'foo bar', 'hello'];
      // "hello" appears in 2/3 docs → IDF = ln(3/2) ≈ 0.405
      expect(inverseDocumentFrequency('hello', docs)).toBeCloseTo(0.405, 2);
      // "xyz" appears in 0/3 docs → return 0 (special case)
      expect(inverseDocumentFrequency('xyz', docs)).toBe(0);
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should return 0 for empty query', () => {
      const score = calculateRelevanceScore('', sampleArticles[0]);
      expect(score).toBe(0);
    });

    it('should give highest score for title match', () => {
      const article = sampleArticles[0]; // title: "React Testing Guide"
      const titleScore = calculateRelevanceScore('react', article);
      const contentScore = calculateRelevanceScore('vitest', article);
      expect(titleScore).toBeGreaterThan(contentScore);
    });

    it('should give high score for tag match', () => {
      const article = sampleArticles[0];
      const tagScore = calculateRelevanceScore('testing', article);
      const randomScore = calculateRelevanceScore('xyz123', article);
      expect(tagScore).toBeGreaterThan(randomScore);
    });

    it('should accumulate scores for multiple query terms', () => {
      const article = sampleArticles[0];
      const singleTerm = calculateRelevanceScore('react', article);
      const multiTerm = calculateRelevanceScore('react testing', article);
      expect(multiTerm).toBeGreaterThan(singleTerm);
    });

    it('should be case insensitive', () => {
      const article = sampleArticles[0];
      expect(calculateRelevanceScore('REACT', article)).toBe(calculateRelevanceScore('react', article));
    });
  });

  describe('detectMatchType', () => {
    it('should return exact for exact title/tag match', () => {
      const article = sampleArticles[0];
      expect(detectMatchType('react', article)).toBe('exact');
      expect(detectMatchType('testing', article)).toBe('exact');
    });

    it('should return prefix for partial match', () => {
      const article = sampleArticles[0];
      expect(detectMatchType('re', article)).toBe('prefix');
      expect(detectMatchType('java', article)).toBe('prefix');
    });

    it('should return fuzzy for content-only match', () => {
      const article = sampleArticles[0];
      expect(detectMatchType('vitest', article)).toBe('fuzzy');
      expect(detectMatchType('components', article)).toBe('fuzzy');
    });
  });

  describe('filterByTags', () => {
    it('should return all articles when no tags specified', () => {
      expect(filterByTags(sampleArticles, []).length).toBe(3);
    });

    it('should filter by single tag', () => {
      const result = filterByTags(sampleArticles, ['react']);
      expect(result.length).toBe(2);
      expect(result.every(a => a.tags.includes('react'))).toBe(true);
    });

    it('should filter by multiple tags (OR logic)', () => {
      const result = filterByTags(sampleArticles, ['react', 'typescript']);
      expect(result.length).toBe(3); // all have either react or typescript
    });

    it('should be case insensitive', () => {
      const result = filterByTags(sampleArticles, ['REACT']);
      expect(result.length).toBe(2);
    });
  });

  describe('sortByScore', () => {
    it('should sort descending by score', () => {
      const results: SearchResult[] = [
        { id: '1', title: 'A', summary: '', tags: [], score: 5, matchType: 'exact' },
        { id: '2', title: 'B', summary: '', tags: [], score: 10, matchType: 'exact' },
        { id: '3', title: 'C', summary: '', tags: [], score: 3, matchType: 'exact' },
      ];
      const sorted = sortByScore(results);
      expect(sorted[0].score).toBe(10);
      expect(sorted[1].score).toBe(5);
      expect(sorted[2].score).toBe(3);
    });

    it('should not mutate original array', () => {
      const results: SearchResult[] = [
        { id: '1', title: 'A', summary: '', tags: [], score: 5, matchType: 'exact' as const },
      ];
      sortByScore(results);
      expect(results[0].score).toBe(5);
    });
  });

  describe('deduplicateById', () => {
    it('should remove duplicates by id', () => {
      const results: SearchResult[] = [
        { id: '1', title: 'A', summary: '', tags: [], score: 5, matchType: 'exact' as const },
        { id: '2', title: 'B', summary: '', tags: [], score: 10, matchType: 'exact' as const },
        { id: '1', title: 'A duplicate', summary: '', tags: [], score: 3, matchType: 'exact' as const },
      ];
      const deduped = deduplicateById(results);
      expect(deduped.length).toBe(2);
    });
  });

  describe('paginate', () => {
    it('should return correct page of results', () => {
      const results: SearchResult[] = Array.from({ length: 25 }, (_, i) => ({
        id: String(i + 1),
        title: `Article ${i + 1}`,
        summary: '',
        tags: [],
        score: 25 - i,
        matchType: 'exact' as const,
      }));

      const page1 = paginate(results, 1, 10);
      expect(page1.length).toBe(10);
      expect(page1[0].id).toBe('1');

      const page2 = paginate(results, 2, 10);
      expect(page2.length).toBe(10);
      expect(page2[0].id).toBe('11');

      const page3 = paginate(results, 3, 10);
      expect(page3.length).toBe(5);
      expect(page3[0].id).toBe('21');
    });

    it('should return empty for out of range page', () => {
      const results: SearchResult[] = [
        { id: '1', title: 'A', summary: '', tags: [], score: 1, matchType: 'exact' as const },
      ];
      expect(paginate(results, 10, 10).length).toBe(0);
    });
  });

  describe('highlightMatches', () => {
    it('should wrap matching terms in **', () => {
      // Original case preserved, only wrapped
      const result = highlightMatches('Hello World', ['hello']);
      expect(result).toBe('**Hello** World');
    });

    it('should be case insensitive for matching', () => {
      const result = highlightMatches('Hello World', ['HELLO']);
      expect(result).toBe('**Hello** World');
    });

    it('should handle multiple terms', () => {
      const result = highlightMatches('Hello World React', ['hello', 'react']);
      expect(result).toBe('**Hello** World **React**');
    });

    it('should not double-wrap already matched terms', () => {
      const result = highlightMatches('Hello Hello', ['hello']);
      expect(result).toBe('**Hello** **Hello**');
    });
  });

  describe('search pipeline integration', () => {
    it('should complete full search pipeline', () => {
      const query = 'react testing';
      const queryTerms = tokenize(query);

      // Score all articles
      const scored = sampleArticles.map(article => ({
        id: article.id,
        title: article.title,
        summary: article.summary,
        tags: article.tags,
        score: calculateRelevanceScore(query, article),
        matchType: detectMatchType(query, article),
      }));

      // Filter and sort
      const filtered = filterByTags(scored, []);
      const sorted = sortByScore(filtered);
      const deduped = deduplicateById(sorted);
      const page1 = paginate(deduped, 1, 10);

      // Top result should be article-1 (React Testing Guide)
      expect(page1[0].id).toBe('article-1');
      expect(page1[0].score).toBeGreaterThan(page1[1].score);
    });

    it('should handle tag filtering in pipeline', () => {
      const query = 'guide';
      const queryTerms = tokenize(query);

      const scored = sampleArticles.map(article => ({
        id: article.id,
        title: article.title,
        summary: article.summary,
        tags: article.tags,
        score: calculateRelevanceScore(query, article),
        matchType: detectMatchType(query, article),
      }));

      // Only react articles
      const filtered = filterByTags(scored, ['react']);
      const sorted = sortByScore(filtered);

      expect(filtered.length).toBe(2);
      expect(sorted.every(r => r.tags.includes('react'))).toBe(true);
    });
  });
});