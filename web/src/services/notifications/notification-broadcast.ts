/**
 * NotificationBroadcast - Real-time cross-tab sync via BroadcastChannel
 * Zero new dependencies - uses only built-in Web APIs
 */

import type { Notification } from './notification-service';
import { getNotificationService } from './notification-service';

export type BroadcastMessageType =
  | 'NOTIFICATION_NEW'
  | 'NOTIFICATION_READ'
  | 'NOTIFICATION_SYNC_REQUEST'
  | 'NOTIFICATION_SYNC_RESPONSE';

export interface BroadcastMessage {
  type: BroadcastMessageType;
  payload?: Notification | Notification[] | { id: string };
}

const CHANNEL_NAME = 'ai-subscription-notifications';

type NotificationListener = (notification: Notification) => void;

let channel: BroadcastChannel | null = null;
const listeners: Set<NotificationListener> = new Set();

function getChannel(): BroadcastChannel {
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

/**
 * NotificationBroadcast - manages real-time notification sync across browser tabs
 */
export class NotificationBroadcast {
  private static instance: NotificationBroadcast | null = null;
  private channel: BroadcastChannel;
  private isListening: boolean = false;

  private constructor() {
    this.channel = getChannel();
  }

  static getInstance(): NotificationBroadcast {
    if (!NotificationBroadcast.instance) {
      NotificationBroadcast.instance = new NotificationBroadcast();
    }
    return NotificationBroadcast.instance;
  }

  /**
   * Start listening for broadcast messages
   */
  startListening(): void {
    if (this.isListening) return;
    this.isListening = true;

    this.channel.addEventListener('message', this.handleMessage.bind(this));
  }

  /**
   * Stop listening for broadcast messages
   */
  stopListening(): void {
    if (!this.isListening) return;
    this.isListening = false;
    this.channel.removeEventListener('message', this.handleMessage.bind(this));
  }

  /**
   * Handle incoming broadcast messages
   */
  private async handleMessage(event: MessageEvent<BroadcastMessage>): Promise<void> {
    const { type, payload } = event.data;

    switch (type) {
      case 'NOTIFICATION_NEW': {
        if (payload && !Array.isArray(payload) && 'type' in payload && 'title' in payload && 'body' in payload) {
          const notifPayload = payload as Notification;
          // Store the notification locally
          const service = getNotificationService();
          await service.createNotification(
            notifPayload.type,
            notifPayload.title,
            notifPayload.body
          );
          // Notify listeners
          listeners.forEach(listener => listener(notifPayload));
        }
        break;
      }

      case 'NOTIFICATION_READ': {
        if (payload && !Array.isArray(payload) && 'id' in payload) {
          const readPayload = payload as { id: string };
          const service = getNotificationService();
          await service.markAsRead(readPayload.id);
        }
        break;
      }

      case 'NOTIFICATION_SYNC_REQUEST': {
        // Respond with current notifications
        const service = getNotificationService();
        const notifications = await service.getNotifications();
        this.broadcast('NOTIFICATION_SYNC_RESPONSE', notifications);
        break;
      }

      case 'NOTIFICATION_SYNC_RESPONSE': {
        if (payload && Array.isArray(payload)) {
          // Merge incoming notifications with local storage
          await this.mergeNotifications(payload);
        }
        break;
      }
    }
  }

  /**
   * Merge incoming notifications with local storage
   * Keeps most recent version of each notification by id
   */
  private async mergeNotifications(incoming: Notification[]): Promise<void> {
    const service = getNotificationService();
    
    for (const notification of incoming) {
      const existing = await service.getById(notification.id);
      if (!existing) {
        // New notification - create it
        await service.createNotification(
          notification.type,
          notification.title,
          notification.body
        );
        // Mark as read if it was already read
        if (notification.read) {
          await service.markAsRead(notification.id);
        }
      } else if (notification.timestamp > existing.timestamp) {
        // Incoming is newer - update local
        await service.deleteNotification(notification.id);
        await service.createNotification(
          notification.type,
          notification.title,
          notification.body
        );
        if (notification.read) {
          await service.markAsRead(notification.id);
        }
      }
    }
  }

  /**
   * Broadcast a message to all tabs
   */
  broadcast(type: BroadcastMessageType, payload?: BroadcastMessage['payload']): void {
    const message: BroadcastMessage = { type, payload };
    this.channel.postMessage(message);
  }

  /**
   * Broadcast a new notification to all tabs
   */
  async broadcastNew(notification: Notification): Promise<void> {
    this.broadcast('NOTIFICATION_NEW', notification);
  }

  /**
   * Broadcast mark-as-read to all tabs
   */
  broadcastRead(id: string): void {
    this.broadcast('NOTIFICATION_READ', { id });
  }

  /**
   * Request sync from all tabs
   */
  requestSync(): void {
    this.broadcast('NOTIFICATION_SYNC_REQUEST');
  }

  /**
   * Add a listener for new notifications
   */
  addListener(listener: NotificationListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /**
   * Close the broadcast channel
   */
  close(): void {
    this.stopListening();
    this.channel.close();
    channel = null;
    NotificationBroadcast.instance = null;
  }
}

// Export a factory function
export function getNotificationBroadcast(): NotificationBroadcast {
  return NotificationBroadcast.getInstance();
}

// Auto-start listening when module loads
if (typeof window !== 'undefined') {
  const broadcast = NotificationBroadcast.getInstance();
  broadcast.startListening();

  // Request sync from other tabs on focus
  window.addEventListener('focus', () => {
    broadcast.requestSync();
  });
}