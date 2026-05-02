/**
 * JSON Stream Parser
 * Parses incomplete JSON from streaming LLM responses using partial-json and jsonrepair
 */

import { parse as parsePartialJson, Allow } from 'partial-json';
import { repair as jsonrepair } from 'jsonrepair';

export interface ParserState {
  buffer: string;
  jsonStarted: boolean;
  lastCompleteIndex: number;
}

export interface ParseResult {
  success: boolean;
  items: unknown[];
  partial: string | null;
  error?: string;
}

/**
 * Create a new parser state
 */
export function createParserState(): ParserState {
  return {
    buffer: '',
    jsonStarted: false,
    lastCompleteIndex: 0,
  };
}

/**
 * Parse a streaming JSON chunk
 * Attempts to extract complete JSON items from the buffer, tolerating incomplete JSON
 *
 * @param chunk - The text chunk from the stream
 * @param state - Parser state (mutated in place)
 * @returns ParseResult with any complete items and remaining partial content
 */
export function parseStructuredChunk(
  chunk: string,
  state: ParserState
): ParseResult {
  state.buffer += chunk;

  // If we haven't found the start of JSON yet, look for [
  if (!state.jsonStarted) {
    const idx = state.buffer.indexOf('[');
    if (idx === -1) {
      // No JSON found yet, keep buffering
      return { success: true, items: [], partial: null };
    }
    // Trim anything before the [
    state.buffer = state.buffer.slice(idx);
    state.jsonStarted = true;
  }

  // Try to parse the buffer
  let parsed: unknown;
  let partial: string | null = null;

  try {
    // First try a full JSON parse (fast path for complete JSON)
    parsed = JSON.parse(state.buffer);
    // Successfully parsed complete JSON
    const items = Array.isArray(parsed) ? parsed : [parsed];
    state.buffer = '';
    state.lastCompleteIndex = 0;
    return { success: true, items, partial: null };
  } catch {
    // JSON incomplete - use partial-json to extract what's valid
    try {
      const partialResult = parsePartialJson(state.buffer, Allow.ARR | Allow.OBJ);
      if (partialResult !== null) {
        // partial-json can extract something useful
        const items = Array.isArray(partialResult) ? partialResult : [partialResult];
        // Find where the complete part ends
        // We'll use jsonrepair to get a valid JSON and compare
        const repaired = jsonrepair(state.buffer);
        // Check if repaired version is different in a way that indicates completion
        try {
          JSON.parse(repaired);
          // repaired is valid JSON - check if it's complete
          const repairedObj = JSON.parse(repaired);
          const repairedItems = Array.isArray(repairedObj) ? repairedObj : [repairedObj];
          // Only return if we got new complete items
          if (repairedItems.length > state.lastCompleteIndex) {
            const newItems = repairedItems.slice(state.lastCompleteIndex);
            state.lastCompleteIndex = repairedItems.length;
            state.buffer = '';
            return { success: true, items: newItems, partial: null };
          }
        } catch {
          // repaired is still incomplete, track partial
          partial = state.buffer;
        }
      }
    } catch {
      // partial-json failed, try jsonrepair
      try {
        const repaired = jsonrepair(state.buffer);
        // Check if repaired parses successfully
        const repairedObj = JSON.parse(repaired);
        const repairedItems = Array.isArray(repairedObj) ? repairedObj : [repairedObj];
        if (repairedItems.length > state.lastCompleteIndex) {
          const newItems = repairedItems.slice(state.lastCompleteIndex);
          state.lastCompleteIndex = repairedItems.length;
          // Keep buffer as-is since it's not complete
          partial = state.buffer;
          return { success: true, items: newItems, partial };
        }
        partial = state.buffer;
      } catch {
        // Both partial-json and jsonrepair failed, buffer is incomplete
        partial = state.buffer;
      }
    }
  }

  return {
    success: partial !== null,
    items: [],
    partial,
    error: partial === null ? 'Failed to parse JSON' : undefined,
  };
}

/**
 * Parse a streaming JSON array and yield complete items as they arrive
 */
export async function* parseStreamingJson(
  stream: AsyncGenerator<string>
): AsyncGenerator<unknown> {
  const state = createParserState();

  for await (const chunk of stream) {
    const result = parseStructuredChunk(chunk, state);
    for (const item of result.items) {
      yield item;
    }
  }
}
