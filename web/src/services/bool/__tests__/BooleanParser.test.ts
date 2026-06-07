/**
 * BooleanParser.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { BooleanParser } from '../BooleanParser';

describe('BooleanParser — parse', () => {
  it('true', () => {
    expect(BooleanParser.parse('true')).toBe(true);
  });

  it('1', () => {
    expect(BooleanParser.parse('1')).toBe(true);
  });

  it('yes', () => {
    expect(BooleanParser.parse('yes')).toBe(true);
  });

  it('on', () => {
    expect(BooleanParser.parse('on')).toBe(true);
  });

  it('Y', () => {
    expect(BooleanParser.parse('Y')).toBe(true);
  });

  it('false', () => {
    expect(BooleanParser.parse('false')).toBe(false);
  });

  it('0', () => {
    expect(BooleanParser.parse('0')).toBe(false);
  });

  it('case insensitive', () => {
    expect(BooleanParser.parse('TRUE')).toBe(true);
  });

  it('invalid returns null', () => {
    expect(BooleanParser.parse('maybe')).toBeNull();
  });
});

describe('BooleanParser — strict', () => {
  it('strict valid', () => {
    expect(BooleanParser.parseStrict('true')).toBe(true);
  });

  it('strict invalid throws', () => {
    expect(() => BooleanParser.parseStrict('maybe')).toThrow();
  });
});

describe('BooleanParser — toBoolean', () => {
  it('from bool', () => {
    expect(BooleanParser.toBoolean(true)).toBe(true);
  });

  it('from number 0', () => {
    expect(BooleanParser.toBoolean(0)).toBe(false);
  });

  it('from number nonzero', () => {
    expect(BooleanParser.toBoolean(42)).toBe(true);
  });

  it('from string true', () => {
    expect(BooleanParser.toBoolean('true')).toBe(true);
  });
});

describe('BooleanParser — isValid', () => {
  it('valid', () => {
    expect(BooleanParser.isValid('true')).toBe(true);
  });

  it('invalid', () => {
    expect(BooleanParser.isValid('maybe')).toBe(false);
  });
});

describe('BooleanParser — stringify', () => {
  it('truefalse', () => {
    expect(BooleanParser.stringify(true)).toBe('true');
    expect(BooleanParser.stringify(false)).toBe('false');
  });

  it('yesno', () => {
    expect(BooleanParser.stringify(true, 'yesno')).toBe('yes');
  });

  it('10', () => {
    expect(BooleanParser.stringify(true, '10')).toBe('1');
  });

  it('onoff', () => {
    expect(BooleanParser.stringify(false, 'onoff')).toBe('off');
  });
});
