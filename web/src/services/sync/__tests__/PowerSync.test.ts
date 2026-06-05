/**
 * PowerSync.test.ts + VersionVector.test.ts — Pure unit tests for sync
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VersionVector } from '../VersionVector';
import { PowerSync, type Change } from '../PowerSync';

describe('VersionVector — basic ops', () => {
  it('starts with all zeros', () => {
    const v = new VersionVector();
    expect(v.get('a')).toBe(0);
    expect(v.size()).toBe(0);
  });

  it('accepts initial map', () => {
    const v = new VersionVector({ a: 1, b: 2 });
    expect(v.get('a')).toBe(1);
    expect(v.get('b')).toBe(2);
  });

  it('increment returns new value', () => {
    const v = new VersionVector();
    expect(v.increment('a')).toBe(1);
    expect(v.increment('a')).toBe(2);
    expect(v.get('a')).toBe(2);
  });

  it('rejects negative counter', () => {
    const v = new VersionVector();
    expect(() => v.set('a', -1)).toThrow('non-negative integer');
  });

  it('rejects non-integer counter', () => {
    const v = new VersionVector();
    expect(() => v.set('a', 1.5)).toThrow('non-negative integer');
  });

  it('toObject / serialize / deserialize', () => {
    const v = new VersionVector({ a: 1, b: 2 });
    expect(v.toObject()).toEqual({ a: 1, b: 2 });
    const s = v.serialize();
    const v2 = VersionVector.deserialize(s);
    expect(v2.get('a')).toBe(1);
    expect(v2.get('b')).toBe(2);
  });

  it('sum / max / size', () => {
    const v = new VersionVector({ a: 3, b: 5, c: 2 });
    expect(v.sum()).toBe(10);
    expect(v.max()).toBe(5);
    expect(v.size()).toBe(3);
  });
});

describe('VersionVector — compare and merge', () => {
  it('compare returns 0 for equal', () => {
    const a = new VersionVector({ a: 1, b: 2 });
    const b = new VersionVector({ a: 1, b: 2 });
    expect(a.compare(b)).toBe(0);
  });

  it('compare returns -1 when this < other', () => {
    const a = new VersionVector({ a: 1, b: 2 });
    const b = new VersionVector({ a: 1, b: 3 });
    expect(a.compare(b)).toBe(-1);
  });

  it('compare returns 1 when this > other', () => {
    const a = new VersionVector({ a: 2 });
    const b = new VersionVector({ a: 1 });
    expect(a.compare(b)).toBe(1);
  });

  it('compare returns 2 for concurrent', () => {
    const a = new VersionVector({ a: 2, b: 1 });
    const b = new VersionVector({ a: 1, b: 2 });
    expect(a.compare(b)).toBe(2);
  });

  it('precedes / isConcurrent / equals helpers', () => {
    const a = new VersionVector({ a: 1 });
    const b = new VersionVector({ a: 2 });
    const c = new VersionVector({ a: 1, b: 1 });
    const d = new VersionVector({ a: 2, b: 0 });
    expect(a.precedes(b)).toBe(true);
    expect(c.isConcurrent(d)).toBe(true); // c has a:1,b:1; d has a:2,b:0 — concurrent
    expect(a.equals(new VersionVector({ a: 1 }))).toBe(true);
  });

  it('merge takes max per replica', () => {
    const a = new VersionVector({ a: 1, b: 5 });
    const b = new VersionVector({ a: 3, b: 2, c: 4 });
    const merged = a.merge(b);
    expect(merged.get('a')).toBe(3);
    expect(merged.get('b')).toBe(5);
    expect(merged.get('c')).toBe(4);
  });

  it('dominates returns true when all counters >= and at least one >', () => {
    const a = new VersionVector({ a: 3, b: 2 });
    const b = new VersionVector({ a: 1, b: 2 });
    expect(a.dominates(b)).toBe(true);
    expect(b.dominates(a)).toBe(false);
  });

  it('withIncrement returns a new vector with bumped counter', () => {
    const a = new VersionVector({ a: 1 });
    const b = a.withIncrement('a');
    expect(a.get('a')).toBe(1); // original unchanged
    expect(b.get('a')).toBe(2);
  });

  it('diff returns only increased counters', () => {
    const a = new VersionVector({ a: 3, b: 5 });
    const b = new VersionVector({ a: 1, b: 5, c: 2 });
    const d = a.diff(b);
    expect(d).toEqual({ a: 2 });
  });

  it('clone returns independent copy', () => {
    const a = new VersionVector({ a: 1 });
    const b = a.clone();
    b.increment('a');
    expect(a.get('a')).toBe(1);
    expect(b.get('a')).toBe(2);
  });
});

describe('PowerSync — change recording', () => {
  let ps: PowerSync;
  beforeEach(() => {
    ps = new PowerSync({ localReplica: 'mobile-1' });
  });

  it('recordLocalChange increments local vector', () => {
    const c = ps.recordLocalChange({ id: '1', op: 'insert', collection: 'articles', data: { title: 'A' } });
    expect(c.origin).toBe('mobile-1');
    expect(c.vector.get('mobile-1')).toBe(1);
    expect(ps.getPendingPush().length).toBe(1);
  });

  it('multiple local changes increment vector each time', () => {
    ps.recordLocalChange({ id: '1', op: 'insert', collection: 'a', data: {} });
    ps.recordLocalChange({ id: '2', op: 'insert', collection: 'a', data: {} });
    ps.recordLocalChange({ id: '3', op: 'update', collection: 'a', data: {} });
    expect(ps.getLocalVector().get('mobile-1')).toBe(3);
  });

  it('applyRemoteChange increments remote vector', () => {
    const c = ps.applyRemoteChange({ id: '1', op: 'insert', collection: 'articles', data: {}, vector: new VersionVector(), origin: 'server' });
    expect(ps.getRemoteVector().get('server')).toBe(1);
    expect(c.origin).toBe('server');
  });
});

describe('PowerSync — conflict detection', () => {
  it('detects conflict when local and remote edit same id', () => {
    const ps = new PowerSync({ localReplica: 'l1' });
    const local = ps.recordLocalChange({ id: '1', op: 'update', collection: 'a', data: { x: 1 } });
    const remote = ps.applyRemoteChange({ id: '1', op: 'update', collection: 'a', data: { x: 2 }, vector: new VersionVector(), origin: 'r1' });
    const conflicts = ps.getConflicts();
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].localChange).toBe(local);
    expect(conflicts[0].remoteChange).toBe(remote);
  });

  it('does not detect conflict for different ids', () => {
    const ps = new PowerSync({ localReplica: 'l1' });
    ps.recordLocalChange({ id: '1', op: 'update', collection: 'a', data: {} });
    ps.applyRemoteChange({ id: '2', op: 'update', collection: 'a', data: {}, vector: new VersionVector(), origin: 'r1' });
    expect(ps.getConflicts().length).toBe(0);
  });

  it('local-wins strategy resolves to local data', () => {
    const ps = new PowerSync({ localReplica: 'l1', conflictStrategy: 'local-wins' });
    ps.recordLocalChange({ id: '1', op: 'update', collection: 'a', data: { x: 'local' } });
    ps.applyRemoteChange({ id: '1', op: 'update', collection: 'a', data: { x: 'remote' }, vector: new VersionVector(), origin: 'r1' });
    const c = ps.getConflicts()[0];
    expect(c.resolution).toBe('local-wins');
    expect(c.mergedData).toEqual({ x: 'local' });
  });

  it('remote-wins strategy resolves to remote data', () => {
    const ps = new PowerSync({ localReplica: 'l1', conflictStrategy: 'remote-wins' });
    ps.recordLocalChange({ id: '1', op: 'update', collection: 'a', data: { x: 'local' } });
    ps.applyRemoteChange({ id: '1', op: 'update', collection: 'a', data: { x: 'remote' }, vector: new VersionVector(), origin: 'r1' });
    const c = ps.getConflicts()[0];
    expect(c.resolution).toBe('remote-wins');
    expect(c.mergedData).toEqual({ x: 'remote' });
  });

  it('last-write-wins resolves by timestamp', () => {
    const ps = new PowerSync({ localReplica: 'l1', conflictStrategy: 'last-write-wins' });
    const local = ps.recordLocalChange({ id: '1', op: 'update', collection: 'a', data: { x: 'local' } });
    // Wait a tick so remote timestamp is later
    const remote = ps.applyRemoteChange({ id: '1', op: 'update', collection: 'a', data: { x: 'remote' }, vector: new VersionVector(), origin: 'r1' });
    // Local timestamp < remote timestamp (or equal) — depends on Date.now()
    const c = ps.getConflicts()[0];
    expect(['local-wins', 'remote-wins']).toContain(c.resolution);
    // Verify resolution matches timestamp comparison
    const cmp = local.timestamp < remote.timestamp ? 'remote-wins' : 'local-wins';
    expect(c.resolution).toBe(cmp);
  });

  it('manual strategy leaves conflicts unresolved', () => {
    const ps = new PowerSync({ localReplica: 'l1', conflictStrategy: 'manual' });
    ps.recordLocalChange({ id: '1', op: 'update', collection: 'a', data: { x: 'local' } });
    ps.applyRemoteChange({ id: '1', op: 'update', collection: 'a', data: { x: 'remote' }, vector: new VersionVector(), origin: 'r1' });
    const c = ps.getConflicts()[0];
    expect(c.resolution).toBeUndefined();
  });

  it('manual resolveConflict records custom resolution', () => {
    const ps = new PowerSync({ localReplica: 'l1', conflictStrategy: 'manual' });
    ps.recordLocalChange({ id: '1', op: 'update', collection: 'a', data: { x: 'local' } });
    ps.applyRemoteChange({ id: '1', op: 'update', collection: 'a', data: { x: 'remote' }, vector: new VersionVector(), origin: 'r1' });
    const ok = ps.resolveConflict('1', 'merged', { x: 'merged' });
    expect(ok).toBe(true);
    const c = ps.getConflicts()[0];
    expect(c.resolution).toBe('merged');
    expect(c.mergedData).toEqual({ x: 'merged' });
  });

  it('resolveConflict returns false for unknown id', () => {
    const ps = new PowerSync({ localReplica: 'l1' });
    expect(ps.resolveConflict('nope', 'local-wins')).toBe(false);
  });

  it('clearConflicts removes all', () => {
    const ps = new PowerSync({ localReplica: 'l1' });
    ps.recordLocalChange({ id: '1', op: 'update', collection: 'a', data: {} });
    ps.applyRemoteChange({ id: '1', op: 'update', collection: 'a', data: {}, vector: new VersionVector(), origin: 'r1' });
    expect(ps.getConflicts().length).toBe(1);
    ps.clearConflicts();
    expect(ps.getConflicts().length).toBe(0);
  });
});

describe('PowerSync — planSync and commit', () => {
  it('planSync returns toPush, toPull, conflicts', () => {
    const ps = new PowerSync({ localReplica: 'l1' });
    ps.recordLocalChange({ id: '1', op: 'insert', collection: 'a', data: {} });
    ps.applyRemoteChange({ id: '2', op: 'insert', collection: 'a', data: {}, vector: new VersionVector(), origin: 'r1' });
    const plan = ps.planSync();
    expect(plan.toPush.length).toBe(1);
    expect(plan.toPull.length).toBe(1);
  });

  it('commitPush clears pendingPush', () => {
    const ps = new PowerSync({ localReplica: 'l1' });
    ps.recordLocalChange({ id: '1', op: 'insert', collection: 'a', data: {} });
    ps.commitPush();
    expect(ps.getPendingPush().length).toBe(0);
  });

  it('commitPull clears pendingPull', () => {
    const ps = new PowerSync({ localReplica: 'l1' });
    ps.applyRemoteChange({ id: '1', op: 'insert', collection: 'a', data: {}, vector: new VersionVector(), origin: 'r1' });
    ps.commitPull();
    expect(ps.getPendingPull().length).toBe(0);
  });

  it('applyRemoteVector merges into remote vector', () => {
    const ps = new PowerSync({ localReplica: 'l1' });
    ps.applyRemoteVector(new VersionVector({ server: 5, other: 3 }));
    expect(ps.getRemoteVector().get('server')).toBe(5);
    expect(ps.getRemoteVector().get('other')).toBe(3);
  });

  it('finalize clears all pending', () => {
    const ps = new PowerSync({ localReplica: 'l1' });
    ps.recordLocalChange({ id: '1', op: 'insert', collection: 'a', data: {} });
    ps.applyRemoteChange({ id: '2', op: 'insert', collection: 'a', data: {}, vector: new VersionVector(), origin: 'r1' });
    ps.finalize();
    expect(ps.isSynced()).toBe(true);
  });

  it('getSyncProgress returns counts', () => {
    const ps = new PowerSync({ localReplica: 'l1' });
    ps.recordLocalChange({ id: '1', op: 'insert', collection: 'a', data: {} });
    ps.applyRemoteChange({ id: '2', op: 'insert', collection: 'a', data: {}, vector: new VersionVector(), origin: 'r1' });
    const p = ps.getSyncProgress();
    expect(p.pendingPush).toBe(1);
    expect(p.pendingPull).toBe(1);
    expect(p.unresolvedConflicts).toBe(0);
  });

  it('isSynced returns true when no pending', () => {
    const ps = new PowerSync({ localReplica: 'l1' });
    expect(ps.isSynced()).toBe(true);
    ps.recordLocalChange({ id: '1', op: 'insert', collection: 'a', data: {} });
    expect(ps.isSynced()).toBe(false);
  });
});
