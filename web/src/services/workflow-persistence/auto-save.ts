/**
 * Auto-Save Service
 * Debounced save with dirty tracking
 */

import { createVersion, hasChangesSinceLastVersion, getLatest } from './version-manager';
import type { WorkflowCanvasData, SaveIndicatorState } from './types';

interface AutoSaveConfig {
  debounceMs: number;
  onStateChange?: (state: SaveIndicatorState) => void;
}

const DEFAULT_DEBOUNCE_MS = 300;

type SaveCallback = (versionId: string, versionNumber: number) => void | Promise<void>;

interface PendingSave {
  workflowId: string;
  workflowData: WorkflowCanvasData;
  callback?: SaveCallback;
}

/**
 * Simple debounce implementation
 */
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * AutoSaveManager handles debounced auto-save with dirty tracking
 */
class AutoSaveManager {
  private dirtyWorkflows: Set<string> = new Set();
  private pendingSaves: Map<string, PendingSave> = new Map();
  private saveInProgress: Set<string> = new Set();
  private debouncedSave: ReturnType<typeof debounce>;
  private config: AutoSaveConfig;
  private state: SaveIndicatorState = 'saved';
  private listeners: Set<(state: SaveIndicatorState) => void> = new Set();

  constructor(config: AutoSaveConfig = { debounceMs: DEFAULT_DEBOUNCE_MS }) {
    this.config = config;
    this.debouncedSave = debounce(
      this.performSave.bind(this),
      config.debounceMs
    );
  }

  /**
   * Subscribe to save state changes
   */
  subscribe(listener: (state: SaveIndicatorState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyStateChange(newState: SaveIndicatorState): void {
    this.state = newState;
    this.listeners.forEach(listener => {
      try {
        listener(newState);
      } catch {
        // Ignore listener errors
      }
    });
    this.config.onStateChange?.(newState);
  }

  /**
   * Mark a workflow as dirty (has unsaved changes)
   */
  markDirty(workflowId: string): void {
    this.dirtyWorkflows.add(workflowId);
    if (this.state === 'saved') {
      this.notifyStateChange('unsaved');
    }
  }

  /**
   * Mark a workflow as clean (saved)
   */
  markClean(workflowId: string): void {
    this.dirtyWorkflows.delete(workflowId);
    if (this.dirtyWorkflows.size === 0) {
      this.notifyStateChange('saved');
    }
  }

  /**
   * Check if workflow has unsaved changes
   */
  isDirty(workflowId: string): boolean {
    return this.dirtyWorkflows.has(workflowId);
  }

  /**
   * Get current save state
   */
  getState(): SaveIndicatorState {
    return this.state;
  }

  /**
   * Schedule an auto-save for a workflow
   */
  scheduleSave(
    workflowId: string,
    workflowData: WorkflowCanvasData,
    callback?: SaveCallback
  ): void {
    // Store the latest data
    this.pendingSaves.set(workflowId, {
      workflowId,
      workflowData,
      callback,
    });

    // Mark as dirty
    this.markDirty(workflowId);

    // Notify saving state
    this.notifyStateChange('saving');

    // Schedule the debounced save
    this.debouncedSave(workflowId);
  }

  /**
   * Immediately save a workflow (bypass debounce)
   */
  async saveNow(
    workflowId: string,
    workflowData: WorkflowCanvasData,
    callback?: SaveCallback
  ): Promise<string | null> {
    try {
      this.notifyStateChange('saving');
      const version = await createVersion(workflowId, workflowData);
      this.markClean(workflowId);
      this.pendingSaves.delete(workflowId);
      callback?.(version.id, version.version_number);
      return version.id;
    } catch (error) {
      this.notifyStateChange('error');
      throw error;
    }
  }

  /**
   * Perform the actual save (called by debounced function)
   */
  private async performSave(workflowId: string): Promise<void> {
    const pending = this.pendingSaves.get(workflowId);
    if (!pending) return;

    // Check if already saving
    if (this.saveInProgress.has(workflowId)) {
      // Reschedule for later
      this.debouncedSave(workflowId);
      return;
    }

    this.saveInProgress.add(workflowId);

    try {
      await this.saveNow(
        pending.workflowId,
        pending.workflowData,
        pending.callback
      );
    } finally {
      this.saveInProgress.delete(workflowId);
    }
  }

  /**
   * Check if there are pending changes since last version
   */
  async hasUnsavedChanges(workflowId: string, workflowData: WorkflowCanvasData): Promise<boolean> {
    // First check our dirty tracking
    if (this.isDirty(workflowId)) return true;

    // Then check the actual content
    return hasChangesSinceLastVersion(workflowId, workflowData);
  }

  /**
   * Clear all pending saves
   */
  clearPending(workflowId: string): void {
    this.pendingSaves.delete(workflowId);
  }

  /**
   * Reset manager state
   */
  reset(): void {
    this.dirtyWorkflows.clear();
    this.pendingSaves.clear();
    this.saveInProgress.clear();
    this.notifyStateChange('saved');
  }
}

// Singleton instance
let autoSaveInstance: AutoSaveManager | null = null;

/**
 * Get the singleton AutoSaveManager instance
 */
export function getAutoSaveManager(config?: AutoSaveConfig): AutoSaveManager {
  if (!autoSaveInstance) {
    autoSaveInstance = new AutoSaveManager(config);
  }
  return autoSaveInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetAutoSaveManager(): void {
  if (autoSaveInstance) {
    autoSaveInstance.reset();
  }
  autoSaveInstance = null;
}

export { AutoSaveManager, DEFAULT_DEBOUNCE_MS };
export type { AutoSaveConfig, SaveCallback };