import { useCallback } from 'react';
import { useInfiniteResource } from './useInfiniteResource';
import { fetchOrdersPage, type DashboardPeriod, type OrdersSearchParam } from '../services/api/orders.service';
import type { OrderItem } from '../types/api/orders';

export interface OrdersRowItem {
  id: string;
  orderNo: string;
  companyName: string;
  orderDate: string;
  updatedDate: string;
  orderTypeName: string;
  salespersonName: string;
  orderTotal: number;
  orderStatus: string;
  orderCategory: string;
}

const mapOrderItem = (raw: OrderItem): OrdersRowItem => ({
  id: String(raw.ORDER_ID ?? raw.ORDER_NO),
  orderNo: String(raw.ORDER_NO ?? ''),
  companyName: String(raw.COMPANY_NAME ?? ''),
  orderDate: raw.ORDER_DATE ?? '',
  updatedDate: raw.UPDATED_DATE ?? '',
  orderTypeName: (raw.ORDER_TYPE_NAME ?? '').trim(),
  salespersonName: (raw.SALESPERSON_NAME ?? '').trim(),
  orderTotal: Number.isFinite(raw.ORDER_TOTAL) ? raw.ORDER_TOTAL : 0,
  orderStatus: raw.ORDER_STATUS ?? '',
  orderCategory: raw.ORDER_CATEGORY ?? '',
});

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
  search?: OrdersSearchParam | null
) {
  const searchValue = search?.value?.trim() ?? '';
  const searchType = search?.type ?? 'orderNo';

  const fetcher = useCallback(
    (page: number) =>
      fetchOrdersPage(period, {
        token: token ?? null,
        page,
        search: searchValue ? { type: searchType, value: searchValue } : null,
      }),
    [period, token, searchType, searchValue]
  );

  return useInfiniteResource<OrderItem, OrdersRowItem>({
    queryKey: ['orders', period, token ?? null, searchType, searchValue],
    fetcher,
    mapItem: mapOrderItem,
  });
}
