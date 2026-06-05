/**
 * WorkQueue — priority work queue
 *
 * Inspired by: Celery / Sidekiq / BullMQ
 *
 * FIFO work queue with priorities:
 *   - jobs with lower priority number run first (0=highest)
 *   - FIFO within same priority
 *   - delays: schedule a job for the future
 *   - retries with exponential backoff
 *   - concurrency: process N jobs in parallel
 *   - success/failure callbacks
 *   - dead-letter for permanently failed jobs
 */

export type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'delayed' | 'dead';

export interface Job<T = unknown> {
  id: string;
  name: string;
  data: T;
  priority: number;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  enqueuedAt: number;
  /** Earliest time the job can be picked up (for delayed jobs) */
  notBefore: number;
  /** Last started time */
  startedAt?: number;
  completedAt?: number;
  failedAt?: number;
  error?: string;
  result?: unknown;
}

export type JobHandler<T = unknown> = (job: Job<T>) => Promise<unknown> | unknown;

export class WorkQueue {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private activeJobs: Set<string> = new Set();
  private counter: number = 0;
  private concurrency: number;
  private backoffBaseMs: number;

  constructor(options: { concurrency?: number; backoffBaseMs?: number } = {}) {
    this.concurrency = options.concurrency ?? 1;
    this.backoffBaseMs = options.backoffBaseMs ?? 100;
  }

  private nextId(): string {
    this.counter += 1;
    return `job-${Date.now().toString(36)}-${this.counter}`;
  }

  /**
   * Register a handler for a job name.
   */
  registerHandler<T = unknown>(name: string, handler: JobHandler<T>): void {
    this.handlers.set(name, handler as JobHandler);
  }

  /**
   * Enqueue a job. Returns the job ID.
   */
  enqueue<T = unknown>(name: string, data: T, options: { priority?: number; delayMs?: number; maxAttempts?: number } = {}): string {
    const id = this.nextId();
    const job: Job<T> = {
      id,
      name,
      data,
      priority: options.priority ?? 5,
      status: options.delayMs && options.delayMs > 0 ? 'delayed' : 'pending',
      attempts: 0,
      maxAttempts: options.maxAttempts ?? 3,
      enqueuedAt: Date.now(),
      notBefore: options.delayMs ? Date.now() + options.delayMs : Date.now(),
    };
    this.jobs.set(id, job as Job);
    return id;
  }

  /**
   * Get a job by ID.
   */
  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /**
   * Promote delayed jobs whose notBefore has passed.
   * Returns the number promoted.
   */
  promoteDelayed(): number {
    const now = Date.now();
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'delayed' && job.notBefore <= now) {
        job.status = 'pending';
        count += 1;
      }
    }
    return count;
  }

  /**
   * Pick the next pending job (highest priority first, then FIFO).
   */
  pickNext(): Job | undefined {
    let best: Job | undefined;
    for (const job of this.jobs.values()) {
      if (job.status !== 'pending') continue;
      if (job.notBefore > Date.now()) continue;
      if (!best || job.priority < best.priority || (job.priority === best.priority && job.enqueuedAt < best.enqueuedAt)) {
        best = job;
      }
    }
    return best;
  }

  /**
   * Process jobs. Picks up to `concurrency` jobs and runs them.
   * Returns the number of jobs started.
   */
  async process(): Promise<number> {
    let started = 0;
    while (this.activeJobs.size < this.concurrency) {
      const job = this.pickNext();
      if (!job) break;
      job.status = 'active';
      job.startedAt = Date.now();
      job.attempts += 1;
      this.activeJobs.add(job.id);
      started += 1;
      // Run async
      this.runJob(job).catch(() => {});
    }
    return started;
  }

  private async runJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.name);
    if (!handler) {
      job.status = 'failed';
      job.failedAt = Date.now();
      job.error = `no handler for job name "${job.name}"`;
      this.maybeDLQ(job);
      this.activeJobs.delete(job.id);
      return;
    }
    try {
      const result = await handler(job);
      job.result = result;
      job.status = 'completed';
      job.completedAt = Date.now();
    } catch (err) {
      job.error = err instanceof Error ? err.message : String(err);
      job.failedAt = Date.now();
      if (job.attempts < job.maxAttempts) {
        // Schedule retry with exponential backoff
        const delay = this.backoffBaseMs * Math.pow(2, job.attempts - 1);
        job.status = 'delayed';
        job.notBefore = Date.now() + delay;
      } else {
        job.status = 'failed';
        this.maybeDLQ(job);
      }
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  private maybeDLQ(job: Job): void {
    if (job.attempts >= job.maxAttempts) {
      job.status = 'dead';
    }
  }

  /**
   * Wait for all active jobs to complete.
   */
  async drain(): Promise<void> {
    while (this.activeJobs.size > 0) {
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  /** Count jobs by status. */
  countByStatus(status: JobStatus): number {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === status) count += 1;
    }
    return count;
  }

  /** Get all jobs with given status. */
  listByStatus(status: JobStatus): Job[] {
    return Array.from(this.jobs.values()).filter((j) => j.status === status);
  }

  /** Cancel a pending or delayed job. */
  cancel(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    if (job.status === 'pending' || job.status === 'delayed') {
      job.status = 'failed';
      job.error = 'cancelled';
      job.failedAt = Date.now();
      return true;
    }
    return false;
  }

  /** Get all dead jobs (DLQ). */
  getDLQ(): Job[] {
    return this.listByStatus('dead');
  }

  /** Statistics. */
  stats(): { total: number; pending: number; active: number; completed: number; failed: number; delayed: number; dead: number; activeWorkers: number } {
    return {
      total: this.jobs.size,
      pending: this.countByStatus('pending'),
      active: this.countByStatus('active'),
      completed: this.countByStatus('completed'),
      failed: this.countByStatus('failed'),
      delayed: this.countByStatus('delayed'),
      dead: this.countByStatus('dead'),
      activeWorkers: this.activeJobs.size,
    };
  }
}
