/**
 * StringAlgo — string matching algorithms
 */

export class StringAlgo {
  /**
   * KMP prefix function.
   */
  private static _prefix(pattern: string): number[] {
    const m = pattern.length;
    const pi = new Array(m).fill(0);
    for (let i = 1; i < m; i++) {
      let j = pi[i - 1];
      while (j > 0 && pattern[i] !== pattern[j]) j = pi[j - 1];
      if (pattern[i] === pattern[j]) j++;
      pi[i] = j;
    }
    return pi;
  }

  /**
   * KMP search. Returns indices of all matches.
   */
  static kmp(text: string, pattern: string): number[] {
    const result: number[] = [];
    const pi = StringAlgo._prefix(pattern);
    let j = 0;
    for (let i = 0; i < text.length; i++) {
      while (j > 0 && text[i] !== pattern[j]) j = pi[j - 1];
      if (text[i] === pattern[j]) j++;
      if (j === pattern.length) {
        result.push(i - pattern.length + 1);
        j = pi[j - 1];
      }
    }
    return result;
  }

  /**
   * Rabin-Karp search using rolling hash.
   */
  static rabinKarp(text: string, pattern: string, base: number = 256, mod: number = 1e9 + 7): number[] {
    const m = pattern.length;
    const n = text.length;
    if (m > n) return [];
    let pHash = 0;
    let tHash = 0;
    let power = 1;
    for (let i = 0; i < m; i++) {
      pHash = (pHash * base + pattern.charCodeAt(i)) % mod;
      tHash = (tHash * base + text.charCodeAt(i)) % mod;
      if (i < m - 1) power = (power * base) % mod;
    }
    const result: number[] = [];
    for (let i = 0; i <= n - m; i++) {
      if (pHash === tHash && text.substring(i, i + m) === pattern) {
        result.push(i);
      }
      if (i < n - m) {
        tHash = ((tHash - text.charCodeAt(i) * power) * base + text.charCodeAt(i + m)) % mod;
        if (tHash < 0) tHash += mod;
      }
    }
    return result;
  }

  /**
   * Z-algorithm. Z[i] = length of longest substring starting at i that's also a prefix.
   */
  static zArray(s: string): number[] {
    const n = s.length;
    const z = new Array(n).fill(0);
    let l = 0;
    let r = 0;
    for (let i = 1; i < n; i++) {
      if (i < r) z[i] = Math.min(r - i, z[i - l]);
      while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++;
      if (i + z[i] > r) { l = i; r = i + z[i]; }
    }
    return z;
  }

  /**
   * Longest palindromic substring (O(n^2)).
   */
  static longestPalindrome(s: string): string {
    if (s.length <= 1) return s;
    let best = '';
    function expand(l: number, r: number): string {
      while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; }
      return s.slice(l + 1, r);
    }
    for (let i = 0; i < s.length; i++) {
      const odd = expand(i, i);
      const even = expand(i, i + 1);
      if (odd.length > best.length) best = odd;
      if (even.length > best.length) best = even;
    }
    return best;
  }

  /**
   * Manacher's algorithm (O(n)) for longest palindrome.
   */
  static longestPalindromeManacher(s: string): string {
    const t = '#' + s.split('').join('#') + '#';
    const n = t.length;
    const p = new Array(n).fill(0);
    let c = 0;
    let r = 0;
    for (let i = 0; i < n; i++) {
      const mirror = 2 * c - i;
      if (i < r) p[i] = Math.min(r - i, p[mirror]);
      while (i + p[i] + 1 < n && i - p[i] - 1 >= 0 && t[i + p[i] + 1] === t[i - p[i] - 1]) p[i]++;
      if (i + p[i] > r) { c = i; r = i + p[i]; }
    }
    let maxI = 0;
    for (let i = 0; i < n; i++) if (p[i] > p[maxI]) maxI = i;
    const start = (maxI - p[maxI]) >> 1;
    return s.slice(start, start + p[maxI]);
  }
}
