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
  repeatedOrdersCount: data?.repeatedOrdersCount ?? (data as any)?.repeatCount ?? 0,
  newOrdersAmount: data?.newOrdersAmount ?? (data as any)?.newOrdersTotal ?? 0,
  repeatedOrdersAmount: data?.repeatedOrdersAmount ?? (data as any)?.repeatedOrdersTotal ?? 0,
  newQuotesCount: data?.newQuotesCount ?? 0,
  repeatedQuotesCount: data?.repeatedQuotesCount ?? 0,
  totalQuotesCount: data?.totalQuotesCount ?? 0,
  noVendorCount: data?.noVendorCount ?? 0,
  partialVendorCount: data?.partialVendorCount ?? 0,
  fullySourcedCount: data?.fullySourcedCount ?? 0,
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
    if (options.search.type === 'orderNo') {
      query.orderNo = val;
    } else if (options.search.type === 'companyCode') {
      query.companyCode = val;
    } else if (options.search.type === 'companyName') {
      query.companyName = val;
    } else if (options.search.type === 'partNumber') {
      query.partNumber = val;
      query.pcbpartNo = val;
    } else if (options.search.type === 'salesperson') {
      query.salesPerson = val; // Note: /dashboard/orders endpoint uses salesPerson
    }
  }

  try {
    let data: any = null;

    if (options.search?.type === 'partNumber' && options.search.value.trim()) {
      const partVal = options.search.value.trim();
      try {
        data = await apiClient.get<any>({
          path: `/dashboard/partnumbers/${encodeURIComponent(partVal)}`,
          token: options.token,
          timeoutMs: 15000,
        });
      } catch (pnErr) {
        if (__DEV__) console.log('[Orders] Partnumber endpoint fallback:', pnErr);
      }
    }

    if (!data) {
      data = await apiClient.get<OrdersListResponse & { page?: number; limit?: number; totalRecords?: number }>({
        path: '/dashboard/orders',
        query,
        token: options.token,
        timeoutMs: 15000,
      });
    }

    const normalized = normalizeOrdersResponse(data);

    // Support both paginated (totalRecords) and non-paginated (count) backends
    const totalRecords = (data as any)?.totalRecords ?? normalized.count;

    const ordersList = normalized.orders;
    const newCount = (data as any)?.newOrdersCount ?? (data as any)?.newCount ?? normalized.newOrdersCount ?? 0;
    const repeatCount = (data as any)?.repeatedOrdersCount ?? (data as any)?.repeatCount ?? normalized.repeatedOrdersCount ?? 0;

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

    const finalNewCount = newCount || cntNew;
    const finalRepeatCount = repeatCount || cntRep;
    const finalNewAmount = (data as any)?.newOrdersAmount ?? (data as any)?.newOrdersTotal ?? normalized.newOrdersAmount ?? sumNewAmt;
    const finalRepeatAmount = (data as any)?.repeatedOrdersAmount ?? (data as any)?.repeatedOrdersTotal ?? normalized.repeatedOrdersAmount ?? sumRepAmt;

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
