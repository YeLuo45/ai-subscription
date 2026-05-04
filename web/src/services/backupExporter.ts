import type { Subscription, AIModel, AppSettings } from '../types';
import { getSubscriptions, getModels, getSettings } from './storage';

export interface BackupData {
  version: number;
  exportedAt: string;
  subscriptions: Subscription[];
  models: AIModel[];
  settings: AppSettings;
  includeArticles: boolean;
}

export async function exportAllData(includeArticles = false): Promise<BackupData> {
  const [subscriptions, models, settings] = await Promise.all([
    getSubscriptions(),
    getModels(),
    getSettings(),
  ]);
  
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    subscriptions,
    models,
    settings,
    includeArticles,
  };
}

export function downloadJSON(data: BackupData, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
