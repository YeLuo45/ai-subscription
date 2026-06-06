/**
 * DurationParse — ISO 8601 duration parser
 *
 * Inspired by: ISO 8601 duration (PnYnMnDTnHnMnS)
 *
 * Format: P[n]Y[n]M[n]DT[n]H[n]M[n]S
 */

export interface Duration {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  sign: 1 | -1;
}

export class DurationParse {
  /**
   * Parse ISO 8601 duration string.
   * P1Y2M3DT4H5M6.789S
   */
  static parse(input: string): Duration | null {
    if (typeof input !== 'string' || input.length === 0) return null;
    const re = /^([-+])?P(?!$)(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)D)?(?:T(?=\d)(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
    const m = input.match(re);
    if (!m) return null;
    return {
      sign: m[1] === '-' ? -1 : 1,
      years: m[2] ? parseFloat(m[2]) : 0,
      months: m[3] ? parseFloat(m[3]) : 0,
      days: m[4] ? parseFloat(m[4]) : 0,
      hours: m[5] ? parseFloat(m[5]) : 0,
      minutes: m[6] ? parseFloat(m[6]) : 0,
      seconds: m[7] ? parseFloat(m[7]) : 0,
      milliseconds: 0,
    };
  }

  /**
   * Compute total milliseconds (approximate, using avg year/month).
   */
  static toMs(d: Duration): number {
    const ms =
      d.years * 365.25 * 86_400_000 +
      d.months * 30.44 * 86_400_000 +
      d.days * 86_400_000 +
      d.hours * 3_600_000 +
      d.minutes * 60_000 +
      d.seconds * 1000 +
      d.milliseconds;
    return ms * d.sign;
  }

  /**
   * Format Duration to ISO 8601 string.
   */
  static format(d: Duration): string {
    let s = d.sign === -1 ? '-' : '';
    s += 'P';
    if (d.years) s += `${d.years}Y`;
    if (d.months) s += `${d.months}M`;
    if (d.days) s += `${d.days}D`;
    if (d.hours || d.minutes || d.seconds) s += 'T';
    if (d.hours) s += `${d.hours}H`;
    if (d.minutes) s += `${d.minutes}M`;
    if (d.seconds) s += `${d.seconds}S`;
    return s === 'P' || s === '-P' ? 'PT0S' : s;
  }

  /**
   * Add duration to a date.
   */
  static addTo(date: Date, d: Duration): Date {
    const r = new Date(date);
    r.setFullYear(r.getFullYear() + d.sign * d.years);
    r.setMonth(r.getMonth() + d.sign * d.months);
    r.setDate(r.getDate() + d.sign * d.days);
    r.setHours(r.getHours() + d.sign * d.hours);
    r.setMinutes(r.getMinutes() + d.sign * d.minutes);
    r.setSeconds(r.getSeconds() + d.sign * d.seconds);
    r.setMilliseconds(r.getMilliseconds() + d.sign * d.milliseconds);
    return r;
  }

  /**
   * Subtract duration from a date.
   */
  static subtractFrom(date: Date, d: Duration): Date {
    return this.addTo(date, { ...d, sign: -1 });
  }

  /**
   * Zero duration.
   */
  static zero(): Duration {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0, sign: 1 };
  }
}
