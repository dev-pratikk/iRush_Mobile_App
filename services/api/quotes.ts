export interface QuoteItem {
  quoteNo: string;
  companyName: string;
  quoteType: string;
  layer: string;
  quoteDate: string;
}

export interface QuotesBySalesperson {
  salespersonId: number;
  salespersonName: string;
  quoteCount: number;
  convertedCount: number;
  convertedPct: number;
}

export interface QuotesByServiceType {
  serviceType: string;
  quoteCount: number;
  convertedCount: number;
  convertedPct: number;
}

export interface QuotesToOrdersBySalesperson {
  salespersonId: number;
  salespersonName: string;
  totalOrders: number;
  totalConvertedQuotes: number;
}

export interface QuotesToOrdersByServiceType {
  serviceTypeName: string;
  totalOrders: number;
  totalConvertedQuotes: number;
}

export interface QuotesDashboardResponse {
  quoteCount: number;
  convertedCount: number;
  quotesByNewCustomer: number;
  quotesByExistingCustomer: number;
  totalConvertedQuotesCount: number;
  quotes: QuoteItem[];
  quotesBySalesperson: QuotesBySalesperson[];
  quotesByServiceType: QuotesByServiceType[];
  quotesToOrdersBySalesperson: QuotesToOrdersBySalesperson[];
  quotesToOrdersByServiceType: QuotesToOrdersByServiceType[];
}

const DEFAULT_TIMEOUT_MS = 10000;

export const SAMPLE_QUOTES: QuotesDashboardResponse = {
  quoteCount: 31,
  convertedCount: 6,
  quotesByNewCustomer: 11,
  quotesByExistingCustomer: 20,
  totalConvertedQuotesCount: 14,
  quotes: [
    { quoteNo: 'PCB305522', companyName: 'Anduril', quoteType: 'Full Turnkey', layer: '6', quoteDate: '2026-07-27T04:44:00Z' },
    { quoteNo: 'PCB305523', companyName: 'mechtechvic', quoteType: 'Full Turnkey', layer: '4', quoteDate: '2026-07-27T05:57:00Z' },
    { quoteNo: 'PCB305526', companyName: 'University of Minnesota', quoteType: 'PCB Fab', layer: '4', quoteDate: '2026-07-27T09:18:00Z' },
    { quoteNo: 'PCB305531', companyName: 'Krypton Solutions LLC', quoteType: 'PCB Fab', layer: '4', quoteDate: '2026-07-27T13:14:00Z' },
    { quoteNo: 'PCB305551', companyName: 'Blue Origin, LLC', quoteType: 'PCB Fab', layer: '14', quoteDate: '2026-07-27T19:53:00Z' },
    { quoteNo: 'PCB305552', companyName: 'Lockheed Martin', quoteType: 'Full Turnkey', layer: '10', quoteDate: '2026-07-27T20:11:00Z' },
  ],
  quotesBySalesperson: [
    { salespersonId: 1, salespersonName: 'Imran', quoteCount: 17, convertedCount: 4, convertedPct: 23.5 },
    { salespersonId: 2, salespersonName: 'Mehraj', quoteCount: 6, convertedCount: 2, convertedPct: 33.3 },
    { salespersonId: 3, salespersonName: 'riz', quoteCount: 5, convertedCount: 0, convertedPct: 0 },
    { salespersonId: 4, salespersonName: 'Roy', quoteCount: 2, convertedCount: 0, convertedPct: 0 },
    { salespersonId: 5, salespersonName: 'Ricky', quoteCount: 1, convertedCount: 0, convertedPct: 0 },
  ],
  quotesByServiceType: [
    { serviceType: 'Full Turnkey', quoteCount: 18, convertedCount: 4, convertedPct: 22.2 },
    { serviceType: 'PCB Fab', quoteCount: 13, convertedCount: 2, convertedPct: 15.4 },
  ],
  quotesToOrdersBySalesperson: [
    { salespersonId: 1, salespersonName: 'Imran', totalOrders: 9, totalConvertedQuotes: 9 },
    { salespersonId: 2, salespersonName: 'Mehraj', totalOrders: 5, totalConvertedQuotes: 5 },
  ],
  quotesToOrdersByServiceType: [
    { serviceTypeName: 'Full Turnkey', totalOrders: 10, totalConvertedQuotes: 10 },
    { serviceTypeName: 'PCB Fab', totalOrders: 4, totalConvertedQuotes: 4 },
  ],
};

