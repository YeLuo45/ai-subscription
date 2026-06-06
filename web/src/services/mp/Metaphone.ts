/**
 * Metaphone — Double Metaphone phonetic algorithm
 *
 * Inspired by: natural/metaphone
 *
 * Simplified: returns primary phonetic code.
 * Handles common English spellings.
 */

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);

export class Metaphone {
  /**
   * Compute primary Metaphone code.
   */
  static encode(input: string): string {
    if (!input) return '';
    const s = input.toUpperCase().replace(/[^A-Z]/g, '');
    if (s.length === 0) return '';
    const chars = s.split('');
    let out = '';
    let i = 0;
    // Silent leading GN/KN/PN/WR
    if (chars.length >= 2) {
      const first2 = chars[0] + chars[1];
      if (['GN', 'KN', 'PN', 'WR'].includes(first2)) i = 1;
    }
    // Silent leading X (sounds like Z, but common pronunciation: e.g. "Xavier")
    if (chars[0] === 'X') {
      out += 'S';
      i = 1;
    }
    while (i < chars.length) {
      const c = chars[i];
      const next = chars[i + 1];
      const prev = chars[i - 1];
      if (c === prev && c !== 'C') { i++; continue; } // skip duplicates
      switch (c) {
        case 'A': case 'E': case 'I': case 'O': case 'U':
          if (i === 0) out += c;
          i++;
          break;
        case 'B':
          out += 'B';
          if (next === 'B') i += 2; else i++;
          break;
        case 'C':
          if (next === 'H') {
            out += 'X';
            i += 2;
          } else if (next === 'I' || next === 'E' || next === 'Y') {
            out += 'S';
            i++;
          } else {
            out += 'K';
            i++;
          }
          break;
        case 'D':
          if (next === 'G' && (chars[i + 2] === 'I' || chars[i + 2] === 'E' || chars[i + 2] === 'Y')) {
            out += 'J';
            i += 3;
          } else {
            out += 'T';
            i++;
          }
          break;
        case 'F': out += 'F'; i += (next === 'F' ? 2 : 1); break;
        case 'G':
          if (next === 'H') {
            if (i > 0 && VOWELS.has(chars[i - 1])) { /* skip */ }
            out += 'F';
            i += 2;
          } else if (next === 'N') { i++; }
          else if (next === 'I' || next === 'E' || next === 'Y') { out += 'J'; i++; }
          else { out += 'K'; i++; }
          break;
        case 'H':
          if (i === 0 || !VOWELS.has(prev)) { out += 'H'; }
          i++;
          break;
        case 'J': out += 'J'; i += (next === 'J' ? 2 : 1); break;
        case 'K': out += 'K'; i += (next === 'K' ? 2 : 1); break;
        case 'L': out += 'L'; i += (next === 'L' ? 2 : 1); break;
        case 'M': out += 'M'; i += (next === 'M' ? 2 : 1); break;
        case 'N': out += 'N'; i += (next === 'N' ? 2 : 1); break;
        case 'P':
          if (next === 'H') { out += 'F'; i += 2; }
          else { out += 'P'; i += (next === 'P' ? 2 : 1); }
          break;
        case 'Q': out += 'K'; i += (next === 'Q' ? 2 : 1); break;
        case 'R': out += 'R'; i += (next === 'R' ? 2 : 1); break;
        case 'S':
          if (next === 'H') { out += 'X'; i += 2; }
          else if (next === 'C' && chars[i + 2] === 'H') { out += 'X'; i += 3; }
          else { out += 'S'; i += (next === 'S' ? 2 : 1); }
          break;
        case 'T':
          if (next === 'H') { out += '0'; i += 2; }
          else if (next === 'I' && (chars[i + 2] === 'A' || chars[i + 2] === 'O')) { out += 'X'; i++; }
          else { out += 'T'; i += (next === 'T' ? 2 : 1); }
          break;
        case 'V': out += 'F'; i++; break;
        case 'W':
          if (next && VOWELS.has(next)) { out += 'W'; }
          i++;
          break;
        case 'X':
          out += 'KS';
          i += (next === 'X' ? 2 : 1);
          break;
        case 'Y':
          if (next && VOWELS.has(next)) { out += 'Y'; }
          i++;
          break;
        case 'Z': out += 'S'; i += (next === 'Z' ? 2 : 1); break;
        default: i++;
      }
    }
    return out;
  }

  /**
   * Are two strings phonetically similar?
   */
  static similar(a: string, b: string): boolean {
    return Metaphone.encode(a) === Metaphone.encode(b);
  }
}
