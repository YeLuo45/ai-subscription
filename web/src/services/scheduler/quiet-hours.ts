// Quiet hours - check if current time is in quiet/disable period
import type { QuietHours } from './types';

export function isQuietHours(time: Date, quietHours: QuietHours): boolean {
  if (!quietHours.enabled) return false;

  // Get current time as minutes from midnight
  const currentMinutes = time.getHours() * 60 + time.getMinutes();
  
  // Parse start/end times
  const [startHour, startMin] = quietHours.startTime.split(':').map(Number);
  const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle overnight (e.g., 22:00 - 08:00)
  if (startMinutes > endMinutes) {
    // Overnight: return true if current is AFTER start OR BEFORE end
    if (quietHours.weekdaysOnly) {
      const day = time.getDay();
      if (day === 0 || day === 6) return false; // Weekend - no quiet hours
    }
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // Same day: return true if current is BETWEEN start and end
    if (quietHours.weekdaysOnly) {
      const day = time.getDay();
      if (day === 0 || day === 6) return false;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

export function getNextAvailableTime(
  quietHours: QuietHours,
  from: Date = new Date()
): Date {
  if (!quietHours.enabled || !isQuietHours(from, quietHours)) {
    return from;
  }

  const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
  const next = new Date(from);
  next.setHours(endHour, endMin, 0, 0);
  
  // If end time is earlier in the day than current time, advance to next day
  if (next.getTime() <= from.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

export function formatQuietHoursRange(quietHours: QuietHours): string {
  if (!quietHours.enabled) return 'Disabled';
  
  let range = `${quietHours.startTime} - ${quietHours.endTime}`;
  if (quietHours.weekdaysOnly) {
    range += ' (weekdays only)';
  }
  return range;
}
