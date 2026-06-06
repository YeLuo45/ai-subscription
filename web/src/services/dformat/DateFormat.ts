/**
 * DateFormat — strftime-style date formatting
 *
 * Inspired by: strftime / date-fns format
 *
 * Supports tokens: YYYY YY MM M DD D HH H hh h mm m ss s SSS A a Z z DDDD DDD ddd ddd
 */

const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n: number, len: number = 2): string {
  return String(n).padStart(len, '0');
}

export class DateFormat {
  /**
   * Format date with strftime-style pattern.
   */
  static format(date: Date, pattern: string): string {
    const y = date.getFullYear();
    const M = date.getMonth();
    const d = date.getDate();
    const h = date.getHours();
    const m = date.getMinutes();
    const s = date.getSeconds();
    const ms = date.getMilliseconds();
    const day = date.getDay();
    let result = '';
    let i = 0;
    while (i < pattern.length) {
      const ch = pattern[i];
      // YYYY
      if (pattern.slice(i, i + 4) === 'YYYY') { result += pad(y, 4); i += 4; continue; }
      if (pattern.slice(i, i + 2) === 'YY') { result += pad(y % 100); i += 2; continue; }
      // MMMM
      if (pattern.slice(i, i + 4) === 'MMMM') { result += MONTHS_LONG[M]; i += 4; continue; }
      if (pattern.slice(i, i + 3) === 'MMM') { result += MONTHS_SHORT[M]; i += 3; continue; }
      if (pattern.slice(i, i + 2) === 'MM') { result += pad(M + 1); i += 2; continue; }
      // DD
      // DDDD
      if (pattern.slice(i, i + 4) === 'DDDD') { result += DAYS_LONG[day]; i += 4; continue; }
      if (pattern.slice(i, i + 3) === 'DDD') { result += DAYS_SHORT[day]; i += 3; continue; }
      if (pattern.slice(i, i + 3) === 'ddd') { result += DAYS_SHORT[day].toLowerCase(); i += 3; continue; }
      if (pattern.slice(i, i + 2) === 'DD') { result += pad(d); i += 2; continue; }
      // HH
      if (pattern.slice(i, i + 2) === 'HH') { result += pad(h); i += 2; continue; }
      if (pattern.slice(i, i + 2) === 'hh') { result += pad(h % 12 || 12); i += 2; continue; }
      if (pattern.slice(i, i + 2) === 'mm') { result += pad(m); i += 2; continue; }
      if (pattern.slice(i, i + 2) === 'ss') { result += pad(s); i += 2; continue; }
      if (pattern.slice(i, i + 3) === 'SSS') { result += pad(ms, 3); i += 3; continue; }
      if (ch === 'A') { result += h < 12 ? 'AM' : 'PM'; i += 1; continue; }
      if (ch === 'a') { result += h < 12 ? 'am' : 'pm'; i += 1; continue; }
      result += ch;
      i += 1;
    }
    return result;
  }

  /**
   * Common format: ISO 8601.
   */
  static iso(date: Date): string {
    return this.format(date, 'YYYY-MM-DDTHH:mm:ss.SSSZ');
  }

  /**
   * Date only (YYYY-MM-DD).
   */
  static date(date: Date): string {
    return this.format(date, 'YYYY-MM-DD');
  }

  /**
   * Time only (HH:mm:ss).
   */
  static time(date: Date): string {
    return this.format(date, 'HH:mm:ss');
  }

  /**
   * 12-hour format with AM/PM.
   */
  static time12(date: Date): string {
    return this.format(date, 'hh:mm:ss A');
  }

  /**
   * Get day of year (1-366).
   */
  static dayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  }

  /**
   * Get week of year (ISO 8601).
   */
  static weekOfYear(date: Date): number {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604_800_000);
  }
}
