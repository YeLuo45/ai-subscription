/**
 * useWorkflowPersistence Hook
 * Provides workflow persistence CRUD operations as React hooks
 */

import { useState, useEffect, useCallback } from 'react';
import {
  saveWorkflowMeta,
  loadById,
  listWorkflows,
  updateWorkflowMeta,
  softDelete,
  hardDelete,
  updateLastRunAt,
  getVersionsByWorkflowId,
  getLatestVersion,
} from '../services/workflow-persistence/workflow-store';
import { getVersions, getLatest, getVersionStats } from '../services/workflow-persistence/version-manager';
import type { WorkflowPersistenceMeta, WorkflowSnapshot } from '../services/workflow-persistence/types';
import type { WorkflowCanvasData } from '../services/workflow-persistence/types';

export interface UseWorkflowPersistenceResult {
  workflows: WorkflowPersistenceMeta[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  saveWorkflow: (
    name: string,
    description: string
  ) => Promise<WorkflowPersistenceMeta>;
  updateWorkflow: (
    id: string,
    updates: Partial<Pick<WorkflowPersistenceMeta, 'name' | 'description'>>
  ) => Promise<WorkflowPersistenceMeta | undefined>;
  deleteWorkflow: (id: string, hard?: boolean) => Promise<void>;
  markLastRun: (id: string) => Promise<void>;
  loadVersions: (workflowId: string) => Promise<WorkflowSnapshot[]>;
  loadLatestVersion: (workflowId: string) => Promise<WorkflowSnapshot | undefined>;
}

export function useWorkflowPersistence(): UseWorkflowPersistenceResult {
  const [workflows, setWorkflows] = useState<WorkflowPersistenceMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listWorkflows(false);
      setWorkflows(list);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load workflows'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveWorkflow = useCallback(
    async (name: string, description: string): Promise<WorkflowPersistenceMeta> => {
      const meta = await saveWorkflowMeta({
        name,
        description,
        last_run_at: null,
        is_deleted: false,
      });
      await refresh();
      return meta;
    },
    [refresh]
  );

  const updateWorkflow = useCallback(
    async (
      id: string,
      updates: Partial<Pick<WorkflowPersistenceMeta, 'name' | 'description'>>
    ): Promise<WorkflowPersistenceMeta | undefined> => {
      const updated = await updateWorkflowMeta(id, updates);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const deleteWorkflow = useCallback(
    async (id: string, hard = false): Promise<void> => {
      if (hard) {
        await hardDelete(id);
      } else {
        await softDelete(id);
      }
      await refresh();
    },
    [refresh]
  );

  const markLastRun = useCallback(async (id: string): Promise<void> => {
    await updateLastRunAt(id);
  }, []);

  const loadVersions = useCallback(
    async (workflowId: string): Promise<WorkflowSnapshot[]> => {
      return getVersions(workflowId);
    },
    []
  );

  const loadLatestVersion = useCallback(
    async (workflowId: string): Promise<WorkflowSnapshot | undefined> => {
      return getLatest(workflowId);
    },
    []
  );

  return {
    workflows,
    loading,
    error,
    refresh,
    saveWorkflow,
    updateWorkflow,
    deleteWorkflow,
    markLastRun,
    loadVersions,
    loadLatestVersion,
  };
}

export interface UseWorkflowVersionResult {
  versions: WorkflowSnapshot[];
  latestVersion: WorkflowSnapshot | undefined;
  stats: {
    totalVersions: number;
    latestVersion: number;
    oldestVersion: number | null;
    latestCreatedAt: number | null;
  };
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useWorkflowVersions(workflowId: string | null): UseWorkflowVersionResult {
  const [versions, setVersions] = useState<WorkflowSnapshot[]>([]);
  const [latestVersion, setLatestVersion] = useState<WorkflowSnapshot | undefined>();
  const [stats, setStats] = useState({
    totalVersions: 0,
    latestVersion: 0,
    oldestVersion: null as number | null,
    latestCreatedAt: null as number | null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!workflowId) {
      setVersions([]);
      setLatestVersion(undefined);
      setStats({
        totalVersions: 0,
        latestVersion: 0,
        oldestVersion: null,
        latestCreatedAt: null,
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [versionList, latest, versionStats] = await Promise.all([
        getVersions(workflowId),
        getLatest(workflowId),
        getVersionStats(workflowId),
      ]);
      setVersions(versionList);
      setLatestVersion(latest);
      setStats(versionStats);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load versions'));
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    versions,
    latestVersion,
    stats,
    loading,
    error,
    refresh,
  };
}