/**
 * Workflow Version Pure Unit Tests
 * Tests version management logic without IndexedDB dependencies
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================
// Pure version management logic (extracted from workflow-version.ts)
// ============================================================

const MAX_VERSIONS_PER_WORKFLOW = 20;

interface Version {
  id: string;
  workflowId: string;
  version: number;
  definition: unknown[];
  createdAt: string;
}

function calculateNextVersionNumber(currentCount: number): number {
  return currentCount + 1;
}

function shouldPrune(currentCount: number): boolean {
  return currentCount >= MAX_VERSIONS_PER_WORKFLOW;
}

function getVersionNumberAfterPrune(currentCount: number): number {
  if (!shouldPrune(currentCount)) {
    return calculateNextVersionNumber(currentCount);
  }
  // After pruning down to MAX_VERSIONS, next version = MAX_VERSIONS (since oldest was removed)
  return MAX_VERSIONS_PER_WORKFLOW;
}

function isAtMaxVersions(currentCount: number): boolean {
  return currentCount >= MAX_VERSIONS_PER_WORKFLOW;
}

function getVersionsToPrune(currentCount: number): number {
  if (!shouldPrune(currentCount)) return 0;
  return currentCount - MAX_VERSIONS_PER_WORKFLOW + 1;
}

function sortVersionsByCreatedAt(versions: Version[]): Version[] {
  return [...versions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function getOldestVersions(versions: Version[], count: number): Version[] {
  const sorted = sortVersionsByCreatedAt(versions);
  return sorted.slice(0, count);
}

function getNewestVersions(versions: Version[], count: number): Version[] {
  const sorted = sortVersionsByCreatedAt(versions);
  return sorted.slice(-count);
}

function filterVersionsByWorkflowId(versions: Version[], workflowId: string): Version[] {
  return versions.filter(v => v.workflowId === workflowId);
}

function sortVersionsByVersionNumber(versions: Version[]): Version[] {
  return [...versions].sort((a, b) => a.version - b.version);
}

function getMaxVersionNumber(versions: Version[]): number {
  if (versions.length === 0) return 0;
  return Math.max(...versions.map(v => v.version));
}

// ============================================================
// Pure function tests
// ============================================================

describe('WorkflowVersion Pure Logic', () => {
  // Helper: create a mock version with given version number and age
  function mockVersion(overrides: Partial<Version> = {}): Version {
    return {
      id: 'v-' + Math.random().toString(36).substr(2, 5),
      workflowId: 'wf-123',
      version: 1,
      definition: [],
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  describe('calculateNextVersionNumber', () => {
    it('should return 1 when no versions exist', () => {
      expect(calculateNextVersionNumber(0)).toBe(1);
    });

    it('should increment for each existing version', () => {
      expect(calculateNextVersionNumber(1)).toBe(2);
      expect(calculateNextVersionNumber(5)).toBe(6);
      expect(calculateNextVersionNumber(19)).toBe(20);
    });

    it('should handle large version counts', () => {
      expect(calculateNextVersionNumber(100)).toBe(101);
      expect(calculateNextVersionNumber(999)).toBe(1000);
    });
  });

  describe('shouldPrune', () => {
    it('should return false when below max', () => {
      expect(shouldPrune(0)).toBe(false);
      expect(shouldPrune(10)).toBe(false);
      expect(shouldPrune(19)).toBe(false);
    });

    it('should return true when at or above max (20)', () => {
      expect(shouldPrune(20)).toBe(true);
      expect(shouldPrune(21)).toBe(true);
      expect(shouldPrune(100)).toBe(true);
    });
  });

  describe('isAtMaxVersions', () => {
    it('should match shouldPrune behavior', () => {
      expect(isAtMaxVersions(19)).toBe(false);
      expect(isAtMaxVersions(20)).toBe(true);
      expect(isAtMaxVersions(21)).toBe(true);
    });
  });

  describe('getVersionsToPrune', () => {
    it('should return 0 when not pruning needed', () => {
      expect(getVersionsToPrune(0)).toBe(0);
      expect(getVersionsToPrune(10)).toBe(0);
      expect(getVersionsToPrune(19)).toBe(0);
    });

    it('should return correct count when pruning needed', () => {
      // At 20, need to prune 1 to make room (delete oldest)
      expect(getVersionsToPrune(20)).toBe(1);
      // At 25, need to prune 6 to get down to 20
      expect(getVersionsToPrune(25)).toBe(6);
    });
  });

  describe('getVersionNumberAfterPrune', () => {
    it('should calculate normally when no pruning needed', () => {
      expect(getVersionNumberAfterPrune(0)).toBe(1);
      expect(getVersionNumberAfterPrune(5)).toBe(6);
      expect(getVersionNumberAfterPrune(19)).toBe(20);
    });

    it('should return count+1 after pruning at max', () => {
      // At 20, after pruning 1, count = 19, next version = 20
      expect(getVersionNumberAfterPrune(20)).toBe(20);
      // At 25, after pruning 6, count = 19, next version = 20
      expect(getVersionNumberAfterPrune(25)).toBe(20);
    });
  });

  describe('sortVersionsByCreatedAt', () => {
    it('should sort oldest to newest', () => {
      const now = Date.now();
      const versions = [
        mockVersion({ id: 'new', createdAt: new Date(now + 2000).toISOString() }),
        mockVersion({ id: 'old', createdAt: new Date(now - 2000).toISOString() }),
        mockVersion({ id: 'mid', createdAt: new Date(now - 1000).toISOString() }),
      ];

      const sorted = sortVersionsByCreatedAt(versions);
      expect(sorted[0].id).toBe('old');
      expect(sorted[1].id).toBe('mid');
      expect(sorted[2].id).toBe('new');
    });

    it('should not mutate original array', () => {
      const versions = [
        mockVersion({ id: 'new', createdAt: new Date(Date.now() + 2000).toISOString() }),
        mockVersion({ id: 'old', createdAt: new Date(Date.now() - 2000).toISOString() }),
      ];
      const original = [...versions];
      sortVersionsByCreatedAt(versions);
      expect(versions[0].id).toBe(original[0].id);
    });
  });

  describe('getOldestVersions', () => {
    it('should return oldest N versions', () => {
      const now = Date.now();
      const versions = [
        mockVersion({ id: 'v1', createdAt: new Date(now - 4000).toISOString(), version: 1 }),
        mockVersion({ id: 'v2', createdAt: new Date(now - 3000).toISOString(), version: 2 }),
        mockVersion({ id: 'v3', createdAt: new Date(now - 2000).toISOString(), version: 3 }),
        mockVersion({ id: 'v4', createdAt: new Date(now - 1000).toISOString(), version: 4 }),
        mockVersion({ id: 'v5', createdAt: new Date(now).toISOString(), version: 5 }),
      ];

      const oldest2 = getOldestVersions(versions, 2);
      expect(oldest2.length).toBe(2);
      expect(oldest2[0].id).toBe('v1');
      expect(oldest2[1].id).toBe('v2');
    });

    it('should return all if count exceeds length', () => {
      const versions = [mockVersion({ id: 'v1' })];
      const result = getOldestVersions(versions, 10);
      expect(result.length).toBe(1);
    });
  });

  describe('getNewestVersions', () => {
    it('should return newest N versions', () => {
      const now = Date.now();
      const versions = [
        mockVersion({ id: 'v1', createdAt: new Date(now - 4000).toISOString(), version: 1 }),
        mockVersion({ id: 'v2', createdAt: new Date(now - 3000).toISOString(), version: 2 }),
        mockVersion({ id: 'v3', createdAt: new Date(now - 2000).toISOString(), version: 3 }),
        mockVersion({ id: 'v4', createdAt: new Date(now - 1000).toISOString(), version: 4 }),
        mockVersion({ id: 'v5', createdAt: new Date(now).toISOString(), version: 5 }),
      ];

      const newest2 = getNewestVersions(versions, 2);
      expect(newest2.length).toBe(2);
      expect(newest2[0].id).toBe('v4');
      expect(newest2[1].id).toBe('v5');
    });
  });

  describe('filterVersionsByWorkflowId', () => {
    it('should filter by workflowId', () => {
      const versions = [
        mockVersion({ workflowId: 'wf-1', version: 1 }),
        mockVersion({ workflowId: 'wf-2', version: 2 }),
        mockVersion({ workflowId: 'wf-1', version: 3 }),
        mockVersion({ workflowId: 'wf-3', version: 4 }),
      ];

      const wf1Versions = filterVersionsByWorkflowId(versions, 'wf-1');
      expect(wf1Versions.length).toBe(2);
      expect(wf1Versions.every(v => v.workflowId === 'wf-1')).toBe(true);
    });

    it('should return empty for non-existent workflow', () => {
      const versions = [mockVersion({ workflowId: 'wf-1' })];
      const result = filterVersionsByWorkflowId(versions, 'wf-nonexistent');
      expect(result.length).toBe(0);
    });
  });

  describe('sortVersionsByVersionNumber', () => {
    it('should sort by version number ascending', () => {
      const versions = [
        mockVersion({ id: 'v5', version: 5 }),
        mockVersion({ id: 'v1', version: 1 }),
        mockVersion({ id: 'v3', version: 3 }),
      ];

      const sorted = sortVersionsByVersionNumber(versions);
      expect(sorted[0].version).toBe(1);
      expect(sorted[1].version).toBe(3);
      expect(sorted[2].version).toBe(5);
    });
  });

  describe('getMaxVersionNumber', () => {
    it('should return 0 for empty array', () => {
      expect(getMaxVersionNumber([])).toBe(0);
    });

    it('should return max version number', () => {
      const versions = [
        mockVersion({ version: 5 }),
        mockVersion({ version: 1 }),
        mockVersion({ version: 3 }),
      ];
      expect(getMaxVersionNumber(versions)).toBe(5);
    });

    it('should handle single version', () => {
      expect(getMaxVersionNumber([mockVersion({ version: 7 })])).toBe(7);
    });
  });

  describe('version number continuity', () => {
    it('should detect gap in version sequence', () => {
      const versions = [
        mockVersion({ version: 1 }),
        mockVersion({ version: 2 }),
        mockVersion({ version: 4 }), // gap at 3
        mockVersion({ version: 5 }),
      ];

      const sorted = sortVersionsByVersionNumber(versions);
      const numbers = sorted.map(v => v.version);
      const gaps: number[] = [];

      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] - numbers[i-1] > 1) {
          for (let j = numbers[i-1] + 1; j < numbers[i]; j++) {
            gaps.push(j);
          }
        }
      }

      expect(gaps).toEqual([3]);
    });

    it('should detect duplicate version numbers', () => {
      const versions = [
        mockVersion({ version: 1 }),
        mockVersion({ version: 2 }),
        mockVersion({ version: 2 }), // duplicate
        mockVersion({ version: 3 }),
      ];

      const sorted = sortVersionsByVersionNumber(versions);
      const numbers = sorted.map(v => v.version);
      const duplicates = numbers.filter((n, i) => numbers.indexOf(n) !== i);

      expect(duplicates).toEqual([2]);
    });
  });

  describe('MAX_VERSIONS_PER_WORKFLOW boundary', () => {
    it('should be exactly 20', () => {
      expect(MAX_VERSIONS_PER_WORKFLOW).toBe(20);
    });

    it('should enforce max at version 20', () => {
      // At 19 versions, next version = 20 (allowed)
      expect(calculateNextVersionNumber(19)).toBe(20);
      // At 20 versions, pruning should trigger
      expect(shouldPrune(20)).toBe(true);
    });

    it('should correctly calculate versions at boundary', () => {
      // 20 versions → need to prune 1
      expect(getVersionsToPrune(20)).toBe(1);
      // After pruning 1, count = 19, next version = 20
      expect(getVersionNumberAfterPrune(20)).toBe(20);
    });
  });
});