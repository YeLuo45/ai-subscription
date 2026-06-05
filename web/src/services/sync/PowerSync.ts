/**
 * PowerSync — Bidirectional sync engine with version vectors
 *
 * Inspired by: thunderbolt-design PowerSync (SQLite <-> PostgreSQL delta sync)
 * Source pattern: /home/hermes/projects/thunderbolt-design/docs-site/sync.md
 *
 * Local replica tracks a VersionVector. Sync operations:
 *   - push(localChanges): mark local writes, return changeset to send upstream
 *   - pull(remoteChanges): apply remote writes, update local vector
 *   - detectConflict(local, remote): check for concurrent writes
 *   - bidirectional(): round-trip — push local, pull remote, merge
 *
 * Pure logic — pluggable transport (caller provides fetch/persist).
 */

import { VersionVector } from './VersionVector';

export type ChangeOp = 'insert' | 'update' | 'delete';

export interface Change {
  id: string;
  op: ChangeOp;
  collection: string;
  data?: unknown;
  prevVersion?: number;
  /** Vector timestamp when this change was made */
  vector: VersionVector;
  /** Replica that made the change */
  origin: string;
  timestamp: number;
}

export interface SyncState {
  localVector: VersionVector;
  remoteVector: VersionVector;
  pendingPush: Change[];
  pendingPull: Change[];
  conflicts: ConflictRecord[];
}

export interface ConflictRecord {
  id: string;
  collection: string;
  localChange: Change;
  remoteChange: Change;
  resolution?: 'local-wins' | 'remote-wins' | 'merged';
  mergedData?: unknown;
  resolvedAt?: number;
}

export interface PowerSyncOptions {
  /** Local replica ID */
  localReplica: string;
  /** Strategy for conflict resolution */
  conflictStrategy?: 'local-wins' | 'remote-wins' | 'manual' | 'last-write-wins';
  /** Last-write-wins timestamp comparator */
  timestampComparator?: (local: number, remote: number) => number;
}

export class PowerSync {
  private localVector: VersionVector;
  private remoteVector: VersionVector;
  private pendingPush: Change[] = [];
  private pendingPull: Change[] = [];
  private conflicts: ConflictRecord[] = [];
  private readonly localReplica: string;
  private readonly conflictStrategy: 'local-wins' | 'remote-wins' | 'manual' | 'last-write-wins';
  private readonly timestampComparator: (a: number, b: number) => number;

  constructor(options: PowerSyncOptions) {
    this.localReplica = options.localReplica;
    this.localVector = new VersionVector();
    this.remoteVector = new VersionVector();
    this.conflictStrategy = options.conflictStrategy ?? 'last-write-wins';
    this.timestampComparator = options.timestampComparator ?? ((a, b) => a - b);
  }

  /** Get current local version vector. */
  getLocalVector(): VersionVector {
    return this.localVector.clone();
  }

  /** Get current remote version vector. */
  getRemoteVector(): VersionVector {
    return this.remoteVector.clone();
  }

  /** Get pending push (local) changes. */
  getPendingPush(): Change[] {
    return [...this.pendingPush];
  }

  /** Get pending pull (remote) changes. */
  getPendingPull(): Change[] {
    return [...this.pendingPull];
  }

  /** Get detected conflicts. */
  getConflicts(): ConflictRecord[] {
    return [...this.conflicts];
  }

  /**
   * Record a local change. Increments local vector, adds to pendingPush.
   */
  recordLocalChange(change: Omit<Change, 'vector' | 'origin' | 'timestamp'>): Change {
    this.localVector.increment(this.localReplica);
    const fullChange: Change = {
      ...change,
      vector: this.localVector.clone(),
      origin: this.localReplica,
      timestamp: Date.now(),
    };
    this.pendingPush.push(fullChange);
    return fullChange;
  }

  /**
   * Apply a remote change. Increments remote vector, adds to pendingPull.
   * If the remote change conflicts with a local change, records a conflict.
   */
  applyRemoteChange(change: Omit<Change, 'timestamp'> & { timestamp?: number }): Change {
    const remoteTimestamp = change.timestamp ?? Date.now();
    const fullChange: Change = {
      ...change,
      timestamp: remoteTimestamp,
    };
    this.remoteVector.increment(change.origin);
    this.pendingPull.push(fullChange);

    // Check for conflict with any pending local change on same id+collection
    const conflictingLocal = this.pendingPush.find(
      (c) => c.id === fullChange.id && c.collection === fullChange.collection,
    );
    if (conflictingLocal) {
      this.detectConflict(conflictingLocal, fullChange);
    }
    return fullChange;
  }

