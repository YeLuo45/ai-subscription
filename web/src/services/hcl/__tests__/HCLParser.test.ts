/**
 * HCLParser.test.ts — Pure unit tests for HCL parser
 */

import { describe, it, expect } from 'vitest';
import { HCLParser } from '../HCLParser';

describe('HCLParser — basic', () => {
  it('parses key-value', () => {
    const r = new HCLParser().parse('name = "Alice"');
    expect(r.body.name).toBe('Alice');
  });

  it('parses integer', () => {
    expect(new HCLParser().parse('port = 8080').body.port).toBe(8080);
  });

  it('parses float', () => {
    expect(new HCLParser().parse('pi = 3.14').body.pi).toBe(3.14);
  });

  it('parses boolean', () => {
    expect(new HCLParser().parse('enabled = true').body.enabled).toBe(true);
  });

  it('parses null', () => {
    expect(new HCLParser().parse('x = null').body.x).toBe(null);
  });
});

describe('HCLParser — blocks', () => {
  it('simple block', () => {
    const r = new HCLParser().parse('resource "aws_s3_bucket" "my" {\n  region = "us-east-1"\n}');
    expect(r.blocks.length).toBe(1);
    expect(r.blocks[0].type).toBe('resource');
    expect(r.blocks[0].labels).toEqual(['aws_s3_bucket', 'my']);
    expect(r.blocks[0].body.region).toBe('us-east-1');
  });

  it('block without labels', () => {
    const r = new HCLParser().parse('settings {\n  debug = true\n}');
    expect(r.blocks[0].type).toBe('settings');
    expect(r.blocks[0].labels).toEqual([]);
  });

  it('multiple blocks', () => {
    const r = new HCLParser().parse('a { x = 1 }\nb { y = 2 }');
    expect(r.blocks.length).toBe(2);
  });
});

describe('HCLParser — lists', () => {
  it('string list', () => {
    const r = new HCLParser().parse('items = ["a", "b", "c"]');
    expect(r.body.items).toEqual(['a', 'b', 'c']);
  });

  it('number list', () => {
    expect(new HCLParser().parse('nums = [1, 2, 3]').body.nums).toEqual([1, 2, 3]);
  });
});

describe('HCLParser — comments', () => {
  it('# comments', () => {
    const r = new HCLParser().parse('# comment\nx = 1');
    expect(r.body.x).toBe(1);
  });

  it('// comments', () => {
    expect(new HCLParser().parse('// comment\nx = 1').body.x).toBe(1);
  });

  it('inline # comment', () => {
    expect(new HCLParser().parse('x = 1 # note').body.x).toBe(1);
  });
});
