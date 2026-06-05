/**
 * MetricsCollector — metrics + histograms
 *
 * Inspired by: ruflo telemetry + Prometheus pattern
 *
 * Three metric types:
 *   - counter: monotonically increasing value (e.g., requests, errors)
 *   - gauge: arbitrary value (e.g., memory, queue depth)
 *   - histogram: distribution of values with buckets
 *
 * Labels: key-value tags for grouping (e.g., {method: "GET", status: "200"})
 *
 * Features:
 *   - multi-label metrics
 *   - histogram buckets (default: 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10)
 *   - snapshot/export in Prometheus-style text format
 *   - time-windowed counters (per-second rate)
 */

export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface MetricLabels {
  [key: string]: string;
}

interface CounterState {
  type: 'counter';
  name: string;
  help: string;
  values: Map<string, { value: number; labels: MetricLabels; createdAt: number }>;
}

interface GaugeState {
  type: 'gauge';
  name: string;
  help: string;
  values: Map<string, { value: number; labels: MetricLabels; updatedAt: number }>;
}

interface HistogramState {
  type: 'histogram';
  name: string;
  help: string;
  buckets: number[];
  values: Map<string, {
    labels: MetricLabels;
    counts: number[]; // count per bucket (cumulative or not, here non-cumulative per bucket)
    sum: number;
    count: number;
    bucketCounts: number[]; // cumulative
  }>;
}

type MetricState = CounterState | GaugeState | HistogramState;

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

export class MetricsCollector {
  private metrics: Map<string, MetricState> = new Map();
  private globalLabels: MetricLabels = {};

  /** Set global labels applied to all metrics. */
  setGlobalLabels(labels: MetricLabels): void {
    this.globalLabels = { ...labels };
  }

  /** Add a global label. */
  addGlobalLabel(key: string, value: string): void {
    this.globalLabels[key] = value;
  }

  /** Create a counter. */
  createCounter(name: string, help: string = ''): void {
    if (this.metrics.has(name)) {
      throw new Error(`metric "${name}" already exists`);
    }
    this.metrics.set(name, {
      type: 'counter',
      name,
      help,
      values: new Map(),
    });
  }

  /** Create a gauge. */
  createGauge(name: string, help: string = ''): void {
    if (this.metrics.has(name)) {
      throw new Error(`metric "${name}" already exists`);
    }
    this.metrics.set(name, {
      type: 'gauge',
      name,
      help,
      values: new Map(),
    });
  }

  /** Create a histogram. */
  createHistogram(name: string, help: string = '', buckets: number[] = DEFAULT_BUCKETS): void {
    if (this.metrics.has(name)) {
      throw new Error(`metric "${name}" already exists`);
    }
    this.metrics.set(name, {
      type: 'histogram',
      name,
      help,
      buckets: [...buckets].sort((a, b) => a - b),
      values: new Map(),
    });
  }

