export interface OrderItem {
  ORDER_ID: number;
  ORDER_NO: string;
  COMPANY_NAME: string;
  COMPANY_CODE: string;
  ORDER_DATE: string;
  UPDATED_DATE: string;
  ORDER_TYPE_NAME: string;
  CUSTOMERID: number;
  ORDER_TOTAL: number;
  ORDER_CATEGORY: string;
  ORDER_STATUS: string;
  QUOTE_ID: number | null;
  QUOTE_NO: string | null;
  QUOTE_DATE: string | null;
  SALESPERSON_NAME: string;
  CUSTOMER_STATUS: string;
}

export interface OrdersListResponse {
  count: number;
  totalAmount: number;
  orders: OrderItem[];
}

const DEFAULT_TIMEOUT_MS = 10000;

export const EMPTY_ORDERS: OrdersListResponse = {
  count: 0,
  totalAmount: 0,
  orders: [],
};

export const SAMPLE_ORDERS: OrdersListResponse = {
  count: 16,
  totalAmount: 67006.42,
  orders: [
    {
      ORDER_ID: 1,
      ORDER_NO: '483069',
      COMPANY_NAME: 'Ecolab Inc.',
      COMPANY_CODE: '',
      ORDER_DATE: '2026-07-27',
      UPDATED_DATE: '2026-07-27',
      ORDER_TYPE_NAME: 'Full Turnkey',
      CUSTOMERID: 0,
      ORDER_TOTAL: 7905,
      ORDER_CATEGORY: '',
      ORDER_STATUS: '',
      QUOTE_ID: null,
      QUOTE_NO: null,
      QUOTE_DATE: null,
      SALESPERSON_NAME: 'Mehraj',
      CUSTOMER_STATUS: '',
    },
    {
      ORDER_ID: 2,
      ORDER_NO: '483068',
      COMPANY_NAME: 'Precision Neuroscience',
      COMPANY_CODE: '',
      ORDER_DATE: '2026-07-23',
      UPDATED_DATE: '2026-07-23',
      ORDER_TYPE_NAME: 'PCB Assembly',
      CUSTOMERID: 0,
      ORDER_TOTAL: 4400,
      ORDER_CATEGORY: '',
      ORDER_STATUS: '',
      QUOTE_ID: null,
      QUOTE_NO: null,
      QUOTE_DATE: null,
      SALESPERSON_NAME: 'Mehraj',
      CUSTOMER_STATUS: '',
    },
    {
      ORDER_ID: 3,
      ORDER_NO: '483067',
      COMPANY_NAME: 'Inkspace Imaging',
      COMPANY_CODE: '',
      ORDER_DATE: '2026-07-27',
      UPDATED_DATE: '2026-07-27',
      ORDER_TYPE_NAME: 'PCB Fab',
      CUSTOMERID: 0,
      ORDER_TOTAL: 431.84,
      ORDER_CATEGORY: '',
      ORDER_STATUS: '',
      QUOTE_ID: null,
      QUOTE_NO: null,
      QUOTE_DATE: null,
      SALESPERSON_NAME: 'Imran',
      CUSTOMER_STATUS: '',
    },
    {
      ORDER_ID: 4,
      ORDER_NO: '483064',
      COMPANY_NAME: 'Truman Robotics',
      COMPANY_CODE: '',
      ORDER_DATE: '2026-07-27',
      UPDATED_DATE: '2026-07-27',
      ORDER_TYPE_NAME: 'Full Turnkey',
      CUSTOMERID: 0,
      ORDER_TOTAL: 3108.39,
      ORDER_CATEGORY: '',
      ORDER_STATUS: '',
      QUOTE_ID: null,
      QUOTE_NO: null,
      QUOTE_DATE: null,
      SALESPERSON_NAME: 'Mehraj',
      CUSTOMER_STATUS: '',
    },
    {
      ORDER_ID: 5,
      ORDER_NO: '483058',
      COMPANY_NAME: 'Teledyne Gavia',
      COMPANY_CODE: '',
      ORDER_DATE: '2026-07-23',
      UPDATED_DATE: '2026-07-23',
      ORDER_TYPE_NAME: 'Full Turnkey',
      CUSTOMERID: 0,
      ORDER_TOTAL: 8950,
      ORDER_CATEGORY: '',
      ORDER_STATUS: '',
      QUOTE_ID: null,
      QUOTE_NO: null,
      QUOTE_DATE: null,
      SALESPERSON_NAME: 'Imran',
      CUSTOMER_STATUS: '',
    },
  ],
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
  return {
    startDate: toISODate(first),
    endDate: toISODate(now),
  };
};

export const getDashboardOrders = async (
  period: 'today' | 'month',
  options?: { token?: string | null; timeoutMs?: number; customRange?: { startDate: string; endDate: string } }
): Promise<OrdersListResponse> => {
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

    if (options?.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const url = `${baseURL}/dashboard/orders?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = await response.text();
        detail = errBody ? ` — ${errBody.slice(0, 120)}` : '';
      } catch {}
      throw new Error(`Server error ${response.status}${detail}`);
    }

    const data: OrdersListResponse = await response.json();

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format');
    }
    if (!Number.isFinite(data.count)) data.count = 0;
    if (!Number.isFinite(data.totalAmount)) data.totalAmount = 0;
    if (!Array.isArray(data.orders)) data.orders = [];

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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

export const formatOrderDate = (isoDate: string | null | undefined): string => {
  if (!isoDate) return '';
  try {
    const [y, m, d] = isoDate.split('-');
    if (!y || !m || !d) return isoDate;
    return `${m}-${d}-${y.slice(2)}`;
  } catch {
    return isoDate;
  }
};
