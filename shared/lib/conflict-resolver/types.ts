/**
 * Conflict Resolution Types
 * Based on thunderbolt conflict resolution pattern
 */

export interface VectorClock {
  [deviceId: string]: number;
}

export interface VersionEntry {
  id: string;
  entityId: string;
  timestamp: number;
  user: string;
  changes: Record<string, unknown>;
  parent: string | null;
  vectorClock: VectorClock;
}

export interface ConflictRecord {
  entityId: string;
  localVersion: VersionEntry;
  remoteVersion: VersionEntry;
  baseVersion: VersionEntry | null;
  detectedAt: number;
}

export type MergeStrategy = 'keep-local' | 'keep-remote' | 'auto-merge' | 'manual';

export interface MergeResult {
  success: boolean;
  mergedVersion: VersionEntry | null;
  strategy: MergeStrategy;
  conflicts: string[];
}

export interface ConflictDetectionResult {
  hasConflict: boolean;
  localClock: VectorClock;
  remoteClock: VectorClock;
  conflicts?: VectorClock;
}

export interface DiffResult {
  hasChanges: boolean;
  added: Record<string, unknown>;
  removed: Record<string, unknown>;
  modified: Record<string, { old: unknown; new: unknown }>;
}