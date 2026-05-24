/**
 * tagsTool Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { tagsTool } from './tags';

describe('tagsTool', () => {
  it('should require articleContent', async () => {
    await expect(tagsTool({})).rejects.toThrow('articleContent is required');
  });

  it('should generate tags from content', async () => {
    const result = await tagsTool({ articleContent: 'Machine learning and artificial intelligence are transforming technology.' });
    expect(result).toHaveProperty('tags');
    expect(result).toHaveProperty('confidence');
    expect(Array.isArray(result.tags)).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should filter out existing tags', async () => {
    const result = await tagsTool({
      articleContent: 'Python programming and JavaScript development',
      existingTags: ['programming'],
    });
    expect(result.tags).not.toContain('programming');
  });

  it('should return default tag when no keywords found', async () => {
    const result = await tagsTool({ articleContent: 'the a an is are was' });
    expect(result.tags).toContain('general');
  });
});
