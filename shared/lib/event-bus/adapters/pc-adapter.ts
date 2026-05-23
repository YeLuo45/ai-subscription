/**
 * PCChannelAdapter - Framework adapter for desktop (Electron) platform
 * Implements ChannelAdapter interface for PC platform
 * 
 * TODO: Implement actual PC communication (electron IPC, WebSocket, etc.)
 */

import type { BusEvent, ChannelAdapter } from '../types';

export class PCChannelAdapter implements ChannelAdapter {
  platform: 'pc' = 'pc';
  private remoteCallbacks: Set<(event: BusEvent) => void> = new Set();

  constructor() {
    this.initPCBridge();
  }

  private initPCBridge(): void {
    // TODO: Initialize PC bridge (electron IPC, nodeIntegration, etc.)
    // Possible approaches:
    // 1. electron ipcRenderer/ipcMain for main-renderer communication
    // 2. WebSocket to local server for cross-device within same network
    // 3. Shared electron-store for persistent cross-session state
    console.log('[PCChannelAdapter] Initialized - bridge not implemented');
  }

  async publish(event: BusEvent): Promise<void> {
    // TODO: Implement PC-specific broadcast via IPC or WebSocket
    console.log('[PCChannelAdapter] publish called:', event.type);
    
    // Temporary: store locally for now
    this.broadcastToCallbacks(event);
  }

  async getState(): Promise<Record<string, unknown>> {
    // TODO: Implement PC-specific state retrieval
    return {};
  }

  onRemoteEvent(callback: (event: BusEvent) => void): () => void {
    this.remoteCallbacks.add(callback);

    // TODO: Set up PC event listener (electron IPC, etc.)

    return () => {
      this.remoteCallbacks.delete(callback);
    };
  }

  private broadcastToCallbacks(event: BusEvent): void {
    this.remoteCallbacks.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('[PCChannelAdapter] Callback error:', e);
      }
    });
  }

  destroy(): void {
    this.remoteCallbacks.clear();
  }
}