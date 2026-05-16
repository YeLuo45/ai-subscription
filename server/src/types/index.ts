// Plugin types for the marketplace backend

export type PluginStatus = 'pending' | 'approved' | 'rejected';

export interface PluginManifest {
  name: string;
  version: string;
  author: string;
  description: string;
  homepage?: string;
  dependencies?: Record<string, string>;
  permissions?: string[];
}

export interface Plugin {
  id: string;
  namespace: string;
  name: string;
  version: string;
  author: string;
  description: string;
  homepage?: string;
  downloads: number;
  rating: number;
  status: PluginStatus;
  createdAt: string;
  updatedAt: string;
  versions: PluginVersion[];
}

export interface PluginVersion {
  id: string;
  pluginId: string;
  version: string;
  manifest: PluginManifest;
  signature: string;
  zipUrl: string;
  changelog?: string;
  createdAt: string;
}

export interface ReviewItem {
  id: string;
  pluginId: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer?: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  key: string;
  role: 'admin' | 'developer';
  owner?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreatePluginDto {
  namespace: string;
  name: string;
  author: string;
  description: string;
  homepage?: string;
  manifest: PluginManifest;
}

export interface CreateVersionDto {
  version: string;
  manifest: PluginManifest;
  signature: string;
  changelog?: string;
}

export interface UpdatePluginDto {
  name?: string;
  description?: string;
  homepage?: string;
  version?: string;
}