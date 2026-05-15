// Workflow Rule Types for Automation — Enhanced with branches, loops, conditions

// Comparison operators for condition evaluation
export type ComparisonOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains';

// Field types that can be compared
export type ConditionField =
  | 'title_length'
  | 'content_length'
  | 'article_age_hours'
  | 'tag_count'
  | 'has_summary'
  | 'source';

// Single condition clause
export interface ConditionClause {
  field: ConditionField;
  operator: ComparisonOperator;
  value: string | number | boolean;
}

// Branch: if/else if/else structure
export interface WorkflowBranch {
  id: string;
  conditions: ConditionClause[];
  actions: WorkflowAction[];
  label?: string;
}

// Loop: iterate over items
export interface WorkflowLoop {
  id: string;
  itemsField: 'tags' | 'sources' | 'keywords';
  actions: WorkflowAction[];
}

// Enhanced condition with operators
export interface WorkflowCondition {
  clauses: ConditionClause[];
}

export type WorkflowActionType =
  | 'add_tag'
  | 'send_telegram'
  | 'send_webhook'
  | 'mark_starred'
  | 'add_to_list'
  | 'http_request';

export interface WorkflowAction {
  type: WorkflowActionType;
  params: Record<string, any>;
}

export interface WorkflowRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: 'article_added' | 'keyword_detected' | 'sentiment_match' | 'source_match';
    keywords?: string[];
    sentiment?: string[];
    sources?: string[];
  };
  conditions?: {
    tags?: string[];
    minLength?: number;
  };
  preconditions?: WorkflowCondition;
  branches?: WorkflowBranch[];
  loop?: WorkflowLoop;
  actions: WorkflowAction[];
  createdAt: number;
}

export interface WorkflowLogEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  articleId: string;
  articleTitle: string;
  actionType: string;
  success: boolean;
  error?: string;
  timestamp: number;
}

export type TriggerType = WorkflowRule['trigger']['type'];
export type ActionType = WorkflowActionType;

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  article_added: '文章入库',
  keyword_detected: '关键词匹配',
  sentiment_match: '情感匹配',
  source_match: '来源匹配',
};

export const ACTION_LABELS: Record<ActionType, string> = {
  add_tag: '添加标签',
  send_telegram: '发送Telegram',
  send_webhook: '触发Webhook',
  mark_starred: '标记星标',
  add_to_list: '加入列表',
  http_request: 'HTTP请求',
};

export const OPERATOR_LABELS: Record<ComparisonOperator, string> = {
  eq: '等于',
  neq: '不等于',
  gt: '大于',
  lt: '小于',
  gte: '大于等于',
  lte: '小于等于',
  contains: '包含',
  not_contains: '不包含',
};

export const CONDITION_FIELD_LABELS: Record<ConditionField, string> = {
  title_length: '标题长度',
  content_length: '内容长度',
  article_age_hours: '文章时效(小时)',
  tag_count: '标签数量',
  has_summary: '已有摘要',
  source: '来源',
};
