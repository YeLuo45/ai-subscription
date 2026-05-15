// Cron parser - parse, validate, and calculate next run time

export interface ParsedCron {
  minute: number[];
  hour: number[];
  day: number[];
  month: number[];
  weekday: number[];
}

function parseField(field: string, min: number, max: number): number[] {
  if (field === '*') {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }

  const result = new Set<number>();
  const parts = field.split(',');

  for (const part of parts) {
    if (part.includes('/')) {
      // Step: */n or start-end/n
      const [range, stepStr] = part.split('/');
      const step = parseInt(stepStr, 10);
      let start = min;
      let end = max;
      if (range !== '*') {
        if (range.includes('-')) {
          [start, end] = range.split('-').map(Number);
        } else {
          start = parseInt(range, 10);
        }
      }
      for (let i = start; i <= end; i += step) {
        result.add(i);
      }
    } else if (part.includes('-')) {
      // Range: n-m
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) {
        result.add(i);
      }
    } else {
      // Single value
      result.add(parseInt(part, 10));
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}

export function parseCron(expression: string): ParsedCron | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  try {
    return {
      minute: parseField(parts[0], 0, 59),
      hour: parseField(parts[1], 0, 23),
      day: parseField(parts[2], 1, 31),
      month: parseField(parts[3], 1, 12),
      weekday: parseField(parts[4], 0, 6),
    };
  } catch {
    return null;
  }
}

export function validateCron(expression: string): { valid: boolean; error?: string } {
  if (!expression || typeof expression !== 'string') {
    return { valid: false, error: 'Empty expression' };
  }

  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { valid: false, error: `Expected 5 fields, got ${parts.length}` };
  }

  const [min, hour, day, month, weekday] = parts;

  const validateRange = (field: string, name: string, min: number, max: number) => {
    const invalid = field.split(/[,\s]/).some(part => {
      if (part === '*' || part.includes('/') || part.includes('-')) return false;
      const n = parseInt(part, 10);
      return isNaN(n) || n < min || n > max;
    });
    if (invalid) {
      return `${name} field invalid (must be ${min}-${max})`;
    }
    return null;
  };

  const err1 = validateRange(min, 'Minute', 0, 59);
  if (err1) return { valid: false, error: err1 };

  const err2 = validateRange(hour, 'Hour', 0, 23);
  if (err2) return { valid: false, error: err2 };

  const err3 = validateRange(day, 'Day', 1, 31);
  if (err3) return { valid: false, error: err3 };

  const err4 = validateRange(month, 'Month', 1, 12);
  if (err4) return { valid: false, error: err4 };

  const err5 = validateRange(weekday, 'Weekday', 0, 6);
  if (err5) return { valid: false, error: err5 };

  const parsed = parseCron(expression);
  if (!parsed) return { valid: false, error: 'Failed to parse expression' };

  return { valid: true };
}

export function nextRunTime(expression: string, from: Date = new Date()): Date | null {
  const parsed = parseCron(expression);
  if (!parsed) return null;

  const result = new Date(from);
  result.setSeconds(0);
  result.setMilliseconds(0);

  // Advance to next minute
  result.setMinutes(result.getMinutes() + 1);

  // Simple: find next matching slot (max 2 years of iterations)
  const maxIterations = 365 * 24 * 60 * 2;

  for (let i = 0; i < maxIterations; i++) {
    if (
      parsed.minute.includes(result.getMinutes()) &&
      parsed.hour.includes(result.getHours()) &&
      parsed.day.includes(result.getDate()) &&
      parsed.month.includes(result.getMonth() + 1) &&
      parsed.weekday.includes(result.getDay())
    ) {
      return result;
    }

    result.setMinutes(result.getMinutes() + 1);
  }

  return null;
}

export function formatNextRun(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
