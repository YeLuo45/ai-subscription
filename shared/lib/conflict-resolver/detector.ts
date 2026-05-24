/**
 * Conflict Detector using Vector Clocks
 * Based on thunderbolt conflict resolution pattern
 */

import { VectorClock, ConflictDetectionResult, VersionEntry } from './types';

/**
 * Compare two vector clocks
 * Returns:
 *  -1 if a < b (a happened before b)
 *   0 if a == b (concurrent or same)
 *   1 if a > b (a happened after b)
 *   2 if a || b (conflicting concurrent changes)
 */
export function compareVectorClocks(a: VectorClock, b: VectorClock): -1 | 0 | 1 | 2 {
  let aGreaterThanB = false;
  let bGreaterThanA = false;

  const allKeys = Object.keys({ ...a, ...b });

  for (let i = 0; i < allKeys.length; i++) {
    const key = allKeys[i];
    const aVal = a[key] || 0;
    const bVal = b[key] || 0;

    if (aVal > bVal) {
      aGreaterThanB = true;
    } else if (bVal > aVal) {
      bGreaterThanA = true;
    }
  }

  if (aGreaterThanB && bGreaterThanA) {
    return 2; // Concurrent conflicting updates
  }
  if (aGreaterThanB) {
    return 1; // a happened after b
  }
  if (bGreaterThanA) {
    return -1; // a happened before b
  }
  return 0; // Same or concurrent non-conflicting
}

/**
 * Detect conflict between local and remote versions using vector clocks
 */
export function detectConflict(
  local: VersionEntry,
  remote: VersionEntry
): ConflictDetectionResult {
  const comparison = compareVectorClocks(local.vectorClock, remote.vectorClock);

  return {
    hasConflict: comparison === 2,
    localClock: local.vectorClock,
    remoteClock: remote.vectorClock,
    conflicts: comparison === 2 ? { ...local.vectorClock, ...remote.vectorClock } : undefined
  };
}

/**
 * Check if a version can be automatically merged (no conflicts)
 */
export function canAutoMerge(local: VersionEntry, remote: VersionEntry): boolean {
  const comparison = compareVectorClocks(local.vectorClock, remote.vectorClock);
  // Can auto-merge if one happened strictly after the other (no conflict)
  return comparison === 1 || comparison === -1;
}

/**
 * Determine the common ancestor (base version) if it exists
 */
export function findCommonAncestor(
  versions: VersionEntry[]
): VersionEntry | null {
  if (versions.length < 2) return null;

  // Sort by timestamp to find potential ancestors
  const sorted = [...versions].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const comparison = compareVectorClocks(
        sorted[i].vectorClock,
        sorted[j].vectorClock
      );
      if (comparison === -1) {
        return sorted[i];
      }
    }
  }

  return null;
}