/**
 * costTool Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { costTool } from './cost';

describe('costTool', () => {
  it('should return cost estimation with defaults', async () => {
    const result = await costTool({});
    expect(result).toHaveProperty('estimatedCost');
    expect(result).toHaveProperty('currency', 'USD');
    expect(result).toHaveProperty('modelName', 'gemini-2.0-flash');
    expect(result.estimatedCost).toBeGreaterThan(0);
  });

  it('should calculate cost for GPT-4o', async () => {
    const result = await costTool({ modelName: 'gpt-4o', inputTokens: 1000, outputTokens: 500 });
    expect(result.modelName).toBe('gpt-4o');
    expect(result.estimatedCost).toBeGreaterThan(0);
    // GPT-4o: 1000/1K * 0.005 + 500/1K * 0.015 = 0.005 + 0.0075 = 0.0125
    expect(result.estimatedCost).toBeCloseTo(0.0125, 4);
  });

  it('should calculate cost for Gemini Flash', async () => {
    const result = await costTool({ modelName: 'gemini-2.0-flash', inputTokens: 1000, outputTokens: 500 });
    expect(result.modelName).toBe('gemini-2.0-flash');
    // gemini-2.0-flash: 1000/1K * 0.0001 + 500/1K * 0.0004 = 0.0001 + 0.0002 = 0.0003
    expect(result.estimatedCost).toBeCloseTo(0.0003, 4);
  });

  it('should handle zero tokens', async () => {
    const result = await costTool({ inputTokens: 0, outputTokens: 0 });
    expect(result.estimatedCost).toBeLessThan(0.001); // essentially zero
  });
});
