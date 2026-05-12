// Local inference manager with cloud fallback

import { routeAndCall } from '@shared/lib/ai/llm-router';
import { detectHardware, canRunLocalModel } from './hardware-detector';
import { getModelForTask, LOCAL_MODELS } from './model-registry';
import type { LocalInferenceRequest, LocalInferenceResult, HardwareCapability } from './types';
import { localModelManager, LOCAL_MODELS as SHARED_LOCAL_MODELS } from '@shared/lib/ai/local-model';

let hardware: HardwareCapability | null = null;
let initialized = false;
let webllmInitialized = false;

// Simple keyword-based local classifier
const CLASSIFIER_RULES: Record<string, { keywords: string[]; category: string }[]> = {
  'add_source': [
    { keywords: ['添加', '新增', '加入', '订阅源', '源'], category: 'add_source' },
  ],
  'delete_source': [
    { keywords: ['删除', '移除', '取消', '订阅源', '源'], category: 'delete_source' },
  ],
  'search_articles': [
    { keywords: ['搜索', '查找', '找', '文章', '内容'], category: 'search_articles' },
  ],
  'create_tag': [
    { keywords: ['创建', '新建', '添加', '标签', 'tag'], category: 'create_tag' },
  ],
  'pause_source': [
    { keywords: ['暂停', '停止', '禁用'], category: 'pause_source' },
  ],
};

function localClassify(text: string): { category: string; confidence: number } {
  const lower = text.toLowerCase();
  
  for (const [, rules] of Object.entries(CLASSIFIER_RULES)) {
    for (const rule of rules) {
      const matchCount = rule.keywords.filter(k => lower.includes(k)).length;
      if (matchCount > 0) {
        return {
          category: rule.category,
          confidence: matchCount / rule.keywords.length,
        };
      }
    }
  }
  
  return { category: 'unknown', confidence: 0 };
}

async function localQuickSummary(text: string): Promise<string> {
  // Simple extraction-based summary
  const sentences = text.split(/[。！？\n]/).filter(s => s.trim().length > 10);
  if (sentences.length <= 3) {
    return text.slice(0, 500);
  }
  // Return first 3 sentences as summary
  return sentences.slice(0, 3).join('。') + '。';
}

async function localTagGeneration(text: string): Promise<string[]> {
  const tags: string[] = [];
  const lower = text.toLowerCase();
  
  const tagMap: Record<string, string[]> = {
    'ai': ['ai', '人工智能', '大模型', 'llm', 'gpt', 'chatgpt'],
    'tech': ['技术', '科技', '代码', '编程', '软件'],
    'news': ['新闻', '资讯', '最新', '今日'],
    'business': ['商业', '创业', '融资', '公司'],
    'science': ['科学', '研究', '实验', '发现'],
  };
  
  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some(k => lower.includes(k))) {
      tags.push(tag);
    }
  }
  
  return tags.length > 0 ? tags : ['general'];
}

export async function initializeLocalInference(): Promise<void> {
  if (initialized) return;
  hardware = await detectHardware();
  initialized = true;
  console.log('[LocalInference] Hardware:', hardware);
  console.log('[LocalInference] Can run local:', canRunLocalModel(hardware!));
  
  // Try to initialize WebLLM if hardware supports it
  if (hardware?.webGPUAvailable) {
    try {
      await localModelManager.loadModel('qwen2-0.5b', (p) => {
        console.log('[LocalInference] Model load progress:', p);
      });
      webllmInitialized = true;
      console.log('[LocalInference] WebLLM model loaded successfully');
    } catch (e) {
      console.warn('[LocalInference] Failed to load WebLLM model:', e);
      webllmInitialized = false;
    }
  }
}

/**
 * Check if any registered local model supports the given task type
 */
