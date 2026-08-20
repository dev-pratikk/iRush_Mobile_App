import { apiClient, ApiClientError } from '@lib/api-client';
import type { ARItem, ARDashboardResponse, ARStatusTab } from '../../types/api/ar';

export type { ARItem, ARDashboardResponse, ARStatusTab };

export interface FetchARParams {
  status?: ARStatusTab;
  salesPerson?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
  token?: string | null;
  timeoutMs?: number;
}

export interface SearchARParams {
  search: string;
  page?: number;
  limit?: number;
  token?: string | null;
  timeoutMs?: number;
  status?: ARStatusTab;
  salesPerson?: string | null;
}

const normalizeARResponse = (data: any): ARDashboardResponse => {
  let invoices: any[] = [];
  if (Array.isArray(data)) {
    invoices = data;
  } else if (Array.isArray(data?.invoices)) {
    invoices = data.invoices;
  } else if (Array.isArray(data?.data)) {
    invoices = data.data;
  } else if (Array.isArray(data?.records)) {
    invoices = data.records;
  } else if (Array.isArray(data?.results)) {
    invoices = data.results;
  } else if (data && typeof data === 'object') {
    const firstArrVal = Object.values(data).find(
      (v) => Array.isArray(v) && v.length > 0 && (v[0]?.INV_NUMBER || v[0]?.invoiceNumber || v[0]?.CompanyName || v[0]?.companyName || v[0]?.DUE_AMOUNT)
    ) as any[] | undefined;
    if (firstArrVal) {
      invoices = firstArrVal;
    }
  }

  const envelope = data && typeof data === 'object' && !Array.isArray(data) ? data : {};

  const normalizedInvoices: ARItem[] = invoices.map((item: any) => ({
    INV_NUMBER: String(item.INV_NUMBER || item.invoiceNumber || item.inv_number || '').trim(),
    INV_DATE: item.INV_DATE || item.invoiceDate || item.inv_date || null,
    CompanyCode: String(item.CompanyCode || item.companyCode || '').trim(),
    CompanyName: String(item.CompanyName || item.companyName || '').trim(),
    creditTerm: String(item.creditTerm || item.CREDIT_TERM || '').trim(),
    ORDER_NO: String(item.ORDER_NO || item.orderNo || '').trim(),
    ORDER_DATE: item.ORDER_DATE || item.orderDate || null,
    InvoiceAmount: Number(item.InvoiceAmount ?? item.invoiceAmount ?? item.INVOICE_AMOUNT ?? 0),
    DUE_AMOUNT: Number(item.DUE_AMOUNT ?? item.dueAmount ?? item.due_amount ?? item.InvoiceAmount ?? 0),
    invoiceDays: Number(item.invoiceDays ?? item.INVOICE_DAYS ?? 0),
    creditTermInDays: Number(item.creditTermInDays ?? item.CREDIT_TERM_IN_DAYS ?? 0),
    overDueDays: Number(item.overDueDays ?? item.OVERDUE_DAYS ?? 0),
    salespersonName: String(item.salespersonName || item.salesPersonName || item.salesperson || '').trim(),
    status: String(item.status || item.STATUS || 'future').trim(),
    invoiceId: item.invoiceId != null ? Number(item.invoiceId) : undefined,
    invoiceNumber: item.invoiceNumber ? String(item.invoiceNumber).trim() : undefined,
    invoiceDate: item.invoiceDate || null,
    companyName: item.companyName ? String(item.companyName).trim() : undefined,
    companyCode: item.companyCode ? String(item.companyCode).trim() : undefined,
  }));

  const count = Number.isFinite(envelope?.count)
    ? envelope.count
    : Number.isFinite(envelope?.totalRecords)
    ? envelope.totalRecords
    : normalizedInvoices.length;
  const totalInvoiceCount = Number.isFinite(envelope?.totalInvoiceCount) ? envelope.totalInvoiceCount : count;
  const totalARDueAmount = Number.isFinite(envelope?.totalARDueAmount)
    ? envelope.totalARDueAmount
    : normalizedInvoices.reduce((sum, inv) => sum + (Number(inv?.DUE_AMOUNT) || 0), 0);

  return {
    count,
    page: Number.isFinite(envelope?.page) ? envelope.page : 1,
    limit: Number.isFinite(envelope?.limit) ? envelope.limit : 20,
    totalPages: Number.isFinite(envelope?.totalPages) ? envelope.totalPages : (count > 0 ? Math.ceil(count / (envelope?.limit || normalizedInvoices.length || 20)) : 1),
    totalRecords: count,
    dueTodayCount: Number.isFinite(envelope?.dueTodayCount) ? envelope.dueTodayCount : 0,
    dueTodayDueTotal: Number.isFinite(envelope?.dueTodayDueTotal) ? envelope.dueTodayDueTotal : 0,
    crossedCount: Number.isFinite(envelope?.crossedCount) ? envelope.crossedCount : 0,
    crossedDueTotal: Number.isFinite(envelope?.crossedDueTotal) ? envelope.crossedDueTotal : 0,
    futureDuesCount: Number.isFinite(envelope?.futureDuesCount) ? envelope.futureDuesCount : 0,
    futureDuesDueTotal: Number.isFinite(envelope?.futureDuesDueTotal) ? envelope.futureDuesDueTotal : 0,
    totalInvoiceCount,
    totalARDueAmount,
    invoices: normalizedInvoices,
  };
};

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

