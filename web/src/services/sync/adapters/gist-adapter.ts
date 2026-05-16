/**
 * GitHub Gist Sync Adapter
 * Syncs data to GitHub Gist (user-provided, no server needed)
 */

import type { SyncAdapter, SyncRecord } from '../types';

const GIST_API = 'https://api.github.com/gists';

interface GistFile {
  content: string;
}

interface GistResponse {
  id: string;
  files: Record<string, GistFile>;
  updated_at: string;
}

export class GistAdapter implements SyncAdapter {
  private token: string;
  private gistId: string | null = null;
  private lastSyncTime: number | null = null;

  constructor(githubToken: string, gistId?: string) {
    this.token = githubToken;
    this.gistId = gistId ?? null;
  }

  async push(records: SyncRecord[]): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = this.buildGistPayload(records);
      const url = this.gistId ? `${GIST_API}/${this.gistId}` : GIST_API;
      const method = this.gistId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `GitHub API error: ${response.status} - ${errorText}` };
      }

      const gist: GistResponse = await response.json();
      this.gistId = gist.id;
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async pull(since: number): Promise<{ records: SyncRecord[]; error?: string }> {
    if (!this.gistId) {
      return { records: [], error: undefined };
    }

    try {
      const response = await fetch(`${GIST_API}/${this.gistId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        return { records: [], error: `GitHub API error: ${response.status}` };
      }

      const gist: GistResponse = await response.json();
      const syncData = this.parseGistData(gist);

      // Filter records updated since last sync
      const filtered = syncData.filter(r => r.localUpdatedAt > since);
      return { records: filtered, error: undefined };
    } catch (error) {
      return { records: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getLastSyncTime(): Promise<number | null> {
    return this.lastSyncTime;
  }

  async setLastSyncTime(time: number): Promise<void> {
    this.lastSyncTime = time;
  }

  private buildGistPayload(records: SyncRecord[]): Record<string, unknown> {
    const timestamp = new Date().toISOString();
    const content = JSON.stringify({
      version: 1,
      exportedAt: timestamp,
      records,
    });

    const filename = `ai-subscription-sync-${Date.now()}.json`;

    return {
      description: `AI Subscription Sync Backup - ${timestamp}`,
      public: false,
      files: {
        [filename]: { content },
        'sync-meta.json': {
          content: JSON.stringify({
            lastSync: timestamp,
            recordCount: records.length,
            version: 1,
          }),
        },
      },
    };
  }

  private parseGistData(gist: GistResponse): SyncRecord[] {
    const records: SyncRecord[] = [];

    for (const file of Object.values(gist.files)) {
      if (file.filename.endsWith('.json') && !file.filename.includes('sync-meta')) {
        try {
          const data = JSON.parse(file.content);
          if (data.records) {
            records.push(...data.records);
          }
        } catch {
          // Skip invalid JSON files
        }
      }
    }

    return records;
  }

  // ============================================================
  // Gist Discovery (find existing gist)
  // ============================================================

  static async findExistingGist(token: string): Promise<string | null> {
    try {
      const response = await fetch(GIST_API, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) return null;

      const gists = await response.json();
      const syncGist = gists.find((g: any) =>
        g.description?.includes('AI Subscription Sync')
      );

      return syncGist?.id ?? null;
    } catch {
      return null;
    }
  }
}