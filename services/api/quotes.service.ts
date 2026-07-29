import { apiClient, ApiClientError } from '@lib/api-client';
import { EMPTY_QUOTES } from '@mocks/api/quotes';
import type { QuotesDashboardResponse } from '../../types/api/quotes';

// Re-export types so screens can import from one place
export type {
  QuoteItem,
  QuotesBySalesperson,
  QuotesByServiceType,
  QuotesToOrdersBySalesperson,
  QuotesToOrdersByServiceType,
  QuotesDashboardResponse,
} from '../../types/api/quotes';
export { SAMPLE_QUOTES, EMPTY_QUOTES } from '@mocks/api/quotes';

// Re-export formatters used by quote screens
export {
  formatCurrency,
  formatCurrencyWithCents,
  formatNumber,
  formatQuoteDateTime,
  cleanupName,
} from '@lib/formatters';

export type DashboardPeriod = 'today' | 'month';

const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getDateRangeForPeriod = (
  period: DashboardPeriod
): { startDate: string; endDate: string } => {
  const now = new Date();
  if (period === 'today') {
    const iso = toISODate(now);
    return { startDate: iso, endDate: iso };
  }
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: toISODate(first), endDate: toISODate(now) };
};

export const computeConversionRate = (quoteCount: number, convertedCount: number): number => {
  if (!quoteCount) return 0;
  return Math.round((convertedCount / quoteCount) * 100);
};

const normalizeQuotesResponse = (data: QuotesDashboardResponse | null | undefined): QuotesDashboardResponse => ({
  quoteCount: Number.isFinite(data?.quoteCount) ? data!.quoteCount : 0,
  convertedCount: Number.isFinite(data?.convertedCount) ? data!.convertedCount : 0,
  quotesByNewCustomer: Number.isFinite(data?.quotesByNewCustomer) ? data!.quotesByNewCustomer : 0,
  quotesByExistingCustomer: Number.isFinite(data?.quotesByExistingCustomer) ? data!.quotesByExistingCustomer : 0,
  totalConvertedQuotesCount: Number.isFinite(data?.totalConvertedQuotesCount) ? data!.totalConvertedQuotesCount : 0,
  quotes: Array.isArray(data?.quotes) ? data!.quotes : EMPTY_QUOTES.quotes,
  quotesBySalesperson: Array.isArray(data?.quotesBySalesperson) ? data!.quotesBySalesperson : [],
  quotesByServiceType: Array.isArray(data?.quotesByServiceType) ? data!.quotesByServiceType : [],
  quotesToOrdersBySalesperson: Array.isArray(data?.quotesToOrdersBySalesperson) ? data!.quotesToOrdersBySalesperson : [],
  quotesToOrdersByServiceType: Array.isArray(data?.quotesToOrdersByServiceType) ? data!.quotesToOrdersByServiceType : [],
});

const toServiceError = (error: unknown) => {
  if (!(error instanceof ApiClientError)) {
    return error;
  }
  if (error.kind === 'timeout') {
    return new Error(`${error.message} — check your connection or VPN`);
  }
  if (error.kind === 'network') {
    return new Error('Network error — check internet / VPN / CORS');
  }
  if (error.kind === 'http' && error.status) {
    const detail = error.details ? ` — ${error.details.slice(0, 120)}` : '';
    return new Error(`Server error ${error.status}${detail}`);
  }
  return new Error(error.message);
};

export const getDashboardQuotes = async (
  period: DashboardPeriod,
  options?: { token?: string | null; timeoutMs?: number; customRange?: { startDate: string; endDate: string } }
): Promise<QuotesDashboardResponse> => {
  const { startDate, endDate } = options?.customRange ?? getDateRangeForPeriod(period);

  try {
    const data = await apiClient.get<QuotesDashboardResponse>({
      path: '/dashboard/quotes',
      query: { startDate, endDate },
      token: options?.token,
      timeoutMs: options?.timeoutMs,
    });

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format');
    }

    return normalizeQuotesResponse(data);
  } catch (error) {
    throw toServiceError(error);
  }
};
