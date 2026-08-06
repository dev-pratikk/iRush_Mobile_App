import { useQuery } from '@tanstack/react-query';
import {
  fetchUnifiedSearchSuggestions,
  type SearchSuggestionItem,
} from '../services/api/search.service';

export function useSearchSuggestions(query: string, token?: string | null) {
  const trimmed = query.replace(/^#/, '').trim();

  return useQuery<SearchSuggestionItem[]>({
    queryKey: ['search-suggestions', trimmed, token ?? null],
    queryFn: async () => {
      if (!trimmed) return [];
      return fetchUnifiedSearchSuggestions(trimmed, { token });
    },
    enabled: trimmed.length >= 1,
    staleTime: 30 * 1000, // 30 seconds cache
  });
}
