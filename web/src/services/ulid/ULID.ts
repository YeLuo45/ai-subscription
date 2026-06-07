/**
 * ULID — Universally Unique Lexicographically Sortable Identifier
 *
 * 26 chars: 10 time + 16 random (Crockford Base32)
 */

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = 32;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

export class ULID {
  /**
   * Generate a new ULID.
   */
  static generate(time: number = Date.now()): string {
    if (time < 0 || time > 281474976710655) throw new Error('Invalid time');
    let id = '';
    let t = time;
    for (let i = TIME_LEN - 1; i >= 0; i--) {
      const mod = t % 32;
      id = CROCKFORD[mod] + id;
      t = (t - mod) / 32;
    }
    for (let i = 0; i < RANDOM_LEN; i++) {
      id += CROCKFORD[Math.floor(Math.random() * 32)];
    }
    return id;
  }

  /**
   * Validate ULID format.
   */
  static isValid(id: string): boolean {
    if (id.length !== TIME_LEN + RANDOM_LEN) return false;
    return /^[0-7][0-9A-HJKMNP-TV-Z]{9}[0-9A-HJKMNP-TV-Z]{16}$/i.test(id);
  }

  /**
   * Extract time from ULID.
   */
  static getTime(id: string): number {
    if (!ULID.isValid(id)) throw new Error('Invalid ULID');
    let t = 0;
    for (let i = 0; i < TIME_LEN; i++) {
      const c = ULID._decodeChar(id[i]);
      t = t * 32 + c;
    }
    return t;
  }

  /**
   * Get random part.
   */
  static getRandom(id: string): string {
    if (!ULID.isValid(id)) throw new Error('Invalid ULID');
    return id.slice(TIME_LEN);
  }

  /**
   * Compare two ULIDs (sortable).
   */
  static compare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  /**
   * Build a monotonic ULID.
   */
  static monotonic(prev: string, time: number = Date.now()): string {
    if (!prev) return ULID.generate(time);
    const prevTime = ULID.getTime(prev);
    if (time > prevTime) return ULID.generate(time);
    // Increment random part
    const randomPart = ULID.getRandom(prev);
    const next = ULID._incrementRandom(randomPart);
    let id = '';
    let t = time;
    for (let i = TIME_LEN - 1; i >= 0; i--) {
      const mod = t % 32;
      id = CROCKFORD[mod] + id;
      t = (t - mod) / 32;
    }
    return id + next;
  }

  private static _decodeChar(c: string): number {
    const idx = CROCKFORD.indexOf(c.toUpperCase());
    if (idx < 0) throw new Error(`Invalid char: ${c}`);
    return idx;
  }

  private static _incrementRandom(s: string): string {
    let carry = 1;
    let arr = s.split('');
    for (let i = arr.length - 1; i >= 0 && carry; i--) {
      const idx = CROCKFORD.indexOf(arr[i]) + carry;
      if (idx >= 32) {
        arr[i] = CROCKFORD[0];
        carry = 1;
      } else {
        arr[i] = CROCKFORD[idx];
        carry = 0;
      }
    }
    return arr.join('');
  }
}
