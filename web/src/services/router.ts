/**
 * Router Service - AI Model Routing Rules Engine
 * Routes tasks to optimal models based on task type and content characteristics
 */

import { 
  findModelForTask, 
  getFallbackChain,
  type TaskType,
  type RoutingCondition 
} from '@shared/lib/ai/providers-ai-subscription';

// Routing decision log for debugging and monitoring
export interface RoutingDecision {
  taskType: TaskType;
  selectedModel: string;
  selectedProvider: string;
  contentLength: number;
  reasoning: string;
  timestamp: number;
  fallbackAttempted: boolean;
  fallbackModel?: string;
}

const routingLog: RoutingDecision[] = [];
const MAX_LOG_SIZE = 100;

/**
 * Analyze content and determine the appropriate task type
 */
export function analyzeTaskType(
  content: string,
  explicitTaskType?: TaskType
): TaskType {
  // If explicit task type provided, use it
  if (explicitTaskType) {
    return explicitTaskType;
  }

  const length = content.length;

  // Content-based heuristics
  // Quick summary: <500 chars
  if (length < 500) {
    return 'quick-summary';
  }

  // Default to standard summary for medium content
  if (length < 5000) {
    return 'standard-summary';
  }

  // Longer content gets structured summary for better organization
  return 'structured-summary';
}

/**
 * Select the optimal model for a given task
 */
export function selectModel(
  taskType: TaskType,
  contentLength: number = 0
): { modelId: string; providerId: string; reasoning: string } {
  let reasoning = '';

  // Apply routing rules based on task type and content characteristics
  switch (taskType) {
    case 'translation':
      // Gemini 3.1 Flash for translation - cost effective and high quality
      reasoning = 'Translation: Gemini Flash for cost-effective high-quality translation';
      break;

    case 'quick-summary':
      // Gemini 3.1 Flash for short content
      if (contentLength < 500) {
        reasoning = 'Quick summary (<500 chars): Gemini Flash for fast, low-cost processing';
      } else {
        reasoning = 'Quick summary: Gemini Flash for efficient processing';
      }
      break;

    case 'standard-summary':
      // Claude Sonnet 4.6 for standard summaries - good balance of quality and cost
      reasoning = 'Standard summary: Claude Sonnet for balanced quality and performance';
      break;

    case 'structured-summary':
      // GPT-4o for structured output requiring multi-dimensional analysis
      reasoning = 'Structured summary: GPT-4o for complex multi-dimensional output';
      break;

    case 'tag-generation':
      // GPT-4o for accurate tag classification
      reasoning = 'Tag generation: GPT-4o for high-accuracy multi-tag classification';
      break;

    case 'knowledge-graph':
      // Gemini 3.1 Pro for deep entity relationship understanding
      reasoning = 'Knowledge graph: Gemini Pro for deep entity extraction and relationship understanding';
      break;

    case 'chat':
      // GPT-4o for conversational interaction
      reasoning = 'Chat: GPT-4o for natural language interaction';
      break;

    default:
      reasoning = `Unknown task type: ${taskType}, defaulting to Claude Sonnet`;
  }

  // Find model in registry
  const result = findModelForTask(taskType);
  
  if (result) {
    return {
      modelId: result.modelId,
      providerId: result.providerId,
      reasoning: reasoning + ` → Selected: ${result.modelId}`,
    };
  }

  // Fallback if no model found
  const fallbackResult = findModelForTask('standard-summary');
  if (fallbackResult) {
    return {
      modelId: fallbackResult.modelId,
      providerId: fallbackResult.providerId,
      reasoning: reasoning + ` → Fallback to: ${fallbackResult.modelId}`,
    };
  }

  // Ultimate fallback
  return {
    modelId: 'gpt-4o-mini',
    providerId: 'openai',
    reasoning: 'No suitable model found, using default fallback',
  };
}

/**
 * Get the fallback chain for retry logic
 */
export function getModelFallbackChain(taskType: TaskType): Array<{ modelId: string; providerId: string }> {
  return getFallbackChain(taskType);
}

/**
 * Log a routing decision for debugging and monitoring
 */
export function logRoutingDecision(decision: RoutingDecision): void {
  routingLog.push(decision);
  if (routingLog.length > MAX_LOG_SIZE) {
    routingLog.shift();
  }
  // Console log for visibility in development
  console.debug(`[Router] ${decision.taskType} → ${decision.selectedProvider}/${decision.modelId}: ${decision.reasoning}`);
}

/**
 * Get recent routing decisions
 */
export function getRecentRoutingDecisions(limit: number = 10): RoutingDecision[] {
  return routingLog.slice(-limit);
}

/**
 * Route and execute a task with automatic model selection and fallback
 */
