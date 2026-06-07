/**
 * BooleanParser — parse various boolean representations
 */

const TRUTHY = new Set(['true', '1', 'yes', 'y', 'on', 'enable', 'enabled', 't']);
const FALSY = new Set(['false', '0', 'no', 'n', 'off', 'disable', 'disabled', 'f']);

export class BooleanParser {
  /**
   * Parse string to boolean.
   */
  static parse(value: string): boolean | null {
    const s = value.trim().toLowerCase();
    if (TRUTHY.has(s)) return true;
    if (FALSY.has(s)) return false;
    return null;
  }

  /**
   * Strict parse (throws on invalid).
   */
  static parseStrict(value: string): boolean {
    const r = BooleanParser.parse(value);
    if (r === null) throw new Error(`Cannot parse boolean: ${value}`);
    return r;
  }

  /**
   * Parse any input to boolean.
   */
  static toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const r = BooleanParser.parse(value);
      if (r !== null) return r;
    }
    return Boolean(value);
  }

  /**
   * Check if string is a valid boolean representation.
   */
  static isValid(value: string): boolean {
    return BooleanParser.parse(value) !== null;
  }

  /**
   * Convert boolean to various string forms.
   */
  static stringify(value: boolean, form: 'truefalse' | 'yesno' | '10' | 'onoff' = 'truefalse'): string {
    if (form === 'yesno') return value ? 'yes' : 'no';
    if (form === '10') return value ? '1' : '0';
    if (form === 'onoff') return value ? 'on' : 'off';
    return value ? 'true' : 'false';
  }
}
