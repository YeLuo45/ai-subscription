/**
 * Compression Plugin - gzip compression for sync data
 */

import type { PluginRegistration, PluginAPI } from '../types';
import { HookEvent } from '../types';

export const compressionPlugin: PluginRegistration = {
  manifest: {
    id: 'builtin/compression',
    name: 'Compression',
    version: '1.0.0',
    description: 'Compresses sync data using gzip to reduce storage and bandwidth',
    author: 'ai-subscription',
    hooks: [HookEvent.SYNC_BEFORE, HookEvent.SYNC_AFTER],
    enabled: true,
    builtin: true,
  },
  factory: (api: PluginAPI) => {
    api.registerHook(HookEvent.SYNC_BEFORE, async (context) => {
      if (context.syncContext?.operation === 'push') {
        api.setConfig('lastSyncBefore', context.timestamp);
      }
    });

    api.registerHook(HookEvent.SYNC_AFTER, async (context) => {
      if (context.syncContext?.operation === 'push') {
        api.setConfig('lastSyncAfter', context.timestamp);
      }
    });
  },
};

/**
 * Compress string data using gzip (using pako if available, otherwise Web API)
 */
export async function compressGzip(data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const uint8array = encoder.encode(data);
  
  // Use pako if available
  if (typeof window !== 'undefined' && (window as any).pako) {
    const pako = (window as any).pako;
    return pako.gzip(uint8array, { level: 6 });
  }
  
  // Fallback to Compression Streams API
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([uint8array as BlobPart]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const result = await new Response(compressedStream).arrayBuffer();
    return new Uint8Array(result);
  }
  
  // No compression available, return original
  return uint8array;
}

/**
 * Decompress gzip data (using pako if available, otherwise Web API)
 */
export async function decompressGzip(data: Uint8Array): Promise<string> {
  // Use pako if available
  if (typeof window !== 'undefined' && (window as any).pako) {
    const pako = (window as any).pako;
    const decompressed = pako.ungzip(data, { to: 'string' });
    return decompressed;
  }
  
  // Fallback to Compression Streams API
  if (typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([data as BlobPart]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
    const result = await new Response(decompressedStream).arrayBuffer();
    const decoder = new TextDecoder();
    return decoder.decode(result);
  }
  
  // No decompression available, try to return as string
  const decoder = new TextDecoder();
  return decoder.decode(data);
}