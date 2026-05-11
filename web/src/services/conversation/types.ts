// Intent types for conversation management
export enum Intent {
  ADD_SOURCE = 'add_source',
  DELETE_SOURCE = 'delete_source',
  PAUSE_SOURCE = 'pause_source',
  RESUME_SOURCE = 'resume_source',
  CREATE_TAG = 'create_tag',
  DELETE_TAG = 'delete_tag',
  RENAME_TAG = 'rename_tag',
  BATCH_TAG = 'batch_tag',
  BATCH_DELETE = 'batch_delete',
  START_PIPELINE = 'start_pipeline',
  STOP_PIPELINE = 'stop_pipeline',
  UPDATE_PIPELINE = 'update_pipeline',
  SEARCH_ARTICLES = 'search_articles',
  UNKNOWN = 'unknown',
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface IntentEntities {
  sourceUrl?: string;
  sourceName?: string;
  sourceCategory?: string;
  tagName?: string;
  tagColor?: string;
  newTagName?: string;
  articleFilter?: {
    tags?: string[];
    keyword?: string;
    dateRange?: { start: Date; end: Date };
  };
  pipelineConfig?: Record<string, unknown>;
}

export interface IntentResult {
  intent: Intent;
  entities: IntentEntities;
  confidence: number;
  response: string;
  needsConfirmation: boolean;
  confirmationMessage?: string;
}

export interface OperationResult {
  success: boolean;
  message: string;
  data?: unknown;
}
