/**
 * Workflow Scheduler - Cron-based scheduling using setInterval
 * Compatible with browser environment (no cron library dependency)
 */

import type { Workflow, ScheduledJob } from './types';
import { parseCron, nextRunTime, validateCron } from '../../scheduler/cron-parser';

// In-memory job storage
const scheduledJobs = new Map<string, ScheduledJob>();
const CRON_CHECK_INTERVAL = 60000; // 1 minute

// ============================================================
// Cron Helpers
// ============================================================

export function parseCronExpression(cron: string): { valid: boolean; error?: string; nextRun?: Date } {
  const validation = validateCron(cron);
  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }
  
  const next = nextRunTime(cron);
  return { valid: true, nextRun: next || undefined };
}

export function formatCronDescription(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return 'Invalid cron';
  
  const [minute, hour, day, month, weekday] = parts;
  
  // Common patterns
  if (minute === '0' && hour === '9' && day === '*' && month === '*' && weekday === '*') {
    return '每天 9:00';
  }
  if (minute === '0' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return `每小时整点`;
  }
  if (minute === '*/15' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return '每15分钟';
  }
  if (minute === '*/30' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return '每30分钟';
  }
  
  // Build description
  const desc: string[] = [];
  
  if (minute !== '*') desc.push(`分:${minute}`);
  if (hour !== '*') desc.push(`时:${hour}`);
  if (day !== '*') desc.push(`日:${day}`);
  if (month !== '*') desc.push(`月:${month}`);
  if (weekday !== '*') {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const w = parseInt(weekday, 10);
    desc.push(`周:${isNaN(w) ? weekday : days[w] || weekday}`);
  }
  
  return desc.join(', ') || 'Invalid';
}

// ============================================================
// Scheduler Management
// ============================================================

export function startScheduler(): void {
  // Check every minute for scheduled jobs
  const intervalId = setInterval(() => {
    checkScheduledJobs();
  }, CRON_CHECK_INTERVAL);
  
  console.log('[WorkflowScheduler] Started - checking every minute');
}

function checkScheduledJobs(): void {
  const now = Date.now();
  
  for (const [workflowId, job] of scheduledJobs) {
    if (job.nextRunTime && now >= job.nextRunTime) {
      console.log(`[WorkflowScheduler] Triggering workflow ${workflowId}`);
      
      // Import engine dynamically to avoid circular dependency
      import('./engine').then(({ WorkflowEngine }) => {
        WorkflowEngine.getInstance().triggerScheduled(workflowId);
      }).catch(err => {
        console.error('[WorkflowScheduler] Failed to trigger workflow:', err);
      });
      
      // Calculate next run time
      const nextRun = nextRunTime(job.cron, new Date());
      job.nextRunTime = nextRun?.getTime() || 0;
      
      console.log(`[WorkflowScheduler] Next run for ${workflowId}:`, nextRun);
    }
  }
}

export function scheduleWorkflow(workflow: Workflow): void {
  const trigger = workflow.triggers.find(t => t.type === 'scheduled');
  if (!trigger || !trigger.cron) return;
  
  const validation = validateCron(trigger.cron);
  if (!validation.valid) {
    console.error(`[WorkflowScheduler] Invalid cron for workflow ${workflow.id}:`, validation.error);
    return;
  }
  
  // Remove existing job if any
  unscheduleWorkflow(workflow.id);
  
  const nextRun = nextRunTime(trigger.cron);
  const job: ScheduledJob = {
    workflowId: workflow.id,
    cron: trigger.cron,
    nextRunTime: nextRun?.getTime() || 0,
  };
  
  scheduledJobs.set(workflow.id, job);
  console.log(`[WorkflowScheduler] Scheduled workflow ${workflow.id}, next run:`, nextRun);
}

export function unscheduleWorkflow(workflowId: string): void {
  const job = scheduledJobs.get(workflowId);
  if (job?.intervalId) {
    clearInterval(job.intervalId);
  }
  scheduledJobs.delete(workflowId);
  console.log(`[WorkflowScheduler] Unscheduled workflow ${workflowId}`);
}

export function rescheduleAllWorkflows(workflows: Workflow[]): void {
  // Clear all existing jobs
  for (const [id] of scheduledJobs) {
    unscheduleWorkflow(id);
  }
  
  // Reschedule enabled workflows with scheduled triggers
  for (const wf of workflows) {
    if (wf.enabled) {
      scheduleWorkflow(wf);
    }
  }
  
  console.log(`[WorkflowScheduler] Rescheduled ${workflows.filter(w => w.enabled).length} workflows`);
}

export function getNextRunTime(workflowId: string): Date | null {
  const job = scheduledJobs.get(workflowId);
  if (!job?.nextRunTime) return null;
  return new Date(job.nextRunTime);
}

export function getScheduledJobs(): ScheduledJob[] {
  return Array.from(scheduledJobs.values());
}