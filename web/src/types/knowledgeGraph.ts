// Knowledge Graph Types — Enhanced with cross-article linking and reasoning

export type EntityType = 'person' | 'organization' | 'location' | 'event' | 'concept';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  description?: string;
  x?: number;
  y?: number;
  // Cross-article tracking
  articleIds?: string[];    // articles this entity appears in
  mentionCount?: number;    // total mentions across all articles
  firstMentioned?: number;  // timestamp of first mention
  lastMentioned?: number;   // timestamp of last mention
  // Inferred (not directly extracted)
  inferred?: boolean;
  inferenceSource?: string; // how this was inferred
}

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  // Cross-article tracking
  articleIds?: string[];
  weight?: number;          // 0-1, computed from co-occurrence frequency
  inferred?: boolean;
  inferenceSource?: string;
}

export interface KnowledgeGraph {
  id: string;
  articleId: string;
  articleTitle: string;
  entities: Entity[];
  relations: Relation[];
  createdAt: number;
}

// Global knowledge graph — aggregated across all articles
export interface GlobalKnowledgeGraph {
  id: string;                  // 'global'
  entities: Entity[];
  relations: Relation[];
  updatedAt: number;
  stats: {
    totalEntities: number;
    totalRelations: number;
    articlesCovered: number;
    byType: Record<EntityType, number>;
  };
}

// Entity timeline entry
export interface EntityTimelineEntry {
  articleId: string;
  articleTitle: string;
  mentionedAt: number;
  context?: string;          // snippet around mention
}

// Cross-article entity resolution result
export interface MergedEntity extends Entity {
  sourceEntities: string[];  // original entity IDs that were merged
  articlesWithEntity: string[];
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
  person: '#4A90D9',
  organization: '#52c41a',
  location: '#fa8c16',
  event: '#eb2f96',
  concept: '#722ed1',
};

export const ENTITY_SHAPES: Record<EntityType, 'circle' | 'rect' | 'triangle' | 'diamond'> = {
  person: 'circle',
  organization: 'rect',
  location: 'triangle',
  event: 'circle',
  concept: 'diamond',
};

let _entityCounter = 0;
let _relationCounter = 0;

export function generateEntityId(): string {
  return `entity_${Date.now()}_${++_entityCounter}`;
}

export function generateRelationId(): string {
  return `relation_${Date.now()}_${++_relationCounter}`;
}
