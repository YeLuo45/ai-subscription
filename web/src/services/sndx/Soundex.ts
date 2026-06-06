/**
 * Soundex — Soundex phonetic algorithm
 *
 * Inspired by: natural / soundex
 *
 * American Soundex: 4-char code (letter + 3 digits).
 */

const CODES: Record<string, string> = {
  b: '1', f: '1', p: '1', v: '1',
  c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
  d: '3', t: '3',
  l: '4',
  m: '5', n: '5',
  r: '6',
};

export class Soundex {
  /**
   * American Soundex code.
   */
  static encode(input: string): string {
    if (!input) return '';
    const cleaned = input.toLowerCase().replace(/[^a-z]/g, '');
    if (cleaned.length === 0) return '';
    const first = cleaned[0].toUpperCase();
    let prev = CODES[cleaned[0]] ?? '';
    const out: string[] = [first];
    for (let i = 1; i < cleaned.length && out.length < 4; i++) {
      const code = CODES[cleaned[i]] ?? '';
      if (code !== '' && code !== prev) {
        out.push(code);
      }
      if (code !== '' || cleaned[i] === 'h' || cleaned[i] === 'w') {
        prev = code;
      }
    }
    while (out.length < 4) out.push('0');
    return out.join('');
  }

  /**
   * Are two strings phonetically similar?
   */
  static similar(a: string, b: string): boolean {
    return Soundex.encode(a) === Soundex.encode(b);
  }

  /**
   * Soundex distance (0 or 1).
   */
  static distance(a: string, b: string): number {
    return Soundex.similar(a, b) ? 0 : 1;
  }

  /**
   * Batch encode.
   */
  static batch(inputs: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const i of inputs) out[i] = Soundex.encode(i);
    return out;
  }
}
