// Scheduler types - cron config, schedule records, quiet hours, batch processing

export interface CronConfig {
  id: string;
  expression: string; // 5-field cron: minute hour day month weekday
  label: string;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  subscriptionId?: string;
}

export interface ScheduleRecord {
  id: string;
  jobId: string;
  executedAt: number;
  status: 'success' | 'failed' | 'skipped';
  articlesProcessed: number;
  tokensUsed: number;
  error?: string;
  durationMs: number;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string; // "22:00"
  endTime: string;   // "08:00"
  timezone: string;   // "Asia/Shanghai"
  weekdaysOnly: boolean; // true = apply on weekdays only
}

export interface BatchConfig {
  enabled: boolean;
  threshold: number;      // Switch to batch mode when backlog > threshold
  maxBatchSize: number;  // Max articles per batch
  batchSummaryLength: number; // Sentences per article in batch mode (default: 3)
}

export interface SchedulerState {
  jobs: CronConfig[];
  quietHours: QuietHours;
  batchConfig: BatchConfig;
}

export const PRESET_SCHEDULES = [
  { label: 'Every hour', expression: '0 * * * *' },
  { label: 'Every 6 hours', expression: '0 */6 * * *' },
  { label: 'Daily at 9 AM', expression: '0 9 * * *' },
  { label: 'Weekdays at 9 AM', expression: '0 9 * * 1-5' },
  { label: 'Weekly on Monday at 9 AM', expression: '0 9 * * 1' },
  { label: 'Monthly on 1st at 9 AM', expression: '0 9 1 * *' },
];

export const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: false,
  startTime: '22:00',
  endTime: '08:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  weekdaysOnly: false,
};

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  enabled: true,
  threshold: 5,
  maxBatchSize: 20,
  batchSummaryLength: 3,
};
