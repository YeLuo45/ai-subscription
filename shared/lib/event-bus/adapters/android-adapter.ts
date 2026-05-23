/**
 * AndroidChannelAdapter - Framework adapter for Android (WebView) platform
 * Implements ChannelAdapter interface for Android platform
 * 
 * TODO: Implement actual Android communication (WebView bridge, Android broadcast, etc.)
 */

import type { BusEvent, ChannelAdapter } from '../types';

export class AndroidChannelAdapter implements ChannelAdapter {
  platform: 'android' = 'android';
  private remoteCallbacks: Set<(event: BusEvent) => void> = new Set();

  constructor() {
    this.initAndroidBridge();
  }

  private initAndroidBridge(): void {
    // TODO: Initialize Android bridge (WebViewJavascriptBridge, Android addJavascriptInterface, etc.)
    // Possible approaches:
    // 1. window.AndroidBridge for native Android communication
    // 2. WebView postMessage for webview-native communication
    // 3. Android BroadcastReceiver for cross-app events (requires native module)
    console.log('[AndroidChannelAdapter] Initialized - bridge not implemented');
  }

  async publish(event: BusEvent): Promise<void> {
    // TODO: Implement Android-specific broadcast
    console.log('[AndroidChannelAdapter] publish called:', event.type);
    
    // Temporary: store locally for now
    this.broadcastToCallbacks(event);
  }

  async getState(): Promise<Record<string, unknown>> {
    // TODO: Implement Android-specific state retrieval
    return {};
  }

  onRemoteEvent(callback: (event: BusEvent) => void): () => void {
    this.remoteCallbacks.add(callback);

    // TODO: Set up Android event listener (WebView bridge, etc.)

    return () => {
      this.remoteCallbacks.delete(callback);
    };
  }

  private broadcastToCallbacks(event: BusEvent): void {
    this.remoteCallbacks.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('[AndroidChannelAdapter] Callback error:', e);
      }
    });
  }

  destroy(): void {
    this.remoteCallbacks.clear();
  }
}