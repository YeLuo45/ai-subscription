/**
 * HashId — obfuscate integers to short hashes
 *
 * Inspired by: hashids
 *
 * Maps integer sequences to short strings.
 */

export class HashId {
  private _alphabet: string;
  private _salt: string;
  private _minLength: number;

  constructor(salt: string = '', alphabet: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890', minLength: number = 0) {
    this._salt = salt;
    this._alphabet = [...new Set(alphabet.split(''))].join('');
    this._minLength = minLength;
  }

  /**
   * Encode numbers to hash.
   */
  encode(numbers: number[]): string {
    if (numbers.length === 0) return '';
    const alphabet = this._alphabet.split('');
    const numbersStr = numbers.join(',');
    const alphabetStr = alphabet.join('');
    let alphabetStr1 = alphabetStr;
    let alphabetStr2 = alphabetStr.split('').reverse().join('');
    const saltLen = this._salt.length;
    if (saltLen > 0) {
      for (let i = 0; i < alphabetStr.length; i++) {
        const psn = (alphabetStr.charCodeAt(i) + this._salt.charCodeAt(i % saltLen)) % alphabetStr.length;
        const tmp = alphabetStr1[i];
        alphabetStr1 = alphabetStr1.substring(0, i) + alphabetStr1[psn] + alphabetStr1.substring(i + 1);
        alphabetStr1 = alphabetStr1.substring(0, psn) + tmp + alphabetStr1.substring(psn + 1);
      }
    }
    const lottery = alphabetStr1[0];
    let hash = lottery;
    for (const num of numbers) {
      const buffer = `${lottery}${this._salt}${num}`;
      const alphabet2 = alphabetStr1 + alphabetStr2;
      let h = 0;
      for (let i = 0; i < buffer.length; i++) {
        h += buffer.charCodeAt(i);
      }
      h %= alphabetStr1.length;
      hash += alphabetStr1[h];
      // Simplified
      hash += num.toString(36);
    }
    hash += alphabetStr1[Math.floor(alphabetStr1.length / 2)];
    if (this._minLength > 0 && hash.length < this._minLength) {
      hash += this._pad(hash, this._minLength);
    }
    return hash;
  }

  /**
   * Decode hash back to numbers (simplified).
   */
  decode(hash: string): number[] {
    if (hash.length === 0) return [];
    // Extract base36 numbers from the hash
    const numbers: number[] = [];
    const matches = hash.match(/\d+/g);
    if (matches) {
      for (const m of matches) {
        const n = parseInt(m, 36);
        if (!isNaN(n) && n > 0) numbers.push(n);
      }
    }
    return numbers;
  }

  private _pad(hash: string, length: number): string {
    let pad = '';
    let i = 0;
    while (hash.length + pad.length < length) {
      pad += this._alphabet[i % this._alphabet.length];
      i++;
    }
    return pad;
  }
}
