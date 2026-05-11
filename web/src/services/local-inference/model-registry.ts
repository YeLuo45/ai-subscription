// Local model registry

import type { LocalModelConfig, HardwareCapability } from './types';
import { getRecommendedQuantization } from './hardware-detector';

// Pre-configured models
export const LOCAL_MODELS: Record<string, LocalModelConfig> = {
  'phi-3-mini': {
    name: 'Phi-3-mini',
    taskType: 'quick-summary',
    maxTokens: 2048,
    quantization: 'int4',
    loaded: false,
  },
  'qwen2-0.5b': {
    name: 'Qwen2-0.5B',
    taskType: 'tag-generation',
    maxTokens: 512,
    quantization: 'int4',
    loaded: false,
  },
  'local-classifier': {
    name: 'Local Keyword Classifier',
    taskType: 'intent-classification',
    maxTokens: 256,
    quantization: 'fp16',
    loaded: false,
  },
};

export function getModelForTask(taskType: string): LocalModelConfig | null {
  const entry = Object.values(LOCAL_MODELS).find(m => m.taskType === taskType);
  return entry || null;
}

export function selectBestModel(hardware: HardwareCapability): string {
  // For now, always use local-classifier as it's rule-based
  // In future, could select based on hardware capability
  if (hardware.memoryGB >= 8 && hardware.hasGPU) {
    return 'phi-3-mini';
  }
  if (hardware.memoryGB >= 4) {
    return 'qwen2-0.5b';
  }
  return 'local-classifier';
}
