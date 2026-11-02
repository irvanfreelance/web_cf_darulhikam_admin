const TIME_ZONE = 'Asia/Jakarta';

function parts(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, ...options }).formatToParts(date);
}

function part(list: Intl.DateTimeFormatPart[], type: string) {
  return list.find((item) => item.type === type)?.value || '';
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return new Date(`${trimmed}T00:00:00+07:00`);
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** Calendar date in Asia/Jakarta, always YYYY-MM-DD. */
export function formatWibDate(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();
  const date = asDate(value);
  if (!date) return '';
  const list = parts(date, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${part(list, 'year')}-${part(list, 'month')}-${part(list, 'day')}`;
}

/** Date and time in Asia/Jakarta, 24-hour clock. */
export function formatWibDateTime(value: unknown, fallback = '—'): string {
  const date = asDate(value);
  if (!date) return fallback;
  const list = parts(date, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `${part(list, 'day')} ${part(list, 'month')} ${part(list, 'year')} ${part(list, 'hour')}.${part(list, 'minute')} WIB`;
}

export function todayWib(): string {
  return formatWibDate(new Date());
}
