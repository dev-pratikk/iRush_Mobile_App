import type { QuotesDashboardResponse } from '../../types/api/quotes';

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
