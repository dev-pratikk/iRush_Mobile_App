import { apiClient, ApiClientError } from '@lib/api-client';
import { EMPTY_ORDERS } from '@mocks/api/orders';
import type { OrdersListResponse } from '../../types/api/orders';

// Re-export types so screens can import from one place
export type { OrdersListResponse, OrderItem } from '../../types/api/orders';
export { SAMPLE_ORDERS, EMPTY_ORDERS } from '@mocks/api/orders';

// Re-export formatters so screens that imported them from the old "orders" path still work
export {
  formatCurrency,
  formatCurrencyWithCents,
  formatNumber,
  formatOrderDate,
  trimStr,
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
  return {
    startDate: toISODate(first),
    endDate: toISODate(now),
  };
};

const normalizeOrdersResponse = (data: OrdersListResponse | null | undefined): OrdersListResponse => ({
  count: Number.isFinite(data?.count) ? data!.count : 0,
  totalAmount: Number.isFinite(data?.totalAmount) ? data!.totalAmount : 0,
  orders: Array.isArray(data?.orders) ? data!.orders : EMPTY_ORDERS.orders,
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

export const getDashboardOrders = async (
  period: DashboardPeriod,
  options?: { token?: string | null; timeoutMs?: number; customRange?: { startDate: string; endDate: string } }
): Promise<OrdersListResponse> => {
  const { startDate, endDate } = options?.customRange ?? getDateRangeForPeriod(period);

  try {
    const data = await apiClient.get<OrdersListResponse>({
      path: '/dashboard/orders',
      query: { startDate, endDate },
      token: options?.token,
      timeoutMs: options?.timeoutMs,
    });

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format');
    }

    return normalizeOrdersResponse(data);
  } catch (error) {
    throw toServiceError(error);
  }
};
