/**
 * Workflow Canvas Engine
 * Executes workflow definitions by driving the existing pipeline
 */

import type { WorkflowDefinition, WorkflowNode, WorkflowEdge, WorkflowExecutionState, NodeExecutionState } from './types';
import { createExtractorAgent, createSummarizerAgent, createTaggerAgent, createTranslatorAgent } from '../pipeline/agents';
import type { ExtractionResult, SummaryResult, TagResult, TranslationResult } from '../pipeline/types';

// ============================================================
// Article Context for Execution
// ============================================================

export interface ArticleInput {
  title: string;
  content: string;
  description?: string;
  link?: string;
  pubDate?: string;
  subscriptionId?: string;
  subscriptionName?: string;
}

// ============================================================
// Agent Result Types
// ============================================================

interface AgentResult<T = any> {
  agent: string;
  data: T;
  success: boolean;
  error?: string;
}

// ============================================================
// Node Executors
// ============================================================

type NodeExecutor = (
  node: WorkflowNode,
  input: any,
  context: ExecutionContext
) => Promise<{ output: any; nextNodeIds: string[] }>;

interface ExecutionContext {
  article: ArticleInput;
  state: WorkflowExecutionState;
  setNodeState: (nodeId: string, partial: Partial<NodeExecutionState>) => void;
}

