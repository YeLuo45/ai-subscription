// Plugin service - business logic for plugin CRUD and version management
import { storageService } from './storage-service';
import { Plugin, PluginVersion, CreatePluginDto, CreateVersionDto, UpdatePluginDto } from '../types';

export class PluginService {
  private plugins: Map<string, Plugin> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const plugins = storageService.getPlugins();
    plugins.forEach(p => this.plugins.set(p.id, p));
  }

  async createPlugin(dto: CreatePluginDto): Promise<Plugin> {
    const id = storageService.generateId();
    const now = new Date().toISOString();
    
    const plugin: Plugin = {
      id,
      namespace: dto.namespace,
      name: dto.name,
      version: dto.manifest.version,
      author: dto.author,
      description: dto.description,
      homepage: dto.homepage,
      downloads: 0,
      rating: 0,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      versions: []
    };

    this.plugins.set(id, plugin);
    storageService.savePlugin(plugin);
    return plugin;
  }

  async getPluginById(id: string): Promise<Plugin | null> {
    return this.plugins.get(id) || null;
  }

  async getPlugins(page: number = 1, pageSize: number = 20, status?: string): Promise<{ data: Plugin[], total: number }> {
    let plugins = Array.from(this.plugins.values());
    
    if (status) {
      plugins = plugins.filter(p => p.status === status);
    }

    // Sort by updatedAt descending
    plugins.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const total = plugins.length;
    const start = (page - 1) * pageSize;
    const data = plugins.slice(start, start + pageSize);

    return { data, total };
  }

  async updatePlugin(id: string, dto: UpdatePluginDto): Promise<Plugin | null> {
    const plugin = this.plugins.get(id);
    if (!plugin) return null;

    if (dto.name) plugin.name = dto.name;
    if (dto.description) plugin.description = dto.description;
    if (dto.homepage) plugin.homepage = dto.homepage;
    if (dto.version) plugin.version = dto.version;
    plugin.updatedAt = new Date().toISOString();

    storageService.savePlugin(plugin);
    return plugin;
  }

  async deletePlugin(id: string): Promise<boolean> {
    const existed = this.plugins.has(id);
    if (existed) {
      this.plugins.delete(id);
      await storageService.deletePluginVersions(id);
      storageService.deletePlugin(id);
    }
    return existed;
  }

  async addVersion(pluginId: string, dto: CreateVersionDto, zipUrl: string): Promise<PluginVersion | null> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return null;

    const version: PluginVersion = {
      id: storageService.generateId(),
      pluginId,
      version: dto.version,
      manifest: dto.manifest,
      signature: dto.signature,
      zipUrl,
      changelog: dto.changelog,
      createdAt: new Date().toISOString()
    };

    plugin.versions.push(version);
    plugin.version = dto.version;
    plugin.updatedAt = new Date().toISOString();
    
    storageService.savePlugin(plugin);
    return version;
  }

  async getVersions(pluginId: string): Promise<PluginVersion[]> {
    const plugin = this.plugins.get(pluginId);
    return plugin?.versions || [];
  }

  async incrementDownloads(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.downloads++;
      storageService.savePlugin(plugin);
    }
  }

  async updateRating(pluginId: string, rating: number): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.rating = (plugin.rating * plugin.downloads + rating) / (plugin.downloads + 1);
      plugin.downloads++;
      storageService.savePlugin(plugin);
    }
  }
}

export const pluginService = new PluginService();
