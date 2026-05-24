/**
 * useAutoSave Hook
 * Debounced auto-save with dirty tracking for React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AutoSaveManager,
  getAutoSaveManager,
  resetAutoSaveManager,
  SaveIndicatorState,
} from '../services/workflow-persistence';
import type { WorkflowCanvasData } from '../services/workflow-persistence';

export interface UseAutoSaveOptions {
  debounceMs?: number;
  onStateChange?: (state: SaveIndicatorState) => void;
}

export interface UseAutoSaveResult {
  saveState: SaveIndicatorState;
  isDirty: boolean;
  scheduleSave: (workflowId: string, workflowData: WorkflowCanvasData) => void;
  saveNow: (workflowId: string, workflowData: WorkflowCanvasData) => Promise<string | null>;
  hasUnsavedChanges: (workflowId: string, workflowData: WorkflowCanvasData) => Promise<boolean>;
  markDirty: (workflowId: string) => void;
  markClean: (workflowId: string) => void;
}

export function useAutoSave(
  workflowId: string | null,
  workflowData: WorkflowCanvasData | null,
  options: UseAutoSaveOptions = {}
): UseAutoSaveResult {
  const { debounceMs = 300, onStateChange } = options;

  const managerRef = useRef<AutoSaveManager | null>(null);
  const [saveState, setSaveState] = useState<SaveIndicatorState>('saved');
  const [isDirty, setIsDirty] = useState(false);

  // Initialize manager
  useEffect(() => {
    managerRef.current = getAutoSaveManager({ debounceMs });
    const unsubscribe = managerRef.current.subscribe(state => {
      setSaveState(state);
      setIsDirty(state === 'unsaved');
      onStateChange?.(state);
    });
    return () => {
      unsubscribe();
    };
  }, [debounceMs, onStateChange]);

  // Track current workflow data changes
  useEffect(() => {
    if (workflowId && workflowData) {
      managerRef.current?.markDirty(workflowId);
    }
  }, [workflowId, workflowData]);

  const scheduleSave = useCallback(
    (wid: string, data: WorkflowCanvasData) => {
      managerRef.current?.scheduleSave(wid, data);
    },
    []
  );

  const saveNow = useCallback(
    async (wid: string, data: WorkflowCanvasData): Promise<string | null> => {
      return managerRef.current?.saveNow(wid, data) ?? null;
    },
    []
  );

  const hasUnsavedChanges = useCallback(
    async (wid: string, data: WorkflowCanvasData): Promise<boolean> => {
      return managerRef.current?.hasUnsavedChanges(wid, data) ?? false;
    },
    []
  );

  const markDirty = useCallback((wid: string) => {
    managerRef.current?.markDirty(wid);
  }, []);

  const markClean = useCallback((wid: string) => {
    managerRef.current?.markClean(wid);
  }, []);

  return {
    saveState,
    isDirty,
    scheduleSave,
    saveNow,
    hasUnsavedChanges,
    markDirty,
    markClean,
  };
}

// Reset manager helper for testing
export function useResetAutoSave(): () => void {
  return () => {
    resetAutoSaveManager();
  };
}