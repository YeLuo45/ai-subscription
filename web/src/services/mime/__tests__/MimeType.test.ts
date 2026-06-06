/**
 * MimeType.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { MimeType } from '../MimeType';

describe('MimeType — parse', () => {
  it('simple', () => {
    const p = MimeType.parse('text/html');
    expect(p?.type).toBe('text');
    expect(p?.subtype).toBe('html');
  });

  it('with charset', () => {
    const p = MimeType.parse('text/html; charset=utf-8');
    expect(p?.parameters.charset).toBe('utf-8');
  });

  it('with multiple params', () => {
    const p = MimeType.parse('multipart/form-data; boundary=foo; charset=utf-8');
    expect(p?.parameters.boundary).toBe('foo');
    expect(p?.parameters.charset).toBe('utf-8');
  });

  it('quoted param', () => {
    const p = MimeType.parse('text/html; charset="utf-8"');
    expect(p?.parameters.charset).toBe('utf-8');
  });

  it('invalid', () => {
    expect(MimeType.parse('garbage')).toBe(null);
  });
});

describe('MimeType — extension', () => {
  it('fromExtension html', () => {
    expect(MimeType.fromExtension('html')).toBe('text/html');
  });

  it('fromExtension with dot', () => {
    expect(MimeType.fromExtension('.png')).toBe('image/png');
  });

  it('fromExtension unknown', () => {
    expect(MimeType.fromExtension('xyz')).toBe(null);
  });

  it('toExtension', () => {
    expect(MimeType.toExtension('text/html')).toBe('html');
  });
});

describe('MimeType — matches', () => {
  it('exact match', () => {
    expect(MimeType.matches('text/html', 'text/html')).toBe(true);
  });

  it('wildcard', () => {
    expect(MimeType.matches('image/png', 'image/*')).toBe(true);
  });

  it('wildcard no match', () => {
    expect(MimeType.matches('text/html', 'image/*')).toBe(false);
  });
});

describe('MimeType — text/binary', () => {
  it('isText', () => {
    expect(MimeType.isText('text/html')).toBe(true);
    expect(MimeType.isText('application/json')).toBe(true);
  });

  it('isBinary', () => {
    expect(MimeType.isBinary('image/png')).toBe(true);
  });
});

describe('MimeType — format/charset', () => {
  it('format', () => {
    const p = MimeType.parse('text/html; charset=utf-8')!;
    expect(MimeType.format(p)).toBe('text/html; charset=utf-8');
  });

  it('getCharset default', () => {
    expect(MimeType.getCharset('text/html')).toBe('utf-8');
  });

  it('getCharset explicit', () => {
    expect(MimeType.getCharset('text/html; charset=gbk')).toBe('gbk');
  });
});
