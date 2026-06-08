/**
 * Stub for llm-router (excluded from build due to esbuild parse issue)
 * The real implementation in shared/lib/ai/llm-router.ts has a parser
 * issue with esbuild 0.18.20. Until upstream is fixed, this stub
 * satisfies the type imports in web/src.
 */
export type { TaskType } from './providers-ai-subscription';
export const routeAndCall = async () => ({ text: '', modelId: '', providerId: '' });
export const routeAndCallWithFallback = async () => ({ text: '', modelId: '', providerId: '' });
export const routeAndPrompt = async () => ({ text: '', modelId: '', providerId: '' });
export const routeAndStructuredCall = async () => ({ data: null, modelId: '', providerId: '' });
export const getRoutingExplanation = () => null;
export const isLocalCapableTask = () => false;
