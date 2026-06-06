/**
 * CSSSelector.test.ts — Pure unit tests for CSS selector
 */

import { describe, it, expect } from 'vitest';
import { CSSSelector, type SimpleNode } from '../CSSSelector';

function div(tag: string, opts: Partial<SimpleNode> = {}): SimpleNode {
  return {
    tag,
    id: opts.id,
    classList: opts.classList ?? [],
    attrs: opts.attrs ?? {},
    children: opts.children ?? [],
    parent: opts.parent ?? null,
  };
}

describe('CSSSelector — tag', () => {
  it('matches tag', () => {
    const n = div('div');
    expect(new CSSSelector('div').matches(n)).toBe(true);
  });

  it('rejects wrong tag', () => {
    expect(new CSSSelector('span').matches(div('div'))).toBe(false);
  });
});

describe('CSSSelector — class', () => {
  it('matches class', () => {
    const n = div('div', { classList: ['foo', 'bar'] });
    expect(new CSSSelector('.foo').matches(n)).toBe(true);
    expect(new CSSSelector('.bar').matches(n)).toBe(true);
    expect(new CSSSelector('.baz').matches(n)).toBe(false);
  });
});

describe('CSSSelector — id', () => {
  it('matches id', () => {
    const n = div('div', { id: 'main' });
    expect(new CSSSelector('#main').matches(n)).toBe(true);
    expect(new CSSSelector('#other').matches(n)).toBe(false);
  });
});

describe('CSSSelector — universal', () => {
  it('matches all', () => {
    expect(new CSSSelector('*').matches(div('span'))).toBe(true);
  });
});

describe('CSSSelector — attribute', () => {
  it('presence', () => {
    const n = div('input', { attrs: { disabled: 'true' } });
    expect(new CSSSelector('[disabled]').matches(n)).toBe(true);
  });

  it('exact', () => {
    const n = div('input', { attrs: { type: 'text' } });
    expect(new CSSSelector('[type=text]').matches(n)).toBe(true);
    expect(new CSSSelector('[type=number]').matches(n)).toBe(false);
  });

  it('prefix', () => {
    const n = div('a', { attrs: { href: 'https://example.com' } });
    expect(new CSSSelector('[href^=https]').matches(n)).toBe(true);
  });

  it('suffix', () => {
    const n = div('a', { attrs: { href: 'main.css' } });
    expect(new CSSSelector('[href$=.css]').matches(n)).toBe(true);
  });

  it('substring', () => {
    const n = div('a', { attrs: { href: 'foo/bar/baz' } });
    expect(new CSSSelector('[href*=bar]').matches(n)).toBe(true);
  });
});

describe('CSSSelector — combined', () => {
  it('tag + class', () => {
    const n = div('div', { classList: ['foo'] });
    expect(new CSSSelector('div.foo').matches(n)).toBe(true);
  });

  it('all parts must match', () => {
    const n = div('div', { id: 'main', classList: ['foo'] });
    expect(new CSSSelector('div.foo#main').matches(n)).toBe(true);
  });
});

describe('CSSSelector — queryAll', () => {
  it('finds all matches in tree', () => {
    const tree: SimpleNode = {
      tag: 'root',
      classList: [],
      attrs: {},
      children: [
        div('div', { classList: ['foo'] }),
        div('span'),
        div('div', { classList: ['foo', 'bar'] }),
      ],
    };
    const r = new CSSSelector('.foo').queryAll(tree);
    expect(r.length).toBe(2);
  });
});
