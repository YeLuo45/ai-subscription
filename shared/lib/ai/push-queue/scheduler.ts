/**
 * Push Scheduler
 * Timer-based scheduler for automated push delivery
 */

import type { AggregatedPush, PushQueueConfig, PushSender } from './types';
import { AggregationService } from './aggregation-service';

const DEFAULT_CONFIG: PushQueueConfig = {
  maxRetries: 3,
  defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  schedulerInterval: 30000, // 30 seconds
};

export class PushScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private config: PushQueueConfig;
  private isRunning = false;

  constructor(
    private aggregationService: AggregationService,
    config: Partial<PushQueueConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[PushScheduler] Started');
    this.tick(); // Run immediately
    this.intervalId = setInterval(() => this.tick(), this.config.schedulerInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[PushScheduler] Stopped');
  }

  async triggerNow(id: string): Promise<void> {
    const push = await this.aggregationService.get(id);
    if (!push) {
      console.error(`[PushScheduler] Push not found: ${id}`);
      return;
    }
    if (push.status !== 'pending') {
      console.warn(`[PushScheduler] Cannot trigger non-pending push: ${id} (status: ${push.status})`);
      return;
    }
    await this.sendPush(push);
  }

  private async tick(): Promise<void> {
    try {
      const now = Date.now();
      const pendingPushes = await this.aggregationService.getPending(now);
      
      for (const push of pendingPushes) {
        // Check retry limit
        if (push.retryCount >= this.config.maxRetries) {
          console.warn(`[PushScheduler] Max retries reached for ${push.id}, marking as error`);
          await this.aggregationService.markError(push.id, false);
          continue;
        }
        
        await this.sendPush(push);
      }
    } catch (error) {
      console.error('[PushScheduler] Tick error:', error);
    }
  }

  private async sendPush(push: AggregatedPush): Promise<void> {
    try {
      console.log(`[PushScheduler] Sending push: ${push.id} - ${push.title}`);
      // The actual sending is delegated to the sender callback or notification system
      // In a real implementation, this would call a push notification service
      await this.aggregationService.markSent(push.id);
      console.log(`[PushScheduler] Push sent successfully: ${push.id}`);
    } catch (error) {
      console.error(`[PushScheduler] Failed to send push ${push.id}:`, error);
      await this.aggregationService.markError(push.id, true);
    }
  }
}

// Default scheduler instance holder for browser environment
let defaultScheduler: PushScheduler | null = null;

export function getDefaultScheduler(): PushScheduler | null {
  return defaultScheduler;
}

export function setDefaultScheduler(scheduler: PushScheduler): void {
  defaultScheduler = scheduler;
}
