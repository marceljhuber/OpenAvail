// Date helpers — ported and extended from the original prototype's app.js.
// All ISO dates are *local* calendar-date strings "YYYY-MM-DD": a day is a day,
// with no time component. This suits a single-timezone group (Europe/Vienna);
// availability is per whole day, so there are no timezone conversions.

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday-first short weekday names for a locale (Jan 1 2024 was a Monday). */
export function weekdayLabels(locale?: string): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" }),
  );
}

export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toMonthInput(date: Date): string {
  return toISO(date).slice(0, 7);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function addDays(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

/** Monday-based weekday index: Mon=0 … Sun=6. */
export function mondayBasedDay(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Inclusive list of dates from `from` to `to` (both ISO). Empty if reversed. */
export function enumerateDays(fromISO: string, toISO_: string): Date[] {
  const from = parseISODate(fromISO);
  const to = parseISODate(toISO_);
  const days: Date[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    days.push(new Date(d));
  }
  return days;
}

export function formatLongDate(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export function formatMonthYear(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

export function formatRelativeTime(value: string, locale?: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}
