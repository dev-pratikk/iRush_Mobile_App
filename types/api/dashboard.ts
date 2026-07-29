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
