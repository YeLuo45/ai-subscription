/**
 * TextTagger.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { TextTagger } from '../TextTagger';

describe('TextTagger — posTag', () => {
  it('noun', () => {
    const tags = TextTagger.posTag('the time is good');
    const det = tags.find((t) => t.text.toLowerCase() === 'the');
    expect(det?.type).toBe('det');
    const noun = tags.find((t) => t.text.toLowerCase() === 'time');
    expect(noun?.type).toBe('noun');
  });

  it('verb', () => {
    const tags = TextTagger.posTag('I am happy');
    const v = tags.find((t) => t.text.toLowerCase() === 'am');
    expect(v?.type).toBe('verb');
  });

  it('adjective', () => {
    const tags = TextTagger.posTag('good morning');
    const a = tags.find((t) => t.text.toLowerCase() === 'good');
    expect(a?.type).toBe('adj');
  });

  it('adverb', () => {
    const tags = TextTagger.posTag('very happy');
    const adv = tags.find((t) => t.text.toLowerCase() === 'very');
    expect(adv?.type).toBe('adv');
  });

  it('unknown', () => {
    const tags = TextTagger.posTag('xyzabc');
    const u = tags.find((t) => t.text === 'xyzabc');
    expect(u?.type).toBe('unk');
  });

  it('number', () => {
    const tags = TextTagger.posTag('42 is the answer');
    const n = tags.find((t) => t.text === '42');
    expect(n?.type).toBe('num');
  });

  it('positions', () => {
    const tags = TextTagger.posTag('the cat');
    expect(tags[0].start).toBe(0);
    expect(tags[0].end).toBe(3);
  });
});

describe('TextTagger — entities', () => {
  it('email', () => {
    const e = TextTagger.entities('Contact me at foo@bar.com');
    expect(e.some((x) => x.type === 'email' && x.text === 'foo@bar.com')).toBe(true);
  });

  it('url', () => {
    const e = TextTagger.entities('Visit https://example.com today');
    expect(e.some((x) => x.type === 'url' && x.text.startsWith('https://'))).toBe(true);
  });

  it('mention', () => {
    const e = TextTagger.entities('Hi @alice how are you');
    expect(e.some((x) => x.type === 'mention' && x.text === '@alice')).toBe(true);
  });

  it('hashtag', () => {
    const e = TextTagger.entities('I love #typescript');
    expect(e.some((x) => x.type === 'hashtag' && x.text === '#typescript')).toBe(true);
  });

  it('phone', () => {
    const e = TextTagger.entities('Call 555-123-4567 now');
    expect(e.some((x) => x.type === 'phone')).toBe(true);
  });

  it('number', () => {
    const e = TextTagger.entities('I have 42 apples');
    expect(e.some((x) => x.type === 'number' && x.text === '42')).toBe(true);
  });

  it('date', () => {
    const e = TextTagger.entities('Today is 2024-01-15');
    expect(e.some((x) => x.type === 'date')).toBe(true);
  });

  it('sorted by position', () => {
    const e = TextTagger.entities('foo@bar.com and @alice');
    for (let i = 1; i < e.length; i++) {
      expect(e[i].start).toBeGreaterThanOrEqual(e[i - 1].start);
    }
  });
});

describe('TextTagger — tagAll', () => {
  it('combined', () => {
    const r = TextTagger.tagAll('The time is 42');
    expect(r.pos.length).toBeGreaterThan(0);
    expect(r.entities.length).toBeGreaterThan(0);
  });
});
