// Model registry for local models

import type { LocalModelInfo } from './types';

// Model registry - pre-configured local models
export const LOCAL_MODELS: LocalModelInfo[] = [
  {
    id: 'qwen2-0.5b',
    name: 'Qwen2-0.5B',
    size: 500 * 1024 * 1024, // 500MB
    description: '快速文本分类',
    capabilities: ['classification'],
    quantize: 'q4',
    modelUrl: 'https://huggingface.co/Qwen/Qwen2-0.5B-Instruct-GGUF/resolve/main/q4_0.gguf'
  }
];
