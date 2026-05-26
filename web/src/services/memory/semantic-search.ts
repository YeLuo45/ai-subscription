/**
 * L3 Semantic Search - Cross-Session Content Discovery
 * Provides lightweight semantic search without vector embeddings
 * Uses keyword matching + interest vector weighting for relevance scoring
 */

import type { UserInterestVector } from './types';
import { getInterestVector } from './semantic-memory';

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  feedId: string;
  tags: string[];
  author: string;
  summary?: string;
  publishedAt?: number;
  relevanceScore: number;
  matchDetails: {
    tagMatches: number;
    authorMatch: boolean;
    interestBoost: number;
  };
}

export interface SearchOptions {
  query: string;
  feedId?: string;
  tags?: string[];
  limit?: number;
  minScore?: number;
}

/**
 * Tokenize text into searchable terms
 */
function tokenize(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 2);
  return new Set(normalized);
}

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

/**
 * Calculate keyword match score
 */
function keywordScore(queryTokens: Set<string>, contentTokens: Set<string>): number {
  if (queryTokens.size === 0) return 0;
  const matches = [...queryTokens].filter(t => contentTokens.has(t)).length;
  return matches / queryTokens.size;
}

/**
 * Search content by query with interest vector weighting
 */
export async function semanticSearch(
  content: Array<{
    id: string;
    title: string;
    url: string;
    feedId: string;
    tags?: string[];
    author?: string;
    summary?: string;
    content?: string;
    publishedAt?: number;
  }>,
  options: SearchOptions
): Promise<SearchResult[]> {
  const { query, feedId, tags, limit = 20, minScore = 0.1 } = options;
  
  // Get user's interest vector for boosting
  const interestVector = await getInterestVector();
  
  // Tokenize query
  const queryTokens = tokenize(query);
  const queryLower = query.toLowerCase();
  
  const results: SearchResult[] = [];
  
  for (const item of content) {
    // Filter by feedId if specified
    if (feedId && item.feedId !== feedId) continue;
    
    // Filter by tags if specified
    if (tags && tags.length > 0) {
      const itemTags = new Set((item.tags || []).map(t => t.toLowerCase()));
      const hasMatchingTag = tags.some(t => itemTags.has(t.toLowerCase()));
      if (!hasMatchingTag) continue;
    }
    
    // Tokenize content fields
    const titleTokens = tokenize(item.title);
    const contentTokens = tokenize(item.content || item.summary || '');
    const tagTokens = new Set((item.tags || []).map(t => t.toLowerCase()));
    const authorTokens = tokenize(item.author || '');
    
    // Calculate base scores
    const titleScore = keywordScore(queryTokens, titleTokens) * 0.4;
    const contentScore = keywordScore(queryTokens, contentTokens) * 0.3;
    const tagScore = keywordScore(queryTokens, tagTokens) * 0.2;
    const authorScore = keywordScore(queryTokens, authorTokens) * 0.1;
    
    // Jaccard similarity for phrase matching
    const titleJaccard = jaccardSimilarity(queryTokens, titleTokens) * 0.3;
    const contentJaccard = jaccardSimilarity(queryTokens, contentTokens) * 0.2;
    
    // Base relevance score
    const baseScore = titleScore + contentScore + tagScore + authorScore + titleJaccard + contentJaccard;
    
    // Interest vector boost
    const interestBoost = calculateInterestBoost(item, interestVector);
    
    // Combined score with interest boost
    const relevanceScore = baseScore * (1 + interestBoost * 0.3);
    
    // Count tag matches
    const tagMatches = [...queryTokens].filter(t => tagTokens.has(t)).length;
    const authorMatch = authorTokens.size > 0 && [...queryTokens].some(t => authorTokens.has(t));
    
    if (relevanceScore >= minScore) {
      results.push({
        id: item.id,
        title: item.title,
        url: item.url,
        feedId: item.feedId,
        tags: item.tags || [],
        author: item.author || '',
        summary: item.summary,
        publishedAt: item.publishedAt,
        relevanceScore: Math.min(1, relevanceScore),
        matchDetails: {
          tagMatches,
          authorMatch,
          interestBoost,
        },
      });
    }
  }
  
  // Sort by relevance score descending
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  return results.slice(0, limit);
}

/**
 * Calculate interest-based boost from user's interest vector
 */
function calculateInterestBoost(
  item: { tags?: string[]; author?: string; feedId?: string },
  vector: UserInterestVector
): number {
  let boost = 0;
  let count = 0;
  
  // Tag interest
  if (item.tags) {
    for (const tag of item.tags) {
      if (vector.tagWeights[tag]) {
        boost += vector.tagWeights[tag];
        count++;
      }
    }
  }
  
  // Author affinity
  if (item.author && vector.authorAffinity[item.author]) {
    boost += vector.authorAffinity[item.author];
    count++;
  }
  
  // Source/feed weight
  if (item.feedId && vector.sourceWeights[item.feedId]) {
    boost += vector.sourceWeights[item.feedId];
    count++;
  }
  
  return count > 0 ? boost / count : 0;
}

/**
 * Get search suggestions based on query prefix
 */
export async function getSearchSuggestions(
  indexedContent: Array<{
    id: string;
    title: string;
    tags: string[];
  }>,
  prefix: string,
  limit: number = 5
): Promise<string[]> {
  if (prefix.length < 2) return [];
  
  const prefixLower = prefix.toLowerCase();
  const suggestions = new Set<string>();
  
  for (const item of indexedContent) {
    // Match title words
    const words = item.title.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.startsWith(prefixLower) && word.length > prefix.length) {
        suggestions.add(word);
      }
    }
    
    // Match tags
    for (const tag of item.tags) {
      if (tag.toLowerCase().startsWith(prefixLower) && tag.length > prefix.length) {
        suggestions.add(tag);
      }
    }
    
    if (suggestions.size >= limit) break;
  }
  
  return Array.from(suggestions).slice(0, limit);
}

/**
 * Build a search index from content for faster lookups
 */
export function buildSearchIndex(
  content: Array<{
    id: string;
    title: string;
    tags: string[];
    author?: string;
    summary?: string;
  }>
): Map<string, {
  id: string;
  titleTokens: Set<string>;
  tagTokens: Set<string>;
  authorTokens: Set<string>;
  contentTokens: Set<string>;
}> {
  const index = new Map();
  
  for (const item of content) {
    index.set(item.id, {
      id: item.id,
      titleTokens: tokenize(item.title),
      tagTokens: new Set(item.tags.map(t => t.toLowerCase())),
      authorTokens: tokenize(item.author || ''),
      contentTokens: tokenize(item.summary || ''),
    });
  }
  
  return index;
}
