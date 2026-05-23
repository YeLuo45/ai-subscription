/**
 * Event Bus Adapters - Platform-specific channel adapter implementations
 */

// Web adapter - IndexedDB + localStorage for cross-tab sync
export { WebChannelAdapter } from './web-adapter';

// Platform adapters (frameworks - implement as needed)
export { MiniAppChannelAdapter } from './miniapp-adapter';
export { PCChannelAdapter } from './pc-adapter';
export { AndroidChannelAdapter } from './android-adapter';