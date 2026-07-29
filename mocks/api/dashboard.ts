import type { DashboardStatsResponse } from '../../types/api/dashboard';

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
