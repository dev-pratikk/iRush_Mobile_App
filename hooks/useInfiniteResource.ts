import { useInfiniteQuery, QueryKey } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface PaginatedResult<T> {
  page: number;
  limit: number;
  totalRecords: number;
  data: T[];
  [key: string]: any;
}

export interface UseInfiniteResourceOptions<TRaw, TMapped> {
  queryKey: QueryKey;
  fetcher: (pageParam: number) => Promise<PaginatedResult<TRaw>>;
  mapItem: (raw: TRaw) => TMapped;
  enabled?: boolean;
}

/**
 * Generic reusable hook for paginated resources in React Query.
 * - Fetches page 1 on mount
 * - Exposes hasNextPage / fetchNextPage for FlatList's onEndReached
 * - Works identically for small datasets (today) and large ones (month)
 * - Automatically stops when the backend indicates all records are fetched
 */
export function useInfiniteResource<TRaw, TMapped>({
  queryKey,
  fetcher,
  mapItem,
  enabled = true,
}: UseInfiniteResourceOptions<TRaw, TMapped>) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) => fetcher(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // No data at all → stop
      if (!lastPage?.data?.length) return undefined;

      // Case 1: Non-paginated backend.
      // Backend ignores page/limit and returns the full dataset every time.
      // Detected when the items returned equals (or exceeds) the total count.
      if (lastPage.data.length >= lastPage.totalRecords) return undefined;

      // Case 2: Real pagination — partial last page means we're at the end.
      // e.g. limit=50 but backend returned 37 items → no more pages.
      if (lastPage.data.length < lastPage.limit) return undefined;

      // Case 3: All accumulated items already cover totalRecords.
      // Guards against edge cases where earlier checks don't catch the boundary.
      const totalFetched = allPages.reduce((sum, p) => sum + (p.data?.length ?? 0), 0);
      if (totalFetched >= lastPage.totalRecords) return undefined;

      // There are genuinely more pages to fetch
      return lastPage.page + 1;
    },
    enabled,
  });

  const rawPages = query.data?.pages ?? [];

  // Strip down raw records to only the card display fields for UI components
  const items = useMemo(() => {
    return rawPages.flatMap((page) => (page.data || []).map(mapItem));
  }, [rawPages, mapItem]);

  // Extract top-level metadata from page 1 (e.g. totalAmount, summary stats)
  const meta = useMemo(() => {
    if (rawPages.length === 0) return null;
    const { data, ...rest } = rawPages[0];
    return rest;
  }, [rawPages]);

  return {
    items,
    meta,
    rawPages,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    isRefreshing: query.isRefetching && !query.isFetchingNextPage,
  };
}
