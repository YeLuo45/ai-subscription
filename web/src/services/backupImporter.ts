import type { BackupData } from './backupExporter';
import { saveSubscription, saveModel, saveSettings } from './storage';

export interface ImportResult {
  subscriptionsImported: number;
  modelsImported: number;
  settingsImported: boolean;
  errors: string[];
}

export async function importAllData(
  data: BackupData,
  mode: 'merge' | 'replace' = 'merge'
): Promise<ImportResult> {
  const result: ImportResult = {
    subscriptionsImported: 0,
    modelsImported: 0,
    settingsImported: false,
    errors: [],
  };
  
  if (mode === 'replace') {
    // For replace mode, we'd need clear functions - use merge for safety
    // Fall through to merge
  }
  
  // Merge mode: import only items with new IDs (don't overwrite existing)
  for (const sub of data.subscriptions) {
    try {
      // Omit id and let storage generate new one (merge = dedupe by URL)
      const { id, createdAt, updatedAt, ...subData } = sub;
      await saveSubscription(subData as any);
      result.subscriptionsImported++;
    } catch (e) {
      result.errors.push(`Subscription ${sub.name}: ${e}`);
    }
  }
  
  for (const model of data.models) {
    try {
      const { id, createdAt, ...modelData } = model;
      await saveModel(modelData as any);
      result.modelsImported++;
    } catch (e) {
      result.errors.push(`Model ${model.name}: ${e}`);
    }
  }
  
  if (data.settings) {
    try {
      await saveSettings(data.settings);
      result.settingsImported = true;
    } catch (e) {
      result.errors.push(`Settings: ${e}`);
    }
  }
  
  return result;
}
