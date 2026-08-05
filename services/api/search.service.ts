import { apiClient } from '@lib/api-client';

export interface SearchSuggestionItem {
  type: 'orderNo' | 'companyCode' | 'partNumber';
  value: string;
  label: string;
  sublabel?: string;
}

export const fetchOrderSuggestions = async (
  query: string,
  options?: { token?: string | null }
): Promise<SearchSuggestionItem[]> => {
  const trimmed = query.replace(/^#/, '').trim();
  if (!trimmed) return [];

  try {
    const data = await apiClient.get<any>({
      path: `/dashboard/orders/${encodeURIComponent(trimmed)}`,
      token: options?.token,
      timeoutMs: 10000,
    });

    const results: SearchSuggestionItem[] = [];
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.orders)
      ? data.orders
      : data && typeof data === 'object'
      ? [data]
      : [];

    list.forEach((item: any) => {
      const oNo = String(item.ORDER_NO || item.orderNo || item.ORDER_ID || '').replace(/^#/, '').trim();
      const cName = String(item.COMPANY_NAME || item.companyName || '').trim();
      if (oNo) {
        results.push({
          type: 'orderNo',
          value: oNo,
          label: oNo,
          sublabel: cName ? `Company: ${cName}` : 'Order Number',
        });
      }
    });

    return results.slice(0, 8);
  } catch (error) {
    if (__DEV__) {
      console.log('[SearchService] fetchOrderSuggestions error/fallback:', error);
    }
    return [];
  }
};

export const fetchCustomerSuggestions = async (
  query: string,
  options?: { token?: string | null }
): Promise<SearchSuggestionItem[]> => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const data = await apiClient.get<any>({
      path: `/dashboard/customers/${encodeURIComponent(trimmed)}`,
      token: options?.token,
      timeoutMs: 10000,
    });

    const results: SearchSuggestionItem[] = [];
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.customers)
      ? data.customers
      : data && typeof data === 'object'
      ? [data]
      : [];

    list.forEach((item: any) => {
      const cCode = String(item.COMPANY_CODE || item.companyCode || item.COMPANY_NAME || item.companyName || '').trim();
      const cName = String(item.COMPANY_NAME || item.companyName || cCode).trim();
      if (cCode || cName) {
        results.push({
          type: 'companyCode',
          value: cCode || cName,
          label: cName,
          sublabel: cCode ? `Code: ${cCode}` : 'Customer',
        });
      }
    });

    return results.slice(0, 8);
  } catch (error) {
    if (__DEV__) {
      console.log('[SearchService] fetchCustomerSuggestions error/fallback:', error);
    }
    return [];
  }
};

export const fetchPartNumberSuggestions = async (
  query: string,
  options?: { token?: string | null }
): Promise<SearchSuggestionItem[]> => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const data = await apiClient.get<any>({
      path: `/dashboard/partnumbers/${encodeURIComponent(trimmed)}`,
      token: options?.token,
      timeoutMs: 10000,
    });

    const results: SearchSuggestionItem[] = [];
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.orders)
      ? data.orders
      : data && typeof data === 'object'
      ? [data]
      : [];

    list.forEach((item: any) => {
      const pNo = String(item.PCBPARTNO || item.pcbpartNo || item.partNumber || '').trim();
      const oNo = String(item.ORDER_NO || item.orderNo || '').replace(/^#/, '').trim();
      const cName = String(item.COMPANY_NAME || item.companyName || '').trim();
      if (pNo || oNo) {
        results.push({
          type: 'partNumber',
          value: pNo || oNo,
          label: pNo ? `Part: ${pNo}` : `Order #${oNo}`,
          sublabel: oNo ? `Order #${oNo}${cName ? ` · ${cName}` : ''}` : cName,
        });
      }
    });

    return results.slice(0, 8);
  } catch (error) {
    if (__DEV__) {
      console.log('[SearchService] fetchPartNumberSuggestions error/fallback:', error);
    }
    return [];
  }
};
