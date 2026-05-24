/**
 * Memory Layers - L0-L4 Layered Memory System
 * 
 * A hierarchical memory system for AI agents with:
 * - L0: Immediate memory (current session)
 * - L1: Episodic memory (session summaries)
 * - L2: Semantic memory (preferences, interests)
 * - L3: Skill memory (tools, workflows)
 * - L4: Metacognitive memory (self-reflection)
 */

// Types
export * from './types';

// Attention scoring
export * from './attention';

// Layer manager (core CRUD)
export * from './layer-manager';

// Cost tracker bridge
export * from './cost-linker';

// Main exports
export { layerManager } from './layer-manager';
export { costLinker } from './cost-linker';