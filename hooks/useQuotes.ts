import { useQuery } from '@tanstack/react-query';
import { getDashboardQuotes } from '../services/api/quotes.service';
import type { DashboardPeriod, QuotesDashboardResponse } from '../services/api/quotes.service';

/**
 * useQuotes — React Query wrapper for the quotes dashboard aggregate.
 *
 * Quotes is NOT a paginated list: the endpoint returns a single aggregate
 * response (quoteCount, convertedCount, breakdown arrays, etc.). We use
 * `useQuery` (not `useInfiniteQuery`) because there's nothing to page through.
 *
 * Returns:
 *  - data: QuotesDashboardResponse | undefined
 *  - isLoading, isError, error, refetch, isRefetching
 */
export function useQuotes(
  period: DashboardPeriod,
  token: string | null | undefined
) {
  return useQuery<QuotesDashboardResponse, Error>({
    queryKey: ['quotes', period, token ?? null],
    queryFn: () => getDashboardQuotes(period, { token: token ?? null }),
    staleTime: 1000 * 60 * 5, // 5 min — same as global default, explicit for clarity
  });
}
