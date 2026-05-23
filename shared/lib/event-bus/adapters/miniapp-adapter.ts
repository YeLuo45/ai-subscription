/**
 * MiniAppChannelAdapter - Framework adapter for WeChat mini-program platform
 * Implements ChannelAdapter interface for miniapp platform
 * 
 * TODO: Implement actual miniapp communication (wx.navigateToMiniProgram, postMessage, etc.)
 */

import type { BusEvent, ChannelAdapter } from '../types';

export class MiniAppChannelAdapter implements ChannelAdapter {
  platform: 'miniapp' = 'miniapp';
  private remoteCallbacks: Set<(event: BusEvent) => void> = new Set();

  constructor() {
    this.initMiniAppBridge();
  }

  private initMiniAppBridge(): void {
    // TODO: Initialize miniapp bridge (wx.miniProgram or similar)
    console.log('[MiniAppChannelAdapter] Initialized - bridge not implemented');
  }

  async publish(event: BusEvent): Promise<void> {
    // TODO: Implement miniapp-specific broadcast
    // Possible approaches:
    // 1. wx.miniProgram.postMessage() for webview communication
    // 2. wx.navigateToMiniProgram() for cross-app events
    // 3. Shared storage + event listener pattern
    console.log('[MiniAppChannelAdapter] publish called:', event.type);
    
    // Temporary: store locally for now
    this.broadcastToCallbacks(event);
  }

  async getState(): Promise<Record<string, unknown>> {
    // TODO: Implement miniapp-specific state retrieval
    return {};
  }

  onRemoteEvent(callback: (event: BusEvent) => void): () => void {
    this.remoteCallbacks.add(callback);

    // TODO: Set up miniapp event listener (wx.onAppRoute, etc.)

    return () => {
      this.remoteCallbacks.delete(callback);
    };
  }

  private broadcastToCallbacks(event: BusEvent): void {
    this.remoteCallbacks.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('[MiniAppChannelAdapter] Callback error:', e);
      }
    });
  }

  destroy(): void {
    this.remoteCallbacks.clear();
  }
}