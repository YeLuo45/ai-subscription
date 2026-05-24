/**
 * Version History Tests (Pure Functions)
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { diff, formatVersionChain } from '../../../../shared/lib/conflict-resolver/version-history';
import type { VersionEntry } from '../../../../shared/lib/conflict-resolver/types';

describe('Version History', () => {
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

  describe('diff', () => {
    it('should return no changes for identical versions', () => {
      const v1 = createMockVersion({ id: 'v1', changes: { title: 'Test' } });
      const v2 = createMockVersion({ id: 'v2', changes: { title: 'Test' } });

      const result = diff(v1, v2);
      expect(result.hasChanges).toBe(false);
    });

    it('should detect added fields', () => {
      const v1 = createMockVersion({ id: 'v1', changes: { title: 'Test' } });
      const v2 = createMockVersion({ id: 'v2', changes: { title: 'Test', description: 'New field' } });

      const result = diff(v1, v2);
      expect(result.hasChanges).toBe(true);
      expect(result.added).toHaveProperty('description');
      expect(result.added.description).toBe('New field');
    });

    it('should detect removed fields', () => {
      const v1 = createMockVersion({ id: 'v1', changes: { title: 'Test', description: 'Description' } });
      const v2 = createMockVersion({ id: 'v2', changes: { title: 'Test' } });

      const result = diff(v1, v2);
      expect(result.hasChanges).toBe(true);
      expect(result.removed).toHaveProperty('description');
      expect(result.removed.description).toBe('Description');
    });

    it('should detect modified fields', () => {
      const v1 = createMockVersion({ id: 'v1', changes: { title: 'Old Title' } });
      const v2 = createMockVersion({ id: 'v2', changes: { title: 'New Title' } });

      const result = diff(v1, v2);
      expect(result.hasChanges).toBe(true);
      expect(result.modified).toHaveProperty('title');
      expect(result.modified.title.old).toBe('Old Title');
      expect(result.modified.title.new).toBe('New Title');
    });

    it('should handle empty changes object', () => {
      const v1 = createMockVersion({ id: 'v1', changes: {} });
      const v2 = createMockVersion({ id: 'v2', changes: { title: 'New Title' } });

      const result = diff(v1, v2);
      expect(result.hasChanges).toBe(true);
      expect(result.added).toHaveProperty('title');
    });

    it('should return hasChanges=false when no changes detected', () => {
      const v1 = createMockVersion({ id: 'v1', changes: { title: 'Test', count: 42 } });
      const v2 = createMockVersion({ id: 'v2', changes: { title: 'Test', count: 42 } });

      const result = diff(v1, v2);
      expect(result.hasChanges).toBe(false);
    });
  });

  describe('formatVersionChain', () => {
    it('should return empty array for empty chain', () => {
      const formatted = formatVersionChain([]);
      expect(formatted).toEqual([]);
    });

    it('should format single version', () => {
      const versions: VersionEntry[] = [createMockVersion({ id: 'abc123', user: 'user1' })];
      const formatted = formatVersionChain(versions);
      expect(formatted.length).toBe(1);
      expect(formatted[0]).toContain('[1]');
      expect(formatted[0]).toContain('abc123');
    });

    it('should format version chain with parent reference', () => {
      const versions: VersionEntry[] = [
        createMockVersion({ id: 'abc123' }),
        createMockVersion({ id: 'def456', parent: 'abc123' })
      ];
      const formatted = formatVersionChain(versions);
      expect(formatted.length).toBe(2);
      expect(formatted[0]).toContain('[1]');
      expect(formatted[1]).toContain('abc123');
    });

    it('should format multiple versions with different parents', () => {
      const versions: VersionEntry[] = [
        createMockVersion({ id: 'v1' }),
        createMockVersion({ id: 'v2', parent: 'v1' }),
        createMockVersion({ id: 'v3', parent: 'v2' })
      ];
      const formatted = formatVersionChain(versions);
      expect(formatted.length).toBe(3);
      expect(formatted[0]).toContain('[1]');
      expect(formatted[1]).toContain('v1');
      expect(formatted[2]).toContain('v2');
    });
  });
});