export const EMPTY_QUOTES: QuotesDashboardResponse = {
  quoteCount: 0,
  convertedCount: 0,
  quotesByNewCustomer: 0,
  quotesByExistingCustomer: 0,
  totalConvertedQuotesCount: 0,
  quotes: [],
  quotesBySalesperson: [],
  quotesByServiceType: [],
  quotesToOrdersBySalesperson: [],
  quotesToOrdersByServiceType: [],
};

const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getDateRangeForPeriod = (
  period: 'today' | 'month'
): { startDate: string; endDate: string } => {
  const now = new Date();
  if (period === 'today') {
    const iso = toISODate(now);
    return { startDate: iso, endDate: iso };
  }
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: toISODate(first), endDate: toISODate(now) };
};

export const getDashboardQuotes = async (
  period: 'today' | 'month',
  options?: { token?: string | null; timeoutMs?: number; customRange?: { startDate: string; endDate: string } }
): Promise<QuotesDashboardResponse> => {
  const baseURL = 'https://proboardv2.rushpcb.com/api/mobile/v1';
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const { startDate, endDate } = options?.customRange ?? getDateRangeForPeriod(period);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (options?.token) headers['Authorization'] = `Bearer ${options.token}`;

    const url = `${baseURL}/dashboard/quotes?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
    const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    if (!response.ok) {
      let detail = '';
      try {
        const errBody = await response.text();
        detail = errBody ? ` — ${errBody.slice(0, 120)}` : '';
      } catch {}
      throw new Error(`Server error ${response.status}${detail}`);
    }
    const data: QuotesDashboardResponse = await response.json();
    if (!data || typeof data !== 'object') throw new Error('Invalid response format');
    if (!Number.isFinite(data.quoteCount)) data.quoteCount = 0;
    if (!Number.isFinite(data.convertedCount)) data.convertedCount = 0;
    if (!Number.isFinite(data.quotesByNewCustomer)) data.quotesByNewCustomer = 0;
    if (!Number.isFinite(data.quotesByExistingCustomer)) data.quotesByExistingCustomer = 0;
    if (!Number.isFinite(data.totalConvertedQuotesCount)) data.totalConvertedQuotesCount = 0;
    if (!Array.isArray(data.quotes)) data.quotes = [];
    if (!Array.isArray(data.quotesBySalesperson)) data.quotesBySalesperson = [];
    if (!Array.isArray(data.quotesByServiceType)) data.quotesByServiceType = [];
    if (!Array.isArray(data.quotesToOrdersBySalesperson)) data.quotesToOrdersBySalesperson = [];
    if (!Array.isArray(data.quotesToOrdersByServiceType)) data.quotesToOrdersByServiceType = [];
    return data;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s — check your connection or VPN`);
    }
    if (error?.message?.includes('Network request failed')) {
      throw new Error('Network error — check internet / VPN / CORS');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const formatCurrency = (amount: number): string => {
  if (amount === null || amount === undefined || isNaN(amount)) amount = 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyWithCents = (amount: number): string => {
  if (amount === null || amount === undefined || isNaN(amount)) amount = 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  if (num === null || num === undefined || isNaN(num)) num = 0;
  return new Intl.NumberFormat('en-US').format(num);
};

export const formatQuoteDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const h24 = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return `${months[d.getMonth()]} ${d.getDate()}, ${h12}:${m} ${ampm}`;
  } catch {
    return iso;
  }
};

export const computeConversionRate = (quoteCount: number, convertedCount: number): number => {
  if (!quoteCount) return 0;
  return Math.round((convertedCount / quoteCount) * 100);
};

export const cleanupName = (raw: string | null | undefined, fallback: string): string => {
  if (raw === null || raw === undefined) return fallback;
  const t = String(raw).trim();
  return t.length === 0 ? fallback : t;
};
