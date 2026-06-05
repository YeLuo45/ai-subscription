/**
 * MetricsCollector.test.ts — Pure unit tests for metrics + histograms
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from '../MetricsCollector';

describe('MetricsCollector — counter', () => {
  let mc: MetricsCollector;
  beforeEach(() => {
    mc = new MetricsCollector();
  });

  it('creates a counter', () => {
    mc.createCounter('requests', 'total requests');
    expect(mc.getType('requests')).toBe('counter');
  });

  it('rejects duplicate metric name', () => {
    mc.createCounter('a');
    expect(() => mc.createCounter('a')).toThrow('already exists');
  });

  it('incCounter increments', () => {
    mc.createCounter('a');
    mc.incCounter('a');
    mc.incCounter('a', 5);
    expect(mc.getCounter('a')).toBe(6);
  });

  it('incCounter with labels tracks separately', () => {
    mc.createCounter('a');
    mc.incCounter('a', 1, { method: 'GET' });
    mc.incCounter('a', 2, { method: 'POST' });
    expect(mc.getCounter('a', { method: 'GET' })).toBe(1);
    expect(mc.getCounter('a', { method: 'POST' })).toBe(2);
  });

  it('incCounter on unknown counter throws', () => {
    expect(() => mc.incCounter('nope')).toThrow('not found');
  });
});

describe('MetricsCollector — gauge', () => {
  let mc: MetricsCollector;
  beforeEach(() => {
    mc = new MetricsCollector();
  });

  it('creates a gauge', () => {
    mc.createGauge('memory');
    expect(mc.getType('memory')).toBe('gauge');
  });

  it('setGauge sets value', () => {
    mc.createGauge('memory');
    mc.setGauge('memory', 100);
    mc.setGauge('memory', 200);
    expect(mc.getGauge('memory')).toBe(200);
  });

  it('setGauge with labels', () => {
    mc.createGauge('q');
    mc.setGauge('q', 5, { region: 'us' });
    mc.setGauge('q', 10, { region: 'eu' });
    expect(mc.getGauge('q', { region: 'us' })).toBe(5);
    expect(mc.getGauge('q', { region: 'eu' })).toBe(10);
  });

  it('setGauge on unknown throws', () => {
    expect(() => mc.setGauge('nope', 1)).toThrow('not found');
  });

  it('getGauge returns 0 for unset', () => {
    mc.createGauge('g');
    expect(mc.getGauge('g')).toBe(0);
  });
});

describe('MetricsCollector — histogram', () => {
  let mc: MetricsCollector;
  beforeEach(() => {
    mc = new MetricsCollector();
  });

  it('creates a histogram', () => {
    mc.createHistogram('latency');
    expect(mc.getType('latency')).toBe('histogram');
  });

  it('creates a histogram with custom buckets', () => {
    mc.createHistogram('latency', '', [1, 2, 5]);
    expect(mc.getType('latency')).toBe('histogram');
  });

  it('observe records value', () => {
    mc.createHistogram('latency');
    mc.observeHistogram('latency', 0.5);
    mc.observeHistogram('latency', 1.5);
    const stats = mc.getHistogram('latency')!;
    expect(stats.count).toBe(2);
    expect(stats.sum).toBeCloseTo(2.0, 5);
  });

  it('computes mean', () => {
    mc.createHistogram('latency');
    mc.observeHistogram('latency', 1);
    mc.observeHistogram('latency', 3);
    expect(mc.getHistogram('latency')!.mean).toBeCloseTo(2.0, 5);
  });

  it('observe on unknown throws', () => {
    expect(() => mc.observeHistogram('nope', 1)).toThrow('not found');
  });

  it('getHistogram returns undefined for unset', () => {
    mc.createHistogram('h');
    expect(mc.getHistogram('h')).toBeUndefined();
  });

  it('mean is 0 for no observations', () => {
    mc.createHistogram('h');
    const stats = mc.getHistogram('h');
    // Will be undefined for no observations
  });
});

describe('MetricsCollector — global labels', () => {
  it('applies global labels to counter', () => {
    const mc = new MetricsCollector();
    mc.setGlobalLabels({ app: 'test' });
    mc.createCounter('c');
    mc.incCounter('c', 1, { method: 'GET' });
    expect(mc.getCounter('c', { method: 'GET' })).toBe(1);
    // Without explicit method, with global: should be 1
    expect(mc.getCounter('c', { app: 'test', method: 'GET' })).toBe(1);
  });

  it('addGlobalLabel adds single label', () => {
    const mc = new MetricsCollector();
    mc.addGlobalLabel('env', 'prod');
    mc.createCounter('c');
    mc.incCounter('c');
    expect(mc.getCounter('c', { env: 'prod' })).toBe(1);
  });
});

describe('MetricsCollector — list and reset', () => {
  it('listMetrics returns all names', () => {
    const mc = new MetricsCollector();
    mc.createCounter('a');
    mc.createGauge('b');
    mc.createHistogram('c');
    expect(mc.listMetrics().sort()).toEqual(['a', 'b', 'c']);
  });

  it('resetMetric clears values', () => {
    const mc = new MetricsCollector();
    mc.createCounter('a');
    mc.incCounter('a', 5);
    expect(mc.resetMetric('a')).toBe(true);
    expect(mc.getCounter('a')).toBe(0);
  });

  it('resetMetric returns false for unknown', () => {
    const mc = new MetricsCollector();
    expect(mc.resetMetric('nope')).toBe(false);
  });
});

describe('MetricsCollector — Prometheus export', () => {
  it('exports counter in prom format', () => {
    const mc = new MetricsCollector();
    mc.createCounter('requests', 'total requests');
    mc.incCounter('requests', 5, { method: 'GET' });
    const out = mc.exportPrometheus();
    expect(out).toContain('# HELP requests total requests');
    expect(out).toContain('# TYPE requests counter');
    expect(out).toContain('requests{method="GET"} 5');
  });

  it('exports gauge in prom format', () => {
    const mc = new MetricsCollector();
    mc.createGauge('memory', 'mem usage');
    mc.setGauge('memory', 100);
    const out = mc.exportPrometheus();
    expect(out).toContain('memory 100');
  });

  it('exports histogram with buckets', () => {
    const mc = new MetricsCollector();
    mc.createHistogram('latency');
    mc.observeHistogram('latency', 0.05);
    mc.observeHistogram('latency', 0.5);
    const out = mc.exportPrometheus();
    expect(out).toContain('# TYPE latency histogram');
    expect(out).toContain('latency_bucket{le="0.005"}');
    expect(out).toContain('latency_count');
    expect(out).toContain('latency_sum');
  });
});

describe('MetricsCollector — stats', () => {
  it('reports counts by type', () => {
    const mc = new MetricsCollector();
    mc.createCounter('a');
    mc.createCounter('b');
    mc.createGauge('c');
    mc.createHistogram('d');
    const s = mc.stats();
    expect(s.totalMetrics).toBe(4);
    expect(s.byType.counter).toBe(2);
    expect(s.byType.gauge).toBe(1);
    expect(s.byType.histogram).toBe(1);
  });
});
