export interface OpenOrderDetail {
  CREATED_BY: number;
  CREATED_DATE: string;
  UPDATED_BY: number;
  UPDATED_DATE: string;
  ORDERD_ID: string;
  ORDER_ID: string;
  QUANTITY: number;
  UNIT_PRICE: number;
  WEB_PRICE: number | null;
  PRICE_INCREASE: number | null;
  FINISH_DATE: string;
  PROMISED_DATE: string;
  DAY: number;
  INVOICED_QTY: number;
  LINE_TOTAL: number;
  CREDIT_ID: number;
  CUSTOMERADDRESSID: number;
  customerMessageTop: string | null;
  customerMessageBottom: string | null;
}

export interface OpenOrderShippingAddress {
  addressText1: string;
  addressText2: string;
  cityName: string;
  stateName: string;
  zipCode: string;
  phone1: string;
  email: string | null;
  salesPersonId: number;
  netTerm: string;
  salesPersonName: string;
}

export interface OpenOrderCustomerContact {
  firstName: string;
  lastName: string;
  email: string;
  phone1: string;
  phone2: string;
}

export interface OpenOrderVendor {
  [key: string]: any;
}

export interface OpenOrderInvoice {
  [key: string]: any;
}

export interface OpenOrderPackingSlip {
  [key: string]: any;
}

export interface OpenOrderItem {
  ORDER_ID: string;
  CUSTOMERID: string;
  QUOTEID: string;
  ORDER_NO: string;
  PO_NO: string;
  ORDER_DATE: string;
  ORDER_TOTALCOST_AF_DISCCHRG: number;
  orderType: string;
  orderedQuantity: number;
  totalInvoicedQty: number;
  totalInvoicedAmount: number;
  totalShippedQtyAmount: number;
  pendingQuantity: number;
  pendingAmount: number;
  paymentsReceived: number;
  pcbpartNo: string;
  orderStatus: string;
  companyName: string;
  companyCode: string;
  quoteId: string;
  quoteNo: string;
  salesPersonId: number;
  salesPersonName: string;
  netTerm: string;
  customerMessageTop: string | null;
  customerMessageBottom: string | null;
  orderDetails: OpenOrderDetail[];
  shippingAddress: OpenOrderShippingAddress;
  customerContact: OpenOrderCustomerContact;
  invoices: OpenOrderInvoice[];
  orderPackingSlips: OpenOrderPackingSlip[];
  orderVendors: OpenOrderVendor[];
}

export interface OpenOrdersResponse {
  totalOpenOrders: number;
  totalOpenOrdersAmount: number;
  totalInvoicedQty: number;
  totalInvoicedAmount: number;
  totalShippedAmount: number;
  totalPendingQty: number;
  totalPendingAmount: number;
  totalPaymentsReceived: number;
  vendorOrderAmount: number;
  pendingOrdersCount: number;
  pendingOrdersAmount: number;
  partialOrdersCount: number;
  partialOrdersAmount: number;
  pendingOrders: OpenOrderItem[];
  partialOrders: OpenOrderItem[];
}
