export const formatCurrency = (amount: number): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeAmount);
};

export const formatCurrencyWithCents = (amount: number): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
};

export const formatNumber = (value: number): string => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-US').format(safeValue);
};

export const formatOrderDate = (isoDate: string | null | undefined): string => {
  if (!isoDate) return 'N/A';

  try {
    // If ISO date string like "2026-08-07T18:43:37.000Z" or "2026-08-07"
    const parsedDate = new Date(isoDate);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    // Fallback parsing for YYYY-MM-DD
    const cleanDateStr = isoDate.split('T')[0];
    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(month, 10) - 1;
      const monthName = monthNames[monthIdx] || month;
      return `${monthName} ${parseInt(day, 10)}, ${year}`;
    }

    return isoDate;
  } catch {
    return isoDate;
  }
};

export const formatQuoteDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '';

  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(date);
  } catch {
    return iso;
  }
};

export const cleanupName = (raw: string | null | undefined, fallback: string): string => {
  if (raw === null || raw === undefined) return fallback;
  const value = String(raw).trim();
  return value.length === 0 ? fallback : value;
};

export const trimStr = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value);
};
