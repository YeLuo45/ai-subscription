/**
 * translateTool Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { translateTool } from './translate';

describe('translateTool', () => {
  it('should require text', async () => {
    await expect(translateTool({ targetLang: 'en' })).rejects.toThrow('text is required');
  });

  it('should require targetLang', async () => {
    await expect(translateTool({ text: 'Hello' })).rejects.toThrow('targetLang is required');
  });

  it('should reject unsupported languages', async () => {
    await expect(translateTool({ text: 'Hello', targetLang: 'xyz' })).rejects.toThrow('Unsupported target language: xyz');
  });

  it('should accept supported languages', async () => {
    const result = translateTool({ text: 'Hello', targetLang: 'zh' });
    await expect(result).resolves.toBeDefined();
  });
});
