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
