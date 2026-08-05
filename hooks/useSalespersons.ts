import { useQuery } from '@tanstack/react-query';
import { getSalespersons, type SalespersonItem } from '../services/api/salespersons.service';

export function useSalespersons(token?: string | null) {
  return useQuery<SalespersonItem[]>({
    queryKey: ['salespersons', token ?? null],
    queryFn: () => getSalespersons({ token }),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}