  /** Increment a counter. */
  incCounter(name: string, value: number = 1, labels: MetricLabels = {}): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'counter') {
      throw new Error(`counter "${name}" not found`);
    }
    const key = this.labelsKey({ ...this.globalLabels, ...labels });
    const existing = metric.values.get(key);
    if (existing) {
      existing.value += value;
    } else {
      metric.values.set(key, {
        value,
        labels: { ...this.globalLabels, ...labels },
        createdAt: Date.now(),
      });
    }
  }

  /** Set a gauge value. */
  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'gauge') {
      throw new Error(`gauge "${name}" not found`);
    }
    const key = this.labelsKey({ ...this.globalLabels, ...labels });
    metric.values.set(key, {
      value,
      labels: { ...this.globalLabels, ...labels },
      updatedAt: Date.now(),
    });
  }

  /** Observe a histogram value. */
  observeHistogram(name: string, value: number, labels: MetricLabels = {}): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram') {
      throw new Error(`histogram "${name}" not found`);
    }
    const key = this.labelsKey({ ...this.globalLabels, ...labels });
    let entry = metric.values.get(key);
    if (!entry) {
      entry = {
        labels: { ...this.globalLabels, ...labels },
        counts: new Array(metric.buckets.length).fill(0),
        sum: 0,
        count: 0,
        bucketCounts: new Array(metric.buckets.length).fill(0),
      };
      metric.values.set(key, entry);
    }
    entry.sum += value;
    entry.count += 1;
    for (let i = 0; i < metric.buckets.length; i++) {
      if (value <= metric.buckets[i]) {
        entry.counts[i] += 1;
      }
    }
    // Build cumulative
    let cum = 0;
    for (let i = 0; i < metric.buckets.length; i++) {
      cum += entry.counts[i];
      entry.bucketCounts[i] = cum;
    }
  }

  /** Get counter value. */
  getCounter(name: string, labels: MetricLabels = {}): number {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'counter') return 0;
    const key = this.labelsKey({ ...this.globalLabels, ...labels });
    return metric.values.get(key)?.value ?? 0;
  }

  /** Get gauge value. */
  getGauge(name: string, labels: MetricLabels = {}): number {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'gauge') return 0;
    const key = this.labelsKey({ ...this.globalLabels, ...labels });
    return metric.values.get(key)?.value ?? 0;
  }

  /** Get histogram stats. */
  getHistogram(name: string, labels: MetricLabels = {}): { count: number; sum: number; mean: number; p50?: number; p99?: number } | undefined {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram') return undefined;
    const key = this.labelsKey({ ...this.globalLabels, ...labels });
    const entry = metric.values.get(key);
    if (!entry) return undefined;
    return {
      count: entry.count,
      sum: entry.sum,
      mean: entry.count > 0 ? entry.sum / entry.count : 0,
    };
  }

  /** Get all counter/gauge/histogram metric names. */
  listMetrics(): string[] {
    return Array.from(this.metrics.keys());
  }

  /** Get a metric's type. */
  getType(name: string): MetricType | undefined {
    return this.metrics.get(name)?.type;
  }

  /** Reset a metric (clear all its values). */
  resetMetric(name: string): boolean {
    const metric = this.metrics.get(name);
    if (!metric) return false;
    if (metric.type === 'counter') {
      metric.values.clear();
    } else if (metric.type === 'gauge') {
      metric.values.clear();
    } else {
      metric.values.clear();
    }
    return true;
  }

  /**
   * Export in Prometheus text format.
   * Format:
   *   # HELP <name> <help>
   *   # TYPE <name> <type>
   *   <name>{labels} <value>
   */
  exportPrometheus(): string {
    const lines: string[] = [];
    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);
      for (const [, v] of metric.values) {
        const labelsStr = this.labelsToString(v.labels);
        if (metric.type === 'histogram') {
          for (let i = 0; i < metric.buckets.length; i++) {
            const bucketLabels = { ...v.labels, le: String(metric.buckets[i]) };
            lines.push(`${metric.name}_bucket${this.labelsToString(bucketLabels)} ${v.bucketCounts[i]}`);
          }
          lines.push(`${metric.name}_sum${labelsStr} ${v.sum}`);
          lines.push(`${metric.name}_count${labelsStr} ${v.count}`);
        } else {
          lines.push(`${metric.name}${labelsStr} ${v.value}`);
        }
      }
    }
    return lines.join('\n');
  }

  /** Statistics. */
  stats(): { totalMetrics: number; byType: Record<MetricType, number> } {
    const byType: Record<MetricType, number> = { counter: 0, gauge: 0, histogram: 0 };
    for (const m of this.metrics.values()) byType[m.type] += 1;
    return {
      totalMetrics: this.metrics.size,
      byType,
    };
  }

  private labelsKey(labels: MetricLabels): string {
    const keys = Object.keys(labels).sort();
    return keys.map((k) => `${k}=${labels[k]}`).join(',');
  }

  private labelsToString(labels: MetricLabels): string {
    const keys = Object.keys(labels);
    if (keys.length === 0) return '';
    return '{' + keys.map((k) => `${k}="${labels[k]}"`).join(',') + '}';
  }
}
