/**
 * TemplateEngine.test.ts — Pure unit tests for template rendering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateEngine } from '../TemplateEngine';

describe('TemplateEngine — simple variables', () => {
  let t: TemplateEngine;
  beforeEach(() => { t = new TemplateEngine(); });

  it('renders a simple variable', () => {
    expect(t.render('Hello {{name}}', { name: 'World' })).toBe('Hello World');
  });

  it('renders multiple variables', () => {
    expect(t.render('{{a}} + {{b}} = 3', { a: 1, b: 2 })).toBe('1 + 2 = 3');
  });

  it('handles missing variables', () => {
    expect(t.render('{{x}}', {})).toBe('');
  });

  it('renders number variables', () => {
    expect(t.render('Age: {{age}}', { age: 30 })).toBe('Age: 30');
  });

  it('handles dot path', () => {
    expect(t.render('{{user.name}}', { user: { name: 'Alice' } })).toBe('Alice');
  });

  it('returns empty for null', () => {
    expect(t.render('{{x}}', { x: null })).toBe('');
  });

  it('returns empty for undefined', () => {
    expect(t.render('{{x}}', { x: undefined })).toBe('');
  });
});

describe('TemplateEngine — raw and literals', () => {
  let t: TemplateEngine;
  beforeEach(() => { t = new TemplateEngine(); });

  it('triple braces render raw', () => {
    expect(t.render('{{{html}}}', { html: '<b>hi</b>' })).toBe('<b>hi</b>');
  });

  it('ampersand alias for raw', () => {
    expect(t.render('{{&x}}', { x: '<i>' })).toBe('<i>');
  });

  it('JSON-stringifies objects', () => {
    expect(t.render('{{x}}', { x: { a: 1 } })).toBe('{"a":1}');
  });
});

describe('TemplateEngine — if/unless', () => {
  let t: TemplateEngine;
  beforeEach(() => { t = new TemplateEngine(); });

  it('renders if-block when truthy', () => {
    expect(t.render('{{#if x}}yes{{/if}}', { x: true })).toBe('yes');
  });

  it('skips if-block when falsy', () => {
    expect(t.render('{{#if x}}yes{{/if}}', { x: false })).toBe('');
  });

  it('unless renders when falsy', () => {
    expect(t.render('{{#unless x}}no{{/unless}}', { x: false })).toBe('no');
  });

  it('unless skips when truthy', () => {
    expect(t.render('{{#unless x}}no{{/unless}}', { x: true })).toBe('');
  });
});

describe('TemplateEngine — each', () => {
  let t: TemplateEngine;
  beforeEach(() => { t = new TemplateEngine(); });

  it('iterates array', () => {
    expect(t.render('{{#each items}}<{{.}}>{{/each}}', { items: [1, 2, 3] })).toBe('<1><2><3>');
  });

  it('iterates empty array', () => {
    expect(t.render('{{#each items}}x{{/each}}', { items: [] })).toBe('');
  });

  it('iterates object', () => {
    expect(t.render('{{#each items}}{{name}};{{/each}}', { items: [{ name: 'A' }, { name: 'B' }] })).toBe('A;B;');
  });
});

describe('TemplateEngine — comments', () => {
  let t: TemplateEngine;
  beforeEach(() => { t = new TemplateEngine(); });

  it('removes comments', () => {
    expect(t.render('a{{!-- this is hidden --}}b')).toBe('ab');
  });
});

describe('TemplateEngine — helpers', () => {
  let t: TemplateEngine;
  beforeEach(() => {
    t = new TemplateEngine();
    t.registerHelper('upper', (s) => String(s).toUpperCase());
    t.registerHelper('add', (a, b) => String(Number(a) + Number(b)));
  });

  it('uses registered helper', () => {
    expect(t.render('{{upper name}}', { name: 'alice' })).toBe('ALICE');
  });

  it('helper with multiple args', () => {
    expect(t.render('{{add 1 2}}')).toBe('3');
  });
});

describe('TemplateEngine — complex templates', () => {
  let t: TemplateEngine;
  beforeEach(() => { t = new TemplateEngine(); });

  it('combines features', () => {
    const tpl = `
{{#if user}}
Hello {{user.name}}!
{{#if user.admin}}
You are admin.
{{/if}}
{{#each user.items}}
- {{.}}
{{/each}}
{{/if}}`.trim();
    const r = t.render(tpl, {
      user: {
        name: 'Alice',
        admin: true,
        items: ['a', 'b', 'c'],
      },
    });
    expect(r).toContain('Hello Alice!');
    expect(r).toContain('You are admin.');
    expect(r).toContain('- a');
    expect(r).toContain('- c');
  });
});
