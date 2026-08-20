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
  page: number;
  limit: number;
  totalPages: number;
  convertedCount: number;
  notConvertedCount: number;
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

const normalizeItem = (raw: any): QuoteListItem => {
  const isConverted = raw?.quoteStatus === 'CONVERTED' || raw?.QUOTE_STATUS === 'CONVERTED' || (raw?.orderId != null && Number(raw.orderId) > 0);
  return {
    quoteId: Number(raw?.quoteId ?? raw?.QUOTE_ID ?? raw?.quote_id ?? raw?.QUOTEID ?? raw?.id ?? 0),
    quoteNo: String(raw?.quoteNo ?? raw?.QUOTE_NO ?? raw?.quote_no ?? raw?.QUOTENO ?? ''),
    quoteDate: safeString(raw?.quoteDate ?? raw?.QUOTE_DATE ?? raw?.quote_date),
    companyName: safeString(raw?.companyName ?? raw?.COMPANY_NAME ?? raw?.company_name) ?? '',
    companyCode: safeString(raw?.companyCode ?? raw?.COMPANY_CODE ?? raw?.company_code) ?? '',
    salesPersonName: safeString(raw?.salesPerson ?? raw?.salesPersonName ?? raw?.salesperson ?? raw?.SALESPERSON_NAME ?? raw?.sales_person),
    orderId: raw?.orderId != null ? Number(raw.orderId) : (raw?.ORDER_ID != null ? Number(raw.ORDER_ID) : (isConverted ? 1 : null)),
    orderNo: safeString(raw?.orderNo ?? raw?.ORDER_NO ?? raw?.order_no),
    customerCategory: safeString(raw?.customerCategory ?? raw?.CUSTOMER_CATEGORY ?? raw?.customer_category),
  };
};

const normalizeDetail = (raw: any): QuoteDetail => {
  let rawContacts: any[] = [];
  if (Array.isArray(raw?.quoteContacts)) {
    rawContacts = raw.quoteContacts;
  } else if (Array.isArray(raw?.quoteContact)) {
    rawContacts = raw.quoteContact;
  } else if (raw?.quoteContact && typeof raw.quoteContact === 'object') {
    rawContacts = [raw.quoteContact];
  }

  const contacts: QuoteContact[] = rawContacts.map((c: any) => {
    const firstName = safeString(c?.firstName ?? c?.FIRST_NAME ?? c?.first_name);
    const lastName = safeString(c?.lastName ?? c?.LAST_NAME ?? c?.last_name);
    const fullName = safeString(c?.fullName ?? c?.FULL_NAME ?? c?.full_name);

    return {
      firstName: firstName ?? (fullName ? fullName.split(' ').slice(0, -1).join(' ') || null : null),
      lastName: lastName ?? (fullName ? fullName.split(' ').slice(-1).join(' ') || null : null),
      email: safeString(c?.email ?? c?.EMAIL ?? c?.emailAddress ?? c?.EMAIL_ADDRESS),
      phone1: safeString(c?.phone1 ?? c?.PHONE1 ?? c?.phone ?? c?.PHONE),
      jobTitle: safeString(c?.contactJobTitle ?? c?.jobTitle ?? c?.JOB_TITLE ?? c?.contactJobTitleName ?? c?.job_title),
      isPrimary: c?.isPrimaryContact === 'Yes' || c?.isPrimaryContact === 'Y' || c?.isPrimaryContact === true || Boolean(c?.isPrimary ?? c?.IS_PRIMARY ?? c?.isPrimaryContact),
    };
  });

  let specs: Record<string, unknown>[] = [];
  const rawSpec = raw?.specification ?? raw?.SPECIFICATION ?? raw?.specifications ?? raw?.SPECIFICATIONS ?? raw?.quoteSpecifications ?? raw?.QUOTE_SPECIFICATIONS;
  if (Array.isArray(rawSpec)) {
    specs = rawSpec;
  } else if (rawSpec && typeof rawSpec === 'object') {
    specs = [rawSpec];
  }

  return {
    ...normalizeItem(raw),
    quoteContacts: contacts,
    quoteSpecifications: specs,
    quoteMessage: parseMessageObject(raw?.quoteMessage ?? raw?.QUOTE_MESSAGE ?? raw?.message ?? raw?.MESSAGE),
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
      typeof data?.count === 'number' ? data.count :
        typeof data?.totalRecords === 'number' ? data.totalRecords :
          items.length;

    const responsePage = typeof data?.page === 'number' ? data.page : page;
    const limitValue = typeof data?.limit === 'number' ? data.limit : limit;
    const totalPages = typeof data?.totalPages === 'number'
      ? data.totalPages
      : Math.max(1, Math.ceil(totalRecords / (limitValue || 1)));

    const convertedCount = typeof data?.convertedCount === 'number' ? data.convertedCount : 0;
    const notConvertedCount = typeof data?.notConvertedCount === 'number' ? data.notConvertedCount : 0;

    return {
      data: items,
      count: items.length,
      totalRecords,
      page: responsePage,
      limit: limitValue,
      totalPages,
      convertedCount,
      notConvertedCount,
    };
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
