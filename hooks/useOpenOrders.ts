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
import type { OpenOrderItem, PendingOrdersSummary, PartialOrdersSummary } from '../types/api/open-orders';

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
  daysLeft: number;           // positive = days remaining, negative = days late
}

const mapOpenOrderItem = (raw: OpenOrderItem): OpenOrderRowItem => {
  const vendors = extractVendorCount(raw);
  const company =
    trimStr(raw.companyName) ||
    trimStr((raw as any).company_name) ||
    trimStr((raw as any).COMPANY_NAME) ||
    trimStr((raw as any).company) ||
    trimStr((raw as any).customerName) ||
    trimStr((raw as any).CUSTOMERNAME) ||
    trimStr(raw.companyCode) ||
    'N/A';

  const orderNo =
    trimStr(raw.ORDER_NO) ||
    trimStr((raw as any).order_no) ||
    trimStr((raw as any).ORDER_NUMBER) ||
    trimStr(raw.ORDER_ID) ||
    'N/A';

  return {
    ...raw,
    id: String(raw.ORDER_ID ?? raw.ORDER_NO ?? Math.random()),
    orderNo,
    companyName: company,
    orderDate: extractOrderDate(raw.ORDER_DATE || (raw as any).order_date || (raw as any).ORDERDATE),
    orderTotal: Number.isFinite(raw.ORDER_TOTALCOST_AF_DISCCHRG)
      ? raw.ORDER_TOTALCOST_AF_DISCCHRG
      : Number.isFinite((raw as any).totalAmount)
      ? (raw as any).totalAmount
      : Number.isFinite((raw as any).ORDER_TOTAL)
      ? (raw as any).ORDER_TOTAL
      : 0,
    pendingAmount: Number.isFinite(raw.pendingAmount)
      ? raw.pendingAmount
      : Number.isFinite((raw as any).pending_amount)
      ? (raw as any).pending_amount
      : 0,
    orderType: trimStr(raw.orderType || (raw as any).order_type || (raw as any).ORDER_TYPE_NAME),
    orderStatus: trimStr(raw.orderStatus || (raw as any).order_status || (raw as any).ORDER_STATUS),
    vendorCount: vendors.total,
    vendorCompletedCount: vendors.completed,
    daysLeft: extractDaysLeft(raw),
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
