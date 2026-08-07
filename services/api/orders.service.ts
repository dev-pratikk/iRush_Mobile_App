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
  type: data?.type,
  count: Number.isFinite(data?.count) ? data!.count : 0,
  totalAmount: Number.isFinite(data?.totalAmount) ? data!.totalAmount : 0,
  totalOrderCost: data?.totalOrderCost ?? 0,
  totalMarkup: data?.totalMarkup ?? 0,
  overallMarkupPercentage: data?.overallMarkupPercentage ?? 0,
  newOrdersCount: data?.newOrdersCount ?? (data as any)?.newCount ?? 0,
  newOrderValue: data?.newOrderValue ?? data?.newOrdersAmount ?? (data as any)?.newOrdersTotal ?? 0,
  repeatedOrdersCount: data?.repeatedOrdersCount ?? (data as any)?.repeatCount ?? 0,
  repeatedOrderValue: data?.repeatedOrderValue ?? data?.repeatedOrdersAmount ?? (data as any)?.repeatedOrdersTotal ?? 0,
  newOrdersAmount: data?.newOrderValue ?? data?.newOrdersAmount ?? (data as any)?.newOrdersTotal ?? 0,
  repeatedOrdersAmount: data?.repeatedOrderValue ?? data?.repeatedOrdersAmount ?? (data as any)?.repeatedOrdersTotal ?? 0,
  newQuotesCount: data?.newQuotesCount ?? 0,
  repeatedQuotesCount: data?.repeatedQuotesCount ?? 0,
  totalQuotesCount: data?.totalQuotesCount ?? 0,
  noVendorCount: data?.noVendorCount ?? 0,
  partialVendorCount: data?.partialVendorCount ?? 0,
  fullySourcedCount: data?.fullySourcedCount ?? 0,
  orders: Array.isArray(data?.orders) ? data!.orders : EMPTY_ORDERS.orders,
});

export const isOrderNew = (ord: any): boolean => {
  if (!ord) return false;
  const cat = String(ord.ORDER_CATEGORY ?? ord.orderCategory ?? ord.CUSTOMER_STATUS ?? ord.customerStatus ?? '').toUpperCase().trim();
  return cat === 'NEW';
};

