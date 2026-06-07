/**
 * JSONStream.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { JSONStream } from '../JSONStream';

describe('JSONStream — basic', () => {
  it('empty', () => {
    const s = new JSONStream('');
    expect(s.next()).toBe(null);
  });

  it('object open/close', () => {
    const s = new JSONStream('{}');
    expect(s.next()?.type).toBe('openObject');
    expect(s.next()?.type).toBe('closeObject');
    expect(s.next()).toBe(null);
  });

  it('array open/close', () => {
    const s = new JSONStream('[]');
    expect(s.next()?.type).toBe('openArray');
    expect(s.next()?.type).toBe('closeArray');
  });

  it('key-value', () => {
    const s = new JSONStream('{"a":1}');
    const tokens = Array.from(s.tokens());
    expect(tokens[0].type).toBe('openObject');
    expect(tokens[1].type).toBe('key');
    expect(tokens[1].value).toBe('a');
    expect(tokens[2].type).toBe('value');
    expect(tokens[2].value).toBe('1');
  });
});

describe('JSONStream — values', () => {
  it('string value', () => {
    const s = new JSONStream('"hello"');
    expect(s.next()?.value).toBe('hello');
  });

  it('number', () => {
    const s = new JSONStream('42');
    expect(s.next()?.value).toBe('42');
  });

  it('true/false/null', () => {
    const s = new JSONStream('[true,false,null]');
    const tokens = Array.from(s.tokens());
    const values = tokens.filter((t) => t.type === 'value').map((t) => t.value);
    expect(values).toEqual(['true', 'false', 'null']);
  });
});

describe('JSONStream — nested', () => {
  it('nested object', () => {
    const s = new JSONStream('{"a":{"b":1}}');
    const tokens = Array.from(s.tokens());
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('array of objects', () => {
    const s = new JSONStream('[{"a":1},{"b":2}]');
    const tokens = Array.from(s.tokens());
    expect(tokens.length).toBeGreaterThan(0);
  });
});

describe('JSONStream — readValue', () => {
  it('static', () => {
    expect(JSONStream.readValue('{"a":1}')).toEqual({ a: 1 });
  });
});

describe('JSONStream — error', () => {
  it('unterminated string', () => {
    expect(() => new JSONStream('"unterminated').next()).toThrow();
  });
});
