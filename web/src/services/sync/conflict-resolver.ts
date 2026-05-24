/**
 * Conflict Resolution for Sync
 * Provides strategies to handle conflicts between local and remote data
 */

export enum ConflictStrategy {
  LAST_WRITE_WINS = 'last_write_wins',
  SERVER_WINS = 'server_wins',
  MANUAL = 'manual',
}

export interface ConflictRecord<T = unknown> {
  id: string;
  entityType: 'article' | 'subscription' | 'tag' | 'note' | 'readingProgress';
  entityId: string;
  localData: T;
  remoteData: T;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
  detectedAt: number;
}

export interface ConflictResolution<T = unknown> {
  strategy: ConflictStrategy;
  resolvedData?: T;
  timestamp: number;
}

/**
 * ConflictResolver handles conflict detection and resolution
 * between local and remote data during sync
 */
export class ConflictResolver {
  /**
   * Detect if there is a conflict between local and remote data
   * A conflict exists when both local and remote have been modified
   * since the last sync
   */
  detect<T>(
    local: { localUpdatedAt: number; serverUpdatedAt?: number } | null,
    remote: { localUpdatedAt: number } | null,
    lastSyncTime?: number
  ): boolean {
    // No remote data means no conflict
    if (!remote) return false;

    // If no local data, no conflict (just a new remote record)
    if (!local) return false;

    // If we have a lastSyncTime, check if both changes happened after it
    if (lastSyncTime !== undefined) {
      return local.localUpdatedAt > lastSyncTime && remote.localUpdatedAt > lastSyncTime;
    }

    // Without lastSyncTime, assume conflict if remote is newer
    // and local has been modified since server update
    const localModifiedAfterSync = local.localUpdatedAt > (local.serverUpdatedAt ?? 0);
    const remoteModifiedAfterSync = remote.localUpdatedAt > (local.serverUpdatedAt ?? 0);

    return localModifiedAfterSync && remoteModifiedAfterSync;
  }

  /**
   * Resolve a conflict using the specified strategy
   */
  resolve<T>(
    local: T,
    remote: T,
    strategy: ConflictStrategy,
    localTimestamp?: number,
    remoteTimestamp?: number
  ): ConflictResolution<T> {
    switch (strategy) {
      case ConflictStrategy.LAST_WRITE_WINS:
        return this.resolveLastWriteWins(local, remote, localTimestamp, remoteTimestamp);

      case ConflictStrategy.SERVER_WINS:
        return this.resolveServerWins(remote);

      case ConflictStrategy.MANUAL:
        return this.resolveManual(local, remote);

      default:
        return this.resolveLastWriteWins(local, remote, localTimestamp, remoteTimestamp);
    }
  }

  /**
   * Resolve using last-write-wins strategy
   */
  private resolveLastWriteWins<T>(
    local: T,
    remote: T,
    localTimestamp?: number,
    remoteTimestamp?: number
  ): ConflictResolution<T> {
    // Compare timestamps to determine which is newer
    const localTs = localTimestamp ?? 0;
    const remoteTs = remoteTimestamp ?? 0;

    if (remoteTs >= localTs) {
      return {
        strategy: ConflictStrategy.LAST_WRITE_WINS,
        resolvedData: remote,
        timestamp: Date.now(),
      };
    }

    return {
      strategy: ConflictStrategy.LAST_WRITE_WINS,
      resolvedData: local,
      timestamp: Date.now(),
    };
  }

  /**
   * Resolve using server-wins strategy (always prefer remote)
   */
  private resolveServerWins<T>(remote: T): ConflictResolution<T> {
    return {
      strategy: ConflictStrategy.SERVER_WINS,
      resolvedData: remote,
      timestamp: Date.now(),
    };
  }

  /**
   * Resolve using manual strategy (requires manual resolution)
   * Returns local data as-is, marking as needing manual resolution
   */
  private resolveManual<T>(local: T, remote: T): ConflictResolution<T> {
    // For manual resolution, we keep both versions available
    // The actual resolution happens outside this class
    return {
      strategy: ConflictStrategy.MANUAL,
      resolvedData: local, // Default to local, but resolution needed
      timestamp: Date.now(),
    };
  }

  /**
   * Merge two data objects, with conflict detection at field level
   * Returns fields that have conflicts (different values in local vs remote)
   */
  detectFieldConflicts<T extends Record<string, unknown>>(
    local: T,
    remote: T
  ): { field: keyof T; localValue: unknown; remoteValue: unknown }[] {
    const conflicts: { field: keyof T; localValue: unknown; remoteValue: unknown }[] = [];
    const allKeys = new Set<string>([...Object.keys(local), ...Object.keys(remote)]);

    for (const key of Array.from(allKeys)) {
      if (local[key] !== remote[key]) {
        conflicts.push({
          field: key,
          localValue: local[key],
          remoteValue: remote[key],
        });
      }
    }

    return conflicts;
  }

  /**
   * Auto-resolve by merging non-conflicting fields
   * Uses LAST_WRITE_WINS for conflicting fields
   */
  autoMerge<T extends Record<string, unknown>>(
    local: T,
    remote: T,
    localTimestamp?: number,
    remoteTimestamp?: number
  ): { merged: T; hadConflicts: boolean } {
    const conflicts = this.detectFieldConflicts(local, remote);
    const hadConflicts = conflicts.length > 0;

    // Start with remote as base
    const merged: Record<string, unknown> = { ...remote };

    // For non-conflicting fields that only exist in local, add them
    for (const key of Object.keys(local)) {
      if (!(key in remote)) {
        merged[key] = local[key];
      }
    }

    // For conflicting fields, apply LAST_WRITE_WINS
    for (const conflict of conflicts) {
      const localTs = localTimestamp ?? 0;
      const remoteTs = remoteTimestamp ?? 0;

      if (remoteTs >= localTs) {
        merged[conflict.field as string] = conflict.remoteValue;
      } else {
        merged[conflict.field as string] = conflict.localValue;
      }
    }

    return { merged: merged as T, hadConflicts };
  }

  /**
   * Create a conflict record for storage/tracking
   */
  createConflictRecord<T>(
    entityType: ConflictRecord['entityType'],
    entityId: string,
    localData: T,
    remoteData: T,
    localUpdatedAt: number,
    remoteUpdatedAt: number
  ): ConflictRecord<T> {
    return {
      id: `conflict_${entityId}_${Date.now()}`,
      entityType,
      entityId,
      localData,
      remoteData,
      localUpdatedAt,
      remoteUpdatedAt,
      detectedAt: Date.now(),
    };
  }
}

// Singleton instance
let conflictResolverInstance: ConflictResolver | null = null;

export function getConflictResolver(): ConflictResolver {
  if (!conflictResolverInstance) {
    conflictResolverInstance = new ConflictResolver();
  }
  return conflictResolverInstance;
}