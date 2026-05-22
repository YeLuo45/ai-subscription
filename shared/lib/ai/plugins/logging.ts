/**
 * Built-in Logging Plugin
 * Logs all route requests and responses for debugging and auditing
 */

import type { RouterPlugin } from './types';

export const loggingPlugin: RouterPlugin = {
  id: 'built-in-logging',
  name: 'Built-in Logging',
  version: '1.0.0',
  description: 'Logs all route requests and responses',
  onBeforeRoute(context) {
    console.log('[Plugin:Logging] Before route:', {
      taskType: context.request.taskType,
      tenantId: context.request.tenantId,
      userId: context.request.userId,
      timestamp: new Date(context.timestamp).toISOString(),
    });
  },
  onAfterRoute(result) {
    console.log('[Plugin:Logging] After route:', {
      modelId: result.response.modelId,
      providerId: result.response.providerId,
      durationMs: result.durationMs,
      hasUsage: !!result.response.usage,
    });
  },
  onError(error) {
    console.error('[Plugin:Logging] Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  },
};
