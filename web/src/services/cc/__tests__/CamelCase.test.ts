/**
 * CamelCase.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { CamelCase } from '../CamelCase';

describe('CamelCase — words', () => {
  it('camelCase', () => {
    expect(CamelCase.words('camelCase')).toEqual(['camel', 'case']);
  });

  it('PascalCase', () => {
    expect(CamelCase.words('PascalCase')).toEqual(['pascal', 'case']);
  });

  it('snake_case', () => {
    expect(CamelCase.words('snake_case')).toEqual(['snake', 'case']);
  });

  it('kebab-case', () => {
    expect(CamelCase.words('kebab-case')).toEqual(['kebab', 'case']);
  });

  it('CONSTANT_CASE', () => {
    expect(CamelCase.words('CONSTANT_CASE')).toEqual(['constant', 'case']);
  });

  it('spaces', () => {
    expect(CamelCase.words('hello world')).toEqual(['hello', 'world']);
  });

  it('empty', () => {
    expect(CamelCase.words('')).toEqual([]);
  });
});

describe('CamelCase — toCamel', () => {
  it('from snake', () => {
    expect(CamelCase.toCamel('hello_world')).toBe('helloWorld');
  });

  it('from kebab', () => {
    expect(CamelCase.toCamel('hello-world')).toBe('helloWorld');
  });

  it('from Pascal', () => {
    expect(CamelCase.toCamel('HelloWorld')).toBe('helloWorld');
  });
});

describe('CamelCase — toPascal', () => {
  it('from snake', () => {
    expect(CamelCase.toPascal('hello_world')).toBe('HelloWorld');
  });

  it('from camel', () => {
    expect(CamelCase.toPascal('helloWorld')).toBe('HelloWorld');
  });
});

describe('CamelCase — toSnake/toKebab', () => {
  it('toSnake from camel', () => {
    expect(CamelCase.toSnake('helloWorld')).toBe('hello_world');
  });

  it('toKebab from camel', () => {
    expect(CamelCase.toKebab('helloWorld')).toBe('hello-world');
  });
});

describe('CamelCase — toConstant/toTitle', () => {
  it('toConstant', () => {
    expect(CamelCase.toConstant('helloWorld')).toBe('HELLO_WORLD');
  });

  it('toTitle', () => {
    expect(CamelCase.toTitle('helloWorld')).toBe('Hello World');
  });
});

describe('CamelCase — detect', () => {
  it('camel', () => {
    expect(CamelCase.detect('helloWorld')).toBe('camel');
  });

  it('pascal', () => {
    expect(CamelCase.detect('HelloWorld')).toBe('pascal');
  });

  it('snake', () => {
    expect(CamelCase.detect('hello_world')).toBe('snake');
  });

  it('kebab', () => {
    expect(CamelCase.detect('hello-world')).toBe('kebab');
  });

  it('constant', () => {
    expect(CamelCase.detect('HELLO_WORLD')).toBe('constant');
  });
});
