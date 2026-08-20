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
  notConvertedCount?: number;
  quotesByNewCustomer: number;
  quotesByExistingCustomer: number;
  totalConvertedQuotesCount: number;
  quotes: QuoteItem[];
  quotesBySalesperson: QuotesBySalesperson[];
  quotesByServiceType: QuotesByServiceType[];
  quotesToOrdersBySalesperson: QuotesToOrdersBySalesperson[];
  quotesToOrdersByServiceType: QuotesToOrdersByServiceType[];
}
