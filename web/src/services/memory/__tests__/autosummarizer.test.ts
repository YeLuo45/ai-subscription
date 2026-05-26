/**
 * Auto-Summarizer Tests
 * Tests for L4 Procedural Memory Automation
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock procedural-memory module
const mockProceduralItems = [
  {
    id: 'proc_1',
    action: 'subscribe',
    frequency: 5,
    lastUsed: Date.now() - 60000,
    context: { feedName: 'AI News' },
    workflow: ['search', 'view', 'subscribe'],
  },
  {
    id: 'proc_2',
    action: 'subscribe',
    frequency: 3,
    lastUsed: Date.now() - 120000,
    context: { feedName: 'Tech Daily' },
    workflow: ['search', 'view', 'subscribe'],
  },
  {
    id: 'proc_3',
    action: 'mark-read',
    frequency: 10,
    lastUsed: Date.now() - 30000,
    context: { feedName: 'AI News' },
    workflow: [],
  },
];

vi.mock('../procedural-memory', () => ({
  getProceduralActions: vi.fn((action?: string) => {
    if (action) {
      return Promise.resolve(mockProceduralItems.filter(p => p.action === action));
    }
    return Promise.resolve(mockProceduralItems);
  }),
  getActionStats: vi.fn(() => Promise.resolve({
    totalActions: 18,
    uniqueActions: 2,
    mostFrequent: [
      { action: 'subscribe', frequency: 8 },
      { action: 'mark-read', frequency: 10 },
    ],
    recentActions: ['subscribe', 'mark-read'],
  })),
}));

import {
  autoSummarize,
  getAutomationOpportunities,
  pruneOldProceduralMemories,
  type AutoSummarizeOptions,
} from '../autosummarizer';

describe('Auto-Summarizer', () => {
  describe('autoSummarize', () => {
    it('should summarize high-frequency actions', async () => {
      const results = await autoSummarize({ frequencyThreshold: 3 });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should include action type in result', async () => {
      const results = await autoSummarize({ frequencyThreshold: 3 });
      const subscribeItems = results.filter(r => r.action === 'subscribe');
      expect(subscribeItems.length).toBeGreaterThan(0);
    });

    it('should calculate correct frequency', async () => {
      const results = await autoSummarize({ frequencyThreshold: 3 });
      const subscribeResult = results.find(r => r.action === 'subscribe');
      expect(subscribeResult?.frequency).toBe(8); // 5 + 3
    });

    it('should respect frequencyThreshold option', async () => {
      const results = await autoSummarize({ frequencyThreshold: 10 });
      const markReadResults = results.filter(r => r.action === 'mark-read');
      expect(markReadResults.length).toBe(1);
    });

    it('should respect maxSuggestions option', async () => {
      const results = await autoSummarize({ frequencyThreshold: 1, maxSuggestions: 1 });
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should include summary text', async () => {
      const results = await autoSummarize({ frequencyThreshold: 3 });
      expect(results[0].summary).toBeDefined();
      expect(results[0].summary.length).toBeGreaterThan(0);
    });

    it('should include lastUsed timestamp', async () => {
      const results = await autoSummarize({ frequencyThreshold: 3 });
      expect(typeof results[0].lastUsed).toBe('number');
    });

    it('should suggest workflow for pattern-matched actions', async () => {
      const results = await autoSummarize({ frequencyThreshold: 3 });
      const subscribeResult = results.find(r => r.action === 'subscribe');
      expect(subscribeResult?.suggestedWorkflow).toBeDefined();
    });

    it('should include automation hint for multi-step workflows', async () => {
      const results = await autoSummarize({ frequencyThreshold: 3 });
      const subscribeResult = results.find(r => r.action === 'subscribe');
      if (subscribeResult?.suggestedWorkflow && subscribeResult.suggestedWorkflow.length > 2) {
        expect(subscribeResult.automationHint).toBeDefined();
      }
    });
  });

  describe('getAutomationOpportunities', () => {
    it('should return automation opportunities', async () => {
      const opportunities = await getAutomationOpportunities();
      expect(opportunities.highFrequency).toBeDefined();
      expect(opportunities.totalActions).toBe(18);
      expect(opportunities.uniqueActions).toBe(2);
    });

    it('should identify workflow candidates', async () => {
      const opportunities = await getAutomationOpportunities();
      expect(Array.isArray(opportunities.workflowCandidates)).toBe(true);
    });

    it('should include high-frequency actions', async () => {
      const opportunities = await getAutomationOpportunities();
      expect(opportunities.highFrequency.length).toBeGreaterThan(0);
    });
  });

  describe('pruneOldProceduralMemories', () => {
    it('should return pruned count (even if 0)', async () => {
      const pruned = await pruneOldProceduralMemories();
      expect(typeof pruned).toBe('number');
    });

    it('should respect maxAge parameter', async () => {
      const pruned = await pruneOldProceduralMemories(7 * 24 * 60 * 60 * 1000);
      expect(typeof pruned).toBe('number');
    });
  });
});

describe('Workflow pattern detection', () => {
  it('should detect subscribe workflow pattern', async () => {
    const results = await autoSummarize({ frequencyThreshold: 3 });
    const subscribeResult = results.find(r => r.action === 'subscribe');
    if (subscribeResult?.suggestedWorkflow) {
      expect(subscribeResult.suggestedWorkflow).toContain('subscribe');
    }
  });
});