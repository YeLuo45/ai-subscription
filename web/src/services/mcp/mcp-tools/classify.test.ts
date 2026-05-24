/**
 * classifyTool Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { classifyTool } from './classify';

describe('classifyTool', () => {
  it('should require either feedUrl or feedTitle', async () => {
    await expect(classifyTool({})).rejects.toThrow('Either feedUrl or feedTitle is required');
  });

  it('should classify technology feeds', async () => {
    const result = await classifyTool({ feedUrl: 'https://tech.example.com/feed', feedTitle: 'Technology News' });
    expect(result.category).toBe('technology');
    expect(Array.isArray(result.subcategories)).toBe(true);
  });

  it('should classify business feeds', async () => {
    const result = await classifyTool({ feedUrl: 'https://finance.example.com/rss', feedTitle: 'Business Weekly' });
    expect(result.category).toBe('business');
  });

  it('should return default category for unknown feeds', async () => {
    const result = await classifyTool({ feedUrl: 'https://unknown.example.com/feed' });
    expect(result).toHaveProperty('category');
    expect(['technology', 'business', 'science', 'health', 'entertainment', 'sports', 'education', 'politics', 'food', 'travel', 'general']).toContain(result.category);
  });
});
