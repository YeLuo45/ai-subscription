/**
 * Event Bus - Web Service Layer
 * 
 * Web-specific implementation - uses local types and adapters
 * Cross-platform adapters live in shared/lib/event-bus/adapters/
 */

export { WebChannelAdapter } from './adapters/web-adapter';
export { MessageBus, createMessageBus, getMessageBus } from './message-bus';
export * from './types';
export * from './sync-engine';