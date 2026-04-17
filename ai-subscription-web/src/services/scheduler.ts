/**
 * Scheduler Service - Web 端定时任务调度
 * 使用 setInterval + Web Worker（可选）
 */

export type SchedulerCallback = () => void | Promise<void>;

interface ScheduledTask {
  id: string;
  name: string;
  intervalMs: number;
  callback: SchedulerCallback;
  timerId: ReturnType<typeof setInterval> | null;
  enabled: boolean;
}

class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private static instance: SchedulerService | null = null;

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * 添加定时任务
   */
  addTask(
    id: string,
    name: string,
    intervalMs: number,
    callback: SchedulerCallback,
    immediate = false
  ): void {
    // 如果已存在，先清除
    this.removeTask(id);

    const task: ScheduledTask = {
      id,
      name,
      intervalMs,
      callback,
      timerId: null,
      enabled: true,
    };

    if (immediate) {
      // 立即执行一次
      Promise.resolve().then(callback);
    }

    task.timerId = setInterval(async () => {
      if (task.enabled) {
        try {
          await task.callback();
        } catch (err) {
          console.error(`[Scheduler] Task "${name}" failed:`, err);
        }
      }
    }, intervalMs);

    this.tasks.set(id, task);
    console.log(`[Scheduler] Task "${name}" scheduled every ${intervalMs}ms`);
  }

  /**
   * 移除定时任务
   */
  removeTask(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      if (task.timerId !== null) {
        clearInterval(task.timerId);
      }
      this.tasks.delete(id);
      console.log(`[Scheduler] Task "${task.name}" removed`);
    }
  }

  /**
   * 暂停任务
   */
  pauseTask(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.enabled = false;
      console.log(`[Scheduler] Task "${task.name}" paused`);
    }
  }

  /**
   * 恢复任务
   */
  resumeTask(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.enabled = true;
      console.log(`[Scheduler] Task "${task.name}" resumed`);
    }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(id: string): { enabled: boolean; intervalMs: number } | null {
    const task = this.tasks.get(id);
    return task ? { enabled: task.enabled, intervalMs: task.intervalMs } : null;
  }

  /**
   * 清除所有任务
   */
  clearAll(): void {
    for (const [id, task] of this.tasks) {
      if (task.timerId !== null) {
        clearInterval(task.timerId);
      }
    }
    this.tasks.clear();
    console.log('[Scheduler] All tasks cleared');
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): Array<{ id: string; name: string; enabled: boolean; intervalMs: number }> {
    return Array.from(this.tasks.values()).map(t => ({
      id: t.id,
      name: t.name,
      enabled: t.enabled,
      intervalMs: t.intervalMs,
    }));
  }
}

export const scheduler = SchedulerService.getInstance();

/**
 * 便捷函数：添加内容抓取定时任务
 */
export function scheduleContentFetch(
  id: string,
  intervalMinutes: number,
  callback: SchedulerCallback
): void {
  scheduler.addTask(id, `fetch-${id}`, intervalMinutes * 60 * 1000, callback);
}
