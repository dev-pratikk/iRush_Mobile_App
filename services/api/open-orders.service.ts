import { apiClient, ApiClientError } from '@lib/api-client';
import { EMPTY_OPEN_ORDERS } from '@mocks/api/open-orders';
import type {
  OpenOrdersResponse,
  OpenOrderItem,
  OpenOrdersPageResponse,
  PendingOrdersSummary,
  PartialOrdersSummary,
} from '../../types/api/open-orders';
import type { PaginatedResult } from '@hooks/useInfiniteResource';

// Re-export types so screens can import from one place
export type {
  OpenOrderDetail,
  OpenOrderShippingAddress,
  OpenOrderCustomerContact,
  OpenOrderVendor,
  OpenOrderInvoice,
  OpenOrderPackingSlip,
  OpenOrderItem,
  OpenOrdersResponse,
  OpenOrdersPageResponse,
  PendingOrdersSummary,
  PartialOrdersSummary,
} from '../../types/api/open-orders';
export { SAMPLE_OPEN_ORDERS, EMPTY_OPEN_ORDERS } from '@mocks/api/open-orders';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const extractOrderDate = (isoDate: string | null | undefined): string => {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    let year = '';
    let month = '';
    let day = '';
    for (const p of parts) {
      if (p.type === 'year') year = p.value;
      if (p.type === 'month') month = p.value;
      if (p.type === 'day') day = p.value;
    }
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

export const extractDaysLeft = (item: OpenOrderItem): number => {
  if (item.orderDetails && item.orderDetails.length > 0) {
    const detail = item.orderDetails[0];
    if (detail && typeof detail.DAY === 'number') {
      return detail.DAY;
    }
  }
  return 0;
};

export const extractVendorCount = (item: OpenOrderItem): { completed: number; total: number } => {
  const total = item.orderVendors?.length ?? 0;
  let completed = 0;
  if (total > 0) {
    completed = item.orderVendors.filter(
      (v: any) => v && (v.STATUS || v.status || '').toString().toLowerCase().includes('complete')
    ).length;
  }
  return { completed, total: total > 0 ? total : 0 };
};

export const getOverallStatus = (item: OpenOrderItem): 'On track' | 'Due Soon' | 'Overdue' => {
  const d = extractDaysLeft(item);
  const s = (item.orderStatus || '').toString().toLowerCase();
  if (d < 0 || s.includes('overdue') || s.includes('late')) return 'Overdue';
  if (d <= 3 || s.includes('due') || s.includes('partial')) return 'Due Soon';
  return 'On track';
};

export const trimStr = (v: any): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));

// ─── Service error normalisation ───────────────────────────────────────────────

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

// ─── Normaliser ────────────────────────────────────────────────────────────────

const normalizeOpenOrdersResponse = (data: OpenOrdersResponse | null | undefined): OpenOrdersResponse => ({
  totalOpenOrders: Number.isFinite(data?.totalOpenOrders) ? data!.totalOpenOrders : 0,
  totalOpenOrdersAmount: Number.isFinite(data?.totalOpenOrdersAmount) ? data!.totalOpenOrdersAmount : 0,
  totalInvoicedQty: Number.isFinite(data?.totalInvoicedQty) ? data!.totalInvoicedQty : 0,
  totalInvoicedAmount: Number.isFinite(data?.totalInvoicedAmount) ? data!.totalInvoicedAmount : 0,
  totalShippedAmount: Number.isFinite(data?.totalShippedAmount) ? data!.totalShippedAmount : 0,
  totalPendingQty: Number.isFinite(data?.totalPendingQty) ? data!.totalPendingQty : 0,
  totalPendingAmount: Number.isFinite(data?.totalPendingAmount) ? data!.totalPendingAmount : 0,
  totalPaymentsReceived: Number.isFinite(data?.totalPaymentsReceived) ? data!.totalPaymentsReceived : 0,
  vendorOrderAmount: Number.isFinite(data?.vendorOrderAmount) ? data!.vendorOrderAmount : 0,
  pendingOrdersCount: Number.isFinite(data?.pendingOrdersCount) ? data!.pendingOrdersCount : 0,
  pendingOrdersAmount: Number.isFinite(data?.pendingOrdersAmount) ? data!.pendingOrdersAmount : 0,
  partialOrdersCount: Number.isFinite(data?.partialOrdersCount) ? data!.partialOrdersCount : 0,
  partialOrdersAmount: Number.isFinite(data?.partialOrdersAmount) ? data!.partialOrdersAmount : 0,
  pendingOrdersSummary: data?.pendingOrdersSummary ?? null,
  partialOrdersSummary: data?.partialOrdersSummary ?? null,
  pendingOrders: Array.isArray(data?.pendingOrders) ? data!.pendingOrders : [],
  partialOrders: Array.isArray(data?.partialOrders) ? data!.partialOrders : [],
});

