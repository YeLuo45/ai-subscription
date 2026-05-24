/**
 * pushStrategyTool Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { pushStrategyTool } from './push-strategy';

describe('pushStrategyTool', () => {
  it('should require articleTitle', async () => {
    await expect(pushStrategyTool({})).rejects.toThrow('articleTitle is required');
  });

  it('should return valid action types', async () => {
    const result = await pushStrategyTool({ articleTitle: 'Test Article' });
    expect(result).toHaveProperty('action');
    expect(['push_now', 'aggregate', 'archive', 'review']).toContain(result.action);
  });

  it('should return confidence score', async () => {
    const result = await pushStrategyTool({ articleTitle: 'Breaking News' });
    expect(result).toHaveProperty('confidence');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('should return reason string', async () => {
    const result = await pushStrategyTool({ articleTitle: 'Important Update' });
    expect(result).toHaveProperty('reason');
    expect(typeof result.reason).toBe('string');
  });
});
