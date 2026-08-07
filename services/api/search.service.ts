import { apiClient } from '@lib/api-client';
import { fetchOrdersByFastSearch } from './orders.service';

export interface SearchSuggestionItem {
  type: 'orderNo' | 'companyCode' | 'partNumber';
  value: string;
  label: string;
  sublabel?: string;
  orderId?: number | string;
  orderData?: any;
}

export const fetchUnifiedSearchSuggestions = async (
  query: string,
  options?: { token?: string | null }
): Promise<SearchSuggestionItem[]> => {
  const trimmed = query.replace(/^#/, '').trim();
  if (!trimmed) return [];

  try {
    const list = await fetchOrdersByFastSearch(trimmed, options);

    const results: SearchSuggestionItem[] = [];
    const seenKeys = new Set<string>();
    const qLower = trimmed.toLowerCase();

    list.forEach((item: any) => {
      const orderId = item.ORDER_ID || item.orderId || item.ORDERD_ID || item.id;
      const oNo = String(item.ORDER_NO || item.orderNo || orderId || '').replace(/^#/, '').trim();
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
          orderId,
          orderData: item,
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
          orderId,
          orderData: item,
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
          orderId,
          orderData: item,
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
