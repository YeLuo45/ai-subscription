/**
 * Event Bus - Cross-platform unified event bus
 * 
 * Architecture: nanobot MessageBus + ChannelAdapter pattern
 * 
 * Usage:
 *   import { createMessageBus, webChannelAdapter } from '@shared/lib/event-bus';
 *   
 *   const bus = createMessageBus({ deviceId: 'device-1', source: 'web' });
 *   bus.registerAdapter('web', webChannelAdapter);
 *   
 *   bus.subscribe('article_read', (event) => {
 *     console.log('Article read:', event.payload);
 *   });
 *   
 *   bus.publish({ type: 'article_read', payload: {...}, timestamp: Date.now(), source: 'web' });
 */

export * from './types';
export * from './message-bus';
export * from './sync-engine';
export * from './adapters';