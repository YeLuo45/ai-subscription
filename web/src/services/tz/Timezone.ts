/**
 * Timezone — IANA timezone utilities
 */

interface TZInfo {
  name: string;
  offset: number;  // hours
  region: string;
  hasDST: boolean;
}

const TIMEZONES: TZInfo[] = [
  { name: 'UTC', offset: 0, region: 'World', hasDST: false },
  { name: 'America/New_York', offset: -5, region: 'Americas', hasDST: true },
  { name: 'America/Chicago', offset: -6, region: 'Americas', hasDST: true },
  { name: 'America/Denver', offset: -7, region: 'Americas', hasDST: true },
  { name: 'America/Los_Angeles', offset: -8, region: 'Americas', hasDST: true },
  { name: 'America/Sao_Paulo', offset: -3, region: 'Americas', hasDST: false },
  { name: 'Europe/London', offset: 0, region: 'Europe', hasDST: true },
  { name: 'Europe/Paris', offset: 1, region: 'Europe', hasDST: true },
  { name: 'Europe/Berlin', offset: 1, region: 'Europe', hasDST: true },
  { name: 'Europe/Moscow', offset: 3, region: 'Europe', hasDST: false },
  { name: 'Asia/Dubai', offset: 4, region: 'Asia', hasDST: false },
  { name: 'Asia/Kolkata', offset: 5.5, region: 'Asia', hasDST: false },
  { name: 'Asia/Shanghai', offset: 8, region: 'Asia', hasDST: false },
  { name: 'Asia/Tokyo', offset: 9, region: 'Asia', hasDST: false },
  { name: 'Asia/Seoul', offset: 9, region: 'Asia', hasDST: false },
  { name: 'Asia/Singapore', offset: 8, region: 'Asia', hasDST: false },
  { name: 'Asia/Hong_Kong', offset: 8, region: 'Asia', hasDST: false },
  { name: 'Australia/Sydney', offset: 10, region: 'Oceania', hasDST: true },
  { name: 'Pacific/Auckland', offset: 12, region: 'Oceania', hasDST: true },
  { name: 'Pacific/Honolulu', offset: -10, region: 'Oceania', hasDST: false },
];

export class Timezone {
  static list(): TZInfo[] {
    return [...TIMEZONES];
  }

  static findByName(name: string): TZInfo | null {
    return TIMEZONES.find((t) => t.name === name) ?? null;
  }

  static listByRegion(region: string): TZInfo[] {
    return TIMEZONES.filter((t) => t.region === region);
  }

  static getOffset(name: string): number | null {
    return Timezone.findByName(name)?.offset ?? null;
  }

  static hasDST(name: string): boolean {
    return Timezone.findByName(name)?.hasDST ?? false;
  }

  static formatOffset(offset: number): string {
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  static getCurrentOffset(name: string, date: Date = new Date()): number | null {
    const tz = Timezone.findByName(name);
    if (!tz) return null;
    if (tz.hasDST) {
      // Northern hemisphere DST: Mar-Nov
      const month = date.getMonth();
      const inDST = month >= 2 && month <= 10;
      return tz.offset + (inDST ? 1 : 0);
    }
    return tz.offset;
  }

  static isValid(name: string): boolean {
    return Timezone.findByName(name) !== null;
  }
}