function getLocalModelForTaskType(taskType: string): string | null {
  // Map task types to capabilities
  const taskCapabilityMap: Record<string, 'classification' | 'summary' | 'translation'> = {
    'intent-classification': 'classification',
    'quick-summary': 'summary',
    'tag-generation': 'classification', // tags are like classification
  };
  
  const capability = taskCapabilityMap[taskType];
  if (!capability) return null;
  
  // Find a model that supports this capability
  const model = SHARED_LOCAL_MODELS.find(m => m.capabilities.includes(capability));
  return model?.id || null;
}

/**
 * Try to run inference using real local model (WebLLM)
 */
async function tryLocalModelInference(request: LocalInferenceRequest): Promise<LocalInferenceResult | null> {
  const start = Date.now();
  
  // Check if we have a model for this task
  const modelId = getLocalModelForTaskType(request.taskType);
  if (!modelId) return null;
  
  // Check if model is loaded
  if (!localModelManager.isModelLoaded(modelId)) {
    // Try to load it
    try {
      await localModelManager.loadModel(modelId);
    } catch (e) {
      console.warn('[LocalInference] Failed to load model:', e);
      return null;
    }
  }
  
  // Map task type to model task
  const taskCapabilityMap: Record<string, 'classification' | 'summary' | 'translation'> = {
    'intent-classification': 'classification',
    'quick-summary': 'summary',
    'tag-generation': 'classification',
  };
  
  try {
    const result = await localModelManager.infer({
      modelId,
      task: taskCapabilityMap[request.taskType] || 'classification',
      input: request.input,
      options: request.options,
    });
    
    return {
      success: true,
      output: result.output,
      latencyMs: Date.now() - start,
      fallback: null,
      model: `local-model:${modelId}`,
    };
  } catch (e) {
    console.warn('[LocalInference] Local model inference failed:', e);
    return null;
  }
}

export async function inferLocal(request: LocalInferenceRequest): Promise<LocalInferenceResult> {
  const start = Date.now();
  
  // Initialize on first use
  if (!initialized) {
    await initializeLocalInference();
  }
  
  // Try real local model first if available
  const localModelResult = await tryLocalModelInference(request);
  if (localModelResult && localModelResult.success) {
    return localModelResult;
  }
  
  // Check if local inference is feasible (for fallback keyword classifier)
  if (!hardware || !canRunLocalModel(hardware)) {
    return {
      success: false,
      output: '',
      latencyMs: Date.now() - start,
      fallback: 'cloud',
    };
  }
  
  try {
    let output = '';
    
    switch (request.taskType) {
      case 'intent-classification': {
        const result = localClassify(request.input);
        output = JSON.stringify({
          intent: result.category,
          confidence: result.confidence,
          response: `本地分类: ${result.category}`,
          needsConfirmation: false,
        });
        break;
      }
      case 'quick-summary': {
        output = await localQuickSummary(request.input);
        break;
      }
      case 'tag-generation': {
        const tags = await localTagGeneration(request.input);
        output = JSON.stringify({ tags });
        break;
      }
      default:
        throw new Error(`Unsupported task type: ${request.taskType}`);
    }
    
    return {
      success: true,
      output,
      latencyMs: Date.now() - start,
      fallback: null,
      model: 'local-classifier',
    };
  } catch (error) {
    console.error('[LocalInference] Error:', error);
    return {
      success: false,
      output: '',
      latencyMs: Date.now() - start,
      fallback: 'cloud',
    };
  }
}

export async function inferWithFallback(request: LocalInferenceRequest): Promise<LocalInferenceResult> {
  // Try local first
  const localResult = await inferLocal(request);
  
  if (localResult.success) {
    return localResult;
  }
  
  // Fallback to cloud
  const start = Date.now();
  
  try {
    const result = await routeAndCall({
      taskType: request.taskType as any,
      prompt: request.input,
      expectJson: request.taskType === 'intent-classification',
    });
    
    return {
      success: true,
      output: typeof result === 'string' ? result : JSON.stringify(result),
      latencyMs: Date.now() - start,
      fallback: 'cloud',
      model: 'cloud',
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      latencyMs: Date.now() - start,
      fallback: 'cloud',
    };
  }
}

export function getHardware(): HardwareCapability | null {
  return hardware;
}
