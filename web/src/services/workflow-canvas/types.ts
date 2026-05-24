/**
 * Workflow Canvas Data Models
 * Defines the core types for the visual workflow editor
 */

// ============================================================
// SVG Node Types (Canvas Format)
// ============================================================

export type SVGNodeType = 'task' | 'gateway' | 'start' | 'end';

export interface SVGNode {
  id: string;
  type: SVGNodeType;
  x: number;
  y: number;
  label?: string;
  inputs?: string[];
  outputs?: string[];
}

// ============================================================
// Node Types
// ============================================================

export type WorkflowNodeType = 'trigger' | 'agent' | 'condition' | 'action' | 'merge';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  x: number;
  y: number;
  config: NodeConfig;
}

export interface NodeConfig {
  // Agent node config
  agentType?: 'extractor' | 'summarizer' | 'tagger' | 'translator' | 'custom';
  // Trigger node config
  triggerType?: 'rss' | 'manual' | 'scheduled';
  cronExpression?: string;
  // Condition node config
  conditionField?: 'content_length' | 'title_length' | 'tag_count' | 'has_summary' | 'source';
  conditionOperator?: 'gt' | 'lt' | 'eq' | 'neq' | 'contains';
  conditionValue?: string | number;
  // Action node config
  actionType?: 'push' | 'store' | 'notify' | 'webhook';
  actionConfig?: Record<string, any>;
  // Merge node config
  mergeType?: 'and' | 'or';
  // General config
  enabled?: boolean;
}

// ============================================================
// Edge Types
// ============================================================

export type SourcePort = 'out' | 'yes' | 'no';

export interface WorkflowEdge {
  id: string;
  source: string;      // source node id
  target: string;      // target node id
  sourcePort: SourcePort;
  targetPort: 'in';
}

// ============================================================
// Workflow Definition
// ============================================================

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Node Visual Config (for rendering)
// ============================================================

export interface NodeVisualConfig {
  width: number;
  height: number;
  color: string;
  icon: string;
  labelColor: string;
}

export const NODE_VISUAL_CONFIGS: Record<WorkflowNodeType, NodeVisualConfig> = {
  trigger: {
    width: 120,
    height: 60,
    color: '#1890ff',
    icon: '⚡',
    labelColor: '#fff',
  },
  agent: {
    width: 140,
    height: 70,
    color: '#52c41a',
    icon: '🤖',
    labelColor: '#fff',
  },
  condition: {
    width: 100,
    height: 80,
    color: '#faad14',
    icon: '🔀',
    labelColor: '#fff',
  },
  action: {
    width: 120,
    height: 60,
    color: '#f5222d',
    icon: '🎯',
    labelColor: '#fff',
  },
  merge: {
    width: 100,
    height: 60,
    color: '#722ed1',
    icon: '⊕',
    labelColor: '#fff',
  },
};

// ============================================================
// Agent Type Labels
// ============================================================

export const AGENT_TYPE_LABELS: Record<string, string> = {
  extractor: 'Extractor 提取器',
  summarizer: 'Summarizer 摘要器',
  tagger: 'Tagger 标签器',
  translator: 'Translator 翻译器',
  custom: 'Custom 自定义',
};

// ============================================================
// Trigger Type Labels
// ============================================================

export const TRIGGER_TYPE_LABELS: Record<string, string> = {
  rss: 'RSS 更新',
  manual: '手动触发',
  scheduled: '定时调度',
};

// ============================================================
// Action Type Labels
// ============================================================

export const ACTION_TYPE_LABELS: Record<string, string> = {
  push: '推送',
  store: '存储',
  notify: '通知',
  webhook: 'Webhook',
};

// ============================================================
// Execution State
// ============================================================

export type NodeExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface NodeExecutionState {
  nodeId: string;
  status: NodeExecutionStatus;
  startTime?: number;
  endTime?: number;
  error?: string;
  output?: any;
}

export interface WorkflowExecutionState {
  workflowId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  nodeStates: Record<string, NodeExecutionState>;
  startTime?: number;
  endTime?: number;
  currentNodeId?: string;
}