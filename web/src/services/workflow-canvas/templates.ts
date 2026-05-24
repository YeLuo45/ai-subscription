/**
 * Built-in Workflow Templates
 * 4 templates as specified in PRD
 */

import type { WorkflowDefinition, WorkflowNode, WorkflowEdge } from './types';

// ============================================================
// Template 1: 标准摘要流
// trigger → extractor → summarizer → action(push)
// ============================================================

function createStandardSummaryTemplate(): WorkflowDefinition {
  const triggerId = 'node_trigger';
  const extractorId = 'node_extractor';
  const summarizerId = 'node_summarizer';
  const actionId = 'node_action';

  return {
    id: 'template_standard_summary',
    name: '标准摘要流',
    description: 'RSS更新 → 提取 → 摘要 → 推送',
    nodes: [
      {
        id: triggerId,
        type: 'trigger',
        label: 'RSS 触发',
        x: 50,
        y: 200,
        config: {
          triggerType: 'rss',
          enabled: true,
        },
      },
      {
        id: extractorId,
        type: 'agent',
        label: 'Extractor',
        x: 220,
        y: 200,
        config: {
          agentType: 'extractor',
          enabled: true,
        },
      },
      {
        id: summarizerId,
        type: 'agent',
        label: 'Summarizer',
        x: 400,
        y: 200,
        config: {
          agentType: 'summarizer',
          enabled: true,
        },
      },
      {
        id: actionId,
        type: 'action',
        label: '推送',
        x: 580,
        y: 200,
        config: {
          actionType: 'push',
          enabled: true,
        },
      },
    ],
    edges: [
      {
        id: 'edge_1',
        source: triggerId,
        target: extractorId,
        sourcePort: 'out',
        targetPort: 'in',
      },
      {
        id: 'edge_2',
        source: extractorId,
        target: summarizerId,
        sourcePort: 'out',
        targetPort: 'in',
      },
      {
        id: 'edge_3',
        source: summarizerId,
        target: actionId,
        sourcePort: 'out',
        targetPort: 'in',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================
// Template 2: 多语言推送流
// trigger → extractor → translator → action(push)
// ============================================================

function createMultiLanguageTemplate(): WorkflowDefinition {
  const triggerId = 'node_trigger';
  const extractorId = 'node_extractor';
  const translatorId = 'node_translator';
  const actionId = 'node_action';

  return {
    id: 'template_multi_language',
    name: '多语言推送流',
    description: 'RSS更新 → 提取 → 翻译 → 推送',
    nodes: [
      {
        id: triggerId,
        type: 'trigger',
        label: 'RSS 触发',
        x: 50,
        y: 200,
        config: {
          triggerType: 'rss',
          enabled: true,
        },
      },
      {
        id: extractorId,
        type: 'agent',
        label: 'Extractor',
        x: 220,
        y: 200,
        config: {
          agentType: 'extractor',
          enabled: true,
        },
      },
      {
        id: translatorId,
        type: 'agent',
        label: 'Translator',
        x: 400,
        y: 200,
        config: {
          agentType: 'translator',
          enabled: true,
        },
      },
      {
        id: actionId,
        type: 'action',
        label: '推送',
        x: 580,
        y: 200,
        config: {
          actionType: 'push',
          enabled: true,
        },
      },
    ],
    edges: [
      {
        id: 'edge_1',
        source: triggerId,
        target: extractorId,
        sourcePort: 'out',
        targetPort: 'in',
      },
      {
        id: 'edge_2',
        source: extractorId,
        target: translatorId,
        sourcePort: 'out',
        targetPort: 'in',
      },
      {
        id: 'edge_3',
        source: translatorId,
        target: actionId,
        sourcePort: 'out',
        targetPort: 'in',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================
// Template 3: 智能分类流
// trigger → extractor → tagger → action(store)
// ============================================================

function createSmartCategorizationTemplate(): WorkflowDefinition {
  const triggerId = 'node_trigger';
  const extractorId = 'node_extractor';
  const taggerId = 'node_tagger';
  const actionId = 'node_action';

  return {
    id: 'template_smart_categorization',
    name: '智能分类流',
    description: 'RSS更新 → 提取 → 标签分类 → 存储',
    nodes: [
      {
        id: triggerId,
        type: 'trigger',
        label: 'RSS 触发',
        x: 50,
        y: 200,
        config: {
          triggerType: 'rss',
          enabled: true,
        },
      },
      {
        id: extractorId,
        type: 'agent',
        label: 'Extractor',
        x: 220,
        y: 200,
        config: {
          agentType: 'extractor',
          enabled: true,
        },
      },
      {
        id: taggerId,
        type: 'agent',
        label: 'Tagger',
        x: 400,
        y: 200,
        config: {
          agentType: 'tagger',
          enabled: true,
        },
      },
      {
        id: actionId,
        type: 'action',
        label: '存储',
        x: 580,
        y: 200,
        config: {
          actionType: 'store',
          enabled: true,
        },
      },
    ],
    edges: [
      {
        id: 'edge_1',
        source: triggerId,
        target: extractorId,
        sourcePort: 'out',
        targetPort: 'in',
      },
      {
        id: 'edge_2',
        source: extractorId,
        target: taggerId,
        sourcePort: 'out',
        targetPort: 'in',
      },
      {
        id: 'edge_3',
        source: taggerId,
        target: actionId,
        sourcePort: 'out',
        targetPort: 'in',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================
// Template 4: 翻译+摘要流
// trigger → extractor → translator → summarizer → action(push)
// ============================================================

function createTranslateSummaryTemplate(): WorkflowDefinition {
  const triggerId = 'node_trigger';
  const extractorId = 'node_extractor';
  const translatorId = 'node_translator';
  const summarizerId = 'node_summarizer';
  const actionId = 'node_action';

  return {
    id: 'template_translate_summary',
    name: '翻译+摘要流',
    description: 'RSS更新 → 提取 → 翻译 → 摘要 → 推送',
    nodes: [
      {
        id: triggerId,
        type: 'trigger',
        label: 'RSS 触发',
        x: 30,
        y: 200,
        config: {
          triggerType: 'rss',
          enabled: true,
        },
      },
      {
        id: extractorId,
        type: 'agent',
        label: 'Extractor',
        x: 180,
        y: 200,
        config: {
          agentType: 'extractor',
          enabled: true,
        },
      },
      {
        id: translatorId,
        type: 'agent',
        label: 'Translator',
        x: 330,
        y: 200,
        config: {
          agentType: 'translator',
          enabled: true,
        },
      },
      {
        id: summarizerId,
        type: 'agent',
        label: 'Summarizer',
        x: 480,
        y: 200,
        config: {
          agentType: 'summarizer',
          enabled: true,
        },
      },
      {
        id: actionId,
        type: 'action',
        label: '推送',
        x: 630,
        y: 200,
        config: {
          actionType: 'push',
          enabled: true,
        },
      },
    ],
    edges: [
      {
        id: 'edge_1',
        source: triggerId,
        target: extractorId,
        sourcePort: 'out',
        targetPort: 'in',
      },
      {
        id: 'edge_2',
        source: extractorId,
        target: translatorId,
        sourcePort: 'out',
        targetPort: 'in',
      },
      {
        id: 'edge_3',
        source: translatorId,
        target: summarizerId,
        sourcePort: 'out',
        targetPort: 'in',
      },
      {
        id: 'edge_4',
        source: summarizerId,
        target: actionId,
        sourcePort: 'out',
        targetPort: 'in',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================
// Template with Condition Branch
// trigger → extractor → condition (yes/no branches) → action
// ============================================================

function createConditionalTemplate(): WorkflowDefinition {
  const triggerId = 'node_trigger';
  const extractorId = 'node_extractor';
  const conditionId = 'node_condition';
  const actionYesId = 'node_action_yes';
  const actionNoId = 'node_action_no';
  const mergeId = 'node_merge';

  return {
    id: 'template_conditional',
    name: '条件分支流',
    description: 'RSS更新 → 提取 → 条件判断 → 分支处理 → 合并',
    nodes: [
      {
        id: triggerId,
        type: 'trigger',
        label: 'RSS 触发',
        x: 50,
        y: 250,
        config: {
          triggerType: 'rss',
          enabled: true,
        },
      },
      {
        id: extractorId,
        type: 'agent',
        label: 'Extractor',
        x: 200,
        y: 250,
        config: {
          agentType: 'extractor',
          enabled: true,
        },
      },
      {
        id: conditionId,
        type: 'condition',
        label: '内容长度',
        x: 350,
        y: 250,
        config: {
          conditionField: 'content_length',
          conditionOperator: 'gt',
          conditionValue: 1000,
          enabled: true,
        },
      },
      {
        id: actionYesId,
        type: 'action',
        label: '详细摘要',
        x: 520,
        y: 150,
        config: {
          actionType: 'push',
          enabled: true,
        },
      },
      {
        id: actionNoId,
        type: 'action',
        label: '快速摘要',
        x: 520,
        y: 320,
        config: {
          actionType: 'push',
          enabled: true,
        },
      },
      {
        id: mergeId,
        type: 'merge',
        label: '合并',
        x: 680,
        y: 250,
        config: {
          mergeType: 'and',
          enabled: true,
        },
      },
    ],
    edges: [
      {
        id: 'edge_1',
        source: triggerId,
        target: extractorId,
        sourcePort: 'out',
        targetPort: 'in',
      },
      {
        id: 'edge_2',
        source: extractorId,
        target: conditionId,
        sourcePort: 'out',
        targetPort: 'in',
      },
      {
        id: 'edge_3',
        source: conditionId,
        target: actionYesId,
        sourcePort: 'yes',
        targetPort: 'in',
      },
      {
        id: 'edge_4',
        source: conditionId,
        target: actionNoId,
        sourcePort: 'no',
        targetPort: 'in',
      },
      {
        id: 'edge_5',
        source: actionYesId,
        target: mergeId,
        sourcePort: 'out',
        targetPort: 'in',
      },
      {
        id: 'edge_6',
        source: actionNoId,
        target: mergeId,
        sourcePort: 'out',
        targetPort: 'in',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================
// Export Templates
// ============================================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  createWorkflow: () => WorkflowDefinition;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'template_standard_summary',
    name: '标准摘要流',
    description: 'RSS更新 → 提取 → 摘要 → 推送，适合新闻资讯类内容',
    createWorkflow: createStandardSummaryTemplate,
  },
  {
    id: 'template_multi_language',
    name: '多语言推送流',
    description: 'RSS更新 → 提取 → 翻译 → 推送，适合外文内容消费',
    createWorkflow: createMultiLanguageTemplate,
  },
  {
    id: 'template_smart_categorization',
    name: '智能分类流',
    description: 'RSS更新 → 提取 → 标签分类 → 存储，适合内容归档',
    createWorkflow: createSmartCategorizationTemplate,
  },
  {
    id: 'template_translate_summary',
    name: '翻译+摘要流',
    description: 'RSS更新 → 提取 → 翻译 → 摘要 → 推送，适合深度阅读',
    createWorkflow: createTranslateSummaryTemplate,
  },
  {
    id: 'template_conditional',
    name: '条件分支流',
    description: '根据内容长度选择不同的处理路径，适合差异化处理',
    createWorkflow: createConditionalTemplate,
  },
];

/**
 * Create a new workflow from a template
 */
export function createWorkflowFromTemplate(templateId: string): WorkflowDefinition | null {
  const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
  if (!template) return null;

  const workflow = template.createWorkflow();
  // Generate new IDs for the instance
  const timestamp = Date.now();
  workflow.id = `workflow_${timestamp}`;
  workflow.name = `${template.name} (${new Date().toLocaleDateString()})`;
  workflow.createdAt = new Date().toISOString();
  workflow.updatedAt = new Date().toISOString();

  // Regenerate node and edge IDs
  const nodeIdMap: Record<string, string> = {};
  workflow.nodes = workflow.nodes.map((node, idx) => {
    const newId = `node_${timestamp}_${idx}`;
    nodeIdMap[node.id] = newId;
    return { ...node, id: newId };
  });

  workflow.edges = workflow.edges.map((edge, idx) => ({
    ...edge,
    id: `edge_${timestamp}_${idx}`,
    source: nodeIdMap[edge.source] || edge.source,
    target: nodeIdMap[edge.target] || edge.target,
  }));

  return workflow;
}

/**
 * Get all template names for display
 */
export function getTemplateList(): { id: string; name: string; description: string }[] {
  return WORKFLOW_TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
  }));
}