// ─── Fetch ─────────────────────────────────────────────────────────────────────

export const getOpenOrders = async (
  options?: { token?: string | null; timeoutMs?: number }
): Promise<OpenOrdersResponse> => {
  try {
    const data = await apiClient.get<OpenOrdersResponse>({
      path: '/dashboard/open-orders',
      token: options?.token,
      timeoutMs: options?.timeoutMs ?? 20000,
    });

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format');
    }

    return normalizeOpenOrdersResponse(data);
  } catch (error) {
    throw toServiceError(error);
  }
};

// ─── Paginated fetcher for useInfiniteResource ──────────────────────────────
// Separate call per filter (pending | partial), always sends limit=10 explicitly.
// Returns PaginatedResult<OpenOrderItem> + summary objects in the extra fields.
export type OpenOrderFilter = 'pending' | 'partial';
export type OpenOrderSearchType = 'orderNo' | 'companyCode' | 'companyName' | 'partNumber' | 'salesperson';

export interface OpenOrderSearchParam {
  type: OpenOrderSearchType;
  value: string;
}

export const OPEN_ORDERS_PAGE_LIMIT = 10;

export const fetchOpenOrdersPage = async (
  filter: OpenOrderFilter,
  options: {
    token?: string | null;
    page?: number;
    search?: OpenOrderSearchParam | null;
    customRange?: { startDate: string; endDate: string } | null;
  }
): Promise<PaginatedResult<OpenOrderItem>> => {
  const page = options.page ?? 1;
  const limit = OPEN_ORDERS_PAGE_LIMIT; // ALWAYS explicit — never rely on backend default

  const query: Record<string, any> = { filter, page, limit };

  if (options.customRange?.startDate && options.customRange?.endDate) {
    query.startDate = options.customRange.startDate;
    query.endDate = options.customRange.endDate;
  }

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
      query.partNo = val;
    } else if (options.search.type === 'salesperson') {
      query.salesPerson = val;
      query.salespPerson = val;
    }
  }

  try {
    let data: any = null;

    // Direct fetch by part number endpoint: /dashboard/partnumbers/:partNumber
    if (options.search?.type === 'partNumber' && options.search.value.trim()) {
      const partVal = options.search.value.trim();
      try {
        data = await apiClient.get<any>({
          path: `/dashboard/partnumbers/${encodeURIComponent(partVal)}`,
          query: { filter },
          token: options.token,
          timeoutMs: 15000,
        });
      } catch (pnErr) {
        if (__DEV__) console.log('[OpenOrders] Partnumber endpoint fallback:', pnErr);
      }
    }

    if (!data) {
      data = await apiClient.get<OpenOrdersPageResponse>({
        path: '/dashboard/open-orders',
        query,
        token: options.token,
        timeoutMs: 20000,
      });
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format');
    }

    const orders: OpenOrderItem[] = Array.isArray(data.data) ? data.data : [];
    const totalRecords = Number.isFinite(data.totalRecords) ? data.totalRecords : orders.length;

    // ─── Pagination diagnostics ─────────────────────────────────────
    if (__DEV__) {
      const searchInfo = options.search && options.search.value.trim()
        ? ` searchType=${options.search.type} searchVal="${options.search.value.trim()}"`
        : '';
      const ids = orders.map((o) => o.ORDER_ID).join(', ');
      console.log(
        `[OpenOrders/${filter}] page=${page} limit=${limit}${searchInfo} ` +
        `returned=${orders.length} totalRecords=${totalRecords} ` +
        `hasMore=${orders.length >= limit && orders.length < totalRecords}\n` +
        `  ORDER_IDs: [${ids}]`
      );
    }

    return {
      page,
      limit,
      totalRecords,
      data: orders,
      // Pass summary objects through as extra metadata fields
      // useInfiniteResource stores the full page object; meta reads page 1
      pendingOrdersSummary: data.pendingOrdersSummary ?? null,
      partialOrdersSummary: data.partialOrdersSummary ?? null,
    };
  } catch (error) {
    throw toServiceError(error);
  }
};
