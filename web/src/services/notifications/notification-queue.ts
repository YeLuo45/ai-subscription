/**
 * NotificationQueue - Offline queue integration for notifications
 * Reuses SyncQueue from sync/sync-queue.ts
 */

import { getSyncQueue, SyncOperation } from '../sync/sync-queue';

export type NotificationOperationType = 'mark_read' | 'mark_all_read' | 'delete';

export interface QueuedNotificationOperation {
  id: string;
  operation: NotificationOperationType;
  notificationId?: string;
  timestamp: number;
}

/**
 * NotificationQueue - manages offline notification operations
 * When offline, queues read/delete operations; flushes when back online
 */
export class NotificationQueue {
  private syncQueue = getSyncQueue();

  /**
   * Queue a mark-as-read operation
   */
  async queueMarkAsRead(notificationId: string): Promise<string> {
    return this.syncQueue.queueOperation(
      'article', // Using article as entity type since notifications aren't in sync types
      notificationId,
      'update',
      { type: 'notification_mark_read', notificationId }
    );
  }

  /**
   * Queue a mark-all-as-read operation
   */
  async queueMarkAllAsRead(): Promise<string> {
    return this.syncQueue.queueOperation(
      'article',
      'all_notifications',
      'update',
      { type: 'notification_mark_all_read' }
    );
  }

  /**
   * Queue a delete operation
   */
  async queueDelete(notificationId: string): Promise<string> {
    return this.syncQueue.queueOperation(
      'article',
      notificationId,
      'delete',
      { type: 'notification_delete', notificationId }
    );
  }

  /**
   * Check if there are pending notification operations
   */
  async getPendingCount(): Promise<number> {
    const pending = await this.syncQueue.getPending();
    return pending.filter(
      (op: SyncOperation) =>
        op.payload && typeof op.payload === 'object' &&
        'type' in op.payload &&
        String((op.payload as Record<string, unknown>).type).startsWith('notification_')
    ).length;
  }

  /**
   * Process all pending notification operations
   * Returns count of processed operations
   */
  async processQueue(
    handler: (op: QueuedNotificationOperation) => Promise<{ success: boolean; error?: string }>
  ): Promise<{ processed: number; succeeded: number; failed: number }> {
    const pending = await this.syncQueue.getPending();
    const notifOps = pending.filter(
      (op: SyncOperation) =>
        op.payload && typeof op.payload === 'object' &&
        'type' in op.payload &&
        String((op.payload as Record<string, unknown>).type).startsWith('notification_')
    );

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const op of notifOps) {
      processed++;
      const payload = op.payload as Record<string, unknown>;
      const notifOp: QueuedNotificationOperation = {
        id: op.id,
        operation: String(payload.type).replace('notification_', '') as NotificationOperationType,
        notificationId: payload.notificationId as string | undefined,
        timestamp: op.timestamp,
      };

      const result = await handler(notifOp);

      if (result.success) {
        await this.syncQueue.removeOperation(op.id);
        succeeded++;
      } else {
        await this.syncQueue.markFailed(op.id, result.error || 'Unknown error');
        failed++;
      }
    }

    return { processed, succeeded, failed };
  }

  /**
   * Flush the queue - process all pending operations
   * Used when coming back online
   */
  async flush(
    markAsReadFn: (id: string) => Promise<void>,
    markAllAsReadFn: () => Promise<void>,
    deleteFn: (id: string) => Promise<void>
  ): Promise<{ processed: number; succeeded: number; failed: number }> {
    return this.processQueue(async (op) => {
      try {
        switch (op.operation) {
          case 'mark_read':
            if (op.notificationId) {
              await markAsReadFn(op.notificationId);
            }
            break;
          case 'mark_all_read':
            await markAllAsReadFn();
            break;
          case 'delete':
            if (op.notificationId) {
              await deleteFn(op.notificationId);
            }
            break;
          default:
            return { success: false, error: `Unknown operation: ${op.operation}` };
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    });
  }
}

// Singleton instance
let queueInstance: NotificationQueue | null = null;

export function getNotificationQueue(): NotificationQueue {
  if (!queueInstance) {
    queueInstance = new NotificationQueue();
  }
  return queueInstance;
}