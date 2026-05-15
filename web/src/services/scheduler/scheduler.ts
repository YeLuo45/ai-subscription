// Scheduler service - manages cron jobs, execution, quiet hours integration
import type { CronConfig, ScheduleRecord } from './types';
import { nextRunTime } from './cron-parser';
import { isQuietHours } from './quiet-hours';
import { shouldUseBatchMode } from './batch-processor';
import { saveScheduleRecord, getScheduleHistory } from './schedule-history';

const JOBS_KEY = 'ai-scheduler-jobs';
const STATE_KEY = 'ai-scheduler-state';

interface SchedulerState {
  jobs: CronConfig[];
  lastCleanup: number;
}

function getState(): SchedulerState {
  try {
    const stored = localStorage.getItem(STATE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { jobs: [], lastCleanup: 0 };
}

function saveState(state: SchedulerState): void {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

class SchedulerService {
  private jobs: Map<string, CronConfig> = new Map();
  private intervalId: number | null = null;
  private onExecute?: (job: CronConfig) => Promise<void>;

  constructor() {
    this.loadJobs();
  }

  private loadJobs(): void {
    const state = getState();
    this.jobs.clear();
    for (const job of state.jobs) {
      this.jobs.set(job.id, job);
    }
  }

  private persistJobs(): void {
    const state = getState();
    state.jobs = Array.from(this.jobs.values());
    saveState(state);
  }

  setExecutor(fn: (job: CronConfig) => Promise<void>): void {
    this.onExecute = fn;
  }

  addJob(config: CronConfig): void {
    const next = nextRunTime(config.expression);
    const job: CronConfig = { ...config, nextRun: next?.getTime() };
    this.jobs.set(job.id, job);
    this.persistJobs();
  }

  updateJob(id: string, updates: Partial<CronConfig>): void {
    const job = this.jobs.get(id);
    if (!job) return;

    const updated = { ...job, ...updates };
    if (updates.expression) {
      const next = nextRunTime(updates.expression);
      updated.nextRun = next?.getTime();
    }
    this.jobs.set(id, updated);
    this.persistJobs();
  }

  removeJob(id: string): void {
    this.jobs.delete(id);
    this.persistJobs();
  }

  getJob(id: string): CronConfig | undefined {
    return this.jobs.get(id);
  }

  listJobs(): CronConfig[] {
    return Array.from(this.jobs.values());
  }

  start(): void {
    if (this.intervalId !== null) return;

    // Check every minute
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, 60 * 1000);

    // Run immediately once
    this.tick();
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async tick(): Promise<void> {
    const now = Date.now();
    const state = getState();

    // Cleanup old records weekly
    if (now - state.lastCleanup > 7 * 24 * 60 * 60 * 1000) {
      this.cleanupHistory();
      state.lastCleanup = now;
      saveState(state);
    }

    for (const [id, job] of this.jobs.entries()) {
      if (!job.enabled) continue;
      if (!job.nextRun) continue;

      if (now >= job.nextRun) {
        // Time to execute
        const record = await this.executeJob(job);
        
        // Save execution record
        await saveScheduleRecord(record);

        // Update next run
        const next = nextRunTime(job.expression);
        job.lastRun = now;
        job.nextRun = next?.getTime();
        this.jobs.set(id, job);
        this.persistJobs();
      }
    }
  }

  private async executeJob(job: CronConfig): Promise<ScheduleRecord> {
    const start = Date.now();
    const record: ScheduleRecord = {
      id: `record-${start}`,
      jobId: job.id,
      executedAt: start,
      status: 'success',
      articlesProcessed: 0,
      tokensUsed: 0,
      durationMs: 0,
    };

    try {
      // Check quiet hours
      const quiet = this.getQuietHours();
      if (quiet.enabled && isQuietHours(new Date(), quiet)) {
        record.status = 'skipped';
        record.error = 'Quiet hours - execution postponed';
        return record;
      }

      // Execute if callback is set
      if (this.onExecute) {
        await this.onExecute(job);
      }

      record.status = 'success';
    } catch (error) {
      record.status = 'failed';
      record.error = error instanceof Error ? error.message : 'Unknown error';
    }

    record.durationMs = Date.now() - start;
    return record;
  }

  private getQuietHours() {
    try {
      const stored = localStorage.getItem('ai-quiet-hours');
      return stored ? JSON.parse(stored) : { enabled: false, startTime: '22:00', endTime: '08:00', timezone: 'UTC', weekdaysOnly: false };
    } catch {
      return { enabled: false, startTime: '22:00', endTime: '08:00', timezone: 'UTC', weekdaysOnly: false };
    }
  }

  private async cleanupHistory(): Promise<void> {
    // Keep last 100 records
    try {
      const history = await getScheduleHistory(100);
      // Records are already limited in the query
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Singleton
let instance: SchedulerService | null = null;

export function getSchedulerService(): SchedulerService {
  if (!instance) {
    instance = new SchedulerService();
  }
  return instance;
}

export { SchedulerService };
