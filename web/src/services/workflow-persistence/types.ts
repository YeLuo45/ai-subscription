/**
 * Workflow Persistence Types
 */

export interface WorkflowPersistenceMeta {
  id: string;
  name: string;
  description: string;
  created_at: number;
  updated_at: number;
  version_count: number;
  last_run_at: number | null;
  is_deleted: boolean;
}

export interface WorkflowSnapshot {
  id: string;
  workflow_id: string;
  version_number: number;
  created_at: number;
  snapshot: string; // JSON serialized workflow
  snapshot_hash: string;
  node_count: number;
  edge_count: number;
}

export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  version_number: number;
  created_at: number;
  snapshot: string;
  snapshot_hash: string;
  node_count: number;
  edge_count: number;
}

export interface SnapshotDiff {
  added: {
    nodes: string[];
    edges: string[];
  };
  removed: {
    nodes: string[];
    edges: string[];
  };
  modified: {
    nodes: string[];
    edges: string[];
  };
}

export type SaveIndicatorState = 'saved' | 'saving' | 'unsaved' | 'error';

export interface WorkflowCanvasData {
  nodes: unknown[];
  edges: unknown[];
}