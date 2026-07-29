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
  if (!isoDate) return '';

  try {
    const [year, month, day] = isoDate.split('-');
    if (!year || !month || !day) return isoDate;
    return `${month}-${day}-${year.slice(2)}`;
  } catch {
    return isoDate;
  }
};

export const formatQuoteDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '';

  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const hours24 = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const meridiem = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;

    return `${months[date.getMonth()]} ${date.getDate()}, ${hours12}:${minutes} ${meridiem}`;
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
