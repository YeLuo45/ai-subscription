/**
 * Builtin Plugins Index
 */

export { compressionPlugin } from './compression-plugin';
export { auditPlugin } from './audit-plugin';

import type { PluginRegistration } from '../types';
import { compressionPlugin } from './compression-plugin';
import { auditPlugin } from './audit-plugin';

/**
 * All builtin plugins
 */
export const builtinPlugins: PluginRegistration[] = [
  compressionPlugin,
  auditPlugin,
];