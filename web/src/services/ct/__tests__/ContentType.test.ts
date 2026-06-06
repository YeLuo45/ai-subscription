/**
 * ContentType.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { ContentType } from '../ContentType';

describe('ContentType — basic', () => {
  it('type', () => {
    const ct = new ContentType('text/html; charset=utf-8');
    expect(ct.type()).toBe('text/html');
  });

  it('mediaType/subType', () => {
    const ct = new ContentType('application/json');
    expect(ct.mediaType()).toBe('application');
    expect(ct.subType()).toBe('json');
  });

  it('param', () => {
    const ct = new ContentType('text/html; charset=utf-8');
    expect(ct.param('charset')).toBe('utf-8');
  });

  it('throws invalid', () => {
    expect(() => new ContentType('garbage')).toThrow();
  });
});

describe('ContentType — params', () => {
  it('setParam', () => {
    const ct = new ContentType('text/html');
    ct.setParam('charset', 'utf-8');
    expect(ct.param('charset')).toBe('utf-8');
  });

  it('removeParam', () => {
    const ct = new ContentType('text/html; charset=utf-8');
    ct.removeParam('charset');
    expect(ct.param('charset')).toBe(undefined);
  });

  it('charset', () => {
    expect(new ContentType('text/html').charset()).toBe('utf-8');
  });

  it('setCharset', () => {
    const ct = new ContentType('text/html');
    ct.setCharset('gbk');
    expect(ct.charset()).toBe('gbk');
  });
});

describe('ContentType — checks', () => {
  it('isMultipart', () => {
    expect(new ContentType('multipart/form-data; boundary=foo').mediaType()).toBe('multipart');
  });

  it('isJson', () => {
    expect(new ContentType('application/json').isJson()).toBe(true);
  });

  it('isFormUrlEncoded', () => {
    expect(new ContentType('application/x-www-form-urlencoded').isFormUrlEncoded()).toBe(true);
  });

  it('isText', () => {
    expect(new ContentType('text/html').isText()).toBe(true);
    expect(new ContentType('image/png').isText()).toBe(false);
  });

  it('boundary', () => {
    expect(new ContentType('multipart/form-data; boundary=foo').boundary()).toBe('foo');
  });
});

describe('ContentType — stringify', () => {
  it('round trip', () => {
    const s = 'text/html; charset=utf-8';
    const ct = new ContentType(s);
    expect(ct.toString()).toBe(s);
  });
});

describe('ContentType — static factories', () => {
  it('json', () => {
    const ct = ContentType.json();
    expect(ct.isJson()).toBe(true);
  });

  it('form', () => {
    expect(ContentType.form().isFormUrlEncoded()).toBe(true);
  });

  it('text', () => {
    const ct = ContentType.text('gbk');
    expect(ct.charset()).toBe('gbk');
  });

  it('multipart', () => {
    const ct = ContentType.multipart('MYBOUNDARY');
    expect(ct.boundary()).toBe('MYBOUNDARY');
  });

  it('tryParse null', () => {
    expect(ContentType.tryParse('garbage')).toBe(null);
  });

  it('tryParse success', () => {
    expect(ContentType.tryParse('text/html')?.type()).toBe('text/html');
  });
});
