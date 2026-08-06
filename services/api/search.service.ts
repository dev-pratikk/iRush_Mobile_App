import { apiClient } from '@lib/api-client';

export interface SearchSuggestionItem {
  type: 'orderNo' | 'companyCode' | 'partNumber';
  value: string;
  label: string;
  sublabel?: string;
}

export const fetchUnifiedSearchSuggestions = async (
  query: string,
  options?: { token?: string | null }
): Promise<SearchSuggestionItem[]> => {
  const trimmed = query.replace(/^#/, '').trim();
  if (!trimmed) return [];

  try {
    const data = await apiClient.get<any>({
      path: '/dashboard/orders',
      query: { search: trimmed, limit: 10 },
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

    const seenKeys = new Set<string>();
    const qLower = trimmed.toLowerCase();

    list.forEach((item: any) => {
      const oNo = String(item.ORDER_NO || item.orderNo || item.ORDER_ID || '').replace(/^#/, '').trim();
      const cName = String(item.COMPANY_NAME || item.companyName || '').trim();
      const cCode = String(item.COMPANY_CODE || item.companyCode || cName).trim();
      const pNo = String(
        item.PCBPARTNO || item.pcbpartNo || item.partNumber || item.orderDetails?.[0]?.PCBPARTNO || ''
      ).trim();

      // 1. Order Number match
      if (oNo && (oNo.toLowerCase().includes(qLower) || qLower.includes(oNo.toLowerCase())) && !seenKeys.has(`orderNo:${oNo}`)) {
        seenKeys.add(`orderNo:${oNo}`);
        results.push({
          type: 'orderNo',
          value: oNo,
          label: oNo,
          sublabel: cName ? `Company: ${cName}` : 'Order Number',
        });
      }

      // 2. Company Name / Code match
      if ((cName.toLowerCase().includes(qLower) || cCode.toLowerCase().includes(qLower)) && !seenKeys.has(`companyCode:${cCode}`)) {
        seenKeys.add(`companyCode:${cCode}`);
        results.push({
          type: 'companyCode',
          value: cCode,
          label: cName || cCode,
          sublabel: cCode ? `Code: ${cCode}` : 'Customer',
        });
      }

      // 3. Part Number match
      if (pNo && pNo.toLowerCase().includes(qLower) && !seenKeys.has(`partNumber:${pNo}`)) {
        seenKeys.add(`partNumber:${pNo}`);
        results.push({
          type: 'partNumber',
          value: pNo,
          label: `Part: ${pNo}`,
          sublabel: oNo ? `Order #${oNo}${cName ? ` · ${cName}` : ''}` : cName,
        });
      }
    });

    return results.slice(0, 8);
  } catch (error) {
    if (__DEV__) {
      console.log('[SearchService] fetchUnifiedSearchSuggestions error/fallback:', error);
    }
    return [];
  }
};

export const fetchOrderSuggestions = async (
  query: string,
  options?: { token?: string | null }
): Promise<SearchSuggestionItem[]> => {
  return fetchUnifiedSearchSuggestions(query, options);
};

export const fetchCustomerSuggestions = async (
  query: string,
  options?: { token?: string | null }
): Promise<SearchSuggestionItem[]> => {
  return fetchUnifiedSearchSuggestions(query, options);
};

export const fetchPartNumberSuggestions = async (
  query: string,
  options?: { token?: string | null }
): Promise<SearchSuggestionItem[]> => {
  return fetchUnifiedSearchSuggestions(query, options);
};
