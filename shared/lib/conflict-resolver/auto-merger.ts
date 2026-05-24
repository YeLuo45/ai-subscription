/**
 * Auto Merger - Automatic conflict resolution when no overlaps
 * Based on thunderbolt conflict resolution pattern
 */

import { VersionEntry, MergeResult, MergeStrategy, VectorClock } from './types';
import { compareVectorClocks, canAutoMerge } from './detector';

function generateId(): string {
  return crypto.randomUUID();
}

function incrementClock(clock: VectorClock, deviceId: string): VectorClock {
  return {
    ...clock,
    [deviceId]: (clock[deviceId] || 0) + 1
  };
}

function mergeChanges(
  localChanges: Record<string, unknown>,
  remoteChanges: Record<string, unknown>
): { merged: Record<string, unknown>; conflicts: string[] } {
  const merged: Record<string, unknown> = { ...remoteChanges };
  const conflicts: string[] = [];

  for (const key of Object.keys(localChanges)) {
    if (key in merged) {
      // Same key modified in both - conflict
      if (JSON.stringify(merged[key]) !== JSON.stringify(localChanges[key])) {
        conflicts.push(key);
      } else {
        // Same value, no conflict
        merged[key] = localChanges[key];
      }
    } else {
      // Only local has this key
      merged[key] = localChanges[key];
    }
  }

  return { merged, conflicts };
}

export function autoMerge(
  local: VersionEntry,
  remote: VersionEntry,
  deviceId: string = 'local'
): MergeResult {
  // Check if auto-merge is possible
  if (!canAutoMerge(local, remote)) {
    return {
      success: false,
      mergedVersion: null,
      strategy: 'auto-merge',
      conflicts: ['Concurrent modifications to the same fields']
    };
  }

  const { merged, conflicts } = mergeChanges(local.changes, remote.changes);

  if (conflicts.length > 0) {
    return {
      success: false,
      mergedVersion: null,
      strategy: 'auto-merge',
      conflicts
    };
  }

  // Determine which version is newer
  const comparison = compareVectorClocks(local.vectorClock, remote.vectorClock);
  const baseClock = comparison === 1 ? remote.vectorClock : local.vectorClock;

  const mergedVersion: VersionEntry = {
    id: generateId(),
    entityId: local.entityId,
    timestamp: Date.now(),
    user: 'system',
    changes: merged,
    parent: comparison === 1 ? remote.id : local.id,
    vectorClock: incrementClock(baseClock, deviceId)
  };

  return {
    success: true,
    mergedVersion,
    strategy: 'auto-merge',
    conflicts: []
  };
}

export function manualMerge(
  local: VersionEntry,
  remote: VersionEntry,
  resolvedChanges: Record<string, unknown>,
  deviceId: string = 'local'
): MergeResult {
  const mergedVersion: VersionEntry = {
    id: generateId(),
    entityId: local.entityId,
    timestamp: Date.now(),
    user: 'user',
    changes: resolvedChanges,
    parent: local.id,
    vectorClock: incrementClock(local.vectorClock, deviceId)
  };

  return {
    success: true,
    mergedVersion,
    strategy: 'manual',
    conflicts: []
  };
}

export function keepLocal(local: VersionEntry, deviceId: string = 'local'): MergeResult {
  const mergedVersion: VersionEntry = {
    ...local,
    id: generateId(),
    timestamp: Date.now(),
    user: 'user',
    parent: local.id,
    vectorClock: incrementClock(local.vectorClock, deviceId)
  };

  return {
    success: true,
    mergedVersion,
    strategy: 'keep-local',
    conflicts: []
  };
}

export function keepRemote(remote: VersionEntry, deviceId: string = 'local'): MergeResult {
  const mergedVersion: VersionEntry = {
    ...remote,
    id: generateId(),
    timestamp: Date.now(),
    user: 'user',
    parent: remote.id,
    vectorClock: incrementClock(remote.vectorClock, deviceId)
  };

  return {
    success: true,
    mergedVersion,
    strategy: 'keep-remote',
    conflicts: []
  };
}

export function getMergeStrategies(): MergeStrategy[] {
  return ['keep-local', 'keep-remote', 'auto-merge', 'manual'];
}