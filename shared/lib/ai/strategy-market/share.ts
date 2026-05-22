/**
 * Strategy Import/Export and Sharing
 * Functions for sharing, importing, and exporting user strategies
 */

import type { UserStrategy, ExportedStrategy } from './types';

const EXPORT_VERSION = '1.0.0';

/**
 * Export a strategy to JSON string
 */
export function exportStrategy(strategy: UserStrategy): string {
  const exported: ExportedStrategy = {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    strategy,
  };
  return JSON.stringify(exported, null, 2);
}

/**
 * Import a strategy from JSON string
 */
export async function importStrategy(json: string): Promise<UserStrategy> {
  const data = JSON.parse(json);

  if (!data.strategy || !data.strategy.id) {
    throw new Error('Invalid strategy format');
  }

  const strategy = data.strategy as UserStrategy;

  // Generate new ID to avoid conflicts
  strategy.id = `imported-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  strategy.createdAt = Date.now();
  strategy.updatedAt = Date.now();
  strategy.isPublic = false; // Imported strategies are private by default

  return strategy;
}

/**
 * Share a strategy using Web Share API
 */
export async function shareStrategy(strategy: UserStrategy): Promise<void> {
  const shareData = {
    title: `AI Strategy: ${strategy.name}`,
    text: `Check out my AI routing strategy: ${strategy.name}. ${strategy.strategy.preferredProvider}/${strategy.strategy.preferredModel}`,
    url: `aisubscription://strategy/${strategy.id}`,
  };

  if (navigator.share) {
    await navigator.share(shareData);
  } else {
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(
      `${shareData.title}\n${shareData.text}\n${exportStrategy(strategy)}`
    );
    throw new Error('Share cancelled - copied to clipboard instead');
  }
}

/**
 * Copy a strategy link to clipboard
 */
export async function copyStrategyLink(id: string): Promise<void> {
  const link = `aisubscription://strategy/${id}`;
  await navigator.clipboard.writeText(link);
}

/**
 * Parse a strategy from a URL or text
 */
export function parseStrategyFromText(text: string): UserStrategy | null {
  try {
    // Check for URL format
    const urlMatch = text.match(/aisubscription:\/\/strategy\/([^?\s]+)/);
    if (urlMatch) {
      // This is just a link reference, not the full strategy
      return null;
    }

    // Try to parse as exported JSON
    const data = JSON.parse(text);
    if (data.strategy && data.strategy.id) {
      return data.strategy as UserStrategy;
    }
  } catch {
    // Not valid JSON
  }
  return null;
}
