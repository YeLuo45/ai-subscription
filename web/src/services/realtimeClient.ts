import { message } from 'antd';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

export interface NewArticlesEvent {
  subscriptionId: string;
  subscriptionName: string;
  count: number;
  articles: unknown[];
  timestamp: string;
}

type NewArticlesHandler = (event: NewArticlesEvent) => void;

class RealtimeClient {
  private eventSource: EventSource | null = null;
  private status: RealtimeStatus = 'disconnected';
  private handlers: NewArticlesHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private onStatusChange: ((status: RealtimeStatus) => void) | null = null;

  setStatusCallback(cb: (status: RealtimeStatus) => void) {
    this.onStatusChange = cb;
  }

  private updateStatus(status: RealtimeStatus) {
    this.status = status;
    this.onStatusChange?.(status);
  }

  connect() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.updateStatus('connecting');
    
    const url = '/api/realtime/subscribe';
    this.eventSource = new EventSource(url);

    this.eventSource.addEventListener('connected', () => {
      this.updateStatus('connected');
      this.reconnectAttempts = 0;
    });

    this.eventSource.addEventListener('new_articles', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as NewArticlesEvent;
        this.handlers.forEach(handler => handler(data));
        
        // Show notification
        message.info(`${data.subscriptionName} 有 ${data.count} 篇新文章`);
      } catch (err) {
        console.error('Failed to parse new_articles event:', err);
      }
    });

    this.eventSource.addEventListener('heartbeat', () => {
      // Connection alive
    });

    this.eventSource.onerror = () => {
      this.updateStatus('disconnected');
      this.eventSource?.close();
      this.eventSource = null;
      
      // Auto-reconnect with exponential backoff
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
        setTimeout(() => this.connect(), delay);
      }
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.updateStatus('disconnected');
  }

  onNewArticles(handler: NewArticlesHandler) {
    this.handlers.push(handler);
  }

  getStatus() {
    return this.status;
  }
}

export const realtimeClient = new RealtimeClient();