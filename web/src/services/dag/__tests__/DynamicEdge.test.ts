/**
 * DynamicEdge.test.ts — Pure unit tests for Map fan-out + Tree fan-in
 */

import { describe, it, expect } from 'vitest';
import {
  splitMessage,
  runMap,
  runTree,
  groupBy,
  type Item,
  type DynamicEdgeConfig,
} from '../DynamicEdge';

describe('splitMessage', () => {
  it('message type splits by paragraph', () => {
    const msg = 'First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph.';
    const items = splitMessage(msg, { type: 'message' });
    expect(items.length).toBe(3);
  });

  it('regex type with capture group', () => {
    const msg = 'foo123bar456baz789';
    const items = splitMessage(msg, { type: 'regex', pattern: '(\\d+)' });
    expect(items).toEqual(['123', '456', '789']);
  });

  it('regex type with whole match', () => {
    const msg = '#tag1 #tag2 #tag3';
    const items = splitMessage(msg, { type: 'regex', pattern: '#\\w+', includeWholeMatch: true });
    expect(items).toEqual(['#tag1', '#tag2', '#tag3']);
  });

  it('jsonPath type extracts array', () => {
    const obj = { articles: [{ id: 1 }, { id: 2 }, { id: 3 }] };
    const items = splitMessage(obj, { type: 'jsonPath', path: '$.articles' });
    expect(items.length).toBe(3);
  });

  it('jsonPath type with index', () => {
    const obj = { data: { items: ['a', 'b', 'c'] } };
    const items = splitMessage(obj, { type: 'jsonPath', path: '$.data.items[1]' });
    expect(items).toEqual(['b']);
  });

  it('field type extracts array field', () => {
    const obj = { tags: ['a', 'b', 'c'] };
    const items = splitMessage(obj, { type: 'field', field: 'tags' });
    expect(items).toEqual(['a', 'b', 'c']);
  });

  it('field type wraps scalar in array', () => {
    const obj = { name: 'alice' };
    const items = splitMessage(obj, { type: 'field', field: 'name' });
    expect(items).toEqual(['alice']);
  });

  it('array type passes through array', () => {
    const arr = [1, 2, 3];
    const items = splitMessage(arr, { type: 'array' });
    expect(items).toEqual([1, 2, 3]);
  });

  it('array type wraps scalar', () => {
    const items = splitMessage(42, { type: 'array' });
    expect(items).toEqual([42]);
  });

  it('fixed type splits by literal string', () => {
    const msg = 'a,b,c,d';
    const items = splitMessage(msg, { type: 'fixed', literal: ',' });
    expect(items).toEqual(['a', 'b', 'c', 'd']);
  });

  it('throws on invalid jsonPath', () => {
    const obj = { a: 1 };
    expect(() => splitMessage(obj, { type: 'jsonPath', path: 'no-dollar' })).toThrow('must start with $');
  });

  it('returns empty for missing field', () => {
    const obj = { a: 1 };
    expect(splitMessage(obj, { type: 'field', field: 'missing' })).toEqual([]);
  });
});

describe('groupBy', () => {
  it('groups items by field value', () => {
    const items = [
      { category: 'a', name: 'x' },
      { category: 'b', name: 'y' },
      { category: 'a', name: 'z' },
    ];
    const groups = groupBy(items, 'category');
    expect(groups.size).toBe(2);
    expect(groups.get('a')?.length).toBe(2);
    expect(groups.get('b')?.length).toBe(1);
  });

  it('handles null/undefined values with _null bucket', () => {
    const items = [
      { tag: null, x: 1 },
      { tag: undefined, x: 2 },
      { tag: 'a', x: 3 },
    ];
    const groups = groupBy(items, 'tag');
    expect(groups.size).toBe(2);
  });

  it('stringifies non-object items', () => {
    const groups = groupBy([1, 2, 1, 3], 'x');
    expect(groups.get('1')?.length).toBe(2);
  });
});

describe('runMap', () => {
  it('processes each item in parallel', async () => {
    const config: DynamicEdgeConfig = {
      mode: 'map',
      split: { type: 'fixed', literal: ',' },
      maxParallel: 3,
    };
    const processor = (item: Item) => String(item).toUpperCase();
    const result = await runMap('a,b,c,d', config, processor);
    expect(result.mode).toBe('map');
    expect(result.inputs).toEqual(['a', 'b', 'c', 'd']);
    expect(result.outputs).toEqual(['A', 'B', 'C', 'D']);
    expect(result.errors.length).toBe(0);
    expect(result.parallelUsed).toBeLessThanOrEqual(3);
  });

  it('records errors and continues', async () => {
    const config: DynamicEdgeConfig = {
      mode: 'map',
      split: { type: 'fixed', literal: ',' },
    };
    const processor = (item: Item) => {
      if (item === 'b') throw new Error('intentional');
      return String(item);
    };
    const result = await runMap('a,b,c', config, processor);
    expect(result.outputs[0]).toBe('a');
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].error).toBe('intentional');
  });

  it('respects maxParallel cap', async () => {
    const config: DynamicEdgeConfig = {
      mode: 'map',
      split: { type: 'array' },
      maxParallel: 2,
    };
    const processor = async (item: Item) => {
      await new Promise((r) => setTimeout(r, 5));
      return item;
    };
    const result = await runMap([1, 2, 3, 4, 5, 6], config, processor);
    expect(result.parallelUsed).toBe(2);
  });

  it('throws when mode is not map', async () => {
    const config: DynamicEdgeConfig = {
      mode: 'tree',
      split: { type: 'fixed', literal: ',' },
      groupBy: 'x',
    };
    await expect(runMap('a,b', config, (x) => x)).rejects.toThrow('requires mode="map"');
  });
});

describe('runTree', () => {
  it('builds tree with leaf nodes for single-item groups', async () => {
    const config: DynamicEdgeConfig = {
      mode: 'tree',
      split: { type: 'array' },
      groupBy: 'category',
    };
    const processor = (item: Item) => `processed-${(item as { id: number }).id}`;
    const reducer = (groupItems: Item[]) => `reduced-${groupItems.length}`;
    const items = [
      { category: 'a', id: 1 },
      { category: 'b', id: 2 },
      { category: 'a', id: 3 },
    ];
    const result = await runTree(items, config, processor, reducer);
    expect(result.mode).toBe('tree');
    expect(result.inputs.length).toBe(3);
    expect(result.output.children.length).toBe(2);
    const groupA = result.output.children.find((c) => c.groupKey === 'a');
    expect(groupA).toBeDefined();
    expect(groupA!.output).toBe('reduced-2');
  });

  it('throws when mode is not tree', async () => {
    const config: DynamicEdgeConfig = {
      mode: 'map',
      split: { type: 'array' },
    };
    await expect(runTree([1, 2], config, (x) => x, (g) => g.length)).rejects.toThrow('requires mode="tree"');
  });

  it('throws when groupBy is missing', async () => {
    const config: DynamicEdgeConfig = {
      mode: 'tree',
      split: { type: 'array' },
    };
    await expect(runTree([1, 2], config, (x) => x, (g) => g.length)).rejects.toThrow('groupBy');
  });

  it('handles single-item groups as leaves', async () => {
    const config: DynamicEdgeConfig = {
      mode: 'tree',
      split: { type: 'array' },
      groupBy: 'category',
    };
    const items = [{ category: 'a', id: 1 }];
    const result = await runTree(items, config, (i) => i, (g) => g.length);
    const child = result.output.children[0];
    expect(child.leaf).toBe(true);
    expect(child.children.length).toBe(0);
  });
});
