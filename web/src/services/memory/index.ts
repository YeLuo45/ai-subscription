/**
 * Memory Service - Unified Export
 * Five-layer memory architecture (L0-L4)
 */

// Types
export * from './types';

// Service
export { MemoryService, getMemoryService } from './memory-service';

// Individual layer exports for direct access
export { workingMemory } from './working-memory';
export { recentMemory } from './recent-memory';
export { episodeMemory } from './episode-memory';
export { semanticMemory } from './semantic-memory';
export { proceduralMemory } from './procedural-memory';