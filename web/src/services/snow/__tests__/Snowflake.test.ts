/**
 * Snowflake.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Snowflake } from '../Snowflake';

describe('Snowflake — generate', () => {
  it('generate', () => {
    const id = Snowflake.generate();
    expect(id).toBeGreaterThan(0n);
  });

  it('generateString', () => {
    const s = Snowflake.generateString();
    expect(s.length).toBeGreaterThan(0);
    expect(/^\d+$/.test(s)).toBe(true);
  });

  it('custom machine', () => {
    const id = Snowflake.generate(42);
    expect(Snowflake.getMachineId(id)).toBe(42);
  });
});

describe('Snowflake — parse', () => {
  it('getTime', () => {
    const id = Snowflake.generate();
    const t = Snowflake.getTime(id);
    expect(t.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('getMachineId', () => {
    const id = Snowflake.generate(5);
    expect(Snowflake.getMachineId(id)).toBe(5);
  });

  it('getSequence', () => {
    const id = Snowflake.generate();
    expect(Snowflake.getSequence(id)).toBeGreaterThanOrEqual(0);
  });

  it('parse', () => {
    const id = Snowflake.generate(7);
    const p = Snowflake.parse(id);
    expect(p.machineId).toBe(7);
  });

  it('from string', () => {
    const s = Snowflake.generateString(3);
    expect(Snowflake.getMachineId(s)).toBe(3);
  });
});
