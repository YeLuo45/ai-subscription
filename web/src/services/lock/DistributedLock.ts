/**
 * DistributedLock — distributed mutex
 *
 * Inspired by: Redis SETNX-based locks / Redlock
 *
 * In-process simulation of distributed lock with:
 *   - acquire(resourceId, ownerId, ttlMs): returns lock token
 *   - release(resourceId, token): only owner can release
 *   - renew(resourceId, token, ttlMs): extend TTL
 *   - isLocked(resourceId): check lock state
 *   - getOwner(resourceId): who owns the lock
 *   - waitForLock(resourceId, timeoutMs): wait until available
 *   - auto-expire: locks that aren't renewed expire
 *
 * Each lock has a unique token. Only the holder of the token
 * can release or renew — prevents accidental release by other owners.
 */

export interface LockEntry {
  resource: string;
  owner: string;
  token: string;
  acquiredAt: number;
  expiresAt: number;
}

export interface AcquireResult {
  success: boolean;
  token?: string;
  expiresAt?: number;
  currentOwner?: string;
  reason?: string;
}

export class DistributedLock {
  private locks: Map<string, LockEntry> = new Map();
  private waiters: Map<string, Array<(entry: LockEntry | null) => void>> = new Map();
  private counter: number = 0;
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = 30_000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  private nextToken(): string {
    this.counter += 1;
    return `lock-${Date.now().toString(36)}-${this.counter}`;
  }

  /**
   * Try to acquire a lock. Returns immediately with success=false if locked.
   */
  tryAcquire(resource: string, owner: string, ttlMs?: number): AcquireResult {
    this.sweep();
    const now = Date.now();
    const existing = this.locks.get(resource);
    if (existing && existing.expiresAt > now) {
      return {
        success: false,
        currentOwner: existing.owner,
        reason: 'already locked',
      };
    }
    const token = this.nextToken();
    const ttl = ttlMs ?? this.defaultTtlMs;
    const entry: LockEntry = {
      resource,
      owner,
      token,
      acquiredAt: now,
      expiresAt: now + ttl,
    };
    this.locks.set(resource, entry);
    return {
      success: true,
      token,
      expiresAt: entry.expiresAt,
    };
  }

  /**
   * Acquire with waiting. Waits up to timeoutMs for the lock to be released.
   * Returns null if timeout.
   */
  async acquire(resource: string, owner: string, timeoutMs: number = 5000, ttlMs?: number): Promise<AcquireResult> {
    const r = this.tryAcquire(resource, owner, ttlMs);
    if (r.success) return r;
    // Wait for the lock
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        // Remove from waiters
        const list = this.waiters.get(resource);
        if (list) {
          const idx = list.indexOf(callback);
          if (idx >= 0) list.splice(idx, 1);
        }
        resolve({ success: false, currentOwner: this.getOwner(resource), reason: 'wait timeout' });
      }, timeoutMs);
      const callback = (entry: LockEntry | null) => {
        clearTimeout(timer);
        if (entry) {
          resolve({ success: true, token: entry.token, expiresAt: entry.expiresAt });
        } else {
          resolve({ success: false, reason: 'waiter cancelled' });
        }
      };
      if (!this.waiters.has(resource)) this.waiters.set(resource, []);
      this.waiters.get(resource)!.push(callback);
    });
  }

  /**
   * Release a lock. Only succeeds if the token matches.
   * Wakes the next waiter and grants them the lock.
   */
  release(resource: string, token: string): boolean {
    const entry = this.locks.get(resource);
    if (!entry || entry.token !== token) return false;
    this.locks.delete(resource);
    // Wake up one waiter and grant them the lock
    const waiters = this.waiters.get(resource);
    if (waiters && waiters.length > 0) {
      const next = waiters.shift()!;
      // Grant the lock to the waiter with a new token
      const newEntry: LockEntry = {
        resource,
        owner: 'waiter', // owner info lost across boundaries; caller has original context
        token: this.nextToken(),
        acquiredAt: Date.now(),
        expiresAt: Date.now() + this.defaultTtlMs,
      };
      this.locks.set(resource, newEntry);
      next(newEntry);
    }
    return true;
  }

  /**
   * Renew a lock's TTL.
   */
  renew(resource: string, token: string, ttlMs?: number): boolean {
    this.sweep();
    const entry = this.locks.get(resource);
    if (!entry || entry.token !== token) return false;
    const ttl = ttlMs ?? this.defaultTtlMs;
    entry.expiresAt = Date.now() + ttl;
    return true;
  }

  /**
   * Check if a resource is currently locked (and not expired).
   */
  isLocked(resource: string): boolean {
    this.sweep();
    const entry = this.locks.get(resource);
    return entry !== undefined && entry.expiresAt > Date.now();
  }

  /**
   * Get the current owner of a resource's lock.
   */
  getOwner(resource: string): string | undefined {
    this.sweep();
    return this.locks.get(resource)?.owner;
  }

  /**
   * Get the lock entry for a resource.
   */
  getEntry(resource: string): LockEntry | undefined {
    this.sweep();
    return this.locks.get(resource);
  }

  /**
   * Force-release a lock (admin operation). Returns true if a lock existed.
   */
  forceRelease(resource: string): boolean {
    return this.locks.delete(resource);
  }

  /**
   * Sweep expired locks.
   */
  sweep(): number {
    const now = Date.now();
    let count = 0;
    for (const [resource, entry] of this.locks) {
      if (entry.expiresAt <= now) {
        this.locks.delete(resource);
        count += 1;
        // Wake waiters
        const waiters = this.waiters.get(resource);
        if (waiters && waiters.length > 0) {
          const next = waiters.shift()!;
          next(null);
        }
      }
    }
    return count;
  }

  /**
   * List all currently-locked resources.
   */
  listLockedResources(): string[] {
    this.sweep();
    return Array.from(this.locks.keys());
  }

  /** Statistics. */
  stats(): { totalLocks: number; totalWaiters: number } {
    let totalWaiters = 0;
    for (const list of this.waiters.values()) totalWaiters += list.length;
    return {
      totalLocks: this.locks.size,
      totalWaiters,
    };
  }
}
