/**
 * Workflow Version Manager
 * Auto-versioning on save, max 50 versions per workflow, prune oldest when exceeded
 */

import { saveVersion, getVersionsByWorkflowId, getLatestVersion, pruneOldVersions, incrementVersionCount } from './workflow-store';
import { computeSnapshotHash, serializeWorkflow } from './snapshot-diff';
import type { WorkflowSnapshot, WorkflowCanvasData } from './types';

const MAX_VERSIONS = 50;

/**
 * Creates a new version for a workflow, auto-pruning old versions if needed
 */
export async function createVersion(
  workflowId: string,
  workflowData: WorkflowCanvasData
): Promise<WorkflowSnapshot> {
  // Get current version count
  const versions = await getVersionsByWorkflowId(workflowId);
  const currentVersionCount = versions.length;
  const nextVersionNumber = currentVersionCount === 0 ? 1 : (versions[0].version_number + 1);

  // Serialize workflow and compute hash
  const snapshot = serializeWorkflow(workflowData);
  const snapshotHash = computeSnapshotHash(snapshot);

  // Check if this is a duplicate of the latest version
  if (currentVersionCount > 0) {
    const latest = versions[0];
    if (latest.snapshot_hash === snapshotHash) {
      // No changes, return latest version instead
      return latest;
    }
  }

  // Count nodes and edges
  const nodeCount = Array.isArray(workflowData.nodes) ? workflowData.nodes.length : 0;
  const edgeCount = Array.isArray(workflowData.edges) ? workflowData.edges.length : 0;

  // Create new version
  const newVersion: Omit<WorkflowSnapshot, 'id'> = {
    workflow_id: workflowId,
    version_number: nextVersionNumber,
    created_at: Date.now(),
    snapshot,
    snapshot_hash: snapshotHash,
    node_count: nodeCount,
    edge_count: edgeCount,
  };

  const saved = await saveVersion(newVersion);

  // Update version count in metadata
  await incrementVersionCount(workflowId);

  // Auto-prune if exceeds max versions
  if (currentVersionCount + 1 > MAX_VERSIONS) {
    await pruneOldVersions(workflowId, MAX_VERSIONS);
  }

  return saved;
}

/**
 * Gets all versions for a workflow
 */
export async function getVersions(workflowId: string): Promise<WorkflowSnapshot[]> {
  return getVersionsByWorkflowId(workflowId);
}

/**
 * Gets the latest version for a workflow
 */
export async function getLatest(workflowId: string): Promise<WorkflowSnapshot | undefined> {
  return getLatestVersion(workflowId);
}

/**
 * Checks if workflow has changed since last save
 */
export async function hasChangesSinceLastVersion(
  workflowId: string,
  workflowData: WorkflowCanvasData
): Promise<boolean> {
  const latest = await getLatestVersion(workflowId);
  if (!latest) return true; // No previous version means it's changed

  const currentSnapshot = serializeWorkflow(workflowData);
  const currentHash = computeSnapshotHash(currentSnapshot);

  return currentHash !== latest.snapshot_hash;
}

/**
 * Gets version statistics
 */
export async function getVersionStats(workflowId: string): Promise<{
  totalVersions: number;
  latestVersion: number;
  oldestVersion: number | null;
  latestCreatedAt: number | null;
}> {
  const versions = await getVersionsByWorkflowId(workflowId);

  if (versions.length === 0) {
    return {
      totalVersions: 0,
      latestVersion: 0,
      oldestVersion: null,
      latestCreatedAt: null,
    };
  }

  return {
    totalVersions: versions.length,
    latestVersion: versions[0].version_number,
    oldestVersion: versions[versions.length - 1].version_number,
    latestCreatedAt: versions[0].created_at,
  };
}

/**
 * Clears all versions for a workflow (but keeps metadata)
 */
export async function clearVersions(workflowId: string): Promise<void> {
  const versions = await getVersionsByWorkflowId(workflowId);
  const { pruneOldVersions } = await import('./workflow-store');
  // Delete all by pruning to 0
  await pruneOldVersions(workflowId, 0);
}

export { MAX_VERSIONS };