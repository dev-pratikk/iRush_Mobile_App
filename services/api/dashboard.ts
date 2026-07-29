export interface DashboardStatsPeriod {
  revenue: number;
  orders: number;
  quotes: number;
  newCustomers: number;
  invoices: number;
}

export interface DashboardStatsResponse {
  
  today: DashboardStatsPeriod;
  month: DashboardStatsPeriod;
}

const DEFAULT_TIMEOUT_MS = 10000;

export const EMPTY_STATS: DashboardStatsResponse = {
  today: { revenue: 0, orders: 0, quotes: 0, newCustomers: 0, invoices: 0 },
  month: { revenue: 0, orders: 0, quotes: 0, newCustomers: 0, invoices: 0 },
};

export const SAMPLE_STATS: DashboardStatsResponse = {
  today: { revenue: 0, orders: 0, quotes: 0, newCustomers: 0, invoices: 0 },
  month: {
    revenue: 2021471.29,
    orders: 289,
    quotes: 543,
    newCustomers: 42,
    invoices: 316,
  },
};

export const getDashboardStats = async (
  options?: { token?: string | null; timeoutMs?: number }
): Promise<DashboardStatsResponse> => {
  const baseURL = 'https://proboardv2.rushpcb.com/api/mobile/v1';
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

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

    const response = await fetch(`${baseURL}/dashboard/stats`, {
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

    const data: DashboardStatsResponse = await response.json();

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format');
    }
    if (!data.today) data.today = { ...EMPTY_STATS.today };
    if (!data.month) data.month = { ...EMPTY_STATS.month };

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

export const formatNumber = (num: number): string => {
  if (num === null || num === undefined || isNaN(num)) num = 0;
  return new Intl.NumberFormat('en-US').format(num);
};
