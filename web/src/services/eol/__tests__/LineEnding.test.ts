/**
 * LineEnding.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { LineEnding } from '../LineEnding';

describe('LineEnding — detect', () => {
  it('LF', () => {
    expect(LineEnding.detect('a\nb')).toBe('LF');
  });

  it('CRLF', () => {
    expect(LineEnding.detect('a\r\nb')).toBe('CRLF');
  });

  it('CR', () => {
    expect(LineEnding.detect('a\rb')).toBe('CR');
  });

  it('MIXED', () => {
    expect(LineEnding.detect('a\nb\r\nc')).toBe('MIXED');
  });

  it('NONE', () => {
    expect(LineEnding.detect('hello')).toBe('NONE');
  });

  it('empty', () => {
    expect(LineEnding.detect('')).toBe('NONE');
  });
});

describe('LineEnding — toLF', () => {
  it('CRLF to LF', () => {
    expect(LineEnding.toLF('a\r\nb')).toBe('a\nb');
  });

  it('CR to LF', () => {
    expect(LineEnding.toLF('a\rb')).toBe('a\nb');
  });
});

describe('LineEnding — toCRLF', () => {
  it('LF to CRLF', () => {
    expect(LineEnding.toCRLF('a\nb')).toBe('a\r\nb');
  });

  it('CR to CRLF', () => {
    expect(LineEnding.toCRLF('a\rb')).toBe('a\r\nb');
  });
});

describe('LineEnding — toCR', () => {
  it('LF to CR', () => {
    expect(LineEnding.toCR('a\nb')).toBe('a\rb');
  });
});

describe('LineEnding — getString', () => {
  it('LF', () => expect(LineEnding.getString('LF')).toBe('\n'));
  it('CRLF', () => expect(LineEnding.getString('CRLF')).toBe('\r\n'));
  it('CR', () => expect(LineEnding.getString('CR')).toBe('\r'));
});

describe('LineEnding — count', () => {
  it('CRLF', () => {
    const c = LineEnding.count('a\r\nb\r\nc');
    expect(c.CRLF).toBe(2);
  });

  it('mixed', () => {
    const c = LineEnding.count('a\nb\r\nc');
    expect(c.LF).toBe(1);
    expect(c.CRLF).toBe(1);
  });

  it('all LF', () => {
    const c = LineEnding.count('a\nb\nc');
    expect(c.LF).toBe(2);
  });
});
