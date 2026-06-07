/**
 * UnitConversion — physical unit conversion
 *
 * Inspired by: convert-units / mathjs
 *
 * Supports: length, mass, temperature, time, area, volume, speed, data
 */

type UnitCategory = 'length' | 'mass' | 'temperature' | 'time' | 'area' | 'volume' | 'speed' | 'data';

const CONVERSIONS: Record<UnitCategory, Record<string, number>> = {
  // Base: meter
  length: { m: 1, cm: 0.01, mm: 0.001, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
  // Base: kg
  mass: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.45359237, oz: 0.028349523125, t: 1000 },
  // Base: second
  time: { s: 1, ms: 0.001, min: 60, h: 3600, d: 86400, wk: 604800 },
  // Base: m^2
  area: { 'm2': 1, 'cm2': 0.0001, 'km2': 1000000, 'ft2': 0.09290304, 'ac': 4046.8564224, 'ha': 10000 },
  // Base: m^3
  volume: { 'm3': 1, l: 0.001, ml: 0.000001, 'gal': 0.003785411784, 'qt': 0.000946352946, 'pt': 0.000473176473, 'cup': 0.0002365882365 },
  // Base: m/s
  speed: { 'm/s': 1, 'km/h': 0.2777777778, 'mph': 0.44704, 'ft/s': 0.3048, knot: 0.5144444444 },
  // Base: byte
  data: { b: 1, B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776, Kb: 1000, Mb: 1000000, Gb: 1000000000 },
  // temperature: handled separately
  temperature: {},
};

export class UnitConversion {
  /**
   * Convert between units in same category.
   */
  static convert(value: number, from: string, to: string, category: UnitCategory): number {
    if (category === 'temperature') {
      return UnitConversion._convertTemp(value, from, to);
    }
    const table = CONVERSIONS[category];
    const fromFactor = table[from];
    const toFactor = table[to];
    if (fromFactor === undefined || toFactor === undefined) {
      throw new Error(`Unknown unit: ${from} or ${to}`);
    }
    return (value * fromFactor) / toFactor;
  }

  /**
   * Temperature conversion (special).
   */
  private static _convertTemp(value: number, from: string, to: string): number {
    if (from === to) return value;
    let celsius: number;
    if (from === 'C') celsius = value;
    else if (from === 'F') celsius = (value - 32) * 5 / 9;
    else if (from === 'K') celsius = value - 273.15;
    else if (from === 'R') celsius = (value - 491.67) * 5 / 9;
    else throw new Error(`Unknown temp unit: ${from}`);

    if (to === 'C') return celsius;
    if (to === 'F') return celsius * 9 / 5 + 32;
    if (to === 'K') return celsius + 273.15;
    if (to === 'R') return (celsius + 273.15) * 9 / 5;
    throw new Error(`Unknown temp unit: ${to}`);
  }

  /**
   * List units in category.
   */
  static listUnits(category: UnitCategory): string[] {
    if (category === 'temperature') return ['C', 'F', 'K', 'R'];
    return Object.keys(CONVERSIONS[category]);
  }

  /**
   * Format bytes with human-readable size.
   */
  static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const idx = Math.min(i, sizes.length - 1);
    return `${(bytes / Math.pow(k, idx)).toFixed(decimals)} ${sizes[idx]}`;
  }
}
