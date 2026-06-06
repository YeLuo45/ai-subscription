/**
 * Calendar — generate calendar grid for a month
 *
 * Inspired by: date-fns / fullcalendar
 *
 * Returns a 2D array of weeks with day numbers.
 */

export interface CalendarCell {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
}

export type CalendarGrid = CalendarCell[][];

export class Calendar {
  /**
   * Get calendar grid for a month.
   * Each week starts on Sunday.
   */
  static getMonthGrid(year: number, month: number, weekStartsOn: number = 0): CalendarGrid {
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const offset = (startDay - weekStartsOn + 7) % 7;
    const gridStart = new Date(year, month, 1 - offset);
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const grid: CalendarGrid = [];
    let cur = new Date(gridStart);
    for (let w = 0; w < 6; w++) {
      const week: CalendarCell[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(cur);
        const cell: CalendarCell = {
          date: cellDate,
          day: cellDate.getDate(),
          isCurrentMonth: cellDate.getMonth() === month,
          isWeekend: cellDate.getDay() === 0 || cellDate.getDay() === 6,
          isToday: `${cellDate.getFullYear()}-${cellDate.getMonth()}-${cellDate.getDate()}` === todayKey,
        };
        week.push(cell);
        cur.setDate(cur.getDate() + 1);
      }
      grid.push(week);
    }
    return grid;
  }

  /**
   * Get weekday names.
   */
  static weekdayNames(weekStartsOn: number = 0, format: 'short' | 'long' = 'short'): string[] {
    const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const arr = format === 'long' ? LONG : SHORT;
    const out: string[] = [];
    for (let i = 0; i < 7; i++) {
      out.push(arr[(weekStartsOn + i) % 7]);
    }
    return out;
  }

  /**
   * Get month name.
   */
  static monthName(month: number, format: 'short' | 'long' = 'long'): string {
    const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return (format === 'long' ? LONG : SHORT)[month];
  }

  /**
   * Number of weeks in month grid (always 4-6).
   */
  static weeksInMonth(year: number, month: number): number {
    return this.getMonthGrid(year, month).length;
  }
}
