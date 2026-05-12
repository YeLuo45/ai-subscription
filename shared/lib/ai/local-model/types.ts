// Local model types for WebLLM/Transformers.js

export interface LocalModelInfo {
  id: string;
  name: string;
  size: number;
  description: string;
  capabilities: ('classification' | 'summary' | 'translation')[];
  quantize: 'q4' | 'q8' | 'fp16';
  modelUrl: string;  // CDN URL
}

export interface ModelLoadProgress {
  modelId: string;
  progress: number;
  status: 'downloading' | 'compiling' | 'ready' | 'error';
  error?: string;
}

export interface LocalInferenceRequest {
  modelId: string;
  task: 'classification' | 'summary' | 'translation';
  input: string;
  options?: { maxTokens?: number; temperature?: number };
}

export interface LocalInferenceResult {
  modelId: string;
  output: string;
  latency: number;
  tokens?: number;
}
