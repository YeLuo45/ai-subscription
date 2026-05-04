/**
 * Tool Registry for AI Function Calling
 * Registers all available tools with their executors
 */

import type { ToolName } from './types/tool';
import { toolDefinitions } from './types/tool';
import { searchWeb } from '../utils/web-search';
import { evalMath } from '../utils/math-eval';
import { parseRSS } from '../utils/rss-parser';

type ToolExecuteFn = (params: unknown) => Promise<unknown>;

export const toolExecutors: Record<ToolName, ToolExecuteFn> = {
  web_search: async (params) => {
    const { query } = toolDefinitions.web_search.parameters.parse(params);
    return searchWeb(query);
  },

  fetch_rss: async (params) => {
    const { url } = toolDefinitions.fetch_rss.parameters.parse(params);
    return parseRSS(url);
  },

  calculate: async (params) => {
    const { expression } = toolDefinitions.calculate.parameters.parse(params);
    return evalMath(expression);
  },
};

export const toolList = Object.entries(toolDefinitions).map(([name, def]) => ({
  name,
  description: def.description,
  parameters: def.parameters,
}));
