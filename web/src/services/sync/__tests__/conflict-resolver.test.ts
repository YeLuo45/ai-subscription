/**
 * Unit tests for ConflictResolver
 */

import { describe, it, expect } from 'vitest';
import { ConflictResolver, ConflictStrategy, type ConflictRecord } from '../conflict-resolver';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  describe('detect', () => {
    it('should return false when remote is null', () => {
      const local = { localUpdatedAt: 1000, serverUpdatedAt: 500 };
      expect(resolver.detect(local, null)).toBe(false);
    });

    it('should return false when local is null', () => {
      const remote = { localUpdatedAt: 1000 };
      expect(resolver.detect(null, remote)).toBe(false);
    });

    it('should return false when neither has been modified since sync', () => {
      const local = { localUpdatedAt: 200, serverUpdatedAt: 100 };
      const remote = { localUpdatedAt: 150 };
      const lastSyncTime = 200;
      
      expect(resolver.detect(local, remote, lastSyncTime)).toBe(false);
    });

    it('should return true when both modified after lastSyncTime', () => {
      const local = { localUpdatedAt: 400, serverUpdatedAt: 200 };
      const remote = { localUpdatedAt: 500 };
      const lastSyncTime = 300;
      
      expect(resolver.detect(local, remote, lastSyncTime)).toBe(true);
    });

    it('should detect conflict when local modified after sync and remote newer', () => {
      const local = { localUpdatedAt: 500, serverUpdatedAt: 200 };
      const remote = { localUpdatedAt: 600 };
      
      expect(resolver.detect(local, remote)).toBe(true);
    });
  });

  describe('resolve with LAST_WRITE_WINS', () => {
    it('should prefer remote when remote timestamp is newer', () => {
      const local = { id: '1', title: 'Local' };
      const remote = { id: '1', title: 'Remote' };
      
      const result = resolver.resolve(local, remote, ConflictStrategy.LAST_WRITE_WINS, 100, 200);
      
      expect(result.resolvedData).toEqual(remote);
      expect(result.strategy).toBe(ConflictStrategy.LAST_WRITE_WINS);
    });

    it('should prefer local when local timestamp is newer', () => {
      const local = { id: '1', title: 'Local' };
      const remote = { id: '1', title: 'Remote' };
      
      const result = resolver.resolve(local, remote, ConflictStrategy.LAST_WRITE_WINS, 300, 200);
      
      expect(result.resolvedData).toEqual(local);
    });

    it('should prefer remote when no timestamps provided', () => {
      const local = { id: '1', title: 'Local' };
      const remote = { id: '1', title: 'Remote' };
      
      const result = resolver.resolve(local, remote, ConflictStrategy.LAST_WRITE_WINS);
      
      expect(result.resolvedData).toEqual(remote);
    });
  });

  describe('resolve with SERVER_WINS', () => {
    it('should always prefer remote data', () => {
      const local = { id: '1', title: 'Local' };
      const remote = { id: '1', title: 'Remote' };
      
      const result = resolver.resolve(local, remote, ConflictStrategy.SERVER_WINS);
      
      expect(result.resolvedData).toEqual(remote);
      expect(result.strategy).toBe(ConflictStrategy.SERVER_WINS);
    });
  });

  describe('resolve with MANUAL', () => {
    it('should return local data as default', () => {
      const local = { id: '1', title: 'Local' };
      const remote = { id: '1', title: 'Remote' };
      
      const result = resolver.resolve(local, remote, ConflictStrategy.MANUAL);
      
      expect(result.resolvedData).toEqual(local);
      expect(result.strategy).toBe(ConflictStrategy.MANUAL);
    });
  });

  describe('detectFieldConflicts', () => {
    it('should detect no conflicts for identical objects', () => {
      const local = { id: '1', title: 'Test', content: 'Content' };
      const remote = { id: '1', title: 'Test', content: 'Content' };
      
      const conflicts = resolver.detectFieldConflicts(local, remote);
      
      expect(conflicts).toEqual([]);
    });

    it('should detect conflicting fields', () => {
      const local = { id: '1', title: 'Local Title' };
      const remote = { id: '1', title: 'Remote Title' };
      
      const conflicts = resolver.detectFieldConflicts(local, remote);
      
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].field).toBe('title');
      expect(conflicts[0].localValue).toBe('Local Title');
      expect(conflicts[0].remoteValue).toBe('Remote Title');
    });

    it('should detect multiple conflicting fields', () => {
      const local = { id: '1', title: 'Local', content: 'Local Content' };
      const remote = { id: '1', title: 'Remote', content: 'Remote Content' };
      
      const conflicts = resolver.detectFieldConflicts(local, remote);
      
      expect(conflicts.length).toBe(2);
    });

    it('should detect fields only in local', () => {
      const local = { id: '1', title: 'Test', extra: 'Local Only' };
      const remote = { id: '1', title: 'Test' };
      
      const conflicts = resolver.detectFieldConflicts(local, remote);
      
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].field).toBe('extra');
    });

    it('should handle empty objects', () => {
      const local = {};
      const remote = {};
      
      const conflicts = resolver.detectFieldConflicts(local, remote);
      
      expect(conflicts).toEqual([]);
    });
  });

  describe('autoMerge', () => {
    it('should merge non-conflicting fields from remote', () => {
      const local = { id: '1', title: 'Local Title', localOnly: 'value' };
      const remote = { id: '1', title: 'Remote Title', remoteOnly: 'value' };
      
      const result = resolver.autoMerge(local, remote);
      
      expect(result.hadConflicts).toBe(true);
      expect(result.merged.id).toBe('1');
      expect(result.merged.title).toBe('Remote Title');
      expect(result.merged.remoteOnly).toBe('value');
    });

    it('should apply LAST_WRITE_WINS for conflicting fields', () => {
      const local = { id: '1', title: 'Local', updatedAt: 300 };
      const remote = { id: '1', title: 'Remote', updatedAt: 200 };
      
      const result = resolver.autoMerge(local, remote, 300, 200);
      
      expect(result.merged.title).toBe('Local');
      expect(result.merged.updatedAt).toBe(300);
    });

    it('should handle no conflicts case', () => {
      const local = { id: '1', title: 'Same' };
      const remote = { id: '1', title: 'Same' };
      
      const result = resolver.autoMerge(local, remote);
      
      expect(result.hadConflicts).toBe(false);
    });
  });

  describe('createConflictRecord', () => {
    it('should create properly structured conflict record', () => {
      const localData = { id: '1', title: 'Local' };
      const remoteData = { id: '1', title: 'Remote' };
      
      const record = resolver.createConflictRecord(
        'article',
        'article-123',
        localData,
        remoteData,
        300,
        200
      );
      
      expect(record.id).toMatch(/^conflict_article-123_/);
      expect(record.entityType).toBe('article');
      expect(record.entityId).toBe('article-123');
      expect(record.localData).toEqual(localData);
      expect(record.remoteData).toEqual(remoteData);
      expect(record.localUpdatedAt).toBe(300);
      expect(record.remoteUpdatedAt).toBe(200);
      expect(record.detectedAt).toBeDefined();
    });
  });
});

describe('ConflictResolver singleton', () => {
  it('should return different instances when constructed directly', () => {
    const resolver1 = new ConflictResolver();
    const resolver2 = new ConflictResolver();
    expect(resolver1).not.toBe(resolver2);
  });
});

describe('ConflictStrategy enum', () => {
  it('should have correct values', () => {
    expect(ConflictStrategy.LAST_WRITE_WINS).toBe('last_write_wins');
    expect(ConflictStrategy.SERVER_WINS).toBe('server_wins');
    expect(ConflictStrategy.MANUAL).toBe('manual');
  });
});