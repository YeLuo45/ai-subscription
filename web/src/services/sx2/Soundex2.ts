/**
 * Soundex2 — simplified phonetic algorithms
 *
 * Inspired by: soundex / metaphone / double-metaphone
 *
 * Implements: Soundex, Refined Soundex, Metaphone (simplified)
 */

export class Soundex2 {
  /**
   * Classic Soundex (American).
   * Robert -> R163, Rupert -> R163, Rubin -> R150
   */
  static soundex(input: string): string {
    if (input.length === 0) return '';
    const s = input.toUpperCase().replace(/[^A-Z]/g, '');
    if (s.length === 0) return '';
    const first = s[0];
    const codes: Record<string, string> = {
      B: '1', F: '1', P: '1', V: '1',
      C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
      D: '3', T: '3',
      L: '4',
      M: '5', N: '5',
      R: '6',
    };
    let out = first;
    let prevCode = codes[first] ?? '';
    for (let i = 1; i < s.length && out.length < 4; i++) {
      const code = codes[s[i]] ?? '';
      if (code !== '' && code !== prevCode) {
        out += code;
        prevCode = code;
      } else if (code === '') {
        prevCode = '';
      } else {
        prevCode = code;
      }
    }
    return (out + '000').slice(0, 4);
  }

  /**
   * Refined Soundex.
   */
  static refinedSoundex(input: string): string {
    if (input.length === 0) return '';
    const s = input.toLowerCase().replace(/[^a-z]/g, '');
    if (s.length === 0) return '';
    const first = s[0].toUpperCase();
    const codes: Record<string, string> = {
      b: 'b', p: 'b', f: 'b', v: 'b',
      c: 'c', k: 'c', s: 'c', g: 'c', j: 'c', q: 'c', x: 'c', z: 'c',
      d: 'd', t: 'd',
      l: 'l',
      m: 'm', n: 'm',
      r: 'r',
      a: 'a', e: 'a', i: 'a', o: 'a', u: 'a', y: 'a', h: 'a', w: 'a',
    };
    let out = first;
    let prev = codes[s[0]] ?? '';
    for (let i = 1; i < s.length; i++) {
      const c = codes[s[i]] ?? '';
      if (c !== '' && c !== 'a' && c !== prev) {
        out += c;
        prev = c;
      } else if (c === '') {
        prev = '';
      }
    }
    return out;
  }

  /**
   * Metaphone (simplified).
   */
  static metaphone(input: string): string {
    if (input.length === 0) return '';
    let s = input.toUpperCase().replace(/[^A-Z]/g, '');
    if (s.length === 0) return '';
    // Drop doubled letters except for 'G'
    s = s.replace(/[^G]\\1/g, '$1');
    s = s.replace(/^(AE|GN|KN|PN|WR)/, m => m[1]);
    s = s.replace(/^X/, 'S');
    s = s.replace(/^WH/, 'W');
    // Common digraphs
    s = s.replace(/SH/g, 'X');
    s = s.replace(/CH/g, 'X');
    s = s.replace(/TH/g, '0');
    s = s.replace(/GH/g, '');
    s = s.replace(/PH/g, 'F');
    s = s.replace(/DG/g, 'J');
    s = s.replace(/CK/g, 'K');
    s = s.replace(/[AEIOUHWY]/g, '');
    return s;
  }

  /**
   * Compare two soundex codes for similarity.
   */
  static similar(a: string, b: string): boolean {
    return Soundex2.soundex(a) === Soundex2.soundex(b);
  }
}
