import type {
  OpenOrderDetail,
  OpenOrderShippingAddress,
  OpenOrderCustomerContact,
  OpenOrderInvoice,
  OpenOrderPackingSlip,
  OpenOrderVendor,
} from './open-orders';

export interface OrderItem {
  ORDER_ID: number | string;
  ORDER_NO: string;
  COMPANY_NAME: string;
  COMPANY_CODE: string;
  ORDER_DATE: string;
  UPDATED_DATE: string;
  ORDER_TYPE_NAME: string;
  CUSTOMERID: number | string;
  ORDER_TOTAL: number;
  ORDER_COST?: number;
  MARKUP?: number;
  MARKUP_PERCENTAGE?: number;
  ORDER_CATEGORY: string;
  ORDER_STATUS: string;
  QUOTE_ID?: number | string | null;
  QUOTE_NO?: string | null;
  QUOTE_DATE?: string | null;
  SALESPERSON_NAME: string;
  CUSTOMER_STATUS?: string;
  vendorFulfillment?: string;
  assignedVendorCount?: number;
  expectedVendorCount?: number;
  orderDetails?: OpenOrderDetail[];
  shippingAddress?: OpenOrderShippingAddress;
  customerContact?: OpenOrderCustomerContact;
  invoices?: OpenOrderInvoice[];
  orderPackingSlips?: OpenOrderPackingSlip[];
  orderVendors?: OpenOrderVendor[];
  [key: string]: any;
}

export interface OrdersListResponse {
  type?: string;
  count: number;
  totalAmount: number;
  totalOrderCost?: number;
  totalMarkup?: number;
  overallMarkupPercentage?: number;
  newOrdersCount?: number;
  repeatedOrdersCount?: number;
  newOrdersAmount?: number;
  repeatedOrdersAmount?: number;
  newQuotesCount?: number;
  repeatedQuotesCount?: number;
  totalQuotesCount?: number;
  noVendorCount?: number;
  partialVendorCount?: number;
  fullySourcedCount?: number;
  orders: OrderItem[];
}
