// Storage service - handles file system operations for plugin storage
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = process.env.DATA_DIR || '/data/plugins';
const VERSIONS_DIR = path.join(DATA_DIR, 'versions');
const PLUGINS_FILE = path.join(DATA_DIR, 'plugins.json');

// Ensure directories exist
function ensureDirectories(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(VERSIONS_DIR)) {
    fs.mkdirSync(VERSIONS_DIR, { recursive: true });
  }
}

export class StorageService {
  constructor() {
    ensureDirectories();
  }

  private readPluginsFile(): any[] {
    try {
      if (fs.existsSync(PLUGINS_FILE)) {
        const data = fs.readFileSync(PLUGINS_FILE, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error reading plugins file:', error);
    }
    return [];
  }

  private writePluginsFile(plugins: any[]): void {
    try {
      fs.writeFileSync(PLUGINS_FILE, JSON.stringify(plugins, null, 2));
    } catch (error) {
      console.error('Error writing plugins file:', error);
    }
  }

  async savePluginZip(buffer: Buffer, pluginId: string, version: string): Promise<string> {
    const versionDir = path.join(VERSIONS_DIR, pluginId);
    if (!fs.existsSync(versionDir)) {
      fs.mkdirSync(versionDir, { recursive: true });
    }
    const fileName = `${version}.zip`;
    const filePath = path.join(versionDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/versions/${pluginId}/${fileName}`;
  }

  async getPluginZip(pluginId: string, version: string): Promise<Buffer | null> {
    const filePath = path.join(VERSIONS_DIR, pluginId, `${version}.zip`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
    return null;
  }

  async deletePluginVersions(pluginId: string): Promise<void> {
    const versionDir = path.join(VERSIONS_DIR, pluginId);
    if (fs.existsSync(versionDir)) {
      fs.rmSync(versionDir, { recursive: true, force: true });
    }
  }

  getPlugins(): any[] {
    return this.readPluginsFile();
  }

  getPluginById(id: string): any | null {
    const plugins = this.readPluginsFile();
    return plugins.find((p: any) => p.id === id) || null;
  }

  savePlugin(plugin: any): void {
    const plugins = this.readPluginsFile();
    const index = plugins.findIndex((p: any) => p.id === plugin.id);
    if (index >= 0) {
      plugins[index] = plugin;
    } else {
      plugins.push(plugin);
    }
    this.writePluginsFile(plugins);
  }

  deletePlugin(id: string): void {
    const plugins = this.readPluginsFile();
    const filtered = plugins.filter((p: any) => p.id !== id);
    this.writePluginsFile(filtered);
  }

  generateId(): string {
    return uuidv4();
  }
}

export const storageService = new StorageService();
