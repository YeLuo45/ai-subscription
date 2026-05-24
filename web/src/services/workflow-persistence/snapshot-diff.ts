/**
 * Snapshot Serialization and Diff Utilities
 * Serialize workflow to JSON, compute hash, compare versions
 */

import type { WorkflowCanvasData, SnapshotDiff } from './types';

/**
 * Serialize workflow canvas data to JSON string
 */
export function serializeWorkflow(workflowData: WorkflowCanvasData): string {
  return JSON.stringify({
    nodes: workflowData.nodes,
    edges: workflowData.edges,
    serializedAt: Date.now(),
  });
}

/**
 * Deserialize workflow JSON string back to canvas data
 */
export function deserializeWorkflow(snapshot: string): WorkflowCanvasData {
  try {
    const parsed = JSON.parse(snapshot);
    return {
      nodes: parsed.nodes || [],
      edges: parsed.edges || [],
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}

/**
 * Compute a simple hash for snapshot comparison
 * Uses cyrb53 hash algorithm for consistent results
 */
export function computeSnapshotHash(snapshot: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < snapshot.length; i++) {
    const ch = snapshot.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const result = 4294967296 * (2097555585 >>> 0) + (h2 >>> 0);
  return result.toString(36) + h1.toString(36);
}

/**
 * Extract node IDs from nodes array
 */
function extractNodeIds(nodes: unknown[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node && typeof node === 'object' && 'id' in node) {
      ids.push(String((node as Record<string, unknown>).id));
    }
  }
  return ids;
}

/**
 * Extract edge IDs from edges array
 */
function extractEdgeIds(edges: unknown[]): string[] {
  const ids: string[] = [];
  for (const edge of edges) {
    if (edge && typeof edge === 'object' && 'id' in edge) {
      ids.push(String((edge as Record<string, unknown>).id));
    }
  }
  return ids;
}

/**
 * Deep compare two values for equality
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return a === b;

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;

  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!bKeys.includes(key)) return false;
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }

  return true;
}

/**
 * Compare two workflow snapshots and return diff
 */
export function compareSnapshots(
  snapshotA: string,
  snapshotB: string
): SnapshotDiff {
  const workflowA = deserializeWorkflow(snapshotA);
  const workflowB = deserializeWorkflow(snapshotB);

  const nodesA = Array.isArray(workflowA.nodes) ? workflowA.nodes : [];
  const nodesB = Array.isArray(workflowB.nodes) ? workflowB.nodes : [];
  const edgesA = Array.isArray(workflowA.edges) ? workflowA.edges : [];
  const edgesB = Array.isArray(workflowB.edges) ? workflowB.edges : [];

  const idsA_nodes = extractNodeIds(nodesA);
  const idsB_nodes = extractNodeIds(nodesB);
  const idsA_edges = extractEdgeIds(edgesA);
  const idsB_edges = extractEdgeIds(edgesB);

  // Find added (in B but not in A)
  const addedNodes = idsB_nodes.filter(id => !idsA_nodes.includes(id));
  const addedEdges = idsB_edges.filter(id => !idsA_edges.includes(id));

  // Find removed (in A but not in B)
  const removedNodes = idsA_nodes.filter(id => !idsB_nodes.includes(id));
  const removedEdges = idsA_edges.filter(id => !idsB_edges.includes(id));

  // Find modified (same ID but different content)
  const commonNodeIds = idsA_nodes.filter(id => idsB_nodes.includes(id));
  const commonEdgeIds = idsA_edges.filter(id => idsB_edges.includes(id));

  const modifiedNodes: string[] = [];
  const modifiedEdges: string[] = [];

  for (const nodeA of nodesA) {
    if (typeof nodeA !== 'object' || !nodeA) continue;
    const nodeId = (nodeA as Record<string, unknown>).id;
    if (nodeId && commonNodeIds.includes(String(nodeId))) {
      const nodeB = nodesB.find(
        n => typeof n === 'object' && n && (n as Record<string, unknown>).id === nodeId
      );
      if (nodeB && !deepEqual(nodeA, nodeB)) {
        modifiedNodes.push(String(nodeId));
      }
    }
  }

  for (const edgeA of edgesA) {
    if (typeof edgeA !== 'object' || !edgeA) continue;
    const edgeId = (edgeA as Record<string, unknown>).id;
    if (edgeId && commonEdgeIds.includes(String(edgeId))) {
      const edgeB = edgesB.find(
        e => typeof e === 'object' && e && (e as Record<string, unknown>).id === edgeId
      );
      if (edgeB && !deepEqual(edgeA, edgeB)) {
        modifiedEdges.push(String(edgeId));
      }
    }
  }

  return {
    added: {
      nodes: addedNodes,
      edges: addedEdges,
    },
    removed: {
      nodes: removedNodes,
      edges: removedEdges,
    },
    modified: {
      nodes: modifiedNodes,
      edges: modifiedEdges,
    },
  };
}

/**
 * Check if two snapshots are identical
 */
export function areSnapshotsEqual(snapshotA: string, snapshotB: string): boolean {
  const diff = compareSnapshots(snapshotA, snapshotB);
  return (
    diff.added.nodes.length === 0 &&
    diff.added.edges.length === 0 &&
    diff.removed.nodes.length === 0 &&
    diff.removed.edges.length === 0 &&
    diff.modified.nodes.length === 0 &&
    diff.modified.edges.length === 0
  );
}