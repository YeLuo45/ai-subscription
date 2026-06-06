/**
 * TimeZone — timezone offset utilities
 *
 * Inspired by: date-fns-tz / luxon
 *
 * Compute offsets, format with offset, convert between zones.
 */

export class TimeZone {
  /**
   * Get offset in minutes for a date in a timezone.
   */
  static getOffsetMinutes(date: Date, timeZone: string): number {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = dtf.formatToParts(date);
    const lookup: Record<string, number> = {};
    for (const p of parts) lookup[p.type] = parseInt(p.value, 10);
    const asUTC = Date.UTC(
      lookup.year,
      lookup.month - 1,
      lookup.day,
      lookup.hour === 24 ? 0 : lookup.hour,
      lookup.minute,
      lookup.second,
    );
    return Math.round((asUTC - date.getTime()) / 60_000);
  }

  /**
   * Get offset string like "+08:00" or "-05:00".
   */
  static getOffsetString(date: Date = new Date(), timeZone: string = 'UTC'): string {
    const mins = this.getOffsetMinutes(date, timeZone);
    const sign = mins >= 0 ? '+' : '-';
    const abs = Math.abs(mins);
    const h = String(Math.floor(abs / 60)).padStart(2, '0');
    const m = String(abs % 60).padStart(2, '0');
    return `${sign}${h}:${m}`;
  }

  /**
   * Get abbreviation like "PST", "JST".
   */
  static getAbbreviation(date: Date = new Date(), timeZone: string = 'UTC'): string {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' });
    const parts = dtf.formatToParts(date);
    const tz = parts.find((p) => p.type === 'timeZoneName');
    return tz ? tz.value : timeZone;
  }

  /**
   * Format date in a specific timezone.
   */
  static formatInZone(date: Date, timeZone: string, format: Intl.DateTimeFormatOptions = {}): string {
    return new Intl.DateTimeFormat('en-US', { timeZone, ...format }).format(date);
  }

  /**
   * Convert local date to UTC.
   */
  static toUTC(date: Date): Date {
    return new Date(date.getTime() + date.getTimezoneOffset() * 60_000);
  }

  /**
   * Convert UTC date to local.
   */
  static fromUTC(date: Date): Date {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  }

  /**
   * List of common timezones.
   */
  static commonTimezones(): string[] {
    return [
      'UTC',
      'America/New_York',
      'America/Los_Angeles',
      'America/Chicago',
      'America/Denver',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Shanghai',
      'Asia/Tokyo',
      'Asia/Hong_Kong',
      'Asia/Singapore',
      'Australia/Sydney',
    ];
  }

  /**
   * Validate timezone string.
   */
  static isValid(timeZone: string): boolean {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
      return true;
    } catch {
      return false;
    }
  }
}