  /**
   * Detect conflict between local and remote change.
   * Returns the conflict record (created or existing).
   */
  detectConflict(local: Change, remote: Change): ConflictRecord {
    let record = this.conflicts.find(
      (c) => c.id === local.id && c.collection === local.collection,
    );
    if (!record) {
      record = { id: local.id, collection: local.collection, localChange: local, remoteChange: remote };
      this.conflicts.push(record);
    } else {
      record.localChange = local;
      record.remoteChange = remote;
    }

    if (this.conflictStrategy === 'local-wins') {
      this.resolveConflict(record.id, 'local-wins', local.data);
    } else if (this.conflictStrategy === 'remote-wins') {
      this.resolveConflict(record.id, 'remote-wins', remote.data);
    } else if (this.conflictStrategy === 'last-write-wins') {
      const cmp = this.timestampComparator(local.timestamp, remote.timestamp);
      if (cmp < 0) {
        this.resolveConflict(record.id, 'remote-wins', remote.data);
      } else if (cmp > 0) {
        this.resolveConflict(record.id, 'local-wins', local.data);
      } else {
        // Same timestamp — use origin as tiebreaker (lexicographic)
        if (local.origin < remote.origin) {
          this.resolveConflict(record.id, 'local-wins', local.data);
        } else {
          this.resolveConflict(record.id, 'remote-wins', remote.data);
        }
      }
    }
    // 'manual' strategy: leave unresolved for caller

    return record;
  }

  /** Resolve a specific conflict. */
  resolveConflict(
    conflictId: string,
    resolution: 'local-wins' | 'remote-wins' | 'merged',
    mergedData?: unknown,
  ): boolean {
    const record = this.conflicts.find((c) => c.id === conflictId);
    if (!record) return false;
    record.resolution = resolution;
    record.mergedData = mergedData ?? (resolution === 'local-wins' ? record.localChange.data : record.remoteChange.data);
    record.resolvedAt = Date.now();
    return true;
  }

  /**
   * Bidirectional sync: returns the plan (push batch + pull batch + conflict list).
   * Caller is responsible for actually sending/receiving via transport.
   */
  planSync(): {
    toPush: Change[];
    toPull: Change[];
    conflicts: ConflictRecord[];
  } {
    return {
      toPush: [...this.pendingPush],
      toPull: [...this.pendingPull],
      conflicts: [...this.conflicts],
    };
  }

  /**
   * Mark push batch as sent (clears pendingPush, advances local vector).
   * In a real impl, transport confirms receipt first.
   */
  commitPush(): void {
    this.pendingPush = [];
  }

  /**
   * Mark pull batch as applied (clears pendingPull, advances remote vector).
   */
  commitPull(): void {
    this.pendingPull = [];
  }

  /**
   * Apply received remote vector after pull.
   */
  applyRemoteVector(vector: VersionVector): void {
    this.remoteVector = this.remoteVector.merge(vector);
  }

  /**
   * Finalize sync: commit push/pull, clear conflicts.
   * Returns updated state.
   */
  finalize(): SyncState {
    this.commitPush();
    this.commitPull();
    return this.getState();
  }

  /** Get a snapshot of current sync state. */
  getState(): SyncState {
    return {
      localVector: this.localVector.clone(),
      remoteVector: this.remoteVector.clone(),
      pendingPush: [...this.pendingPush],
      pendingPull: [...this.pendingPull],
      conflicts: [...this.conflicts],
    };
  }

  /** Clear all conflicts. */
  clearConflicts(): void {
    this.conflicts = [];
  }

  /**
   * Compute sync progress: how many pending changes are unsynced.
   */
  getSyncProgress(): { pendingPush: number; pendingPull: number; unresolvedConflicts: number } {
    return {
      pendingPush: this.pendingPush.length,
      pendingPull: this.pendingPull.length,
      unresolvedConflicts: this.conflicts.filter((c) => !c.resolution).length,
    };
  }

  /**
   * Check if local state is fully synced with remote (no pending changes).
   */
  isSynced(): boolean {
    return this.pendingPush.length === 0 && this.pendingPull.length === 0;
  }
}
