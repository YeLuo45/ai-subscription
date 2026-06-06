/**
 * JobScheduler — periodic and one-shot job scheduling
 *
 * Inspired by: node-cron / setInterval
 *
 * Supports:
 *   - interval(fn, ms): periodic execution
 *   - timeout(fn, ms): one-shot
 *   - at(date, fn): at specific time
 *   - cancel(id): stop job
 */

export type JobId = string;
export type JobHandler = () => void | Promise<void>;

interface IntervalJob {
  type: 'interval' | 'timeout';
  handler: JobHandler;
  id: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>;
}

interface AtJob {
  type: 'at';
  handler: JobHandler;
  id: ReturnType<typeof setTimeout>;
  scheduledFor: number;
}

type Job = IntervalJob | AtJob;

export class JobScheduler {
  private jobs: Map<JobId, Job> = new Map();
  private nextId: number = 1;

  /**
   * Schedule periodic execution.
   */
  interval(handler: JobHandler, ms: number): JobId {
    const id = this.genId();
    const intervalId = setInterval(() => { void handler(); }, ms);
    this.jobs.set(id, { type: 'interval', handler, id: intervalId });
    return id;
  }

  /**
   * Schedule one-shot execution.
   */
  timeout(handler: JobHandler, ms: number): JobId {
    const id = this.genId();
    const timeoutId = setTimeout(() => { void handler(); }, ms);
    this.jobs.set(id, { type: 'timeout', handler, id: timeoutId });
    return id;
  }

  /**
   * Schedule at a specific date.
   */
  at(handler: JobHandler, date: Date): JobId {
    const id = this.genId();
    const delay = Math.max(0, date.getTime() - Date.now());
    const timeoutId = setTimeout(() => { void handler(); }, delay);
    this.jobs.set(id, { type: 'at', handler, id: timeoutId, scheduledFor: date.getTime() });
    return id;
  }

  /**
   * Cancel a scheduled job.
   */
  cancel(id: JobId): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    if (job.type === 'interval' || job.type === 'timeout') {
      if (job.type === 'interval') clearInterval(job.id as ReturnType<typeof setInterval>);
      else clearTimeout(job.id as ReturnType<typeof setTimeout>);
    } else {
      clearTimeout(job.id);
    }
    this.jobs.delete(id);
    return true;
  }

  /**
   * Cancel all jobs.
   */
  cancelAll(): number {
    let count = 0;
    for (const id of Array.from(this.jobs.keys())) {
      this.cancel(id);
      count += 1;
    }
    return count;
  }

  /**
   * Get count of active jobs.
   */
  get size(): number {
    return this.jobs.size;
  }

  /**
   * Get list of active job IDs.
   */
  getJobIds(): JobId[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * Check if job is scheduled.
   */
  has(id: JobId): boolean {
    return this.jobs.has(id);
  }

  private genId(): JobId {
    return `job-${this.nextId++}`;
  }
}
