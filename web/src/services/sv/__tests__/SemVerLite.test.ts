/**
 * SemVerLite.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { SemVerLite } from '../SemVerLite';

describe('SemVerLite — parse', () => {
  it('basic', () => {
    const v = SemVerLite.parse('1.2.3');
    expect(v.major).toBe(1);
    expect(v.minor).toBe(2);
    expect(v.patch).toBe(3);
  });

  it('with prerelease', () => {
    const v = SemVerLite.parse('1.0.0-alpha');
    expect(v.prerelease).toBe('alpha');
  });

  it('with build', () => {
    const v = SemVerLite.parse('1.0.0+build.1');
    expect(v.build).toBe('build.1');
  });

  it('full', () => {
    const v = SemVerLite.parse('2.1.0-beta.1+exp.sha.5114f85');
    expect(v.major).toBe(2);
    expect(v.prerelease).toBe('beta.1');
  });

  it('invalid', () => {
    expect(() => SemVerLite.parse('1.2')).toThrow();
    expect(() => SemVerLite.parse('abc')).toThrow();
  });
});

describe('SemVerLite — compare', () => {
  it('equal', () => {
    expect(SemVerLite.compare('1.2.3', '1.2.3')).toBe(0);
  });

  it('major differ', () => {
    expect(SemVerLite.compare('2.0.0', '1.0.0')).toBeGreaterThan(0);
  });

  it('minor differ', () => {
    expect(SemVerLite.compare('1.2.0', '1.1.0')).toBeGreaterThan(0);
  });

  it('patch differ', () => {
    expect(SemVerLite.compare('1.2.3', '1.2.2')).toBeGreaterThan(0);
  });

  it('prerelease < release', () => {
    expect(SemVerLite.compare('1.0.0-alpha', '1.0.0')).toBeLessThan(0);
  });
});

describe('SemVerLite — satisfies', () => {
  it('caret', () => {
    expect(SemVerLite.satisfies('1.2.5', '^1.0.0')).toBe(true);
    expect(SemVerLite.satisfies('2.0.0', '^1.0.0')).toBe(false);
  });

  it('tilde', () => {
    expect(SemVerLite.satisfies('1.2.5', '~1.2.0')).toBe(true);
    expect(SemVerLite.satisfies('1.3.0', '~1.2.0')).toBe(false);
  });

  it('>=', () => {
    expect(SemVerLite.satisfies('2.0.0', '>=1.0.0')).toBe(true);
  });

  it('exact', () => {
    expect(SemVerLite.satisfies('1.2.3', '1.2.3')).toBe(true);
    expect(SemVerLite.satisfies('1.2.4', '1.2.3')).toBe(false);
  });

  it('*', () => {
    expect(SemVerLite.satisfies('1.2.3', '*')).toBe(true);
  });
});

describe('SemVerLite — increment', () => {
  it('major', () => {
    expect(SemVerLite.increment('1.2.3', 'major')).toBe('2.0.0');
  });

  it('minor', () => {
    expect(SemVerLite.increment('1.2.3', 'minor')).toBe('1.3.0');
  });

  it('patch', () => {
    expect(SemVerLite.increment('1.2.3', 'patch')).toBe('1.2.4');
  });
});

describe('SemVerLite — helpers', () => {
  it('isValid', () => {
    expect(SemVerLite.isValid('1.2.3')).toBe(true);
    expect(SemVerLite.isValid('1.2')).toBe(false);
  });

  it('major/minor/patch', () => {
    expect(SemVerLite.major('2.5.1')).toBe(2);
    expect(SemVerLite.minor('2.5.1')).toBe(5);
    expect(SemVerLite.patch('2.5.1')).toBe(1);
  });
});
