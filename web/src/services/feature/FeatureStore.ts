/**
 * FeatureStore — feature storage with versioning
 *
 * Inspired by: ML feature stores (Tecton, Feast)
 *
 * Features are stored entities with namespaced keys and versioned values.
 * Each feature has:
 *   - entity: parent entity (e.g., user, item)
 *   - feature: feature name
 *   - value: the value
 *   - version: monotonic per (entity, feature)
 *   - timestamp: when written
 *   - ttlMs: optional expiration
 *
 * Supports:
 *   - get/set latest
 *   - get historical (specific version)
 *   - get between versions
 *   - bulk operations
 *   - TTL eviction
 */

export interface Feature {
  entity: string;
  feature: string;
  value: unknown;
  version: number;
  timestamp: number;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

export interface FeatureKey {
  entity: string;
  feature: string;
}

export class FeatureStore {
  private features: Map<string, Feature[]> = new Map();
  private counter: number = 0;

  private key(entity: string, feature: string): string {
    return `${entity}:${feature}`;
  }

  private nextVersion(): number {
    this.counter += 1;
    return this.counter;
  }

  /**
   * Set a feature value. Auto-assigns version per (entity, feature).
   */
  set(entity: string, feature: string, value: unknown, options: { ttlMs?: number; metadata?: Record<string, unknown> } = {}): Feature {
    const k = this.key(entity, feature);
    if (!this.features.has(k)) this.features.set(k, []);
    const list = this.features.get(k)!;
    const now = Date.now();
    const f: Feature = {
      entity,
      feature,
      value,
      version: list.length > 0 ? list[list.length - 1].version + 1 : 1,
      timestamp: now,
      expiresAt: options.ttlMs ? now + options.ttlMs : undefined,
      metadata: options.metadata,
    };
    list.push(f);
    return f;
  }

  /**
   * Get latest feature value.
   */
  get(entity: string, feature: string): Feature | undefined {
    const k = this.key(entity, feature);
    const list = this.features.get(k);
    if (!list || list.length === 0) return undefined;
    return list[list.length - 1];
  }

  /**
   * Get specific version of a feature.
   */
  getVersion(entity: string, feature: string, version: number): Feature | undefined {
    const k = this.key(entity, feature);
    const list = this.features.get(k);
    if (!list) return undefined;
    return list.find((f) => f.version === version);
  }

  /**
   * Get feature history (all versions) for an (entity, feature).
   */
  getHistory(entity: string, feature: string): Feature[] {
    const k = this.key(entity, feature);
    return [...(this.features.get(k) ?? [])];
  }

  /**
   * Get features between two versions (inclusive).
   */
  getRange(entity: string, feature: string, fromVersion: number, toVersion: number): Feature[] {
    const list = this.getHistory(entity, feature);
    return list.filter((f) => f.version >= fromVersion && f.version <= toVersion);
  }

  /**
   * Get all features for an entity (latest version of each feature).
   */
  getAllForEntity(entity: string): Record<string, Feature> {
    const result: Record<string, Feature> = {};
    for (const [k, list] of this.features) {
      const [e, f] = k.split(':');
      if (e === entity && list.length > 0) {
        result[f] = list[list.length - 1];
      }
    }
    return result;
  }

  /**
   * Bulk set: write multiple features at once.
   */
  bulkSet(features: Array<{ entity: string; feature: string; value: unknown; ttlMs?: number }>): Feature[] {
    return features.map((f) => this.set(f.entity, f.feature, f.value, { ttlMs: f.ttlMs }));
  }

  /**
   * Bulk get: retrieve multiple features.
   */
  bulkGet(keys: FeatureKey[]): Array<Feature | undefined> {
    return keys.map((k) => this.get(k.entity, k.feature));
  }

  /**
   * Sweep expired features. Removes features past their TTL.
   * Returns number removed.
   */
  sweep(): number {
    const now = Date.now();
    let removed = 0;
    for (const [k, list] of this.features) {
      const before = list.length;
      const remaining = list.filter((f) => !f.expiresAt || f.expiresAt > now);
      removed += before - remaining.length;
      if (remaining.length === 0) {
        this.features.delete(k);
      } else {
        this.features.set(k, remaining);
      }
    }
    return removed;
  }

  /** List all (entity, feature) pairs that have at least one value. */
  listKeys(): FeatureKey[] {
    return Array.from(this.features.keys()).map((k) => {
      const [entity, feature] = k.split(':');
      return { entity, feature };
    });
  }

  /** List all entity names. */
  listEntities(): string[] {
    const entities = new Set<string>();
    for (const [k] of this.features) {
      entities.add(k.split(':')[0]);
    }
    return Array.from(entities);
  }

  /** Delete a feature entirely (all versions). */
  delete(entity: string, feature: string): boolean {
    return this.features.delete(this.key(entity, feature));
  }

  /** Statistics. */
  stats(): {
    totalKeys: number;
    totalEntities: number;
    totalVersions: number;
  } {
    let totalVersions = 0;
    for (const list of this.features.values()) totalVersions += list.length;
    return {
      totalKeys: this.features.size,
      totalEntities: this.listEntities().length,
      totalVersions,
    };
  }
}
