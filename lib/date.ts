/**
 * Date and Timezone Utilities configured for Los Angeles (America/Los_Angeles - Pacific Time)
 */

export const LA_TIMEZONE = 'America/Los_Angeles';

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

/**
 * Returns year, month (1-12), and day (1-31) in Los Angeles timezone for a given date.
 */
export const getLosAngelesDateParts = (date: Date = new Date()): DateParts => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: LA_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();

  for (const part of parts) {
    if (part.type === 'year') year = parseInt(part.value, 10);
    if (part.type === 'month') month = parseInt(part.value, 10);
    if (part.type === 'day') day = parseInt(part.value, 10);
  }

  return { year, month, day };
};

/**
 * Formats a Date object into YYYY-MM-DD strictly in Los Angeles timezone.
 */
export const getLosAngelesISODate = (date: Date = new Date()): string => {
  const { year, month, day } = getLosAngelesDateParts(date);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

/**
 * Formats the first day of the current month (YYYY-MM-01) strictly in Los Angeles timezone.
 */
export const getLosAngelesFirstOfMonthISODate = (date: Date = new Date()): string => {
  const { year, month } = getLosAngelesDateParts(date);
  const m = String(month).padStart(2, '0');
  return `${year}-${m}-01`;
};

export type DashboardPeriod = 'today' | 'month' | 'all';
export type DateFilterPreset = 'today' | 'week' | 'month' | 'custom';

/**
 * Calculates start and end date parameters (YYYY-MM-DD) for 'today', 'month', or 'all'
 * defaulting strictly to Los Angeles (Pacific Time).
 */
export const getDateRangeForPeriod = (
  period: DashboardPeriod,
  referenceDate: Date = new Date()
): { startDate: string; endDate: string } => {
  const todayISO = getLosAngelesISODate(referenceDate);

  if (period === 'today') {
    return { startDate: todayISO, endDate: todayISO };
  }

  if (period === 'all') {
    return { startDate: '2000-01-01', endDate: todayISO };
  }

  const firstOfMonthISO = getLosAngelesFirstOfMonthISODate(referenceDate);
  return {
    startDate: firstOfMonthISO,
    endDate: todayISO,
  };
};

/**
 * Calculates start and end date parameters (YYYY-MM-DD) for filter presets:
 * 'today' | 'week' | 'month' | 'custom'
 */
export const getDateRangeForFilter = (
  preset: DateFilterPreset,
  customRange?: { startDate: string; endDate: string } | null,
  referenceDate: Date = new Date()
): { startDate: string; endDate: string } => {
  const todayISO = getLosAngelesISODate(referenceDate);

  if (preset === 'custom' && customRange?.startDate && customRange?.endDate) {
    return customRange;
  }

  if (preset === 'today') {
    return { startDate: todayISO, endDate: todayISO };
  }

  if (preset === 'week') {
    // Week starts on Sunday (12:00 AM) and ends on Saturday (11:59 PM) in LA time
    const { year, month, day } = getLosAngelesDateParts(referenceDate);
    const laDate = new Date(year, month - 1, day);
    const dayOfWeek = laDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    const sunday = new Date(laDate);
    sunday.setDate(laDate.getDate() - dayOfWeek);

    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    return {
      startDate: getLosAngelesISODate(sunday),
      endDate: getLosAngelesISODate(saturday),
    };
  }

  // Month starts on 1st day and ends on last day of month in LA time
  const { year, month } = getLosAngelesDateParts(referenceDate);
  const lastDayNum = new Date(year, month, 0).getDate();
  const m = String(month).padStart(2, '0');
  const lastD = String(lastDayNum).padStart(2, '0');

  return {
    startDate: `${year}-${m}-01`,
    endDate: `${year}-${m}-${lastD}`,
  };
};

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats YYYY-MM-DD range into readable month & day string, e.g. "Jul 23 - Jul 31"
 */
export const formatCustomRangeLabel = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) return 'Custom';
  try {
    const parsePart = (iso: string) => {
      const parts = iso.split('-');
      if (parts.length !== 3) return iso;
      const mIdx = parseInt(parts[1], 10) - 1;
      const dNum = parseInt(parts[2], 10);
      const monthStr = SHORT_MONTHS[mIdx] || parts[1];
      return `${monthStr} ${dNum}`;
    };
    return `${parsePart(startDate)} - ${parsePart(endDate)}`;
  } catch {
    return `${startDate.slice(5)} - ${endDate.slice(5)}`;
  }
};
