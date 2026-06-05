/**
 * ConnectionPool — resource pool with acquire/release
 *
 * Inspired by: database connection pool pattern (HikariCP, pg pool)
 *
 * Manages a pool of resources (connections) with:
 *   - max/min size
 *   - acquire(timeoutMs): wait for available
 *   - release(resource): return to pool
 *   - create/destroy on demand
 *   - idle timeout
 *   - stats: active, idle, created, destroyed
 */

export interface PooledResource {
  id: string;
  createdAt: number;
  lastUsedAt: number;
  useCount: number;
  /** Custom resource data */
  data?: Record<string, unknown>;
  /** Whether the resource is currently acquired */
  acquired: boolean;
}

export interface PoolConfig {
  minSize: number;
  maxSize: number;
  /** Max idle time before resource is destroyed (ms) */
  idleTimeoutMs: number;
  /** Acquire timeout (ms) */
  acquireTimeoutMs: number;
  /** Optional resource factory */
  factory?: () => Promise<PooledResource> | PooledResource;
  /** Optional validate function */
  validate?: (resource: PooledResource) => boolean | Promise<boolean>;
}

export interface AcquireResult {
  success: boolean;
  resource?: PooledResource;
  waitedMs: number;
  reason?: string;
}

export class ConnectionPool {
  private config: PoolConfig;
  private resources: PooledResource[] = [];
  private waiting: Array<(r: PooledResource) => void> = [];
  private stats_data = { totalCreated: 0, totalDestroyed: 0, totalAcquired: 0, totalReleased: 0, totalTimeouts: 0 };
  private closed: boolean = false;
  private idleSweepTimer?: ReturnType<typeof setInterval>;

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = {
      minSize: 0,
      maxSize: 10,
      idleTimeoutMs: 60_000,
      acquireTimeoutMs: 5000,
      ...config,
    };
  }

  /** Start the pool: create minSize resources. */
  async start(): Promise<void> {
    if (this.closed) throw new Error('pool is closed');
    for (let i = 0; i < this.config.minSize; i++) {
      const r = await this.create();
      this.resources.push(r);
    }
    // Start idle sweep
    this.idleSweepTimer = setInterval(() => this.sweepIdle(), Math.max(1000, this.config.idleTimeoutMs / 2));
  }

  private async create(): Promise<PooledResource> {
    const base: PooledResource = {
      id: `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      useCount: 0,
      acquired: false,
    };
    if (this.config.factory) {
      const factoryResult = await this.config.factory();
      return { ...base, ...factoryResult };
    }
    return base;
  }

  private destroy(resource: PooledResource): void {
    this.stats_data.totalDestroyed += 1;
    // Could call resource.onClose() if defined
  }

  /**
   * Acquire a resource from the pool.
   * Waits up to acquireTimeoutMs for an available resource.
   */
  async acquire(): Promise<AcquireResult> {
    if (this.closed) return { success: false, waitedMs: 0, reason: 'pool closed' };
    const start = Date.now();
    // Try to find an idle resource
    const idle = this.resources.find((r) => !r.acquired);
    if (idle) {
      if (this.config.validate) {
        const ok = await this.config.validate(idle);
        if (!ok) {
          // Destroy and create new
          this.destroy(idle);
          this.resources = this.resources.filter((r) => r !== idle);
          const newRes = await this.create();
          newRes.acquired = true;
          this.resources.push(newRes);
          this.stats_data.totalAcquired += 1;
          return { success: true, resource: newRes, waitedMs: Date.now() - start };
        }
      }
      idle.acquired = true;
      idle.lastUsedAt = Date.now();
      idle.useCount += 1;
      this.stats_data.totalAcquired += 1;
      return { success: true, resource: idle, waitedMs: Date.now() - start };
    }
    // Try to create new if under max
    if (this.resources.length < this.config.maxSize) {
      const r = await this.create();
      r.acquired = true;
      this.resources.push(r);
      this.stats_data.totalCreated += 1;
      this.stats_data.totalAcquired += 1;
      return { success: true, resource: r, waitedMs: Date.now() - start };
    }
    // Wait for one
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // Remove from waiting list
        this.waiting = this.waiting.filter((cb) => cb !== callback);
        this.stats_data.totalTimeouts += 1;
        resolve({ success: false, waitedMs: Date.now() - start, reason: 'acquire timeout' });
      }, this.config.acquireTimeoutMs);
      const callback = (r: PooledResource) => {
        clearTimeout(timeout);
        r.acquired = true;
        r.lastUsedAt = Date.now();
        r.useCount += 1;
        this.stats_data.totalAcquired += 1;
        resolve({ success: true, resource: r, waitedMs: Date.now() - start });
      };
      this.waiting.push(callback);
    });
  }

  /**
   * Release a resource back to the pool.
   */
  release(resource: PooledResource): boolean {
    const r = this.resources.find((x) => x.id === resource.id);
    if (!r || !r.acquired) return false;
    r.acquired = false;
    r.lastUsedAt = Date.now();
    this.stats_data.totalReleased += 1;
    // If someone is waiting, hand it over
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next(r);
    }
    return true;
  }

  /** Sweep idle resources that have exceeded idleTimeoutMs (but keep minSize). */
  private sweepIdle(): void {
    const now = Date.now();
    const idle = this.resources.filter((r) => !r.acquired);
    if (idle.length <= this.config.minSize) return;
    const excess = idle.length - this.config.minSize;
    for (let i = 0; i < excess; i++) {
      const r = idle[i];
      if (now - r.lastUsedAt >= this.config.idleTimeoutMs) {
        this.destroy(r);
        this.resources = this.resources.filter((x) => x.id !== r.id);
      }
    }
  }

  /** Close the pool, destroy all resources. */
  async close(): Promise<void> {
    this.closed = true;
    if (this.idleSweepTimer) clearInterval(this.idleSweepTimer);
    for (const r of this.resources) this.destroy(r);
    this.resources = [];
    // Reject all waiting
    for (const cb of this.waiting) {
      cb({ id: 'closed', createdAt: 0, lastUsedAt: 0, useCount: 0, acquired: false });
    }
    this.waiting = [];
  }

  /** Current stats snapshot. */
  stats(): { total: number; active: number; idle: number; waiting: number; totalCreated: number; totalDestroyed: number; totalAcquired: number; totalReleased: number; totalTimeouts: number } {
    return {
      total: this.resources.length,
      active: this.resources.filter((r) => r.acquired).length,
      idle: this.resources.filter((r) => !r.acquired).length,
      waiting: this.waiting.length,
      ...this.stats_data,
    };
  }
}
