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
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 6);
    const weekStartISO = getLosAngelesISODate(d);
    return { startDate: weekStartISO, endDate: todayISO };
  }

  const firstOfMonthISO = getLosAngelesFirstOfMonthISODate(referenceDate);
  return {
    startDate: firstOfMonthISO,
    endDate: todayISO,
  };
};
