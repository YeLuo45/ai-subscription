/**
 * Offline detection and queue management service
 * No external dependencies - pure browser APIs
 */

import { requestNotificationPermission, notify } from './notification';

/**
 * Check if browser is currently online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Queue an action to be executed when back online
 */
interface OfflineAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = 'ai_subscription_offline_queue';

function getOfflineQueue(): OfflineAction[] {
  try {
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: OfflineAction[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[Offline] Failed to save queue:', e);
  }
}

export function queueOfflineAction(type: string, payload: unknown): string {
  const action: OfflineAction = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    payload,
    timestamp: Date.now(),
  };
  
  const queue = getOfflineQueue();
  queue.push(action);
  saveOfflineQueue(queue);
  
  console.log('[Offline] Action queued:', type, action.id);
  return action.id;
}

/**
 * Remove an action from the queue
 */
export function removeOfflineAction(id: string): void {
  const queue = getOfflineQueue();
  const filtered = queue.filter(a => a.id !== id);
  saveOfflineQueue(filtered);
}

/**
 * Execute queued offline actions when back online
 * Returns the number of actions flushed
 */
export async function flushOfflineQueue(): Promise<number> {
  const queue = getOfflineQueue();
  
  if (queue.length === 0) {
    return 0;
  }
  
  console.log('[Offline] Flushing offline queue:', queue.length, 'actions');
  
  let flushed = 0;
  const failedActions: OfflineAction[] = [];
  
  for (const action of queue) {
    try {
      await executeOfflineAction(action);
      flushed++;
    } catch (error) {
      console.error('[Offline] Failed to execute action:', action.type, error);
      failedActions.push(action);
    }
  }
  
  // Save failed actions back to queue
  saveOfflineQueue(failedActions);
  
  // Send notification about sync results
  if (flushed > 0) {
    await requestNotificationPermission();
    notify(
      '离线操作已同步',
      `成功同步 ${flushed} 个离线操作${failedActions.length > 0 ? `，${failedActions.length} 个失败` : ''}`,
      undefined,
      'offline-sync'
    );
  }
  
  return flushed;
}

/**
 * Execute a single offline action
 * This should be customized based on the action type
 */
async function executeOfflineAction(action: OfflineAction): Promise<void> {
  // Dispatch custom event for app to handle
  const event = new CustomEvent('offline-action-flush', { detail: action });
  
  try {
    window.dispatchEvent(event);
  } catch (e) {
    // Ignore dispatch errors - listeners may throw
  }
  
  // Allow some time for listeners to handle the action
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Get the number of queued offline actions
 */
export function getQueuedActionCount(): number {
  return getOfflineQueue().length;
}

/**
 * Clear all queued offline actions
 */
export function clearOfflineQueue(): void {
  saveOfflineQueue([]);
}