async function executeExtractorNode(
  node: WorkflowNode,
  input: ArticleInput,
  context: ExecutionContext
): Promise<{ output: ExtractionResult; nextNodeIds: string[] }> {
  const extractor = createExtractorAgent();
  
  context.setNodeState(node.id, { status: 'running', startTime: Date.now() });
  
  try {
    const content = input.content || input.description || '';
    const result = await extractor(content);
    
    context.setNodeState(node.id, {
      status: 'completed',
      endTime: Date.now(),
      output: result.data,
    });
    
    return { output: result.data, nextNodeIds: [] };
  } catch (error) {
    context.setNodeState(node.id, {
      status: 'failed',
      endTime: Date.now(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function executeSummarizerNode(
  node: WorkflowNode,
  input: ExtractionResult,
  context: ExecutionContext
): Promise<{ output: SummaryResult; nextNodeIds: string[] }> {
  const summarizer = createSummarizerAgent();
  
  context.setNodeState(node.id, { status: 'running', startTime: Date.now() });
  
  try {
    const result = await summarizer(input);
    
    context.setNodeState(node.id, {
      status: 'completed',
      endTime: Date.now(),
      output: result.data,
    });
    
    return { output: result.data, nextNodeIds: [] };
  } catch (error) {
    context.setNodeState(node.id, {
      status: 'failed',
      endTime: Date.now(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function executeTaggerNode(
  node: WorkflowNode,
  input: ArticleInput,
  context: ExecutionContext
): Promise<{ output: TagResult; nextNodeIds: string[] }> {
  const tagger = createTaggerAgent();
  
  context.setNodeState(node.id, { status: 'running', startTime: Date.now() });
  
  try {
    const content = input.content || input.description || '';
    const result = await tagger(content);
    
    context.setNodeState(node.id, {
      status: 'completed',
      endTime: Date.now(),
      output: result.data,
    });
    
    return { output: result.data, nextNodeIds: [] };
  } catch (error) {
    context.setNodeState(node.id, {
      status: 'failed',
      endTime: Date.now(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function executeTranslatorNode(
  node: WorkflowNode,
  input: ArticleInput | ExtractionResult,
  context: ExecutionContext
): Promise<{ output: TranslationResult; nextNodeIds: string[] }> {
  const translator = createTranslatorAgent();
  
  context.setNodeState(node.id, { status: 'running', startTime: Date.now() });
  
  try {
    // Check if input is ArticleInput (has 'content' property) or not
    const article: ArticleInput = 'content' in input ? input : context.article;
    const result = await translator({
      title: article.title,
      description: article.description,
    });
    
    context.setNodeState(node.id, {
      status: 'completed',
      endTime: Date.now(),
      output: result.data,
    });
    
    return { output: result.data, nextNodeIds: [] };
  } catch (error) {
    context.setNodeState(node.id, {
      status: 'failed',
      endTime: Date.now(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function executeActionNode(
  node: WorkflowNode,
  input: any,
  context: ExecutionContext
): Promise<{ output: any; nextNodeIds: string[] }> {
  context.setNodeState(node.id, { status: 'running', startTime: Date.now() });
  
  const actionType = node.config?.actionType || 'push';
  
  try {
    // Execute action based on type
    switch (actionType) {
      case 'push':
        console.log('[WorkflowEngine] Push action:', input);
        break;
      case 'store':
        console.log('[WorkflowEngine] Store action:', input);
        break;
      case 'notify':
        console.log('[WorkflowEngine] Notify action:', input);
        break;
      case 'webhook':
        console.log('[WorkflowEngine] Webhook action:', input);
        break;
    }
    
    context.setNodeState(node.id, {
      status: 'completed',
      endTime: Date.now(),
      output: { action: actionType, processed: true },
    });
    
    return { output: { action: actionType, processed: true }, nextNodeIds: [] };
  } catch (error) {
    context.setNodeState(node.id, {
      status: 'failed',
      endTime: Date.now(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function executeConditionNode(
  node: WorkflowNode,
  input: any,
  context: ExecutionContext
): Promise<{ output: any; nextNodeIds: string[] }> {
  context.setNodeState(node.id, { status: 'running', startTime: Date.now() });
  
  const field = node.config?.conditionField || 'content_length';
  const operator = node.config?.conditionOperator || 'gt';
  const value = node.config?.conditionValue ?? 0;
  
  let conditionMet = false;
  
  if (field === 'content_length') {
    const contentLength = (context.article.content || context.article.description || '').length;
    conditionMet = evaluateCondition(contentLength, operator, value);
  } else if (field === 'title_length') {
    const titleLength = context.article.title.length;
    conditionMet = evaluateCondition(titleLength, operator, value);
  }
  
  context.setNodeState(node.id, {
    status: 'completed',
    endTime: Date.now(),
    output: { conditionMet, field, operator, value },
  });
  
  // Return next nodes based on condition
  const yesEdges = context.state.nodeStates[`${node.id}_yes`] 
    ? [node.id] // Will be resolved in executeWorkflow
    : [node.id];
  
  return { 
    output: { conditionMet }, 
    nextNodeIds: conditionMet ? ['yes'] : ['no'] 
  };
}

function evaluateCondition(value: number, operator: string, target: string | number): boolean {
  const numTarget = typeof target === 'string' ? parseFloat(target) : target;
  switch (operator) {
    case 'gt': return value > numTarget;
    case 'lt': return value < numTarget;
    case 'eq': return value === numTarget;
    case 'neq': return value !== numTarget;
    case 'gte': return value >= numTarget;
    case 'lte': return value <= numTarget;
    default: return false;
  }
}

async function executeMergeNode(
  node: WorkflowNode,
  input: any,
  context: ExecutionContext
): Promise<{ output: any; nextNodeIds: string[] }> {
  context.setNodeState(node.id, { status: 'running', startTime: Date.now() });
  
  // Merge node waits for all inputs and passes through
  context.setNodeState(node.id, {
    status: 'completed',
    endTime: Date.now(),
    output: input,
  });
  
  return { output: input, nextNodeIds: [] };
}

async function executeTriggerNode(
  node: WorkflowNode,
  input: any,
  context: ExecutionContext
): Promise<{ output: any; nextNodeIds: string[] }> {
  context.setNodeState(node.id, { status: 'completed', startTime: Date.now(), endTime: Date.now() });
  return { output: context.article, nextNodeIds: [] };
}

// ============================================================
// Node Executor Registry
// ============================================================

const NODE_EXECUTORS: Record<string, NodeExecutor> = {
  trigger: executeTriggerNode,
  agent: async (node, input, context) => {
    const agentType = node.config?.agentType || 'extractor';
    switch (agentType) {
      case 'extractor': return executeExtractorNode(node, input as ArticleInput, context);
      case 'summarizer': return executeSummarizerNode(node, input as ExtractionResult, context);
      case 'tagger': return executeTaggerNode(node, input as ArticleInput, context);
      case 'translator': return executeTranslatorNode(node, input as ArticleInput | ExtractionResult, context);
      default: return executeExtractorNode(node, input as ArticleInput, context);
    }
  },
  condition: executeConditionNode,
  action: executeActionNode,
  merge: executeMergeNode,
};

// ============================================================
// Graph Utilities
// ============================================================

function buildAdjacencyList(edges: WorkflowEdge[]): Map<string, { edge: WorkflowEdge; target: string }[]> {
  const adj = new Map<string, { edge: WorkflowEdge; target: string }[]>();
  
  for (const edge of edges) {
    if (!adj.has(edge.source)) {
      adj.set(edge.source, []);
    }
    adj.get(edge.source)!.push({ edge, target: edge.target });
  }
  
  return adj;
}

function getRootNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const nodeIds = new Set(nodes.map(n => n.id));
  const hasIncoming = new Set(edges.map(e => e.target));
  
  return nodes.filter(n => !hasIncoming.has(n.id));
}

function getOutgoingEdges(nodeId: string, edges: WorkflowEdge[]): WorkflowEdge[] {
  return edges.filter(e => e.source === nodeId);
}

function getNodeById(nodeId: string, nodes: WorkflowNode[]): WorkflowNode | undefined {
  return nodes.find(n => n.id === nodeId);
}

// ============================================================
// Main Execution Engine
// ============================================================

export type ProgressCallback = (state: WorkflowExecutionState) => void;
export type NodeCompleteCallback = (nodeId: string, output: any) => void;

export interface ExecuteOptions {
  onProgress?: ProgressCallback;
  onNodeComplete?: NodeCompleteCallback;
}

export async function executeWorkflow(
  workflow: WorkflowDefinition,
  article: ArticleInput,
  options: ExecuteOptions = {}
): Promise<{ success: boolean; outputs: Record<string, any>; error?: string }> {
  const { onProgress, onNodeComplete } = options;
  
  // Initialize execution state
  const state: WorkflowExecutionState = {
    workflowId: workflow.id,
    status: 'running',
    nodeStates: {},
    startTime: Date.now(),
  };
  
  // Initialize all nodes as pending
  for (const node of workflow.nodes) {
    state.nodeStates[node.id] = {
      nodeId: node.id,
      status: 'pending',
    };
  }
  
  const setNodeState = (nodeId: string, partial: Partial<NodeExecutionState>) => {
    if (state.nodeStates[nodeId]) {
      state.nodeStates[nodeId] = { ...state.nodeStates[nodeId], ...partial };
      onProgress?.(state);
    }
  };
  
  const context: ExecutionContext = {
    article,
    state,
    setNodeState,
  };
  
  try {
    // Find root nodes (typically triggers)
    const rootNodes = getRootNodes(workflow.nodes, workflow.edges);
    
    if (rootNodes.length === 0) {
      return { success: false, outputs: {}, error: 'No root nodes found in workflow' };
    }
    
    // Build adjacency list for traversal
    const adjacencyList = buildAdjacencyList(workflow.edges);
    
    // Track execution results
    const nodeOutputs = new Map<string, any>();
    
    // BFS/DFS execution from root nodes
    const executeNode = async (node: WorkflowNode, input: any): Promise<void> => {
      const executor = NODE_EXECUTORS[node.type];
      if (!executor) {
        console.warn(`[WorkflowEngine] No executor for node type: ${node.type}`);
        return;
      }
      
      state.currentNodeId = node.id;
      
      const result = await executor(node, input, context);
      nodeOutputs.set(node.id, result.output);
      
      onNodeComplete?.(node.id, result.output);
      
      // Find next nodes to execute
      let nextEdges: WorkflowEdge[] = [];
      
      if (result.nextNodeIds.length > 0) {
        // For condition nodes, use the port to find next edge
        for (const port of result.nextNodeIds) {
          const edge = getOutgoingEdges(node.id, workflow.edges).find(e => e.sourcePort === port);
          if (edge) {
            nextEdges.push(edge);
          }
        }
      } else {
        // For other nodes, follow all outgoing edges
        nextEdges = getOutgoingEdges(node.id, workflow.edges);
      }
      
      // Execute next nodes
      for (const edge of nextEdges) {
        const nextNode = getNodeById(edge.target, workflow.nodes);
        if (nextNode) {
          await executeNode(nextNode, nodeOutputs.get(node.id));
        }
      }
    };
    
    // Start execution from root nodes
    for (const rootNode of rootNodes) {
      await executeNode(rootNode, article);
    }
    
    // Mark as completed
    state.status = 'completed';
    state.endTime = Date.now();
    delete state.currentNodeId;
    onProgress?.(state);
    
    return { success: true, outputs: Object.fromEntries(nodeOutputs) };
    
  } catch (error) {
    state.status = 'failed';
    state.endTime = Date.now();
    onProgress?.(state);
    
    return { 
      success: false, 
      outputs: {}, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Validate a workflow definition
 */
export function validateWorkflow(workflow: WorkflowDefinition): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for nodes
  if (!workflow.nodes || workflow.nodes.length === 0) {
    errors.push('Workflow must have at least one node');
  }
  
  // Check for edges
  if (!workflow.edges || workflow.edges.length === 0) {
    errors.push('Workflow must have at least one edge');
  }
  
  // Check all edges reference valid nodes
  const nodeIds = new Set(workflow.nodes.map(n => n.id));
  for (const edge of (workflow.edges || [])) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id} references unknown source node: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} references unknown target node: ${edge.target}`);
    }
  }
  
  // Check for root nodes (nodes without incoming edges)
  const hasIncoming = new Set(workflow.edges.map(e => e.target));
  const rootNodes = workflow.nodes.filter(n => !hasIncoming.has(n.id));
  if (rootNodes.length === 0 && workflow.nodes.length > 0) {
    errors.push('Workflow must have at least one root node (node without incoming edges)');
  }
  
  return { valid: errors.length === 0, errors };
}