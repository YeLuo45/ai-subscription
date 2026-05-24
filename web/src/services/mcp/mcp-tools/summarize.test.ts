/**
 * summarizeTool Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { summarizeTool } from './summarize';

describe('summarizeTool', () => {
  it('should require either articleUrl or articleContent', async () => {
    await expect(summarizeTool({})).rejects.toThrow('Either articleUrl or articleContent is required');
  });

  it('should accept articleContent input', async () => {
    // This will fail at LLM call level but should not throw "required" error
    const result = summarizeTool({ articleContent: 'This is a test article about technology.' });
    await expect(result).resolves.toBeDefined();
  });

  it('should accept articleUrl input', async () => {
    const result = summarizeTool({ articleUrl: 'https://example.com/article' });
    await expect(result).resolves.toBeDefined();
  });

  it('should return expected output structure', async () => {
    const result = await summarizeTool({ articleContent: 'Test content for summarization.' });
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('keyPoints');
    expect(result).toHaveProperty('sentiment');
    expect(result).toHaveProperty('summary');
    expect(['positive', 'neutral', 'negative']).toContain(result.sentiment);
  });
});
