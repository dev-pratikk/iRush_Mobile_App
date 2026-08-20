import { useCallback } from 'react';
import { useInfiniteResource } from './useInfiniteResource';
import {
  fetchOpenOrdersPage,
  extractOrderDate,
  extractDaysLeft,
  extractVendorCount,
  trimStr,
  type OpenOrderSearchParam,
} from '../services/api/open-orders.service';
import type {
  OpenOrderItem,
  PendingOrdersSummary,
  PartialOrdersSummary,
  OpenOrdersSummary,
} from '../types/api/open-orders';

// ─── Mapped row type (only what the list card needs) ──────────────────────────
// Raw OpenOrderItem carries heavy nested objects (orderVendors, invoices,
// orderPackingSlips, customerContact, shippingAddress). We strip all of that
// and pass only primitive display fields into the FlatList.

export interface OpenOrderRowItem extends OpenOrderItem {
  id: string;
  orderNo: string;
  companyName: string;
  orderDate: string;      // already formatted ISO date string
  orderTotal: number;
  pendingAmount: number;
  orderType: string;
  orderStatus: string;
  vendorCount: number;        // total vendors assigned
  vendorCompletedCount: number; // vendors with 'complete' status
  assignedVendorCount: number;
  expectedVendorCount: number;
  daysLeft: number;           // positive = days remaining, negative = days late
  orderCost: number;
  markup: number;
  markupPercentage: number;
}

const mapOpenOrderItem = (raw: OpenOrderItem): OpenOrderRowItem => {
  const vendors = extractVendorCount(raw);
  const company =
    trimStr(raw.companyName) ||
    trimStr((raw as any).COMPANY_NAME) ||
    trimStr((raw as any).company_name) ||
    trimStr((raw as any).company) ||
    trimStr((raw as any).customerName) ||
    trimStr((raw as any).CUSTOMERNAME) ||
    trimStr(raw.companyCode) ||
    'N/A';

  const orderNo =
    trimStr(raw.ORDER_NO) ||
    trimStr((raw as any).orderNo) ||
    trimStr((raw as any).order_no) ||
    trimStr((raw as any).ORDER_NUMBER) ||
    trimStr(raw.ORDER_ID) ||
    'N/A';

  const assignedVendorCount = typeof (raw as any).assignedVendorCount === 'number'
    ? (raw as any).assignedVendorCount
    : vendors.completed;

  const expectedVendorCount = typeof (raw as any).expectedVendorCount === 'number'
    ? (raw as any).expectedVendorCount
    : (vendors.total > 0 ? vendors.total : 1);

  const orderTotal = Number.isFinite(raw.ORDER_TOTALCOST_AF_DISCCHRG)
    ? raw.ORDER_TOTALCOST_AF_DISCCHRG
    : Number.isFinite((raw as any).ORDER_TOTAL)
    ? (raw as any).ORDER_TOTAL
    : Number.isFinite((raw as any).totalAmount)
    ? (raw as any).totalAmount
    : 0;

  const orderCost = Number.isFinite((raw as any).ORDER_COST)
    ? (raw as any).ORDER_COST
    : Number.isFinite((raw as any).orderCost)
    ? (raw as any).orderCost
    : 0;

  const markup = Number.isFinite((raw as any).MARKUP)
    ? (raw as any).MARKUP
    : Number.isFinite((raw as any).markup)
    ? (raw as any).markup
    : orderTotal - orderCost;

  const markupPercentage = Number.isFinite((raw as any).MARKUP_PERCENTAGE)
    ? (raw as any).MARKUP_PERCENTAGE
    : (orderCost > 0 ? Math.round((markup / orderCost) * 100) : 100);

  return {
    ...raw,
    id: String(raw.ORDER_ID ?? raw.ORDER_NO ?? Math.random()),
    orderNo,
    companyName: company,
    orderDate: extractOrderDate(raw.ORDER_DATE || (raw as any).order_date || (raw as any).ORDERDATE),
    orderTotal,
    pendingAmount: Number.isFinite(raw.pendingAmount)
      ? raw.pendingAmount
      : Number.isFinite((raw as any).pending_amount)
      ? (raw as any).pending_amount
      : 0,
    orderType: trimStr(raw.orderType || (raw as any).ORDER_TYPE_NAME || (raw as any).order_type),
    orderStatus: trimStr(raw.orderStatus || (raw as any).ORDER_STATUS || (raw as any).order_status),
    vendorCount: vendors.total,
    vendorCompletedCount: vendors.completed,
    assignedVendorCount,
    expectedVendorCount,
    daysLeft: extractDaysLeft(raw),
    orderCost,
    markup,
    markupPercentage,
  };
};

