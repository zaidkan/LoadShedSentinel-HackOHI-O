/** Clock time in the reader's own time zone, offset from a UTC start. */
export function localClockAfter(startUtc: string, hours: number | null | undefined): string | null {
  const start = new Date(startUtc);
  if (Number.isNaN(start.getTime()) || hours === null || hours === undefined || !Number.isFinite(hours)) return null;
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(start.getTime() + hours * 3_600_000));
}

export function localDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(date);
}
