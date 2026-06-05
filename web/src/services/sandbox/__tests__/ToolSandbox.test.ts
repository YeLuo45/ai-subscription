/**
 * ToolSandbox.test.ts — Pure unit tests for permission/sandbox system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolSandbox, DEFAULT_PERMISSION_RULES, type PermissionRule } from '../ToolSandbox';

describe('ToolSandbox — rule management', () => {
  let sb: ToolSandbox;
  beforeEach(() => {
    sb = new ToolSandbox();
  });

  it('adds a rule', () => {
    sb.addRule({ toolPattern: 'fs:read', action: 'allow' });
    expect(sb.listRules().length).toBe(1);
  });

  it('rules sorted by priority (lower = first)', () => {
    sb.addRule({ toolPattern: 'a', action: 'allow', priority: 200 });
    sb.addRule({ toolPattern: 'b', action: 'allow', priority: 50 });
    const rules = sb.listRules();
    expect(rules[0].toolPattern).toBe('b');
    expect(rules[1].toolPattern).toBe('a');
  });

  it('removes rules by pattern', () => {
    sb.addRule({ toolPattern: 'a', action: 'allow' });
    sb.addRule({ toolPattern: 'a', action: 'deny' });
    sb.addRule({ toolPattern: 'b', action: 'allow' });
    expect(sb.removeRules('a')).toBe(2);
    expect(sb.listRules().length).toBe(1);
  });

  it('removeRules returns 0 for unknown', () => {
    expect(sb.removeRules('nope')).toBe(0);
  });
});

describe('ToolSandbox — matchRule', () => {
  let sb: ToolSandbox;
  beforeEach(() => {
    sb = new ToolSandbox();
  });

  it('matches exact pattern', () => {
    sb.addRule({ toolPattern: 'fs:read', action: 'allow' });
    const r = sb.matchRule('fs:read', 'read');
    expect(r?.action).toBe('allow');
  });

  it('matches glob * suffix', () => {
    sb.addRule({ toolPattern: 'fs:*', action: 'allow' });
    expect(sb.matchRule('fs:read', '')).toBeDefined();
    expect(sb.matchRule('fs:write', '')).toBeDefined();
  });

  it('matches glob * prefix', () => {
    sb.addRule({ toolPattern: '*:read', action: 'allow' });
    expect(sb.matchRule('fs:read', '')).toBeDefined();
    expect(sb.matchRule('db:read', '')).toBeDefined();
  });

  it('filters by actionPattern', () => {
    sb.addRule({ toolPattern: 'net:fetch', action: 'allow', priority: 50 });
    sb.addRule({ toolPattern: 'net:fetch', actionPattern: 'POST', action: 'deny', priority: 10 });
    const r = sb.matchRule('net:fetch', 'POST');
    expect(r?.action).toBe('deny');
  });

  it('returns undefined for no match', () => {
    expect(sb.matchRule('unknown', '')).toBeUndefined();
  });
});

describe('ToolSandbox — execute allow', () => {
  it('runs handler when allowed', async () => {
    const sb = new ToolSandbox();
    const result = await sb.execute('fs:read', 'read', { path: '/tmp' }, async () => 'file contents');
    expect(result.success).toBe(true);
    expect(result.output).toBe('file contents');
    expect(result.action).toBe('allow');
  });

  it('denies with deny rule', async () => {
    const sb = new ToolSandbox();
    sb.addRule({ toolPattern: 'fs:delete', action: 'deny' });
    const result = await sb.execute('fs:delete', 'delete', { path: '/x' }, async () => 'ok');
    expect(result.success).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.action).toBe('deny');
  });

  it('requires approval when rule is ask', async () => {
    const sb = new ToolSandbox({ approvalEnabled: true });
    sb.setApprovalResponder(async () => true);
    sb.addRule({ toolPattern: 'fs:write', action: 'ask' });
    const result = await sb.execute('fs:write', 'write', { data: 'x' }, async () => 'written');
    expect(result.success).toBe(true);
  });

  it('blocks when user denies approval', async () => {
    const sb = new ToolSandbox({ approvalEnabled: true });
    sb.setApprovalResponder(async () => false);
    sb.addRule({ toolPattern: 'fs:write', action: 'ask' });
    const result = await sb.execute('fs:write', 'write', { data: 'x' }, async () => 'written');
    expect(result.success).toBe(false);
    expect(result.action).toBe('ask');
  });

  it('denies when ask but no responder', async () => {
    const sb = new ToolSandbox({ approvalEnabled: false });
    sb.addRule({ toolPattern: 'fs:write', action: 'ask' });
    const result = await sb.execute('fs:write', 'write', {}, async () => 'x');
    expect(result.blocked).toBe(true);
  });
});

describe('ToolSandbox — input sanitization', () => {
  it('blocks script tags', async () => {
    const sb = new ToolSandbox();
    const result = await sb.execute('test', 'x', { html: '<script>alert(1)</script>' }, async () => 'ok');
    expect(result.blocked).toBe(true);
    expect(result.error).toContain('script');
  });

  it('blocks javascript: URL', async () => {
    const sb = new ToolSandbox();
    const result = await sb.execute('test', 'x', { href: 'javascript:alert(1)' }, async () => 'ok');
    expect(result.blocked).toBe(true);
  });

  it('blocks path traversal', async () => {
    const sb = new ToolSandbox();
    const result = await sb.execute('test', 'x', { path: '../../../etc/passwd' }, async () => 'ok');
    expect(result.blocked).toBe(true);
  });

  it('blocks command substitution', async () => {
    const sb = new ToolSandbox();
    const result = await sb.execute('test', 'x', { cmd: 'echo $(whoami)' }, async () => 'ok');
    expect(result.blocked).toBe(true);
  });

  it('passes clean input', async () => {
    const sb = new ToolSandbox();
    const result = await sb.execute('test', 'x', { msg: 'hello world' }, async () => 'ok');
    expect(result.success).toBe(true);
  });

  it('disabling sanitizeInput allows dangerous input', async () => {
    const sb = new ToolSandbox({ sanitizeInput: false });
    const result = await sb.execute('test', 'x', { html: '<script>alert(1)</script>' }, async () => 'ok');
    expect(result.success).toBe(true);
  });
});

describe('ToolSandbox — destructive detection', () => {
  it('blocks rm -rf', async () => {
    const sb = new ToolSandbox();
    const result = await sb.execute('shell', 'x', { cmd: 'rm -rf /' }, async () => 'ok');
    expect(result.blocked).toBe(true);
    expect(result.error).toContain('destructive');
  });

  it('blocks drop table', async () => {
    const sb = new ToolSandbox();
    const result = await sb.execute('db', 'x', { sql: 'drop table users' }, async () => 'ok');
    expect(result.blocked).toBe(true);
  });

  it('blocks mkfs', async () => {
    const sb = new ToolSandbox();
    const result = await sb.execute('shell', 'x', { cmd: 'mkfs.ext4 /dev/sda' }, async () => 'ok');
    expect(result.blocked).toBe(true);
  });

  it('disabling blockDestructive allows destructive', async () => {
    const sb = new ToolSandbox({ blockDestructive: false, sanitizeInput: false });
    const result = await sb.execute('shell', 'x', { cmd: 'rm -rf /' }, async () => 'ok');
    expect(result.success).toBe(true);
  });
});

describe('ToolSandbox — output truncation', () => {
  it('truncates large string output', async () => {
    const sb = new ToolSandbox({ maxOutputBytes: 100 });
    const big = 'x'.repeat(500);
    const result = await sb.execute('test', 'x', {}, async () => big);
    expect(result.truncated).toBe(true);
    expect((result.output as string).length).toBeLessThan(200);
  });

  it('truncates large object output', async () => {
    const sb = new ToolSandbox({ maxOutputBytes: 50 });
    const result = await sb.execute('test', 'x', {}, async () => ({ data: 'x'.repeat(200) }));
    expect(result.truncated).toBe(true);
  });
});

describe('ToolSandbox — timeout', () => {
  it('times out on slow handler', async () => {
    const sb = new ToolSandbox({ defaultTimeoutMs: 50 });
    const result = await sb.execute('test', 'x', {}, async () => {
      await new Promise((r) => setTimeout(r, 200));
      return 'too late';
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('handler timeout');
  });
});

describe('ToolSandbox — audit log', () => {
  it('records each execution', async () => {
    const sb = new ToolSandbox();
    await sb.execute('test', 'x', {}, async () => 'a');
    await sb.execute('test', 'x', {}, async () => 'b');
    expect(sb.getAuditLog().length).toBe(2);
  });

  it('clearAuditLog empties log', async () => {
    const sb = new ToolSandbox();
    await sb.execute('test', 'x', {}, async () => 'a');
    sb.clearAuditLog();
    expect(sb.getAuditLog()).toEqual([]);
  });

  it('getAuditLog with limit returns last N', async () => {
    const sb = new ToolSandbox();
    for (let i = 0; i < 10; i++) await sb.execute('test', 'x', {}, async () => `r${i}`);
    const last3 = sb.getAuditLog(3);
    expect(last3.length).toBe(3);
  });
});

describe('ToolSandbox — stats', () => {
  it('reports counts', async () => {
    const sb = new ToolSandbox();
    sb.addRule({ toolPattern: 'fs:delete', action: 'deny' });
    await sb.execute('fs:delete', 'x', {}, async () => 'x');
    await sb.execute('fs:read', 'x', {}, async () => 'x');
    const s = sb.stats();
    expect(s.totalRules).toBe(1);
    expect(s.totalExecutions).toBe(2);
    expect(s.denied).toBe(1);
  });
});

describe('DEFAULT_PERMISSION_RULES — sanity', () => {
  it('contains 6 default rules', () => {
    expect(DEFAULT_PERMISSION_RULES.length).toBe(6);
  });

  it('fs:read is allow by default', () => {
    expect(DEFAULT_PERMISSION_RULES.find((r) => r.toolPattern === 'fs:read')?.action).toBe('allow');
  });

  it('shell:exec is deny by default', () => {
    expect(DEFAULT_PERMISSION_RULES.find((r) => r.toolPattern === 'shell:exec')?.action).toBe('deny');
  });
});