// ─── Individual hooks per filter ───────────────────────────────────────────────

/**
 * usePendingOrders — infinite scroll hook for ?filter=pending
 *
 * Returns:
 *  - items: OpenOrderRowItem[] — mapped, ready for FlatList
 *  - summary: PendingOrdersSummary | null — KPI totals from page 1 meta
 *  - isLoading, isError, error, isFetchingNextPage, hasNextPage,
 *    fetchNextPage, refetch, isRefreshing
 */
export function usePendingOrders(
  token: string | null | undefined,
  search?: OpenOrderSearchParam | null,
  customRange?: { startDate: string; endDate: string } | null
) {
  const searchValue = search?.value?.trim() ?? '';
  const searchType = search?.type ?? 'orderNo';
  const startISO = customRange?.startDate ?? '';
  const endISO = customRange?.endDate ?? '';

  const fetcher = useCallback(
    (page: number) =>
      fetchOpenOrdersPage('pending', {
        token: token ?? null,
        page,
        search: searchValue ? { type: searchType, value: searchValue } : null,
        customRange: startISO && endISO ? { startDate: startISO, endDate: endISO } : null,
      }),
    [token, searchType, searchValue, startISO, endISO]
  );

  const result = useInfiniteResource<OpenOrderItem, OpenOrderRowItem>({
    queryKey: ['open-orders', 'pending', token ?? null, searchType, searchValue, startISO, endISO],
    fetcher,
    mapItem: mapOpenOrderItem,
  });

  // Extract the summary from page 1 metadata
  const summary: PendingOrdersSummary | null = (result.meta?.pendingOrdersSummary as PendingOrdersSummary) ?? null;

  return { ...result, summary };
}

/**
 * usePartialOrders — infinite scroll hook for ?filter=partial
 */
export function usePartialOrders(
  token: string | null | undefined,
  search?: OpenOrderSearchParam | null,
  customRange?: { startDate: string; endDate: string } | null
) {
  const searchValue = search?.value?.trim() ?? '';
  const searchType = search?.type ?? 'orderNo';
  const startISO = customRange?.startDate ?? '';
  const endISO = customRange?.endDate ?? '';

  const fetcher = useCallback(
    (page: number) =>
      fetchOpenOrdersPage('partial', {
        token: token ?? null,
        page,
        search: searchValue ? { type: searchType, value: searchValue } : null,
        customRange: startISO && endISO ? { startDate: startISO, endDate: endISO } : null,
      }),
    [token, searchType, searchValue, startISO, endISO]
  );

  const result = useInfiniteResource<OpenOrderItem, OpenOrderRowItem>({
    queryKey: ['open-orders', 'partial', token ?? null, searchType, searchValue, startISO, endISO],
    fetcher,
    mapItem: mapOpenOrderItem,
  });

  // Extract the summary from page 1 metadata
  const summary: PartialOrdersSummary | null = (result.meta?.partialOrdersSummary as PartialOrdersSummary) ?? null;

  return { ...result, summary };
}

/**
 * useOpenOrders — infinite scroll hook for ?filter=all (all open orders: pending + partial combined)
 */
export function useOpenOrders(
  token: string | null | undefined,
  search?: OpenOrderSearchParam | null,
  customRange?: { startDate: string; endDate: string } | null
) {
  const searchValue = search?.value?.trim() ?? '';
  const searchType = search?.type ?? 'orderNo';
  const startISO = customRange?.startDate ?? '';
  const endISO = customRange?.endDate ?? '';

  const fetcher = useCallback(
    (page: number) =>
      fetchOpenOrdersPage('all', {
        token: token ?? null,
        page,
        search: searchValue ? { type: searchType, value: searchValue } : null,
        customRange: startISO && endISO ? { startDate: startISO, endDate: endISO } : null,
      }),
    [token, searchType, searchValue, startISO, endISO]
  );

  const result = useInfiniteResource<OpenOrderItem, OpenOrderRowItem>({
    queryKey: ['open-orders', 'all', token ?? null, searchType, searchValue, startISO, endISO],
    fetcher,
    mapItem: mapOpenOrderItem,
  });

  // Extract the summary from page 1 metadata
  const summary: OpenOrdersSummary | null = (result.meta?.openOrdersSummary as OpenOrdersSummary) ?? null;

  return { ...result, summary };
}
