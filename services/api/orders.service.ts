import { apiClient, ApiClientError } from '@lib/api-client';
import { EMPTY_ORDERS } from '@mocks/api/orders';
import type { OrdersListResponse, OrderItem } from '../../types/api/orders';
import type { PaginatedResult } from '@hooks/useInfiniteResource';

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

import { getDateRangeForPeriod, type DashboardPeriod } from '../../lib/date';
export { getDateRangeForPeriod, type DashboardPeriod };

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

// ─── Paginated fetcher for useInfiniteResource ──────────────────────────────
export type OrdersSearchType = 'orderNo' | 'companyName' | 'salesperson';

export interface OrdersSearchParam {
  type: OrdersSearchType;
  value: string;
}

export const ORDERS_PAGE_LIMIT = 10;

export const fetchOrdersPage = async (
  period: DashboardPeriod,
  options: {
    token?: string | null;
    page?: number;
    limit?: number;
    search?: OrdersSearchParam | null;
    customRange?: { startDate: string; endDate: string } | null;
  }
): Promise<PaginatedResult<OrderItem>> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? ORDERS_PAGE_LIMIT;
  const { startDate, endDate } = options.customRange ?? getDateRangeForPeriod(period);

  const query: Record<string, any> = { startDate, endDate, page, limit };

  if (options.search && options.search.value.trim()) {
    const val = options.search.value.trim();
    if (options.search.type === 'orderNo') {
      query.orderNo = val;
    } else if (options.search.type === 'companyName') {
      query.companyName = val;
    } else if (options.search.type === 'salesperson') {
      query.salesPerson = val; // Note: /dashboard/orders endpoint uses salesPerson (no typo!)
    }
  }

  try {
    const data = await apiClient.get<OrdersListResponse & { page?: number; limit?: number; totalRecords?: number }>({
      path: '/dashboard/orders',
      query,
      token: options.token,
      timeoutMs: 15000,
    });

    const normalized = normalizeOrdersResponse(data);

    // Support both paginated (totalRecords) and non-paginated (count) backends
    const totalRecords = (data as any)?.totalRecords ?? normalized.count;

    // ─── Pagination diagnostics ──────────────────────────────────────────────
    if (__DEV__) {
      const searchInfo = options.search && options.search.value.trim()
        ? ` searchType=${options.search.type} searchVal="${options.search.value.trim()}"`
        : '';
      console.log(
        `[Orders/${period}] page=${page} limit=${limit}${searchInfo} ` +
        `returned=${normalized.orders.length} ` +
        `totalRecords=${totalRecords} count=${normalized.count} totalAmount=${normalized.totalAmount} ` +
        `hasMore=${normalized.orders.length < totalRecords && normalized.orders.length >= limit}`
      );
    }

    return {
      page,
      limit,
      totalRecords,
      count: normalized.count,
      totalAmount: normalized.totalAmount,
      data: normalized.orders,
    };
  } catch (error) {
    throw toServiceError(error);
  }
};
