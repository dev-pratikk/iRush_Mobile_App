import { useQuery } from '@tanstack/react-query';
import {
  fetchOrderSuggestions,
  fetchCustomerSuggestions,
  fetchPartNumberSuggestions,
  type SearchSuggestionItem,
} from '../services/api/search.service';

export function useSearchSuggestions(query: string, token?: string | null) {
  const trimmed = query.replace(/^#/, '').trim();

  return useQuery<SearchSuggestionItem[]>({
    queryKey: ['search-suggestions', trimmed, token ?? null],
    queryFn: async () => {
      if (!trimmed) return [];

      const isNumeric = /^\d+$/.test(trimmed);
      const isAlpha = /^[a-zA-Z\s]+$/.test(trimmed);

      // 1. If numeric query (e.g. 48 or 48143): fetch order suggestions first
      if (isNumeric) {
        const orderResults = await fetchOrderSuggestions(trimmed, { token });
        if (orderResults.length > 0) return orderResults;
      }

      // 2. If alphabetic query (e.g. RU, RUS1, SanBlaze): fetch customer/company suggestions
      if (isAlpha || trimmed.length <= 4) {
        const customerResults = await fetchCustomerSuggestions(trimmed, { token });
        if (customerResults.length > 0) return customerResults;
      }

      // 3. Otherwise try part number endpoint
      const partResults = await fetchPartNumberSuggestions(trimmed, { token });
      if (partResults.length > 0) return partResults;

      // 4. Fallback: try order and customer endpoints
      const [orders, customers] = await Promise.all([
        fetchOrderSuggestions(trimmed, { token }),
        fetchCustomerSuggestions(trimmed, { token }),
      ]);

      const combined = [...orders, ...customers];
      const uniqueMap = new Map<string, SearchSuggestionItem>();
      combined.forEach((item) => uniqueMap.set(`${item.type}:${item.value}`, item));

      return Array.from(uniqueMap.values()).slice(0, 8);
    },
    enabled: trimmed.length >= 1,
    staleTime: 30 * 1000, // 30 seconds cache
  });
}
