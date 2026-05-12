// Local model manager using WebLLM

import type { LocalModelInfo, ModelLoadProgress, LocalInferenceRequest, LocalInferenceResult } from './types';
import { LOCAL_MODELS } from './model-registry';

// WebLLM types - will be loaded dynamically
interface WebLLMChat {
  chat: (messages: Array<{ role: string; content: string }>) => Promise<string>;
  unload?: () => Promise<void>;
}

interface WebLLMLLMChat {
  chat: (messages: Array<{ role: string; content: string }>) => Promise<string>;
  unload?: () => Promise<void>;
}

class LocalModelManager {
  private loadedModels: Map<string, WebLLMLLMChat> = new Map();
  private loadingPromises: Map<string, Promise<void>> = new Map();
  private webllmModule: any = null;

  /**
   * Dynamically load WebLLM module
   */
  private async getWebLLM(): Promise<any> {
    if (this.webllmModule) {
      return this.webllmModule;
    }
    
    try {
      // Try to import @mlc-ai/web-llm
      this.webllmModule = await import('@mlc-ai/web-llm');
      return this.webllmModule;
    } catch (e) {
      // Fallback: try global WebLLM from CDN
      console.warn('[LocalModelManager] @mlc-ai/web-llm not available, checking global...');
      if (typeof (window as any).webllm !== 'undefined') {
        this.webllmModule = (window as any).webllm;
        return this.webllmModule;
      }
      throw new Error('WebLLM not available. Please install @mlc-ai/web-llm or load WebLLM from CDN.');
    }
  }

  /**
   * Get model info by ID
   */
  private getModelInfo(modelId: string): LocalModelInfo | undefined {
    return LOCAL_MODELS.find(m => m.id === modelId);
  }

  /**
   * Load a model with progress callback
   */
  async loadModel(
    modelId: string,
    onProgress?: (p: ModelLoadProgress) => void
  ): Promise<void> {
    // If already loaded, skip
    if (this.loadedModels.has(modelId)) {
      onProgress?.({
        modelId,
        progress: 100,
        status: 'ready'
      });
      return;
    }

    // If currently loading, wait for it
    const existing = this.loadingPromises.get(modelId);
    if (existing) {
      return existing;
    }

    // Get model info
    const modelInfo = this.getModelInfo(modelId);
    if (!modelInfo) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Create loading promise
    const loadPromise = this.doLoadModel(modelInfo, onProgress);
    this.loadingPromises.set(modelId, loadPromise);

    try {
      await loadPromise;
    } finally {
      this.loadingPromises.delete(modelId);
    }
  }

  /**
   * Internal model loading logic
   */
  private async doLoadModel(
    modelInfo: LocalModelInfo,
    onProgress?: (p: ModelLoadProgress) => void
  ): Promise<void> {
    const { id, modelUrl } = modelInfo;

    try {
      // Report downloading status
      onProgress?.({
        modelId: id,
        progress: 0,
        status: 'downloading'
      });

      // Get WebLLM module
      const webllm = await this.getWebLLM();

      // Create progress callback for WebLLM
      const progressCallback = (progress: number, _progressText: string) => {
        // WebLLM progress is 0-1
        onProgress?.({
          modelId: id,
          progress: Math.round(progress * 100),
          status: progress < 1 ? 'downloading' : 'compiling'
        });
      };

      // Create new chat instance
      const chat = new webllm.LLMChat();

      // Load model - this downloads and compiles
      await chat.reload(modelUrl, progressCallback);

      // Store loaded model
      this.loadedModels.set(id, chat as unknown as WebLLMLLMChat);

      // Report ready
      onProgress?.({
        modelId: id,
        progress: 100,
        status: 'ready'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      onProgress?.({
        modelId: id,
        progress: 0,
        status: 'error',
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Run inference with loaded model
   */
  async infer(request: LocalInferenceRequest): Promise<LocalInferenceResult> {
    const { modelId, task, input, options } = request;
    const start = Date.now();

    // Ensure model is loaded
    if (!this.loadedModels.has(modelId)) {
      // Try to load it
      await this.loadModel(modelId);
    }

    const chat = this.loadedModels.get(modelId);
    if (!chat) {
      throw new Error(`Model not loaded: ${modelId}`);
    }

    // Build prompt based on task
    const prompt = this.buildPrompt(task, input, options);

    try {
      // Run inference
      const output = await chat.chat([
        { role: 'user', content: prompt }
      ]);

      const latency = Date.now() - start;

      return {
        modelId,
        output,
        latency,
        tokens: output.split(/\s+/).length // rough estimate
      };
    } catch (error) {
      throw new Error(`Inference failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build prompt for different tasks
   */
  private buildPrompt(
    task: 'classification' | 'summary' | 'translation',
    input: string,
    options?: { maxTokens?: number; temperature?: number }
  ): string {
    const maxTokens = options?.maxTokens || 256;

    switch (task) {
      case 'classification':
        return `请分类以下文本，只返回分类结果（一个字或词）：

${input}

分类：`; // Chinese: "Please classify the following text, only return the classification result (one word or phrase):"

      case 'summary':
        return `请用${maxTokens}个字概括以下内容：

${input}

概括：`; // "Please summarize the following in ~N characters:"

      case 'translation':
        return `翻译成英文：

${input}

翻译：`; // "Translate to English:"

      default:
        return input;
    }
  }

  /**
   * Check if model is loaded
   */
  isModelLoaded(modelId: string): boolean {
    return this.loadedModels.has(modelId);
  }

  /**
   * List all available models
   */
  listModels(): LocalModelInfo[] {
    return [...LOCAL_MODELS];
  }

  /**
   * Unload a model to free memory
   */
  async unloadModel(modelId: string): Promise<void> {
    const chat = this.loadedModels.get(modelId);
    if (chat && chat.unload) {
      await chat.unload();
    }
    this.loadedModels.delete(modelId);
  }

  /**
   * Check WebGPU availability
   */
  async isWebGPUSupported(): Promise<boolean> {
    try {
      const adapter = await navigator.gpu?.requestAdapter();
      return !!adapter;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const localModelManager = new LocalModelManager();
