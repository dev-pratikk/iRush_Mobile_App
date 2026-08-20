import { useCallback } from 'react';
import { useInfiniteResource } from './useInfiniteResource';
import { fetchOrdersPage, type DashboardPeriod, type OrdersSearchParam } from '../services/api/orders.service';
import type { OrderItem } from '../types/api/orders';

export interface OrdersRowItem extends OrderItem {
  id: string;
  orderNo: string;
  companyName: string;
  orderDate: string;
  updatedDate: string;
  orderTypeName: string;
  salespersonName: string;
  orderTotal: number;
  orderCost: number;
  markup: number;
  markupPercentage: number;
  assignedVendorCount: number;
  expectedVendorCount: number;
  daysLeft: number;
  orderStatus: string;
  orderCategory: string;
}

const mapOrderItem = (raw: OrderItem): OrdersRowItem => {
  const detail = raw.orderDetails && raw.orderDetails.length > 0 ? raw.orderDetails[0] : null;

  const promisedDate =
    detail?.PROMISED_DATE || detail?.promisedDate || detail?.FINISH_DATE || detail?.finishDate ||
    (raw as any)?.PROMISED_DATE || (raw as any)?.promisedDate ||
    (raw as any)?.FINISH_DATE || (raw as any)?.finishDate ||
    null;
  const orderDate = raw.ORDER_DATE || raw.orderDate || (raw as any)?.ORDERDATE || null;

  let daysLeft = 0;
  if (promisedDate && orderDate) {
    const start = new Date(orderDate);
    const end = new Date(promisedDate);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (Number.isFinite(diffDays)) {
        daysLeft = diffDays;
      }
    }
  }

  if (daysLeft === 0 && detail && typeof detail.DAY === 'number' && detail.DAY > 0) {
    daysLeft = detail.DAY;
  }

  const assignedVendors = typeof raw.assignedVendorCount === 'number'
    ? raw.assignedVendorCount
    : (Array.isArray(raw.orderVendors) ? raw.orderVendors.length : 0);

  const expectedVendors = typeof raw.expectedVendorCount === 'number'
    ? raw.expectedVendorCount
    : 1;

  const orderTotal = Number.isFinite(raw.ORDER_TOTAL)
    ? raw.ORDER_TOTAL!
    : Number.isFinite(raw.ORDER_TOTALCOST_AF_DISCCHRG)
    ? raw.ORDER_TOTALCOST_AF_DISCCHRG!
    : (Number.isFinite(raw.orderTotal) ? raw.orderTotal! : 0);

  const orderCost = Number.isFinite(raw.ORDER_COST)
    ? raw.ORDER_COST!
    : (Number.isFinite(raw.orderCost) ? raw.orderCost! : 0);

  const markup = Number.isFinite(raw.MARKUP)
    ? raw.MARKUP!
    : (Number.isFinite(raw.markup) ? raw.markup! : orderTotal - orderCost);

  const markupPercentage = Number.isFinite(raw.MARKUP_PERCENTAGE)
    ? raw.MARKUP_PERCENTAGE!
    : (orderCost > 0 ? Math.round((markup / orderCost) * 100) : 100);

  return {
    ...raw,
    id: String(raw.ORDER_ID ?? raw.ORDER_NO ?? Math.random()),
    orderNo: String(raw.ORDER_NO ?? raw.orderNo ?? ''),
    companyName: String(raw.COMPANY_NAME ?? raw.companyName ?? ''),
    orderDate: raw.ORDER_DATE ?? raw.orderDate ?? '',
    updatedDate: raw.UPDATED_DATE ?? raw.updatedDate ?? '',
    orderTypeName: (raw.ORDER_TYPE_NAME ?? raw.orderTypeName ?? raw.orderType ?? '').trim(),
    salespersonName: (
      raw.SALESPERSON_NAME ??
      raw.salesPersonName ??   // new endpoint: capital P
      raw.salespersonName ??
      raw.shippingAddress?.salesPersonName ??
      ''
    ).trim(),
    orderTotal,
    orderCost,
    markup,
    markupPercentage,
    assignedVendorCount: assignedVendors,
    expectedVendorCount: expectedVendors,
    daysLeft,
    orderStatus: raw.ORDER_STATUS ?? raw.orderStatus ?? '',
    orderCategory: raw.ORDER_CATEGORY ?? raw.orderCategory ?? '',
  };
};

/**
 * Wrapper around useInfiniteResource for the Orders list.
 *
 * Returns:
 *  - items: OrdersRowItem[] — flattened, mapped, ready for FlatList
 *  - meta: { count, totalAmount } — from page 1 of the response (reflecting search filters)
 *  - isLoading, isError, error, isFetchingNextPage, hasNextPage,
 *    fetchNextPage, refetch, isRefreshing
 */
export function useOrders(
  period: DashboardPeriod,
  token: string | null | undefined,
  search?: OrdersSearchParam | null,
  customRange?: { startDate: string; endDate: string } | null,
  orderCategory?: 'NEW' | 'REPEAT' | 'new' | 'repeated' | string | null
) {
  const searchValue = search?.value?.trim() ?? '';
  const searchType = search?.type ?? 'orderNo';
  const startISO = customRange?.startDate ?? '';
  const endISO = customRange?.endDate ?? '';
  const categoryParam = orderCategory ? String(orderCategory).trim() : '';

  const fetcher = useCallback(
    (page: number) =>
      fetchOrdersPage(period, {
        token: token ?? null,
        page,
        search: searchValue ? { type: searchType, value: searchValue } : null,
        customRange: startISO && endISO ? { startDate: startISO, endDate: endISO } : null,
        orderCategory: categoryParam || null,
      }),
    [period, token, searchType, searchValue, startISO, endISO, categoryParam]
  );

  return useInfiniteResource<OrderItem, OrdersRowItem>({
    queryKey: ['orders', period, token ?? null, searchType, searchValue, startISO, endISO, categoryParam],
    fetcher,
    mapItem: mapOrderItem,
  });
}
