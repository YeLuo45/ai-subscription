/**
 * Plugin Types
 * Plugin interface and lifecycle hook definitions for router extensibility
 */

import type { RouteRequest, RouteResponse } from '../gateway/types';

/**
 * Router plugin interface for extensibility
 */
export interface RouterPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  onBeforeRoute?(context: RouteContext): Promise<void>;
  onAfterRoute?(result: RouteResult): Promise<void>;
  onError?(error: Error): Promise<void>;
  configSchema?: any;
}

/**
 * Context passed to onBeforeRoute hook
 */
export interface RouteContext {
  request: RouteRequest;
  timestamp: number;
}

/**
 * Result passed to onAfterRoute hook
 */
export interface RouteResult {
  response: RouteResponse;
  durationMs: number;
}
