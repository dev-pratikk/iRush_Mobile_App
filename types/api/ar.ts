export interface ARItem {
  // Standard fields
  INV_NUMBER: string;
  INV_DATE: string | null;
  CompanyCode: string;
  CompanyName: string;
  creditTerm: string;
  ORDER_NO: string;
  ORDER_DATE: string | null;
  InvoiceAmount: number;
  DUE_AMOUNT: number;
  invoiceDays: number;
  creditTermInDays: number;
  overDueDays: number;
  salespersonName: string;
  status: 'dueToday' | 'crossed' | 'future' | string;

  // Search response alternative keys (ar-search API)
  invoiceId?: number;
  invoiceNumber?: string;
  invoiceDate?: string | null;
  companyName?: string;
  companyCode?: string;
}

export interface ARDashboardResponse {
  count?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  totalRecords?: number;
  dueTodayCount: number;
  dueTodayDueTotal: number;
  crossedCount: number;
  crossedDueTotal: number;
  futureDuesCount: number;
  futureDuesDueTotal: number;
  totalInvoiceCount: number;
  totalARDueAmount: number;
  invoices: ARItem[];
}

export type ARStatusTab = 'all' | 'dueToday' | 'crossed' | 'future';
