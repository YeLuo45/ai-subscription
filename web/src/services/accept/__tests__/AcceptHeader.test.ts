/**
 * AcceptHeader.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { AcceptHeader } from '../AcceptHeader';

describe('AcceptHeader — parse', () => {
  it('parses single', () => {
    const a = new AcceptHeader('text/html');
    expect(a.getEntries().length).toBe(1);
    expect(a.getEntries()[0].type).toBe('text/html');
  });

  it('parses with q', () => {
    const a = new AcceptHeader('text/html;q=0.5');
    expect(a.getEntries()[0].q).toBe(0.5);
  });

  it('parses multiple sorted by q', () => {
    const a = new AcceptHeader('text/html;q=0.5, application/json');
    const entries = a.getEntries();
    expect(entries[0].type).toBe('application/json');
    expect(entries[1].type).toBe('text/html');
  });

  it('parses *', () => {
    const a = new AcceptHeader('*/*');
    expect(a.getEntries()[0].type).toBe('*/*');
  });

  it('parses empty as */*', () => {
    const a = new AcceptHeader('');
    expect(a.getEntries()[0].type).toBe('*/*');
  });

  it('parses with params', () => {
    const a = new AcceptHeader('text/html;level=1');
    expect(a.getEntries()[0].params.level).toBe('1');
  });
});

describe('AcceptHeader — bestMatch', () => {
  it('exact match', () => {
    const a = new AcceptHeader('text/html');
    expect(a.bestMatch(['text/html', 'application/json'])).toBe('text/html');
  });

  it('wildcard match', () => {
    const a = new AcceptHeader('image/*');
    expect(a.bestMatch(['text/html', 'image/png'])).toBe('image/png');
  });

  it('q preference', () => {
    const a = new AcceptHeader('text/html;q=0.5, application/json');
    expect(a.bestMatch(['text/html', 'application/json'])).toBe('application/json');
  });

  it('no match', () => {
    const a = new AcceptHeader('text/html');
    expect(a.bestMatch(['application/json'])).toBe(null);
  });

  it('*/* match', () => {
    const a = new AcceptHeader('*/*');
    expect(a.bestMatch(['text/html'])).toBe('text/html');
  });
});

describe('AcceptHeader — sort', () => {
  it('sort by preference', () => {
    const a = new AcceptHeader('text/html;q=0.3, application/json');
    const sorted = a.sort(['text/html', 'application/json']);
    expect(sorted[0]).toBe('application/json');
  });

  it('preserves order with no match', () => {
    const a = new AcceptHeader('text/html');
    const sorted = a.sort(['application/json', 'text/html']);
    expect(sorted[0]).toBe('text/html');
  });
});

describe('AcceptHeader — static', () => {
  it('static parse', () => {
    const a = AcceptHeader.parse('text/html');
    expect(a.getEntries()[0].type).toBe('text/html');
  });
});
