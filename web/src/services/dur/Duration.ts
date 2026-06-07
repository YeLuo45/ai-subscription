/**
 * Duration — ISO 8601 duration parser
 *
 * Format: P[n]Y[n]M[n]DT[n]H[n]M[n]S or P[n]W
 */

export interface DurationParts {
  years: number;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  ms: number;
}

export class Duration {
  static REGEX = /^P(?!$)(\d+(?:\.\d+)?Y)?(\d+(?:\.\d+)?M)?(\d+(?:\.\d+)?W)?(\d+(?:\.\d+)?D)?(T(?=\d)(\d+(?:\.\d+)?H)?(\d+(?:\.\d+)?M)?(\d+(?:\.\d+)?S)?)?$/;

  /**
   * Parse ISO 8601 duration.
   */
  static parse(input: string): DurationParts {
    const m = Duration.REGEX.exec(input);
    if (!m) throw new Error(`Invalid duration: ${input}`);
    const num = (s: string | undefined): number => s ? parseFloat(s) : 0;
    return {
      years: num(m[1]),
      months: num(m[2]),
      weeks: num(m[3]),
      days: num(m[4]),
      hours: num(m[6]),
      minutes: num(m[7]),
      seconds: num(m[8]),
      ms: 0,
    };
  }

  /**
   * Convert parts to seconds (approximate, ignoring months/years).
   */
  static toSeconds(parts: DurationParts): number {
    return parts.weeks * 7 * 24 * 3600
      + parts.days * 24 * 3600
      + parts.hours * 3600
      + parts.minutes * 60
      + parts.seconds
      + parts.ms / 1000;
  }

  /**
   * Format seconds as ISO 8601 duration.
   */
  static fromSeconds(s: number): string {
    if (s < 0) return `-${Duration.fromSeconds(-s)}`;
    const days = Math.floor(s / 86400);
    s %= 86400;
    const hours = Math.floor(s / 3600);
    s %= 3600;
    const minutes = Math.floor(s / 60);
    const seconds = Math.floor(s % 60);
    let out = 'P';
    if (days > 0) out += `${days}D`;
    if (hours || minutes || seconds) out += 'T';
    if (hours) out += `${hours}H`;
    if (minutes) out += `${minutes}M`;
    if (seconds) out += `${seconds}S`;
    if (out === 'P') out = 'PT0S';
    return out;
  }

  /**
   * Format seconds as human readable.
   */
  static humanize(parts: DurationParts): string {
    const arr: string[] = [];
    if (parts.years) arr.push(`${parts.years}y`);
    if (parts.months) arr.push(`${parts.months}mo`);
    if (parts.weeks) arr.push(`${parts.weeks}w`);
    if (parts.days) arr.push(`${parts.days}d`);
    if (parts.hours) arr.push(`${parts.hours}h`);
    if (parts.minutes) arr.push(`${parts.minutes}m`);
    if (parts.seconds) arr.push(`${parts.seconds}s`);
    return arr.join(' ') || '0s';
  }

  /**
   * Validate.
   */
  static isValid(input: string): boolean {
    return Duration.REGEX.test(input);
  }
}
