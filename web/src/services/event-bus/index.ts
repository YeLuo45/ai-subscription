/**
 * Event Bus - Unified cross-platform event bus for ai-subscription
 * 
 * Architecture: nanobot MessageBus pattern with Channel Adapters
 * 
 * @example
 * // Initialize
 * import { createMessageBus, WebChannelAdapter } from './event-bus';
 * const bus = createMessageBus({ deviceId: 'my-device' });
 * bus.setAdapter(new WebChannelAdapter());
 * 
 * // Subscribe to events
 * const unsubscribe = bus.subscribe('article_read', (event) => {
 *   console.log('Article read:', event.payload);
 * });
 * 
 * // Publish events
 * bus.publish({
 *   id: 'event-123',
 *   type: 'article_read',
 *   payload: { articleId: '123', feedId: '456', progress: 50 },
 *   timestamp: Date.now(),
 *   source: 'web'
 * });
 */

export * from './types';
export { MessageBus, createMessageBus, getMessageBus } from './message-bus';
export { WebChannelAdapter } from './adapters/web-adapter';
export { SyncEngine, createSyncEngine } from './sync-engine';
export type { SyncState, SyncEvent } from './sync-engine';