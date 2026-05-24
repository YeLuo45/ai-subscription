/**
 * Conflict Resolver Tests
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectConflict,
  canAutoMerge,
  compareVectorClocks,
  autoMerge,
  manualMerge,
  keepLocal,
  keepRemote,
  getMergeStrategies
} from '../../../../shared/lib/conflict-resolver';
import type { VersionEntry, VectorClock } from '../../../../shared/lib/conflict-resolver/types';

// Stub crypto.randomUUID for jsdom environment
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  ...globalThis.crypto,
  randomUUID: () => `test-uuid-${Date.now()}-${uuidCounter++}`
});

describe('Conflict Resolver', () => {
  const createMockVersion = (overrides: Partial<VersionEntry> = {}): VersionEntry => ({
    id: 'mock-id-' + Math.random().toString(36).substr(2, 9),
    entityId: 'entity1',
    timestamp: Date.now(),
    user: 'user1',
    changes: { title: 'Test' },
    parent: null,
    vectorClock: { device1: 1 },
    ...overrides
  });

  describe('compareVectorClocks', () => {
    it('should return -1 when a happened before b', () => {
      const a: VectorClock = { device1: 1 };
      const b: VectorClock = { device1: 2 };
      expect(compareVectorClocks(a, b)).toBe(-1);
    });

    it('should return 1 when a happened after b', () => {
      const a: VectorClock = { device1: 2 };
      const b: VectorClock = { device1: 1 };
      expect(compareVectorClocks(a, b)).toBe(1);
    });

    it('should return 2 for concurrent conflicting clocks', () => {
      const a: VectorClock = { device1: 2, device2: 1 };
      const b: VectorClock = { device1: 1, device2: 2 };
      expect(compareVectorClocks(a, b)).toBe(2);
    });

    it('should return 0 for same clock', () => {
      const a: VectorClock = { device1: 1, device2: 2 };
      const b: VectorClock = { device1: 1, device2: 2 };
      expect(compareVectorClocks(a, b)).toBe(0);
    });

    it('should return 0 for concurrent non-conflicting clocks', () => {
      const a: VectorClock = { device1: 2, device2: 1 };
      const b: VectorClock = { device1: 2, device2: 1 };
      expect(compareVectorClocks(a, b)).toBe(0);
    });
  });

  describe('detectConflict', () => {
    it('should detect conflict when concurrent modifications occur', () => {
      // True concurrent conflict: both clocks have some device higher and some lower
      const local: VersionEntry = {
        id: 'v1',
        entityId: 'entity1',
        timestamp: 1000,
        user: 'user1',
        changes: { title: 'Local Title' },
        parent: null,
        vectorClock: { device1: 2, device2: 1 }
      };

      const remote: VersionEntry = {
        id: 'v2',
        entityId: 'entity1',
        timestamp: 1001,
        user: 'user2',
        changes: { title: 'Remote Title' },
        parent: null,
        vectorClock: { device1: 1, device2: 2 }
      };

      const result = detectConflict(local, remote);
      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toBeDefined();
    });

    it('should not detect conflict when versions are sequential', () => {
      const local: VersionEntry = createMockVersion({ vectorClock: { device1: 2 } });
      const remote: VersionEntry = createMockVersion({ vectorClock: { device1: 1 } });

      const result = detectConflict(local, remote);
      expect(result.hasConflict).toBe(false);
      expect(result.conflicts).toBeUndefined();
    });

    it('should return conflicts object when conflict detected', () => {
      const local: VersionEntry = createMockVersion({
        id: 'v1',
        vectorClock: { device1: 2, device2: 1 }
      });
      const remote: VersionEntry = createMockVersion({
        id: 'v2',
        vectorClock: { device1: 1, device2: 2 }
      });

      const result = detectConflict(local, remote);
      expect(result.hasConflict).toBe(true);
      // Conflicts is merged clock: { ...local, ...remote } = { device1: 2, device2: 2 }
      expect(result.conflicts).toEqual({ device1: 2, device2: 2 });
    });
  });

  describe('canAutoMerge', () => {
    it('should return true for sequential versions', () => {
      const local: VersionEntry = createMockVersion({ vectorClock: { device1: 2 } });
      const remote: VersionEntry = createMockVersion({ vectorClock: { device1: 1 } });

      expect(canAutoMerge(local, remote)).toBe(true);
    });

    it('should return false for concurrent conflicting versions', () => {
      const local: VersionEntry = createMockVersion({
        vectorClock: { device1: 1, device2: 2 }
      });
      const remote: VersionEntry = createMockVersion({
        vectorClock: { device1: 2, device2: 1 }
      });

      expect(canAutoMerge(local, remote)).toBe(false);
    });
  });

  describe('autoMerge', () => {
    it('should successfully auto-merge when no overlapping changes', () => {
      const local: VersionEntry = createMockVersion({
        id: 'v1',
        changes: { title: 'Local Title' },
        vectorClock: { device1: 2 }
      });

      const remote: VersionEntry = createMockVersion({
        id: 'v2',
        changes: { description: 'Remote Description' },
        vectorClock: { device1: 1 }
      });

      const result = autoMerge(local, remote);
      expect(result.success).toBe(true);
      expect(result.mergedVersion).not.toBeNull();
      expect(result.strategy).toBe('auto-merge');
      expect(result.mergedVersion?.changes).toHaveProperty('title');
      expect(result.mergedVersion?.changes).toHaveProperty('description');
    });

    it('should fail to auto-merge when overlapping changes to same field', () => {
      const local: VersionEntry = createMockVersion({
        id: 'v1',
        changes: { title: 'Local Title' },
        vectorClock: { device1: 1, device2: 1 }
      });

      const remote: VersionEntry = createMockVersion({
        id: 'v2',
        changes: { title: 'Remote Title' },
        vectorClock: { device1: 1, device2: 2 }
      });

      const result = autoMerge(local, remote);
      expect(result.success).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('keepLocal', () => {
    it('should keep local version and increment clock', () => {
      const local: VersionEntry = createMockVersion({
        id: 'v1',
        vectorClock: { device1: 1 }
      });

      const result = keepLocal(local);
      expect(result.success).toBe(true);
      expect(result.mergedVersion).not.toBeNull();
      expect(result.mergedVersion!.changes).toEqual(local.changes);
      expect(result.strategy).toBe('keep-local');
    });
  });

  describe('keepRemote', () => {
    it('should keep remote version', () => {
      const remote: VersionEntry = createMockVersion({
        id: 'v2',
        vectorClock: { device1: 2 }
      });

      const result = keepRemote(remote);
      expect(result.success).toBe(true);
      expect(result.mergedVersion).not.toBeNull();
      expect(result.mergedVersion!.changes).toEqual(remote.changes);
      expect(result.strategy).toBe('keep-remote');
    });
  });

  describe('manualMerge', () => {
    it('should successfully merge with provided changes', () => {
      const local: VersionEntry = createMockVersion({
        id: 'v1',
        changes: { title: 'Local' }
      });

      const remote: VersionEntry = createMockVersion({
        id: 'v2',
        changes: { title: 'Remote' }
      });

      const resolvedChanges = { title: 'Merged' };
      const result = manualMerge(local, remote, resolvedChanges);

      expect(result.success).toBe(true);
      expect(result.mergedVersion).not.toBeNull();
      expect(result.mergedVersion!.changes).toEqual(resolvedChanges);
      expect(result.strategy).toBe('manual');
    });
  });

  describe('getMergeStrategies', () => {
    it('should return all merge strategies', () => {
      const strategies = getMergeStrategies();
      expect(strategies).toContain('keep-local');
      expect(strategies).toContain('keep-remote');
      expect(strategies).toContain('auto-merge');
      expect(strategies).toContain('manual');
    });

    it('should return exactly 4 strategies', () => {
      const strategies = getMergeStrategies();
      expect(strategies.length).toBe(4);
    });
  });
});
