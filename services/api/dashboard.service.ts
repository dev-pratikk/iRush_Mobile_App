import { apiClient, ApiClientError } from '@lib/api-client';
import { EMPTY_STATS } from '@mocks/api/dashboard';
import type { DashboardStatsResponse } from '../../types/api/dashboard';

// Re-export types and mocks so screens import from one place
export type { DashboardStatsPeriod, DashboardStatsResponse } from '../../types/api/dashboard';
export { SAMPLE_STATS, EMPTY_STATS } from '@mocks/api/dashboard';
export { formatCurrency, formatCurrencyWithCents, formatNumber } from '@lib/formatters';

const normalizePeriod = (value: DashboardStatsResponse['today']) => ({
  revenue: Number.isFinite(value?.revenue) ? value.revenue : 0,
  orders: Number.isFinite(value?.orders) ? value.orders : 0,
  quotes: Number.isFinite(value?.quotes) ? value.quotes : 0,
  newCustomers: Number.isFinite(value?.newCustomers) ? value.newCustomers : 0,
  invoices: Number.isFinite(value?.invoices) ? value.invoices : 0,
});

const toServiceError = (error: unknown) => {
  if (!(error instanceof ApiClientError)) {
    return error;
  }

  if (error.kind === 'timeout') {
    return new Error(`${error.message} - check your connection or VPN`);
  }

  if (error.kind === 'network') {
    return new Error('Network error - check internet / VPN / CORS');
  }

  if (error.kind === 'http' && error.status) {
    const detail = error.details ? ` - ${error.details}` : '';
    return new Error(`Server error ${error.status}${detail}`);
  }

  return new Error(error.message);
};

export const getDashboardStats = async (options?: {
  token?: string | null;
  timeoutMs?: number;
}): Promise<DashboardStatsResponse> => {
  try {
    const response = await apiClient.get<DashboardStatsResponse>({
      path: '/dashboard/stats',
      token: options?.token,
      timeoutMs: options?.timeoutMs ?? 30000,
    });

    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format');
    }

    return {
      today: normalizePeriod(response.today ?? EMPTY_STATS.today),
      month: normalizePeriod(response.month ?? EMPTY_STATS.month),
    };
  } catch (error) {
    throw toServiceError(error);
  }
};
