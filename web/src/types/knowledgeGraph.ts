/**
 * Knowledge Graph Types
 * Entity extraction and visualization types
 */

export type EntityType = 'person' | 'organization' | 'location' | 'event' | 'concept';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  description?: string;
  // Position in graph (calculated by layout)
  x?: number;
  y?: number;
}

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
}

export interface KnowledgeGraph {
  id: string;
  articleId: string;
  articleTitle: string;
  entities: Entity[];
  relations: Relation[];
  createdAt: number;
}

export interface KnowledgeGraphExtracted {
  entities: Array<{
    name: string;
    type: EntityType;
    description?: string;
  }>;
  relations: Array<{
    source: string;
    target: string;
    relation: string;
  }>;
}

// Entity type styling
export const ENTITY_COLORS: Record<EntityType, string> = {
  person: '#4A90D9',      // Blue
  organization: '#52c41a', // Green
  location: '#fa8c16',     // Orange
  event: '#eb2f96',        // Pink
  concept: '#722ed1',      // Purple
};

export const ENTITY_SHAPES: Record<EntityType, 'circle' | 'rect' | 'triangle' | 'diamond'> = {
  person: 'circle',
  organization: 'rect',
  location: 'triangle',
  event: 'circle',
  concept: 'diamond',
};

// Generate unique ID
export function generateEntityId(): string {
  return `entity_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateRelationId(): string {
  return `rel_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
