/**
 * RelativeTime — relative time formatting
 *
 * Inspired by: moment.js fromNow / Intl.RelativeTimeFormat
 *
 * Format time difference as "5 minutes ago" / "in 2 hours".
 */

const SECONDS = 1;
const MINUTES = 60;
const HOURS = 3600;
const DAYS = 86400;
const WEEKS = 7 * DAYS;
const MONTHS = 30 * DAYS;
const YEARS = 365 * DAYS;

export class RelativeTime {
  /**
   * Format difference between dates.
   */
  static format(target: Date, base: Date = new Date()): string {
    const diffSec = Math.round((target.getTime() - base.getTime()) / 1000);
    const abs = Math.abs(diffSec);
    const future = diffSec > 0;
    if (abs < 5) return 'just now';
    let value: number;
    let unit: string;
    if (abs < MINUTES) {
      value = Math.round(abs / SECONDS);
      unit = value === 1 ? 'second' : 'seconds';
    } else if (abs < HOURS) {
      value = Math.round(abs / MINUTES);
      unit = value === 1 ? 'minute' : 'minutes';
    } else if (abs < DAYS) {
      value = Math.round(abs / HOURS);
      unit = value === 1 ? 'hour' : 'hours';
    } else if (abs < WEEKS) {
      value = Math.round(abs / DAYS);
      unit = value === 1 ? 'day' : 'days';
    } else if (abs < MONTHS) {
      value = Math.round(abs / WEEKS);
      unit = value === 1 ? 'week' : 'weeks';
    } else if (abs < YEARS) {
      value = Math.round(abs / MONTHS);
      unit = value === 1 ? 'month' : 'months';
    } else {
      value = Math.round(abs / YEARS);
      unit = value === 1 ? 'year' : 'years';
    }
    return future ? `in ${value} ${unit}` : `${value} ${unit} ago`;
  }

  /**
   * Short format like "5m", "2h", "3d". Negative sign for past.
   */
  static short(target: Date, base: Date = new Date()): string {
    const diffSec = Math.round((target.getTime() - base.getTime()) / 1000);
    const abs = Math.abs(diffSec);
    const sign = diffSec < 0 ? '-' : '';
    if (abs < MINUTES) return `${sign}${abs}s`;
    if (abs < HOURS) return `${sign}${Math.round(abs / MINUTES)}m`;
    if (abs < DAYS) return `${sign}${Math.round(abs / HOURS)}h`;
    if (abs < WEEKS) return `${sign}${Math.round(abs / DAYS)}d`;
    if (abs < MONTHS) return `${sign}${Math.round(abs / WEEKS)}w`;
    if (abs < YEARS) return `${sign}${Math.round(abs / MONTHS)}mo`;
    return `${sign}${Math.round(abs / YEARS)}y`;
  }

  /**
   * Format as "5 min, 30 sec" detailed.
   */
  static detailed(target: Date, base: Date = new Date()): string {
    let diff = Math.abs(Math.round((target.getTime() - base.getTime()) / 1000));
    const parts: string[] = [];
    const units: Array<[number, string]> = [
      [DAYS, 'day'],
      [HOURS, 'hour'],
      [MINUTES, 'minute'],
      [SECONDS, 'second'],
    ];
    for (const [s, name] of units) {
      if (diff >= s) {
        const v = Math.floor(diff / s);
        parts.push(`${v} ${name}${v === 1 ? '' : 's'}`);
        diff %= s;
      }
    }
    if (parts.length === 0) return '0 seconds';
    return parts.slice(0, 2).join(', ');
  }

  /**
   * Difference in milliseconds.
   */
  static diffMs(target: Date, base: Date = new Date()): number {
    return target.getTime() - base.getTime();
  }
}
