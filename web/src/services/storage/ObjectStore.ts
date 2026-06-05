/**
 * ObjectStore — S3-style object storage
 *
 * Inspired by: AWS S3 / GCS / Azure Blob
 *
 * Hierarchical key-value store with:
 *   - bucket: top-level container
 *   - key: hierarchical path within bucket
 *   - value: arbitrary data (string, binary, object)
 *   - metadata: key-value tags
 *   - versioning: per-key version history
 *
 * Operations:
 *   - put(bucket, key, value, options)
 *   - get(bucket, key, version?)
 *   - delete(bucket, key) - soft delete (marks deleted)
 *   - list(bucket, prefix?)
 *   - exists(bucket, key)
 *   - copy(src, dst)
 */

export interface ObjectMetadata {
  contentType?: string;
  size: number;
  createdAt: number;
  updatedAt: number;
  customTags?: Record<string, string>;
}

export interface StoredObject {
  bucket: string;
  key: string;
  value: unknown;
  metadata: ObjectMetadata;
  version: number;
  deleted: boolean;
  /** Version-id to uniquely identify a version */
  versionId: string;
}

export class ObjectStore {
  private buckets: Map<string, Map<string, StoredObject[]>> = new Map();
  private counter: number = 0;

  private nextId(): string {
    this.counter += 1;
    return `v-${Date.now().toString(36)}-${this.counter}`;
  }

  private getSize(value: unknown): number {
    if (typeof value === 'string') return value.length;
    if (value instanceof Uint8Array) return value.byteLength;
    return JSON.stringify(value).length;
  }

  /**
   * Create a bucket. Idempotent.
   */
  createBucket(name: string): void {
    if (!this.buckets.has(name)) this.buckets.set(name, new Map());
  }

  /**
   * Delete a bucket (must be empty).
   */
  deleteBucket(name: string): boolean {
    const b = this.buckets.get(name);
    if (!b) return false;
    if (b.size > 0) return false;
    this.buckets.delete(name);
    return true;
  }

  /** List all buckets. */
  listBuckets(): string[] {
    return Array.from(this.buckets.keys());
  }

  /**
   * Put an object. Auto-creates bucket if missing.
   * Returns the new StoredObject.
   */
  put(bucket: string, key: string, value: unknown, options: { contentType?: string; customTags?: Record<string, string> } = {}): StoredObject {
    if (!this.buckets.has(bucket)) this.buckets.set(bucket, new Map());
    const b = this.buckets.get(bucket)!;
    if (!b.has(key)) b.set(key, []);
    const list = b.get(key)!;
    const now = Date.now();
    const version = list.length > 0 ? list[list.length - 1].version + 1 : 1;
    const obj: StoredObject = {
      bucket,
      key,
      value,
      metadata: {
        contentType: options.contentType,
        size: this.getSize(value),
        createdAt: list.length > 0 ? list[0].metadata.createdAt : now,
        updatedAt: now,
        customTags: options.customTags,
      },
      version,
      deleted: false,
      versionId: this.nextId(),
    };
    list.push(obj);
    return obj;
  }

  /**
   * Get latest version of an object.
   */
  get(bucket: string, key: string, version?: number): StoredObject | undefined {
    const b = this.buckets.get(bucket);
    if (!b) return undefined;
    const list = b.get(key);
    if (!list || list.length === 0) return undefined;
    if (version !== undefined) {
      const found = list.find((o) => o.version === version);
      return found && !found.deleted ? found : undefined;
    }
    // Return latest non-deleted
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i].deleted) return list[i];
    }
    return undefined;
  }

  /**
   * Soft-delete: mark latest version as deleted. Preserves history.
   * To permanently remove, use purge().
   */
  delete(bucket: string, key: string): boolean {
    const b = this.buckets.get(bucket);
    if (!b) return false;
    const list = b.get(key);
    if (!list) return false;
    const latest = list[list.length - 1];
    if (!latest || latest.deleted) return false;
    latest.deleted = true;
    latest.metadata.updatedAt = Date.now();
    return true;
  }

  /**
   * Purge: permanently remove all versions of a key.
   */
  purge(bucket: string, key: string): boolean {
    const b = this.buckets.get(bucket);
    if (!b) return false;
    return b.delete(key);
  }

  /** Check if key exists (has non-deleted version). */
  exists(bucket: string, key: string): boolean {
    return this.get(bucket, key) !== undefined;
  }

  /**
   * List keys in a bucket, optionally filtered by prefix.
   */
  list(bucket: string, prefix: string = ''): string[] {
    const b = this.buckets.get(bucket);
    if (!b) return [];
    return Array.from(b.keys())
      .filter((k) => k.startsWith(prefix))
      .filter((k) => this.exists(bucket, k))
      .sort();
  }

  /**
   * Get version history of a key.
   */
  getVersions(bucket: string, key: string): StoredObject[] {
    const b = this.buckets.get(bucket);
    if (!b) return [];
    return [...(b.get(key) ?? [])];
  }

  /**
   * Copy an object to a new key (same or different bucket).
   */
  copy(srcBucket: string, srcKey: string, dstBucket: string, dstKey: string): boolean {
    const obj = this.get(srcBucket, srcKey);
    if (!obj) return false;
    this.put(dstBucket, dstKey, obj.value, {
      contentType: obj.metadata.contentType,
      customTags: obj.metadata.customTags,
    });
    return true;
  }

  /** Statistics. */
  stats(): { totalBuckets: number; totalKeys: number; totalVersions: number; totalSize: number } {
    let totalKeys = 0;
    let totalVersions = 0;
    let totalSize = 0;
    for (const b of this.buckets.values()) {
      totalKeys += b.size;
      for (const list of b.values()) {
        totalVersions += list.length;
        // Only count size of latest non-deleted version (current state)
        for (let i = list.length - 1; i >= 0; i--) {
          if (!list[i].deleted) {
            totalSize += list[i].metadata.size;
            break;
          }
        }
      }
    }
    return {
      totalBuckets: this.buckets.size,
      totalKeys,
      totalVersions,
      totalSize,
    };
  }
}
