import { apiClient, ApiClientError } from '@lib/api-client';

export interface SalespersonItem {
  salespersonId: number;
  salespersonName: string;
}

export const FALLBACK_SALESPERSONS: SalespersonItem[] = [
  { salespersonId: 22, salespersonName: 'Imran' },
  { salespersonId: 84, salespersonName: 'jay' },
  { salespersonId: 91, salespersonName: 'Jodi' },
  { salespersonId: 43, salespersonName: 'Mehraj' },
  { salespersonId: 19, salespersonName: 'Ricky' },
  { salespersonId: 129, salespersonName: 'riz' },
  { salespersonId: 34, salespersonName: 'Roy' },
];

export const getSalespersons = async (options?: {
  token?: string | null;
  timeoutMs?: number;
}): Promise<SalespersonItem[]> => {
  try {
    const data = await apiClient.get<SalespersonItem[]>({
      path: '/dashboard/salespersons',
      token: options?.token,
      timeoutMs: options?.timeoutMs ?? 15000,
    });

    if (Array.isArray(data) && data.length > 0) {
      return data.map((s) => ({
        salespersonId: Number(s.salespersonId),
        salespersonName: String(s.salespersonName || '').trim(),
      }));
    }

    return FALLBACK_SALESPERSONS;
  } catch (error) {
    if (__DEV__) {
      console.log('[Salespersons Service] API fallback active:', error);
    }
    return FALLBACK_SALESPERSONS;
  }
};
