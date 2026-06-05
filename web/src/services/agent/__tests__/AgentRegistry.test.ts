/**
 * AgentRegistry.test.ts — Pure unit tests for tool/agent registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry, type JsonSchema } from '../AgentRegistry';

function makeSpec(overrides: Partial<Parameters<AgentRegistry['register']>[0]> = {}) {
  return {
    name: 'echo',
    version: '1.0.0',
    description: 'Echoes input back',
    inputSchema: { type: 'object' as const, properties: { msg: { type: 'string' as const } } },
    outputSchema: { type: 'object' as const, properties: { echo: { type: 'string' as const } } },
    handler: async (input: Record<string, unknown>) => ({ echo: input.msg }),
    tags: ['utility', 'string'],
    requires: [] as string[],
    timeoutMs: 5000,
    deprecated: false,
    ...overrides,
  };
}

describe('AgentRegistry — registration', () => {
  let reg: AgentRegistry;
  beforeEach(() => {
    reg = new AgentRegistry();
  });

  it('registers a tool', () => {
    const id = reg.register(makeSpec());
    expect(id).toMatch(/^tool-/);
    expect(reg.size()).toBe(1);
  });

  it('rejects duplicate name+version', () => {
    reg.register(makeSpec());
    expect(() => reg.register(makeSpec())).toThrow('already registered');
  });

  it('allows same name with different version', () => {
    reg.register(makeSpec({ version: '1.0.0' }));
    reg.register(makeSpec({ version: '2.0.0' }));
    expect(reg.size()).toBe(2);
  });

  it('unregister removes by id', () => {
    const id = reg.register(makeSpec());
    expect(reg.unregister(id)).toBe(true);
    expect(reg.size()).toBe(0);
  });

  it('unregister returns false for unknown', () => {
    expect(reg.unregister('nope')).toBe(false);
  });

  it('get returns by id', () => {
    const id = reg.register(makeSpec());
    expect(reg.get(id)?.name).toBe('echo');
  });

  it('getByName returns latest version when multiple', () => {
    reg.register(makeSpec({ version: '1.0.0' }));
    reg.register(makeSpec({ version: '2.0.0' }));
    reg.register(makeSpec({ version: '1.5.0' }));
    expect(reg.getByName('echo')?.version).toBe('2.0.0');
  });

  it('getByName with explicit version returns that version', () => {
    reg.register(makeSpec({ version: '1.0.0' }));
    reg.register(makeSpec({ version: '2.0.0' }));
    expect(reg.getByName('echo', '1.0.0')?.version).toBe('1.0.0');
  });

  it('getByName returns undefined for unknown', () => {
    expect(reg.getByName('nope')).toBeUndefined();
  });

  it('list returns all tools', () => {
    reg.register(makeSpec({ name: 'a' }));
    reg.register(makeSpec({ name: 'b' }));
    expect(reg.list().length).toBe(2);
  });

  it('findByTag returns matching tools', () => {
    reg.register(makeSpec({ name: 'a', tags: ['fs', 'read'] }));
    reg.register(makeSpec({ name: 'b', tags: ['net'] }));
    expect(reg.findByTag('fs').length).toBe(1);
    expect(reg.findByTag('net').length).toBe(1);
  });

  it('findByCapabilities returns tools matching ALL tags', () => {
    reg.register(makeSpec({ name: 'a', tags: ['fs', 'read', 'json'] }));
    reg.register(makeSpec({ name: 'b', tags: ['fs', 'write'] }));
    expect(reg.findByCapabilities(['fs', 'read']).length).toBe(1);
    expect(reg.findByCapabilities(['fs']).length).toBe(2);
  });
});

describe('AgentRegistry — invoke', () => {
  let reg: AgentRegistry;
  beforeEach(() => {
    reg = new AgentRegistry();
  });

  it('invokes a tool by name', async () => {
    reg.register(makeSpec());
    const result = await reg.invoke('echo', { msg: 'hi' });
    expect(result.success).toBe(true);
    expect(result.output).toEqual({ echo: 'hi' });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns error for unknown tool', async () => {
    const result = await reg.invoke('nope', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('returns error for deprecated tool', async () => {
    reg.register(makeSpec({ deprecated: true }));
    const result = await reg.invoke('echo', { msg: 'hi' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('deprecated');
  });

  it('validates input against schema', async () => {
    const schema: JsonSchema = {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' }, age: { type: 'number' } },
    };
    reg.register(makeSpec({ inputSchema: schema }));
    const result = await reg.invoke('echo', { age: 'thirty' }); // missing name + age wrong type
    expect(result.success).toBe(false);
    expect(result.error).toContain('validation failed');
  });

  it('validation passes for valid input', async () => {
    const schema: JsonSchema = {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    };
    reg.register(makeSpec({ inputSchema: schema }));
    const result = await reg.invoke('echo', { name: 'Alice' });
    expect(result.success).toBe(true);
  });

  it('times out on slow handler', async () => {
    reg.register(makeSpec({
      handler: async () => {
        await new Promise((r) => setTimeout(r, 200));
        return {};
      },
      timeoutMs: 50,
    }));
    const result = await reg.invoke('echo', {});
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  it('uses options.timeoutMs override', async () => {
    reg.register(makeSpec({
      handler: async () => {
        await new Promise((r) => setTimeout(r, 200));
        return {};
      },
      timeoutMs: 5000,
    }));
    const result = await reg.invoke('echo', {}, { timeoutMs: 50 });
    expect(result.timedOut).toBe(true);
  });

  it('records invocation count and avg duration', async () => {
    reg.register(makeSpec());
    await reg.invoke('echo', { msg: 'a' });
    await reg.invoke('echo', { msg: 'b' });
    const tool = reg.getByName('echo')!;
    expect(tool.invocationCount).toBe(2);
    expect(tool.avgDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('records lastError on handler failure', async () => {
    reg.register(makeSpec({ handler: async () => { throw new Error('boom'); } }));
    const result = await reg.invoke('echo', {});
    expect(result.success).toBe(false);
    expect(result.error).toBe('boom');
    expect(reg.getByName('echo')?.lastError).toBe('boom');
  });

  it('passes correlationId through audit', async () => {
    reg.register(makeSpec());
    await reg.invoke('echo', { msg: 'x' }, { correlationId: 'trace-1' });
    const log = reg.getAuditLog();
    expect(log[0].correlationId).toBe('trace-1');
  });
});

describe('AgentRegistry — validation', () => {
  let reg: AgentRegistry;
  beforeEach(() => {
    reg = new AgentRegistry();
  });

  it('detects missing required field', () => {
    const schema: JsonSchema = { type: 'object', required: ['x'] };
    const r = reg.validate({}, schema);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('x');
  });

  it('accepts valid object', () => {
    const schema: JsonSchema = { type: 'object', required: ['x'], properties: { x: { type: 'string' } } };
    const r = reg.validate({ x: 'hi' }, schema);
    expect(r.valid).toBe(true);
  });

  it('rejects wrong type', () => {
    const schema: JsonSchema = { type: 'object', properties: { n: { type: 'number' } } };
    const r = reg.validate({ n: 'not a number' }, schema);
    expect(r.valid).toBe(false);
  });

  it('validates array type', () => {
    const schema: JsonSchema = { type: 'array' };
    expect(reg.validate([], schema).valid).toBe(true);
    expect(reg.validate({}, schema).valid).toBe(false);
  });

  it('validates nested properties', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        addr: { type: 'object', properties: { zip: { type: 'string' } } },
      },
    };
    const r = reg.validate({ addr: { zip: '12345' } }, schema);
    expect(r.valid).toBe(true);
  });
});

describe('AgentRegistry — audit log', () => {
  it('appends entry on each invocation', async () => {
    const reg = new AgentRegistry();
    reg.register(makeSpec());
    await reg.invoke('echo', { msg: 'a' });
    await reg.invoke('echo', { msg: 'b' });
    expect(reg.getAuditLog().length).toBe(2);
  });

  it('clearAuditLog empties log', async () => {
    const reg = new AgentRegistry();
    reg.register(makeSpec());
    await reg.invoke('echo', { msg: 'a' });
    reg.clearAuditLog();
    expect(reg.getAuditLog()).toEqual([]);
  });

  it('getAuditLog with limit returns last N', async () => {
    const reg = new AgentRegistry();
    reg.register(makeSpec());
    for (let i = 0; i < 10; i++) await reg.invoke('echo', { msg: `m${i}` });
    const last3 = reg.getAuditLog(3);
    expect(last3.length).toBe(3);
  });
});

describe('AgentRegistry — stats', () => {
  it('returns zero state for fresh registry', () => {
    const reg = new AgentRegistry();
    const s = reg.stats();
    expect(s.totalTools).toBe(0);
    expect(s.totalInvocations).toBe(0);
  });

  it('counts invocations and failures', async () => {
    const reg = new AgentRegistry();
    reg.register(makeSpec({ handler: async () => { throw new Error('fail'); } }));
    await reg.invoke('echo', {});
    await reg.invoke('echo', {});
    const s = reg.stats();
    expect(s.totalInvocations).toBe(2);
    expect(s.failedInvocations).toBe(2);
  });

  it('counts deprecated tools', () => {
    const reg = new AgentRegistry();
    reg.register(makeSpec({ deprecated: true }));
    reg.register(makeSpec({ name: 'other' }));
    const s = reg.stats();
    expect(s.deprecatedTools).toBe(1);
  });
});