export const isOrderRepeat = (ord: any): boolean => {
  if (!ord) return false;
  const cat = String(ord.ORDER_CATEGORY ?? ord.orderCategory ?? ord.CUSTOMER_STATUS ?? ord.customerStatus ?? '').toUpperCase().trim();
  return cat === 'REPEAT' || cat === 'REPEATED';
};

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
export type OrdersSearchType = 'orderNo' | 'companyCode' | 'companyName' | 'partNumber' | 'salesperson';

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
    if (options.search.type === 'salesperson') {
      query.salesPerson = val;
    } else {
      // Single unified search parameter for orderNo, partNo, company name
      query.search = val;
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

    const ordersList = normalized.orders;

    const hasBackendNewCount = typeof (data as any)?.newOrdersCount === 'number' || typeof (data as any)?.newCount === 'number';
    const hasBackendRepeatCount = typeof (data as any)?.repeatedOrdersCount === 'number' || typeof (data as any)?.repeatCount === 'number';

    const rawNewCount = (data as any)?.newOrdersCount ?? (data as any)?.newCount ?? normalized.newOrdersCount;
    const rawRepeatCount = (data as any)?.repeatedOrdersCount ?? (data as any)?.repeatCount ?? normalized.repeatedOrdersCount;

    let sumNewAmt = 0;
    let sumRepAmt = 0;
    let cntNew = 0;
    let cntRep = 0;

    if (ordersList.length > 0) {
      ordersList.forEach((ord) => {
        const cat = String(ord.CUSTOMER_STATUS || ord.ORDER_CATEGORY || '').toUpperCase().trim();
        const amt = Number(ord.ORDER_TOTAL) || 0;
        if (cat === 'NEW') {
          cntNew += 1;
          sumNewAmt += amt;
        } else if (cat === 'REPEATED' || cat === 'REPEAT') {
          cntRep += 1;
          sumRepAmt += amt;
        }
      });
    }

    const finalNewCount = hasBackendNewCount && typeof rawNewCount === 'number' ? rawNewCount : cntNew;
    const finalRepeatCount = hasBackendRepeatCount && typeof rawRepeatCount === 'number' ? rawRepeatCount : cntRep;

    const hasBackendNewAmount = typeof (data as any)?.newOrderValue === 'number' || typeof (data as any)?.newOrdersAmount === 'number' || typeof (data as any)?.newOrdersTotal === 'number';
    const hasBackendRepeatAmount = typeof (data as any)?.repeatedOrderValue === 'number' || typeof (data as any)?.repeatedOrdersAmount === 'number' || typeof (data as any)?.repeatedOrdersTotal === 'number';

    const rawNewAmount = (data as any)?.newOrderValue ?? (data as any)?.newOrdersAmount ?? (data as any)?.newOrdersTotal ?? normalized.newOrderValue ?? normalized.newOrdersAmount;
    const rawRepeatAmount = (data as any)?.repeatedOrderValue ?? (data as any)?.repeatedOrdersAmount ?? (data as any)?.repeatedOrdersTotal ?? normalized.repeatedOrderValue ?? normalized.repeatedOrdersAmount;

    const finalNewAmount = hasBackendNewAmount && typeof rawNewAmount === 'number' ? rawNewAmount : sumNewAmt;
    const finalRepeatAmount = hasBackendRepeatAmount && typeof rawRepeatAmount === 'number' ? rawRepeatAmount : sumRepAmt;

    // ─── Pagination diagnostics ──────────────────────────────────────────────
    if (__DEV__) {
      const searchInfo = options.search && options.search.value.trim()
        ? ` searchType=${options.search.type} searchVal="${options.search.value.trim()}"`
        : '';
      console.log(
        `[Orders/${period}] page=${page} limit=${limit}${searchInfo} ` +
        `returned=${ordersList.length} ` +
        `totalRecords=${totalRecords} count=${normalized.count} totalAmount=${normalized.totalAmount} ` +
        `newCount=${finalNewCount} newAmount=${finalNewAmount} repeatCount=${finalRepeatCount} repeatAmount=${finalRepeatAmount} ` +
        `hasMore=${ordersList.length < totalRecords && ordersList.length >= limit}`
      );
    }

    return {
      page,
      limit,
      totalRecords,
      count: normalized.count,
      totalAmount: normalized.totalAmount,
      newOrdersCount: finalNewCount,
      repeatedOrdersCount: finalRepeatCount,
      newOrdersAmount: finalNewAmount,
      repeatedOrdersAmount: finalRepeatAmount,
      totalOrderCost: normalized.totalOrderCost,
      totalMarkup: normalized.totalMarkup,
      overallMarkupPercentage: normalized.overallMarkupPercentage,
      data: ordersList,
    };
  } catch (error) {
    throw toServiceError(error);
  }
};

export const fetchOrderById = async (
  orderId: string | number,
  options?: { token?: string | null }
): Promise<OrderItem | null> => {
  const cleanId = String(orderId || '').replace(/^#/, '').trim();
  if (!cleanId) return null;

  try {
    const data = await apiClient.get<any>({
      path: `/dashboard/orders/${encodeURIComponent(cleanId)}`,
      token: options?.token,
      timeoutMs: 15000,
    });

    const singleOrder = Array.isArray(data)
      ? data[0]
      : Array.isArray(data?.orders)
      ? data.orders[0]
      : data;

    return singleOrder ?? null;
  } catch (error) {
    if (__DEV__) {
      console.log('[OrdersService] fetchOrderById error:', error);
    }
    return null;
  }
};

export const fetchOrdersByFastSearch = async (
  val: string,
  options?: { token?: string | null }
): Promise<OrderItem[]> => {
  const trimmed = val.replace(/^#/, '').trim();
  if (!trimmed) return [];

  try {
    const data = await apiClient.get<any>({
      path: `/dashboard/orders/search/${encodeURIComponent(trimmed)}`,
      token: options?.token,
      timeoutMs: 12000,
    });

    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.orders)
      ? data.orders
      : data && typeof data === 'object'
      ? [data]
      : [];

    return list;
  } catch (error) {
    if (__DEV__) {
      console.log('[OrdersService] fetchOrdersByFastSearch fallback:', error);
    }
    try {
      const fallbackData = await apiClient.get<any>({
        path: '/dashboard/orders',
        query: { search: trimmed, limit: 15 },
        token: options?.token,
        timeoutMs: 10000,
      });

      return Array.isArray(fallbackData)
        ? fallbackData
        : Array.isArray(fallbackData?.orders)
        ? fallbackData.orders
        : [];
    } catch {
      return [];
    }
  }
};
