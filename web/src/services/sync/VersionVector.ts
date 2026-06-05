/**
 * VersionVector — Tracks per-node version counters for distributed sync
 *
 * Inspired by: thunderbolt-design PowerSync
 * Source pattern: /home/hermes/projects/thunderbolt-design/docs-site/sync.md
 *
 * Each replica (node) has a counter. Incrementing a counter marks a local
 * write. Comparing two vectors determines causality: A < B means A's writes
 * all precede B's; A || B means concurrent (conflict).
 *
 * Pure data structure with merge/compare primitives.
 */

export type ReplicaId = string;

export class VersionVector {
  private counters: Map<ReplicaId, number> = new Map();

  constructor(initial?: Record<ReplicaId, number> | Map<ReplicaId, number>) {
    if (initial instanceof Map) {
      for (const [k, v] of initial) this.counters.set(k, v);
    } else if (initial) {
      for (const [k, v] of Object.entries(initial)) this.counters.set(k, v);
    }
  }

  /** Get the counter for a replica (0 if absent). */
  get(replica: ReplicaId): number {
    return this.counters.get(replica) ?? 0;
  }

  /** Set the counter for a replica. Returns this for chaining. */
  set(replica: ReplicaId, value: number): this {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Counter must be a non-negative integer, got ${value}`);
    }
    this.counters.set(replica, value);
    return this;
  }

  /** Increment counter for a replica, returns the new value. */
  increment(replica: ReplicaId): number {
    const next = this.get(replica) + 1;
    this.counters.set(replica, next);
    return next;
  }

  /** Get all counters as a plain object. */
  toObject(): Record<ReplicaId, number> {
    return Object.fromEntries(this.counters);
  }

  /** Get all replicas. */
  replicas(): ReplicaId[] {
    return Array.from(this.counters.keys());
  }

  /** Number of replicas tracked. */
  size(): number {
    return this.counters.size;
  }

  /** Total sum of all counters. */
  sum(): number {
    let total = 0;
    for (const v of this.counters.values()) total += v;
    return total;
  }

  /** Maximum counter value (latest activity). */
  max(): number {
    let m = 0;
    for (const v of this.counters.values()) if (v > m) m = v;
    return m;
  }

  /** Compare: returns -1 if this < other, 1 if this > other, 0 if equal, 2 if concurrent. */
  compare(other: VersionVector): -1 | 0 | 1 | 2 {
    let thisLess = false;
    let thisGreater = false;
    const allReplicas = new Set([...this.counters.keys(), ...other.counters.keys()]);
    for (const r of allReplicas) {
      const a = this.get(r);
      const b = other.get(r);
      if (a < b) thisLess = true;
      if (a > b) thisGreater = true;
    }
    if (thisLess && thisGreater) return 2; // concurrent
    if (thisLess) return -1;
    if (thisGreater) return 1;
    return 0;
  }

  /** Returns true if this vector is strictly before (causally precedes) other. */
  precedes(other: VersionVector): boolean {
    return this.compare(other) === -1;
  }

  /** Returns true if this is concurrent with other (no causal relationship). */
  isConcurrent(other: VersionVector): boolean {
    return this.compare(other) === 2;
  }

  /** Returns true if this is equal to other. */
  equals(other: VersionVector): boolean {
    return this.compare(other) === 0;
  }

  /**
   * Merge: returns a new vector with max(this, other) per replica.
   * This is the "join" of two vectors — reflects all known writes.
   */
  merge(other: VersionVector): VersionVector {
    const out = new VersionVector();
    const allReplicas = new Set([...this.counters.keys(), ...other.counters.keys()]);
    for (const r of allReplicas) {
      out.set(r, Math.max(this.get(r), other.get(r)));
    }
    return out;
  }

  /**
   * Returns true if this vector "dominates" other (every counter >= and at
   * least one >).
   */
  dominates(other: VersionVector): boolean {
    let anyGreater = false;
    const allReplicas = new Set([...this.counters.keys(), ...other.counters.keys()]);
    for (const r of allReplicas) {
      if (this.get(r) < other.get(r)) return false;
      if (this.get(r) > other.get(r)) anyGreater = true;
    }
    return anyGreater;
  }

  /**
   * Returns a new vector with this + delta for a replica (used in sync pushes).
   */
  withIncrement(replica: ReplicaId): VersionVector {
    const v = new VersionVector(this.counters);
    v.increment(replica);
    return v;
  }

  /** Serialize to JSON-compatible object. */
  serialize(): string {
    return JSON.stringify(this.toObject());
  }

  /** Deserialize from JSON string. */
  static deserialize(s: string): VersionVector {
    return new VersionVector(JSON.parse(s));
  }

  /** Returns a new vector with this - other (counters that decreased). Used to compute what to fetch. */
  diff(other: VersionVector): Record<ReplicaId, number> {
    const out: Record<ReplicaId, number> = {};
    const allReplicas = new Set([...this.counters.keys(), ...other.counters.keys()]);
    for (const r of allReplicas) {
      const delta = this.get(r) - other.get(r);
      if (delta > 0) out[r] = delta;
    }
    return out;
  }

  /** Clone this vector. */
  clone(): VersionVector {
    return new VersionVector(this.counters);
  }
}
