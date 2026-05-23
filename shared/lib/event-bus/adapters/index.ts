/**
 * Event Bus Adapters - Platform-specific channel adapter implementations
 * 
 * 基于 nanobot MessageBus + thunderbolt PowerSync 架构
 */

// Web adapter - IndexedDB + localStorage for cross-tab sync
export { WebChannelAdapter } from './web-adapter';

// MiniApp adapter - 微信小程序 (full implementation)
export { MiniAppChannelAdapter, getMiniAppChannelAdapter, initializeMiniAppAdapter } from './miniapp';

// PC adapter - Electron 桌面端 (full implementation)
export { PCChannelAdapter, getPCChannelAdapter, initializePCAdapter, IPCBridge } from './pc';

// Android adapter - React Native (full implementation)
export { AndroidChannelAdapter, getAndroidChannelAdapter, initializeAndroidAdapter } from './android';