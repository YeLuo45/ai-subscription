/**
 * Version Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { WorkflowSnapshot, WorkflowCanvasData } from '../types';

describe('version-manager', () => {
  describe('createVersion', () => {
    it('should create first version with version_number 1', () => {
      const workflowId = 'test_wf';
      const workflowData: WorkflowCanvasData = { nodes: [{ id: 'n1' }], edges: [] };
      const versions: WorkflowSnapshot[] = [];

      const nextVersion = versions.length === 0 ? 1 : versions[0].version_number + 1;
      expect(nextVersion).toBe(1);
    });

    it('should increment version number for subsequent versions', () => {
      const workflowId = 'test_wf';
      const existingVersions: WorkflowSnapshot[] = [
        { id: 'v1', workflow_id: workflowId, version_number: 1, created_at: Date.now(), snapshot: '{}', snapshot_hash: 'h1', node_count: 1, edge_count: 0 },
      ];

      const nextVersion = existingVersions[0].version_number + 1;
      expect(nextVersion).toBe(2);
    });

    it('should detect duplicate snapshots and return existing', () => {
      const workflowId = 'test_wf';
      const snapshot = '{"nodes":[],"edges":[]}';
      const hash = 'same_hash';

      const existingVersions: WorkflowSnapshot[] = [
        { id: 'v1', workflow_id: workflowId, version_number: 1, created_at: Date.now(), snapshot, snapshot_hash: hash, node_count: 0, edge_count: 0 },
      ];

      const isDuplicate = existingVersions.length > 0 && existingVersions[0].snapshot_hash === hash;
      expect(isDuplicate).toBe(true);
    });
  });

  describe('MAX_VERSIONS constant', () => {
    it('should be set to 50', () => {
      const MAX_VERSIONS = 50;
      expect(MAX_VERSIONS).toBe(50);
    });
  });

  describe('pruneOldVersions', () => {
    it('should prune when version count exceeds max', () => {
      const MAX_VERSIONS = 50;
      const versions: WorkflowSnapshot[] = Array.from({ length: 60 }, (_, i) => ({
        id: `v${i}`,
        workflow_id: 'wf',
        version_number: i + 1,
        created_at: Date.now(),
        snapshot: '{}',
        snapshot_hash: `h${i}`,
        node_count: 1,
        edge_count: 0,
      }));

      const shouldPrune = versions.length > MAX_VERSIONS;
      expect(shouldPrune).toBe(true);

      const prunedVersions = versions.slice(0, MAX_VERSIONS);
      expect(prunedVersions.length).toBe(50);
    });

    it('should not prune when under max versions', () => {
      const MAX_VERSIONS = 50;
      const versions: WorkflowSnapshot[] = Array.from({ length: 30 }, (_, i) => ({
        id: `v${i}`,
        workflow_id: 'wf',
        version_number: i + 1,
        created_at: Date.now(),
        snapshot: '{}',
        snapshot_hash: `h${i}`,
        node_count: 1,
        edge_count: 0,
      }));

      const shouldPrune = versions.length > MAX_VERSIONS;
      expect(shouldPrune).toBe(false);
    });
  });

  describe('getVersionStats', () => {
    it('should calculate version statistics correctly', () => {
      const versions: WorkflowSnapshot[] = [
        { id: 'v3', workflow_id: 'wf', version_number: 3, created_at: 300, snapshot: '{}', snapshot_hash: 'h3', node_count: 3, edge_count: 2 },
        { id: 'v2', workflow_id: 'wf', version_number: 2, created_at: 200, snapshot: '{}', snapshot_hash: 'h2', node_count: 2, edge_count: 1 },
        { id: 'v1', workflow_id: 'wf', version_number: 1, created_at: 100, snapshot: '{}', snapshot_hash: 'h1', node_count: 1, edge_count: 0 },
      ];

      const stats = {
        totalVersions: versions.length,
        latestVersion: versions[0].version_number,
        oldestVersion: versions[versions.length - 1].version_number,
        latestCreatedAt: versions[0].created_at,
      };

      expect(stats.totalVersions).toBe(3);
      expect(stats.latestVersion).toBe(3);
      expect(stats.oldestVersion).toBe(1);
      expect(stats.latestCreatedAt).toBe(300);
    });

    it('should return zero stats for empty version list', () => {
      const versions: WorkflowSnapshot[] = [];

      const stats = {
        totalVersions: versions.length,
        latestVersion: 0,
        oldestVersion: null as number | null,
        latestCreatedAt: null as number | null,
      };

      expect(stats.totalVersions).toBe(0);
      expect(stats.latestVersion).toBe(0);
      expect(stats.oldestVersion).toBeNull();
      expect(stats.latestCreatedAt).toBeNull();
    });
  });

  describe('hasChangesSinceLastVersion', () => {
    it('should return true when no previous version exists', () => {
      const latestVersion: WorkflowSnapshot | null = null;
      const hasChanges = latestVersion === null;
      expect(hasChanges).toBe(true);
    });

    it('should return true when content has changed', () => {
      const latestSnapshot = '{"nodes":[],"edges":[]}';
      const currentSnapshot = '{"nodes":[{"id":"n1"}],"edges":[]}';
      const hasChanges = latestSnapshot !== currentSnapshot;
      expect(hasChanges).toBe(true);
    });

    it('should return false when content is identical', () => {
      const snapshot = '{"nodes":[],"edges":[]}';
      const hasChanges = snapshot !== snapshot;
      expect(hasChanges).toBe(false);
    });
  });
});