export const fetchARData = async (params: FetchARParams): Promise<ARDashboardResponse> => {
  const query: Record<string, string | number> = {};

  if (params.status && params.status !== 'all') {
    query.status = params.status;
  }

  if (params.salesPerson && params.salesPerson.trim().toLowerCase() !== 'all') {
    query.salesPerson = params.salesPerson.trim();
  }

  if (params.search && params.search.trim()) {
    query.search = params.search.trim();
  }

  if (params.page) {
    query.page = params.page;
  }

  if (params.limit) {
    query.limit = params.limit;
  }

  try {
    if (__DEV__) {
      console.log('[ARService/fetchARData] GET /dashboard/ar query=', query);
    }
    const data = await apiClient.get<ARDashboardResponse>({
      path: '/dashboard/ar',
      query,
      token: params.token,
      timeoutMs: params.timeoutMs ?? 20000,
    });

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format');
    }

    const normalized = normalizeARResponse(data);
    if (__DEV__) {
      console.log(
        `[ARService/fetchARData] OK — rawType=${Array.isArray(data) ? 'array' : typeof data} ` +
        `invoices=${normalized.invoices.length} count=${normalized.count} totalAmount=${normalized.totalARDueAmount}`
      );
    }
    return normalized;
  } catch (error: any) {
    if (__DEV__) {
      console.log('[ARService/fetchARData] ERROR:', error?.message || error, 'query=', query);
    }
    throw toServiceError(error);
  }
};

export const searchARData = async (params: SearchARParams): Promise<ARDashboardResponse> => {
  const query: Record<string, string | number> = {};

  const trimmedSearch = params.search.trim();
  if (trimmedSearch) {
    query.search = trimmedSearch;
  }

  if (params.status && params.status !== 'all') {
    query.status = params.status;
  }

  if (params.salesPerson && params.salesPerson.trim().toLowerCase() !== 'all') {
    query.salesPerson = params.salesPerson.trim();
  }

  if (params.page) {
    query.page = params.page;
  }

  if (params.limit) {
    query.limit = params.limit;
  }

  try {
    if (__DEV__) {
      console.log('[ARService/searchARData] GET /dashboard/ar-search query=', query);
    }
    const data = await apiClient.get<ARDashboardResponse>({
      path: '/dashboard/ar-search',
      query,
      token: params.token,
      timeoutMs: params.timeoutMs ?? 20000,
    });

    if (__DEV__) {
      console.log('[ARService/searchARData] RAW response type:', Array.isArray(data) ? 'array' : typeof data, data);
    }

    if (!data || (typeof data !== 'object' && !Array.isArray(data))) {
      throw new Error('Invalid response format');
    }

    const normalized = normalizeARResponse(data);
    if (__DEV__) {
      console.log(
        `[ARService/searchARData] OK — invoices=${normalized.invoices.length} ` +
        `count=${normalized.count} sample0=${normalized.invoices[0] ? JSON.stringify({
          INV: normalized.invoices[0].INV_NUMBER,
          Co: normalized.invoices[0].CompanyName,
          Code: normalized.invoices[0].CompanyCode,
          Amt: normalized.invoices[0].DUE_AMOUNT,
        }) : 'null'}`
      );
    }
    return normalized;
  } catch (error: any) {
    if (__DEV__) {
      console.log('[ARService/searchARData] PRIMARY ERROR (fallback to /dashboard/ar):', error?.message || error);
    }
    try {
      const fallbackRes = await fetchARData({
        status: params.status,
        salesPerson: params.salesPerson,
        search: trimmedSearch,
        page: params.page,
        limit: params.limit,
        token: params.token,
        timeoutMs: params.timeoutMs ?? 15000,
      });
      if (__DEV__) {
        console.log(
          `[ARService/searchARData] FALLBACK OK — invoices=${fallbackRes.invoices.length}`
        );
      }
      return fallbackRes;
    } catch (fallbackErr: any) {
      if (__DEV__) {
        console.log('[ARService/searchARData] FALLBACK ALSO FAILED:', fallbackErr?.message || fallbackErr);
      }
      throw toServiceError(fallbackErr ?? error);
    }
  }
};

export const fetchARDetailBySearch = async (
  invNumber: string,
  options?: { token?: string | null; timeoutMs?: number }
): Promise<ARItem | null> => {
  const trimmed = invNumber.replace(/^#/, '').trim();
  if (!trimmed) return null;

  try {
    if (__DEV__) {
      console.log('[ARService/fetchARDetailBySearch] GET /dashboard/ar?search=' + trimmed);
    }
    const res = await fetchARData({
      search: trimmed,
      token: options?.token,
      timeoutMs: options?.timeoutMs ?? 15000,
    });

    if (res.invoices && res.invoices.length > 0) {
      const exact = res.invoices.find(
        (inv) => inv.INV_NUMBER.toLowerCase() === trimmed.toLowerCase()
      );
      return exact || res.invoices[0];
    }
    return null;
  } catch (error) {
    if (__DEV__) {
      console.log('[ARService/fetchARDetailBySearch] error:', error);
    }
    return null;
  }
};
