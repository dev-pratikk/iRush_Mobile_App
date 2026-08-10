import { apiClient, ApiClientError } from '@lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuoteListItem {
  quoteId: number;
  quoteNo: string;
  quoteDate: string | null;
  companyName: string;
  companyCode: string;
  salesPersonName: string | null;
  orderId: number | null;    // non-null = converted to order
  orderNo: string | null;
  customerCategory: string | null;
}

export interface QuoteContact {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone1: string | null;
  jobTitle: string | null;
  isPrimary: boolean;
}

export interface QuoteSpecification {
  [key: string]: unknown;
}

export interface QuoteDetail extends QuoteListItem {
  quoteContacts: QuoteContact[];
  quoteSpecifications: QuoteSpecification[];
  quoteMessage: string | null;
  quoteDetails: Record<string, unknown>[];
}

export interface QuoteListResponse {
  data: QuoteListItem[];
  count: number;
  totalRecords: number;
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

const normalizeItem = (raw: any): QuoteListItem => ({
  quoteId: Number(raw?.QUOTEID ?? raw?.quoteId ?? 0),
  quoteNo: String(raw?.QUOTE_NO ?? raw?.quoteNo ?? raw?.QUOTENO ?? ''),
  quoteDate: raw?.QUOTE_DATE ?? raw?.quoteDate ?? null,
  companyName: String(raw?.companyName ?? raw?.COMPANY_NAME ?? ''),
  companyCode: String(raw?.companyCode ?? raw?.COMPANY_CODE ?? ''),
  salesPersonName: raw?.SALESPERSON_NAME ?? raw?.salesPersonName ?? null,
  orderId: raw?.ORDER_ID != null ? Number(raw.ORDER_ID) : (raw?.orderId != null ? Number(raw.orderId) : null),
  orderNo: raw?.ORDER_NO ?? raw?.orderNo ?? null,
  customerCategory: raw?.customerCategory ?? raw?.CUSTOMER_CATEGORY ?? null,
});

const normalizeDetail = (raw: any): QuoteDetail => ({
  ...normalizeItem(raw),
  quoteContacts: Array.isArray(raw?.quoteContacts)
    ? raw.quoteContacts.map((c: any): QuoteContact => ({
        firstName: c?.firstName ?? c?.FIRST_NAME ?? null,
        lastName: c?.lastName ?? c?.LAST_NAME ?? null,
        email: c?.email ?? c?.EMAIL ?? null,
        phone1: c?.phone1 ?? c?.PHONE1 ?? c?.phone ?? null,
        jobTitle: c?.jobTitle ?? c?.JOB_TITLE ?? null,
        isPrimary: Boolean(c?.isPrimary ?? c?.IS_PRIMARY),
      }))
    : [],
  quoteSpecifications: Array.isArray(raw?.quoteSpecifications) ? raw.quoteSpecifications : [],
  quoteMessage: raw?.quoteMessage ?? raw?.QUOTE_MESSAGE ?? null,
  quoteDetails: Array.isArray(raw?.quoteDetails) ? raw.quoteDetails : [],
});

// ─── Error Handling ───────────────────────────────────────────────────────────

const toServiceError = (error: unknown): Error => {
  if (!(error instanceof ApiClientError)) return error as Error;
  if (error.kind === 'timeout') return new Error(`${error.message} — check your connection or VPN`);
  if (error.kind === 'network') return new Error('Network error — check internet / VPN / CORS');
  if (error.kind === 'http' && error.status) {
    const detail = error.details ? ` — ${error.details.slice(0, 120)}` : '';
    return new Error(`Server error ${error.status}${detail}`);
  }
  return new Error(error.message);
};

// ─── Fetch Quotes List ────────────────────────────────────────────────────────

export interface FetchQuotesListOptions {
  token?: string | null;
  startDate?: string;
  endDate?: string;
  quoteNo?: string;
  companyName?: string;
  companyCode?: string;
  page?: number;
  limit?: number;
}

export const fetchQuotesList = async (
  options: FetchQuotesListOptions = {}
): Promise<QuoteListResponse> => {
  const { token, startDate, endDate, quoteNo, companyName, companyCode, page = 1, limit = 30 } = options;

  try {
    const data = await apiClient.get<any>({
      path: '/dashboard/quotes',
      query: {
        startDate,
        endDate,
        quoteNo,
        companyName,
        companyCode,
        page,
        limit,
      },
      token,
    });

    const rawItems: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.quotes)
      ? data.quotes
      : [];

    const items = rawItems.map(normalizeItem);
    const totalRecords =
      typeof data?.totalRecords === 'number' ? data.totalRecords :
      typeof data?.count === 'number' ? data.count :
      items.length;

    return { data: items, count: items.length, totalRecords };
  } catch (error) {
    throw toServiceError(error);
  }
};

// ─── Fetch Quote By ID ────────────────────────────────────────────────────────

export const fetchQuoteById = async (
  quoteId: number | string,
  options: { token?: string | null } = {}
): Promise<QuoteDetail> => {
  try {
    const data = await apiClient.get<any>({
      path: `/dashboard/quotes/${quoteId}`,
      token: options.token,
    });

    if (!data || typeof data !== 'object') throw new Error('Invalid quote response');
    return normalizeDetail(data);
  } catch (error) {
    throw toServiceError(error);
  }
};