export async function routeTask<T>(
  taskType: TaskType,
  content: string,
  executor: (modelId: string, providerId: string) => Promise<T>,
  explicitTaskType?: TaskType
): Promise<{ result: T; decision: RoutingDecision }> {
  // Analyze content to determine task type
  const determinedTaskType = analyzeTaskType(content, explicitTaskType);
  const { modelId, providerId, reasoning } = selectModel(determinedTaskType, content.length);

  // Get fallback chain
  const fallbackChain = getModelFallbackChain(determinedTaskType);
  let lastError: Error | undefined;

  // Try with primary model first
  try {
    const result = await executor(modelId, providerId);
    
    const decision: RoutingDecision = {
      taskType: determinedTaskType,
      selectedModel: modelId,
      selectedProvider: providerId,
      contentLength: content.length,
      reasoning,
      timestamp: Date.now(),
      fallbackAttempted: false,
    };
    
    logRoutingDecision(decision);
    return { result, decision };
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));
    console.warn(`[Router] Primary model ${providerId}/${modelId} failed: ${lastError.message}`);
  }

  // Try fallback models
  for (const fallback of fallbackChain) {
    if (fallback.modelId === modelId && fallback.providerId === providerId) {
      continue; // Skip primary model
    }

    try {
      const result = await executor(fallback.modelId, fallback.providerId);
      
      const decision: RoutingDecision = {
        taskType: determinedTaskType,
        selectedModel: fallback.modelId,
        selectedProvider: fallback.providerId,
        contentLength: content.length,
        reasoning: `${reasoning} → Fallback to ${fallback.modelId}`,
        timestamp: Date.now(),
        fallbackAttempted: true,
        fallbackModel: fallback.modelId,
      };
      
      logRoutingDecision(decision);
      return { result, decision };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[Router] Fallback model ${fallback.providerId}/${fallback.modelId} failed: ${lastError.message}`);
    }
  }

  // All models failed
  throw lastError || new Error('All models failed for task: ' + taskType);
}

/**
 * Route and execute a task with conditional routing
 * Takes conditions into account for model selection
 */
export async function routeTaskWithConditions<T>(
  taskType: TaskType,
  content: string,
  executor: (modelId: string, providerId: string) => Promise<T>,
  conditions: RoutingCondition,
  explicitTaskType?: TaskType
): Promise<{ result: T; decision: RoutingDecision }> {
  // Analyze content to determine task type
  const determinedTaskType = analyzeTaskType(content, explicitTaskType);
  
  // Build conditions with content length
  const fullConditions: RoutingCondition = {
    ...conditions,
    minContentLength: conditions.minContentLength ?? 0,
    maxContentLength: conditions.maxContentLength ?? content.length,
  };

  // Find model using conditions
  const modelInfo = findModelForTask(determinedTaskType, undefined, fullConditions);
  
  let modelId: string;
  let providerId: string;
  let reasoning: string;

  if (modelInfo) {
    modelId = modelInfo.modelId;
    providerId = modelInfo.providerId;
    reasoning = `Conditional routing for ${determinedTaskType}: ${modelInfo.model.id} (${modelInfo.model.routingCondition?.preference || 'default'})`;
  } else {
    // Fallback to standard selection
    const selected = selectModel(determinedTaskType, content.length);
    modelId = selected.modelId;
    providerId = selected.providerId;
    reasoning = selected.reasoning + ' (conditional routing fallback)';
  }

  // Get fallback chain
  const fallbackChain = getModelFallbackChain(determinedTaskType);
  let lastError: Error | undefined;

  // Try with primary model first
  try {
    const result = await executor(modelId, providerId);
    
    const decision: RoutingDecision = {
      taskType: determinedTaskType,
      selectedModel: modelId,
      selectedProvider: providerId,
      contentLength: content.length,
      reasoning,
      timestamp: Date.now(),
      fallbackAttempted: false,
    };
    
    logRoutingDecision(decision);
    return { result, decision };
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));
    console.warn(`[Router] Conditional model ${providerId}/${modelId} failed: ${lastError.message}`);
  }

  // Try fallback models
  for (const fallback of fallbackChain) {
    if (fallback.modelId === modelId && fallback.providerId === providerId) {
      continue; // Skip primary model
    }

    try {
      const result = await executor(fallback.modelId, fallback.providerId);
      
      const decision: RoutingDecision = {
        taskType: determinedTaskType,
        selectedModel: fallback.modelId,
        selectedProvider: fallback.providerId,
        contentLength: content.length,
        reasoning: `${reasoning} → Fallback to ${fallback.modelId}`,
        timestamp: Date.now(),
        fallbackAttempted: true,
        fallbackModel: fallback.modelId,
      };
      
      logRoutingDecision(decision);
      return { result, decision };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[Router] Fallback model ${fallback.providerId}/${fallback.modelId} failed: ${lastError.message}`);
    }
  }

  // All models failed
  throw lastError || new Error('All models failed for conditional task: ' + taskType);
}
