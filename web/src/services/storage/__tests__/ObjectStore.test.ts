/**
 * ObjectStore.test.ts — Pure unit tests for S3-style object storage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ObjectStore } from '../ObjectStore';

describe('ObjectStore — bucket management', () => {
  let s: ObjectStore;
  beforeEach(() => {
    s = new ObjectStore();
  });

  it('creates a bucket', () => {
    s.createBucket('my-bucket');
    expect(s.listBuckets()).toContain('my-bucket');
  });

  it('createBucket is idempotent', () => {
    s.createBucket('a');
    s.createBucket('a');
    expect(s.listBuckets().length).toBe(1);
  });

  it('deletes empty bucket', () => {
    s.createBucket('a');
    expect(s.deleteBucket('a')).toBe(true);
    expect(s.listBuckets()).toEqual([]);
  });

  it('refuses to delete non-empty bucket', () => {
    s.createBucket('a');
    s.put('a', 'k', 'v');
    expect(s.deleteBucket('a')).toBe(false);
  });

  it('deleteBucket returns false for unknown', () => {
    expect(s.deleteBucket('nope')).toBe(false);
  });
});

describe('ObjectStore — put and get', () => {
  let s: ObjectStore;
  beforeEach(() => {
    s = new ObjectStore();
    s.createBucket('b1');
  });

  it('puts and gets an object', () => {
    s.put('b1', 'k1', 'hello');
    expect(s.get('b1', 'k1')?.value).toBe('hello');
  });

  it('auto-creates bucket on put', () => {
    s.put('auto-bucket', 'k', 'v');
    expect(s.listBuckets()).toContain('auto-bucket');
  });

  it('returns undefined for unknown key', () => {
    expect(s.get('b1', 'nope')).toBeUndefined();
  });

  it('returns undefined for unknown bucket', () => {
    expect(s.get('nope', 'k')).toBeUndefined();
  });

  it('records metadata', () => {
    const obj = s.put('b1', 'k', 'hello', { contentType: 'text/plain' });
    expect(obj.metadata.contentType).toBe('text/plain');
    expect(obj.metadata.size).toBe(5);
  });

  it('records custom tags', () => {
    const obj = s.put('b1', 'k', 'v', { customTags: { env: 'prod' } });
    expect(obj.metadata.customTags?.env).toBe('prod');
  });

  it('handles binary data', () => {
    const bin = new Uint8Array([1, 2, 3, 4, 5]);
    s.put('b1', 'bin', bin);
    expect(s.get('b1', 'bin')?.value).toEqual(bin);
    expect(s.get('b1', 'bin')?.metadata.size).toBe(5);
  });

  it('handles object values', () => {
    s.put('b1', 'obj', { x: 1, y: 'hello' });
    expect(s.get('b1', 'obj')?.value).toEqual({ x: 1, y: 'hello' });
  });
});

describe('ObjectStore — versioning', () => {
  let s: ObjectStore;
  beforeEach(() => {
    s = new ObjectStore();
    s.createBucket('b');
  });

  it('auto-increments version on put', () => {
    s.put('b', 'k', 1);
    s.put('b', 'k', 2);
    s.put('b', 'k', 3);
    expect(s.get('b', 'k')?.version).toBe(3);
  });

  it('get specific version', () => {
    s.put('b', 'k', 'v1');
    s.put('b', 'k', 'v2');
    s.put('b', 'k', 'v3');
    expect(s.get('b', 'k', 1)?.value).toBe('v1');
    expect(s.get('b', 'k', 2)?.value).toBe('v2');
  });

  it('getVersions returns full history', () => {
    s.put('b', 'k', 'a');
    s.put('b', 'k', 'b');
    s.put('b', 'k', 'c');
    const versions = s.getVersions('b', 'k');
    expect(versions.length).toBe(3);
  });

  it('preserves createdAt across versions', () => {
    s.put('b', 'k', 1);
    const first = s.get('b', 'k')!.metadata.createdAt;
    s.put('b', 'k', 2);
    expect(s.get('b', 'k')!.metadata.createdAt).toBe(first);
  });
});

describe('ObjectStore — delete and purge', () => {
  let s: ObjectStore;
  beforeEach(() => {
    s = new ObjectStore();
    s.createBucket('b');
  });

  it('soft delete marks as deleted', () => {
    s.put('b', 'k', 'v');
    expect(s.delete('b', 'k')).toBe(true);
    expect(s.exists('b', 'k')).toBe(false);
  });

  it('soft delete preserves version history', () => {
    s.put('b', 'k', 'v1');
    s.put('b', 'k', 'v2');
    s.delete('b', 'k');
    expect(s.getVersions('b', 'k').length).toBe(2);
  });

  it('delete returns false for unknown', () => {
    expect(s.delete('b', 'nope')).toBe(false);
  });

  it('purge permanently removes', () => {
    s.put('b', 'k', 'v');
    s.purge('b', 'k');
    expect(s.exists('b', 'k')).toBe(false);
    expect(s.getVersions('b', 'k').length).toBe(0);
  });

  it('exists returns false for unknown', () => {
    expect(s.exists('b', 'nope')).toBe(false);
  });
});

describe('ObjectStore — list', () => {
  let s: ObjectStore;
  beforeEach(() => {
    s = new ObjectStore();
    s.createBucket('b');
  });

  it('list returns all keys', () => {
    s.put('b', 'a/1', 'v');
    s.put('b', 'a/2', 'v');
    s.put('b', 'b/1', 'v');
    expect(s.list('b').length).toBe(3);
  });

  it('list with prefix filters', () => {
    s.put('b', 'a/1', 'v');
    s.put('b', 'a/2', 'v');
    s.put('b', 'b/1', 'v');
    expect(s.list('b', 'a/').length).toBe(2);
  });

  it('list excludes deleted keys', () => {
    s.put('b', 'a', 'v');
    s.put('b', 'b', 'v');
    s.delete('b', 'a');
    expect(s.list('b').length).toBe(1);
  });

  it('list returns empty for unknown bucket', () => {
    expect(s.list('nope')).toEqual([]);
  });
});

describe('ObjectStore — copy', () => {
  let s: ObjectStore;
  beforeEach(() => {
    s = new ObjectStore();
    s.createBucket('src');
    s.createBucket('dst');
  });

  it('copies object between buckets', () => {
    s.put('src', 'k', 'hello');
    expect(s.copy('src', 'k', 'dst', 'k2')).toBe(true);
    expect(s.get('dst', 'k2')?.value).toBe('hello');
  });

  it('copies within same bucket', () => {
    s.put('src', 'k1', 'v');
    s.copy('src', 'k1', 'src', 'k2');
    expect(s.get('src', 'k2')?.value).toBe('v');
  });

  it('copy returns false for unknown source', () => {
    expect(s.copy('src', 'nope', 'dst', 'k')).toBe(false);
  });
});

describe('ObjectStore — stats', () => {
  it('reports counts and total size', () => {
    const s = new ObjectStore();
    s.createBucket('a');
    s.put('a', 'k1', 'hello');
    s.put('a', 'k2', 'world');
    s.put('a', 'k1', 'hello2');
    const stats = s.stats();
    expect(stats.totalBuckets).toBe(1);
    expect(stats.totalKeys).toBe(2);
    expect(stats.totalVersions).toBe(3);
    expect(stats.totalSize).toBe(11);
  });
});
