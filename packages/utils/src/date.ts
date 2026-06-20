import { format, isToday, isYesterday, differenceInDays } from 'date-fns';

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return format(d, 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return format(d, 'MMM d, yyyy · h:mm a');
}

export function formatRelativeDate(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  const diff = differenceInDays(new Date(), d);
  if (diff < 7) return `${diff} days ago`;
  return format(d, 'MMM d');
}

export function formatMonthYear(month: number, year: number): string {
  return format(new Date(year, month - 1, 1), 'MMMM yyyy');
}

export function currentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}
