/**
 * PEMParser.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { PEMParser } from '../PEMParser';

describe('PEMParser — basic', () => {
  it('parse single block', () => {
    const pem = `-----BEGIN TEST-----
aGVsbG8=
-----END TEST-----`;
    const r = PEMParser.parse(pem);
    expect(r.length).toBe(1);
    expect(r[0].label).toBe('TEST');
    expect(new TextDecoder().decode(r[0].data)).toBe('hello');
  });

  it('parse multiple blocks', () => {
    const pem = `-----BEGIN A-----
aGVsbG8=
-----END A-----
-----BEGIN B-----
d29ybGQ=
-----END B-----`;
    const r = PEMParser.parse(pem);
    expect(r.length).toBe(2);
    expect(r[0].label).toBe('A');
    expect(r[1].label).toBe('B');
  });

  it('parse with line wrap', () => {
    const longData = 'A'.repeat(100);
    const pem = `-----BEGIN X-----
${longData.slice(0, 64)}
${longData.slice(64)}
-----END X-----`;
    const r = PEMParser.parse(pem);
    expect(r.length).toBe(1);
  });
});

describe('PEMParser — stringify', () => {
  it('roundtrip', () => {
    const data = new TextEncoder().encode('hello world');
    const pem = PEMParser.stringify('TEST', data);
    expect(pem).toContain('-----BEGIN TEST-----');
    expect(pem).toContain('-----END TEST-----');
    const r = PEMParser.parse(pem);
    expect(new TextDecoder().decode(r[0].data)).toBe('hello world');
  });

  it('with headers', () => {
    const pem = PEMParser.stringify('TEST', new Uint8Array([1, 2, 3]), { 'Proc-Type': '4,ENCRYPTED', 'DEK-Info': 'AES-256-CBC,abc' });
    expect(pem).toContain('Proc-Type:');
  });
});

describe('PEMParser — find', () => {
  it('find', () => {
    const pem = `-----BEGIN A-----
aGVsbG8=
-----END A-----
-----BEGIN B-----
d29ybGQ=
-----END B-----`;
    const blocks = PEMParser.parse(pem);
    expect(PEMParser.find(blocks, 'B')?.label).toBe('B');
    expect(PEMParser.find(blocks, 'X')).toBe(null);
  });

  it('findAll', () => {
    const pem = `-----BEGIN X-----
aA==
-----END X-----
-----BEGIN X-----
aGk=
-----END X-----`;
    const blocks = PEMParser.parse(pem);
    const xs = PEMParser.findAll(blocks, 'X');
    expect(xs.length).toBe(2);
  });
});

describe('PEMParser — isPEM', () => {
  it('true', () => {
    expect(PEMParser.isPEM('-----BEGIN X-----\n-----END X-----')).toBe(true);
  });

  it('false', () => {
    expect(PEMParser.isPEM('hello world')).toBe(false);
  });
});
