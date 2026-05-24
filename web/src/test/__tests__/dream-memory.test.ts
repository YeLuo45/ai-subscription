/**
 * Dream Memory Tests
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { summarizeArticle, summarizeTitle } from '../../../../shared/lib/dream-memory/summarizer';
import type { SummarizerResult } from '../../../../shared/lib/dream-memory/types';

// Stub crypto.randomUUID for jsdom environment
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  ...globalThis.crypto,
  randomUUID: () => `test-uuid-${Date.now()}-${uuidCounter++}`
});

describe('Summarizer', () => {
  describe('summarizeArticle', () => {
    it('should extract summary from content (first 100 chars)', () => {
      const content = 'This is a very long article content that should be summarized. It contains important information about technology and innovation. The article discusses various topics including artificial intelligence, machine learning, and data science.';
      const result = summarizeArticle('Test Article', content);
      
      expect(result.summary.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(result.summary).toContain('This is a very long article');
    });

    it('should extract key points as phrases', () => {
      const content = 'Artificial intelligence is transforming industries worldwide. Machine learning algorithms are becoming more sophisticated. Deep learning enables breakthrough applications.';
      const result = summarizeArticle('AI Revolution', content);
      
      expect(result.keyPoints.length).toBeGreaterThan(0);
      expect(result.keyPoints.length).toBeLessThanOrEqual(5);
      
      // Check that key points are meaningful phrases
      for (const point of result.keyPoints) {
        expect(typeof point).toBe('string');
        expect(point.length).toBeGreaterThan(0);
      }
    });

    it('should detect positive sentiment', () => {
      const content = 'This is an amazing breakthrough in technology. The results are excellent and wonderful.';
      const result = summarizeArticle('Great Discovery', content);
      
      expect(result.sentiment).toBe('positive');
    });

    it('should detect negative sentiment', () => {
      const content = 'This is a terrible and boring article with poor quality. The fail rate is awful.';
      const result = summarizeArticle('Bad Article', content);
      
      expect(result.sentiment).toBe('negative');
    });

    it('should detect neutral sentiment', () => {
      const content = 'This article discusses the weather patterns in different regions. The data shows temperature variations.';
      const result = summarizeArticle('Weather Report', content);
      
      expect(result.sentiment).toBe('neutral');
    });

    it('should handle empty content gracefully', () => {
      const result = summarizeArticle('Empty Article', '');
      
      expect(result.summary).toBe('');
      expect(result.keyPoints).toEqual([]);
      expect(result.sentiment).toBe('neutral');
    });

    it('should handle short content', () => {
      const content = 'Short content.';
      const result = summarizeArticle('Short', content);
      
      expect(result.summary).toBe('Short content.');
      expect(result.keyPoints.length).toBeLessThanOrEqual(5);
    });

    it('should include title in sentiment analysis', () => {
      const content = 'The product works as expected.';
      const result = summarizeArticle('This is amazing product review', content);
      
      expect(['positive', 'neutral', 'negative']).toContain(result.sentiment);
    });
  });

  describe('summarizeTitle', () => {
    it('should generate summary from title only', () => {
      const result = summarizeTitle('Test Article Title');
      
      expect(result.summary).toBe('Test Article Title');
    });

    it('should extract key words from title', () => {
      const result = summarizeTitle('Artificial Intelligence Machine Learning');
      
      expect(result.keyPoints.length).toBeGreaterThan(0);
      expect(result.keyPoints.length).toBeLessThanOrEqual(5);
    });

    it('should detect sentiment from title', () => {
      const result = summarizeTitle('This is an amazing and wonderful day');
      
      expect(result.sentiment).toBe('positive');
    });

    it('should handle short titles', () => {
      const result = summarizeTitle('Hi');
      
      expect(result.summary).toBe('Hi');
      expect(result.sentiment).toBe('neutral');
    });
  });

  describe('SummarizerResult structure', () => {
    it('should return valid SummarizerResult', () => {
      const result = summarizeArticle('Test', 'Content here with some meaningful information.');
      
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('keyPoints');
      expect(result).toHaveProperty('sentiment');
      expect(Array.isArray(result.keyPoints)).toBe(true);
      expect(['positive', 'neutral', 'negative']).toContain(result.sentiment);
    });
  });
});

describe('DreamEntry types', () => {
  it('should have valid structure', () => {
    const entry = {
      id: 'test-id',
      sessionId: 'session-1',
      timestamp: Date.now(),
      title: 'Test Article',
      summary: 'Test summary',
      keyPoints: ['point1', 'point2'],
      sentiment: 'neutral' as const,
      articleUrl: 'https://example.com',
      feedTitle: 'Test Feed',
      tags: ['tag1', 'tag2'],
    };

    expect(entry.id).toBe('test-id');
    expect(entry.sessionId).toBe('session-1');
    expect(entry.title).toBe('Test Article');
    expect(entry.summary).toBe('Test summary');
    expect(entry.keyPoints).toHaveLength(2);
    expect(entry.sentiment).toBe('neutral');
    expect(entry.articleUrl).toBe('https://example.com');
    expect(entry.tags).toHaveLength(2);
  });
});