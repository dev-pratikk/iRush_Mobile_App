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

const safeString = (val: any): string | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    if (val.name) return String(val.name);
    if (val.label) return String(val.label);
    if (val.categoryName) return String(val.categoryName);
    if (val.title) return String(val.title);
    return JSON.stringify(val);
  }
  return String(val);
};

const parseMessageObject = (msg: any): string | null => {
  if (!msg) return null;
  if (typeof msg === 'string') return msg.trim() || null;
  if (typeof msg === 'object') {
    const parts: string[] = [];
    if (typeof msg.customerTop === 'string' && msg.customerTop.trim()) parts.push(msg.customerTop.trim());
    if (typeof msg.sales === 'string' && msg.sales.trim()) parts.push(msg.sales.trim());
    if (typeof msg.customerBottom === 'string' && msg.customerBottom.trim()) parts.push(msg.customerBottom.trim());
    if (typeof msg.vendorTop === 'string' && msg.vendorTop.trim()) parts.push(msg.vendorTop.trim());
    if (typeof msg.vendorBottom === 'string' && msg.vendorBottom.trim()) parts.push(msg.vendorBottom.trim());
    return parts.length > 0 ? parts.join('\n\n') : null;
  }
  return String(msg);
};

const normalizeItem = (raw: any): QuoteListItem => ({
  quoteId: Number(raw?.QUOTE_ID ?? raw?.quote_id ?? raw?.QUOTEID ?? raw?.quoteId ?? raw?.id ?? raw?.QUOTE_NO ?? raw?.quoteNo ?? 0),
  quoteNo: String(raw?.QUOTE_NO ?? raw?.quoteNo ?? raw?.QUOTENO ?? ''),
  quoteDate: safeString(raw?.QUOTE_DATE ?? raw?.quoteDate),
  companyName: safeString(raw?.companyName ?? raw?.COMPANY_NAME) ?? '',
  companyCode: safeString(raw?.companyCode ?? raw?.COMPANY_CODE) ?? '',
  salesPersonName: safeString(raw?.salesPerson ?? raw?.salesPersonName ?? raw?.salesperson ?? raw?.SALESPERSON_NAME),
  orderId: raw?.ORDER_ID != null ? Number(raw.ORDER_ID) : (raw?.orderId != null ? Number(raw.orderId) : null),
  orderNo: safeString(raw?.ORDER_NO ?? raw?.orderNo),
  customerCategory: safeString(raw?.customerCategory ?? raw?.CUSTOMER_CATEGORY),
});

const normalizeDetail = (raw: any): QuoteDetail => {
  let rawContacts: any[] = [];
  if (Array.isArray(raw?.quoteContacts)) {
    rawContacts = raw.quoteContacts;
  } else if (Array.isArray(raw?.quoteContact)) {
    rawContacts = raw.quoteContact;
  } else if (raw?.quoteContact && typeof raw.quoteContact === 'object') {
    rawContacts = [raw.quoteContact];
  }

  const contacts: QuoteContact[] = rawContacts.map((c: any) => ({
    firstName: safeString(c?.firstName ?? c?.FIRST_NAME),
    lastName: safeString(c?.lastName ?? c?.LAST_NAME),
    email: safeString(c?.email ?? c?.EMAIL),
    phone1: safeString(c?.phone1 ?? c?.PHONE1 ?? c?.phone),
    jobTitle: safeString(c?.contactJobTitle ?? c?.jobTitle ?? c?.JOB_TITLE),
    isPrimary: c?.isPrimaryContact === 'Yes' || Boolean(c?.isPrimary ?? c?.IS_PRIMARY),
  }));

  let specs: Record<string, unknown>[] = [];
  const rawSpec = raw?.specification ?? raw?.specifications ?? raw?.quoteSpecifications;
  if (Array.isArray(rawSpec)) {
    specs = rawSpec;
  } else if (rawSpec && typeof rawSpec === 'object') {
    specs = [rawSpec];
  }

  return {
    ...normalizeItem(raw),
    quoteContacts: contacts,
    quoteSpecifications: specs,
    quoteMessage: parseMessageObject(raw?.quoteMessage ?? raw?.QUOTE_MESSAGE),
    quoteDetails: Array.isArray(raw?.quoteDetails) ? raw.quoteDetails : [],
  };
};

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
  quoteStatus?: 'converted' | 'notconverted';
  salesPerson?: string;
  page?: number;
  limit?: number;
}

export const fetchQuotesList = async (
  options: FetchQuotesListOptions = {}
): Promise<QuoteListResponse> => {
  const { token, startDate, endDate, quoteNo, companyName, companyCode, quoteStatus, salesPerson, page = 1, limit = 30 } = options;

  try {
    const data = await apiClient.get<any>({
      path: '/dashboard/quotes',
      query: {
        startDate,
        endDate,
        quoteNo,
        companyName,
        companyCode,
        quoteStatus,
        salesPerson,
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
