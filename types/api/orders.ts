import type {
  OpenOrderDetail,
  OpenOrderShippingAddress,
  OpenOrderCustomerContact,
  OpenOrderInvoice,
  OpenOrderPackingSlip,
  OpenOrderVendor,
} from './open-orders';

export interface OrderSpecification {
  ORDER_SPECID?: string;
  ORDER_ID?: string;
  REV?: string | number;
  PCBPARTNO?: string;
  ITAR?: number | string;
  OrderTypeId?: number;
  OrderType?: string;
  BoardSize?: string;
  PanelSize?: string;
  NoOfHoles?: number;
  NoOfSmdPads?: number;
  MaskSide?: string | null;
  Layer?: string | number;
  IpcClass?: string;
  Milling?: string;
  MaskColor?: string;
  SilkscreenColor?: string;
  NoOfGoldFingers?: number;
  CutoutSlots?: number;
  Routing?: string;
  SilkscreenSides?: string | null;
  Testing?: string;
  ControlledDelecric?: string;
  CounterBoreHoles?: string;
  CounterSinkHole?: string;
  Material?: string;
  Thickness?: string;
  InnerCopper?: string | null;
  OuterCopper?: string;
  ControlledImpedence?: string;
  PlatedEdges?: string;
  Rohs?: string;
  castelledHoles?: string | null;
  viaInPad?: string | null;
  MicroVias?: string | null;
  SolderPluggedVias?: string | null;
  BlindOrBuriedVias?: string;
  NonConductiveFill?: string | null;
  EproxyFill?: string | null;
  BoardPerPanel?: string | number;
  Plating?: string;
  ApproxHoles?: number;
  SmallestHoles?: string;
  MinTrace?: string;
  MinSpace?: string;
  SmdPitch?: string;
  SmdSided?: string;
  ViaFills?: string;
  MaskTented?: string;
  TOOLING?: string | null;
  ELECTRICTESTING?: string | null;
  STENCIL_CHARGE?: number | null;
  SETUP_CHARGE?: number | null;
  PROG_CHARGE?: number | null;
  LEFTOVERSTOCK?: number | null;
  ORDERCONTACTID?: number;
  ORDERFOLLOWUP?: number;
  [key: string]: any;
}

export interface OrderItem {
  // ─── Old UPPER_SNAKE endpoint fields ──────────────────────────────────────────
  ORDER_ID: number | string;
  ORDER_NO?: string;
  COMPANY_NAME?: string;
  COMPANY_CODE?: string;
  ORDER_DATE?: string;
  UPDATED_DATE?: string;
  ORDER_TYPE_NAME?: string;
  CUSTOMERID?: number | string;
  SALESPERSON_ID?: number;
  SALESPERSON_NAME?: string;
  CUSTOMER_STATUS?: string;
  ORDER_TOTAL?: number;
  ORDER_TOTALCOST_AF_DISCCHRG?: number;   // new /orders/:id endpoint total key
  ORDER_COST?: number;
  MARKUP?: number;
  MARKUP_PERCENTAGE?: number;
  ORDER_CATEGORY?: string;
  ORDER_STATUS?: string;
  ORDER_REPEATOF?: number;                 // 0 = new customer, >0 = repeat
  QUOTE_ID?: number | string | null;
  QUOTE_NO?: string | null;
  QUOTE_DATE?: string | null;
  QUOTEID?: string | null;

  // ─── New camelCase endpoint fields (/dashboard/orders/:id) ────────────────────
  orderNo?: string;
  companyName?: string;
  companyCode?: string;
  orderDate?: string;
  updatedDate?: string;
  orderType?: string;
  orderStatus?: string;
  salesPersonId?: number;
  salesPersonName?: string;    // capital P — from new endpoint
  salespersonName?: string;    // lowercase p — alternate fallback
  orderTotal?: number;
  quoteId?: string | number | null;
  quoteNo?: string | null;
  PO_NO?: string;

  // ─── Shared fields (both endpoints) ───────────────────────────────────────────
  netTerm?: string;
  orderedQuantity?: number;
  totalInvoicedQty?: number;
  totalInvoicedAmount?: number;
  totalShippedQtyAmount?: number;
  pendingQuantity?: number;
  pendingAmount?: number;
  paymentsReceived?: number;
  pcbpartNo?: string;
  vendorFulfillment?: string;
  assignedVendorCount?: number;
  expectedVendorCount?: number;
  customerMessageTop?: string | null;
  customerMessageBottom?: string | null;
  orderDetails?: OpenOrderDetail[];
  orderSpecifications?: OrderSpecification[];
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
  newOrderValue?: number;
  repeatedOrdersCount?: number;
  repeatedOrderValue?: number;
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
