// Local inference types

export interface HardwareCapability {
  hasGPU: boolean;
  hasWASM: boolean;
  memoryGB: number;
  supportsQuantization: boolean;
  webGPUAvailable: boolean;
}

export interface LocalModelConfig {
  name: string;
  taskType: 'quick-summary' | 'tag-generation' | 'intent-classification';
  maxTokens: number;
  quantization: 'int4' | 'int8' | 'fp16';
  loaded: boolean;
  loadProgress?: number;
}

export interface LocalInferenceRequest {
  taskType: string;
  input: string;
  options?: {
    maxTokens?: number;
    temperature?: number;
  };
}

export interface LocalInferenceResult {
  success: boolean;
  output: string;
  latencyMs: number;
  fallback: 'cloud' | null;
  model?: string;
}

export interface InferenceTask {
  type: 'quick-summary' | 'tag-generation' | 'intent-classification';
  input: string;
  resolve: (result: LocalInferenceResult) => void;
  reject: (error: Error) => void;
}
