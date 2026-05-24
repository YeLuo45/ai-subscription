/**
 * Snapshot Diff Tests
 */

import { describe, it, expect } from 'vitest';
import type { WorkflowCanvasData, SnapshotDiff } from '../types';
import { serializeWorkflow, deserializeWorkflow, computeSnapshotHash, compareSnapshots, areSnapshotsEqual } from '../snapshot-diff';

describe('snapshot-diff', () => {
  describe('serializeWorkflow', () => {
    it('should serialize workflow data to JSON string', () => {
      const data: WorkflowCanvasData = {
        nodes: [{ id: 'n1', type: 'start' }],
        edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
      };

      const serialized = serializeWorkflow(data);
      const parsed = JSON.parse(serialized);

      expect(parsed.nodes).toHaveLength(1);
      expect(parsed.edges).toHaveLength(1);
      expect(parsed.serializedAt).toBeDefined();
    });

    it('should handle empty nodes and edges', () => {
      const data: WorkflowCanvasData = { nodes: [], edges: [] };
      const serialized = serializeWorkflow(data);
      const parsed = JSON.parse(serialized);

      expect(parsed.nodes).toHaveLength(0);
      expect(parsed.edges).toHaveLength(0);
    });
  });

  describe('deserializeWorkflow', () => {
    it('should deserialize JSON string back to workflow data', () => {
      const data: WorkflowCanvasData = {
        nodes: [{ id: 'n1' }],
        edges: [],
      };
      const serialized = serializeWorkflow(data);
      const deserialized = deserializeWorkflow(serialized);

      expect(deserialized.nodes).toHaveLength(1);
      expect((deserialized.nodes[0] as { id: string }).id).toBe('n1');
    });

    it('should handle invalid JSON gracefully', () => {
      const result = deserializeWorkflow('invalid json {{{');
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });
  });

  describe('computeSnapshotHash', () => {
    it('should generate consistent hash for same input', () => {
      const snapshot = '{"nodes":[],"edges":[]}';
      const hash1 = computeSnapshotHash(snapshot);
      const hash2 = computeSnapshotHash(snapshot);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different input', () => {
      const snapshot1 = '{"nodes":[],"edges":[]}';
      const snapshot2 = '{"nodes":[{"id":"n1"}],"edges":[]}';
      const hash1 = computeSnapshotHash(snapshot1);
      const hash2 = computeSnapshotHash(snapshot2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('compareSnapshots', () => {
    it('should detect added nodes', () => {
      const snapshotA = '{"nodes":[],"edges":[]}';
      const snapshotB = '{"nodes":[{"id":"n1"}],"edges":[]}';

      const diff = compareSnapshots(snapshotA, snapshotB);

      expect(diff.added.nodes).toContain('n1');
      expect(diff.removed.nodes).toHaveLength(0);
      expect(diff.modified.nodes).toHaveLength(0);
    });

    it('should detect removed nodes', () => {
      const snapshotA = '{"nodes":[{"id":"n1"}],"edges":[]}';
      const snapshotB = '{"nodes":[],"edges":[]}';

      const diff = compareSnapshots(snapshotA, snapshotB);

      expect(diff.removed.nodes).toContain('n1');
      expect(diff.added.nodes).toHaveLength(0);
    });

    it('should detect modified nodes', () => {
      const snapshotA = '{"nodes":[{"id":"n1","label":"old"}],"edges":[]}';
      const snapshotB = '{"nodes":[{"id":"n1","label":"new"}],"edges":[]}';

      const diff = compareSnapshots(snapshotA, snapshotB);

      expect(diff.modified.nodes).toContain('n1');
    });

    it('should detect added edges', () => {
      const snapshotA = '{"nodes":["n1","n2"],"edges":[]}';
      const snapshotB = '{"nodes":["n1","n2"],"edges":[{"id":"e1"}]}';

      const diff = compareSnapshots(snapshotA, snapshotB);

      expect(diff.added.edges).toContain('e1');
    });

    it('should return empty diff for identical snapshots', () => {
      const snapshot = '{"nodes":[{"id":"n1"}],"edges":[{"id":"e1"}]}';

      const diff = compareSnapshots(snapshot, snapshot);

      expect(diff.added.nodes).toHaveLength(0);
      expect(diff.removed.nodes).toHaveLength(0);
      expect(diff.modified.nodes).toHaveLength(0);
      expect(diff.added.edges).toHaveLength(0);
      expect(diff.removed.edges).toHaveLength(0);
      expect(diff.modified.edges).toHaveLength(0);
    });
  });

  describe('areSnapshotsEqual', () => {
    it('should return true for identical snapshots', () => {
      const snapshot = '{"nodes":[{"id":"n1"}],"edges":[]}';

      expect(areSnapshotsEqual(snapshot, snapshot)).toBe(true);
    });

    it('should return false for different snapshots', () => {
      const snapshotA = '{"nodes":[],"edges":[]}';
      const snapshotB = '{"nodes":[{"id":"n1"}],"edges":[]}';

      expect(areSnapshotsEqual(snapshotA, snapshotB)).toBe(false);
    });
  });
});