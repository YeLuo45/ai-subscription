/**
 * LunarCalendar — Chinese lunar calendar (simplified)
 *
 * Inspired by: lunar-javascript
 *
 * Simplified: returns year, month, day for Gregorian date using
 * a precomputed lookup table (2020-2030).
 */

interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
}

// Simplified lookup: each year has 12 or 13 months of 29 or 30 days
// Days from Jan 1, 1900 to start of each lunar year
const LUNAR_INFO: number[] = [
  // 2020-2030 simplified encoding (bits 4-15: months 1-12, bits 0-3: leap month days)
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, 0x04ae0,
];

const MONTH_DAYS: number[] = [29, 30];

export class LunarCalendar {
  /**
   * Convert Gregorian date to lunar date (approximate).
   * Range: 2020-01-01 to 2030-12-31.
   */
  static toLunar(date: Date): LunarDate | null {
    const y = date.getFullYear();
    if (y < 2020 || y > 2030) return null;
    const startOfYear = new Date(y, 0, 1);
    const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86_400_000) + 1;
    // Approximate lunar year starts around Feb (day 32-60)
    const lunarDayOfYear = dayOfYear - 23;
    const lunarYear = lunarDayOfYear < 0 ? y - 1 : y;
    const adjustedDay = lunarDayOfYear < 0 ? lunarDayOfYear + 354 : lunarDayOfYear;
    const month = Math.floor(adjustedDay / 29.5) + 1;
    const day = Math.floor(adjustedDay % 29.5) + 1;
    return {
      year: lunarYear,
      month: Math.min(12, month),
      day: Math.min(30, day),
      isLeapMonth: false,
    };
  }

  /**
   * Format lunar date as Chinese.
   */
  static toChineseString(date: Date): string {
    const l = this.toLunar(date);
    if (!l) return 'unknown';
    return `农历${l.year}年${l.month}月${l.day}日`;
  }

  /**
   * Is leap year in lunar calendar?
   */
  static isLunarLeapYear(year: number): boolean {
    if (year < 2020 || year > 2030) return false;
    const info = LUNAR_INFO[year - 2020];
    return (info & 0xf) !== 0;
  }

  /**
   * Days in lunar year (354 or 384 for leap).
   */
  static daysInLunarYear(year: number): number {
    if (year < 2020 || year > 2030) return 0;
    const info = LUNAR_INFO[year - 2020];
    let sum = 348; // 12 * 29
    for (let i = 0x8000; i > 0x8; i >>= 1) {
      if ((info & i) !== 0) sum += 1;
    }
    return sum + (this.isLunarLeapYear(year) ? 1 : 0);
  }

  /**
   * Get zodiac for a year.
   */
  static zodiac(year: number): string {
    const ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
    return ZODIAC[(year - 4) % 12];
  }

  /**
   * Get heavenly stem and earthly branch (天干地支).
   */
  static ganZhi(year: number): string {
    const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    return `${STEMS[(year - 4) % 10]}${BRANCHES[(year - 4) % 12]}`;
  }
}
