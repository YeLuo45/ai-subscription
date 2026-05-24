/**
 * Plugin System Types
 * PluginManifest, PluginHook, HookEvent definitions
 */

export enum HookEvent {
  SYNC_BEFORE = 'sync:before',
  SYNC_AFTER = 'sync:after',
  CONFLICT_DETECTED = 'conflict:detected',
  ADAPTER_CONNECT = 'adapter:connect',
  ADAPTER_DISCONNECT = 'adapter:disconnect',
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  /** Ordered list of hooks this plugin subscribes to */
  hooks: HookEvent[];
  /** Default enabled state */
  enabled?: boolean;
  /** Plugin configuration schema */
  configSchema?: Record<string, unknown>;
  /** Builtin plugins are bundled and cannot be removed */
  builtin?: boolean;
}

export interface PluginHook {
  /** Plugin manifest */
  manifest: PluginManifest;
  /** Current enabled state */
  enabled: boolean;
  /** Plugin instance reference */
  instance?: unknown;
}

export interface HookContext {
  event: HookEvent;
  timestamp: number;
  platform?: string;
  /** Sync-specific context */
  syncContext?: {
    feedId?: string;
    articleId?: string;
    operation?: 'fetch' | 'push' | 'merge';
  };
  /** Conflict-specific context */
  conflictContext?: {
    localVersion?: unknown;
    remoteVersion?: unknown;
    field?: string;
  };
}

export type HookHandler = (context: HookContext) => void | Promise<void>;

export interface PluginAPI {
  registerHook(event: HookEvent, handler: HookHandler): void;
  unregisterHook(event: HookEvent, handler: HookHandler): void;
  emit(event: HookEvent, context?: Partial<HookContext>): void | Promise<void>;
  getConfig(): Record<string, unknown>;
  setConfig(key: string, value: unknown): void;
}

/**
 * Plugin definition function signature
 */
export type PluginFactory = (api: PluginAPI) => void | Promise<void>;

export interface PluginRegistration {
  manifest: PluginManifest;
  factory: PluginFactory;
}