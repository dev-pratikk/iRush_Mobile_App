import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  BackHandler,
  Modal,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { NotificationHeaderButton } from '../../components/navigation/NotificationHeaderButton';
import { useAuthContext } from '../../context/AuthContext';
import { OrderCard } from '../../components/dashboard/OrderCard';
import {
  formatCurrencyWithCents,
  formatNumber,
  formatOrderDate,
  DashboardPeriod as DatePeriod,
  ORDERS_PAGE_LIMIT,
  isOrderNew,
  isOrderRepeat,
  type OrdersSearchType,
  type OrdersSearchParam,
} from '../../services/api/orders.service';
import { useOrders, type OrdersRowItem } from '../../hooks/useOrders';
import { useSalespersons } from '../../hooks/useSalespersons';
import { useSearchSuggestions } from '../../hooks/useSearchSuggestions';
import type { SearchSuggestionItem } from '../../services/api/search.service';
import { PaginationFooter } from '../../components/ui/PaginationFooter';
import { SkeletonRowItem, SkeletonSummaryCard, SkeletonKpiCard } from '../../components/ui/SkeletonLoader';
import { DateFilterPreset, getDateRangeForFilter, formatCustomRangeLabel } from '../../lib/date';
import { DateFilterModal } from '../../components/ui/DateFilterModal';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const PAGE_BG = '#FFFFFF';
const INPUT_BG = '#F5F5F2';

const DEFAULT_SALESPERSONS = ['Imran', 'John', 'Sarah', 'Alex', 'Michael', 'David'];

// ─── Header Component ─────────────────────────────────────────────────────────

const Header = ({
  activePreset,
  customRange,
  onOpenFilter,
}: {
  activePreset: DateFilterPreset;
  customRange?: { startDate: string; endDate: string } | null;
  onOpenFilter: () => void;
}) => {
  const getFilterLabel = () => {
    if (activePreset === 'today') return 'Today';
    if (activePreset === 'week') return 'This Week';
    if (activePreset === 'month') return 'This Month';
    if (activePreset === 'custom' && customRange) {
      return formatCustomRangeLabel(customRange.startDate, customRange.endDate);
    }
    return 'Custom';
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerIconWrap}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/orders'))}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>

      {/* Left Aligned Header Title */}
      <Text style={styles.headerTitleLeft}>All orders</Text>

      {/* Right Controls: Date Filter Button & Bell Icon */}
      <View style={styles.headerRightWrap}>
        <TouchableOpacity
          style={styles.filterBtnPill}
          onPress={onOpenFilter}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={13} color={PRIMARY} />
          <Text style={styles.filterBtnText}>{getFilterLabel()}</Text>
          <Ionicons name="chevron-down" size={12} color={PRIMARY} />
        </TouchableOpacity>

        <NotificationHeaderButton iconColor={PRIMARY} size={20} />
      </View>
    </View>
  );
};

// ─── White KPI Summary Card (Count & Revenue Overview) ──────────────────────

const SummaryOverviewCard = ({
  activePreset,
  customRange,
  totalRecords,
  totalAmount,
  loading,
}: {
  activePreset: DateFilterPreset;
  customRange?: { startDate: string; endDate: string } | null;
  totalRecords: number;
  totalAmount: number;
  loading: boolean;
}) => {
  const periodLabel =
    activePreset === 'today'
      ? 'Today'
      : activePreset === 'week'
      ? 'This week'
      : activePreset === 'month'
      ? 'This month'
      : 'Custom range';

  if (loading && totalRecords === 0) {
    return (
      <View style={styles.summaryCardWrap}>
        <SkeletonKpiCard />
      </View>
    );
  }

  return (
    <View style={styles.summaryCardWrap}>
      <View style={styles.summaryCardWhite}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryColLeft}>
            <Text style={styles.summaryPeriodLabel}>{periodLabel}</Text>
            <Text style={styles.summaryCount}>{formatNumber(totalRecords)}</Text>
          </View>
          <View style={styles.summaryColRight}>
            <Text style={styles.summaryValue}>{formatCurrencyWithCents(totalAmount)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Search Bar & Salesperson Filter Section ──────────────────────────────────
// NOTE: Suggestions dropdown is rendered at screen-level, not here, to avoid
// FlatList clipping the absolute overlay.

const SearchBarSection = ({
  inputText,
  setInputText,
  selectedSalesperson,
  setSelectedSalesperson,
  selectedCategory,
  setSelectedCategory,
  onFocusChange,
  onClear,
}: {
  inputText: string;
  setInputText: (text: string) => void;
  selectedSalesperson: string | null;
  setSelectedSalesperson: (sp: string | null) => void;
  selectedCategory: 'NEW' | 'REPEAT' | null;
  setSelectedCategory: (cat: 'NEW' | 'REPEAT' | null) => void;
  onFocusChange: (focused: boolean) => void;
  onClear: () => void;
}) => {
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;
  const { data: salespersons = [], isLoading } = useSalespersons(token);
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectSalesperson = (sp: string | null) => {
    setSelectedSalesperson(sp);
    setModalVisible(false);
  };

  return (
    <View style={styles.searchSection}>
      <View style={styles.searchRow}>
        {/* Unified Search Input */}
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color={SECONDARY} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={inputText}
            onChangeText={(txt) => {
              setInputText(txt);
              onFocusChange(true);
            }}
            onFocus={() => onFocusChange(true)}
            onBlur={() => {
              setTimeout(() => onFocusChange(false), 200);
            }}
            placeholder="Search by order no or company name…"
            placeholderTextColor={SECONDARY}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {inputText.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                onClear();
                onFocusChange(false);
              }}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color={SECONDARY} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Salesperson Filter Button in Same Row */}
        <TouchableOpacity
          style={[styles.filterButton, !!selectedSalesperson && styles.filterButtonActive]}
          onPress={() => {
            onFocusChange(false);
            setModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="funnel-outline"
            size={14}
            color={selectedSalesperson ? '#FFFFFF' : PRIMARY}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[styles.filterButtonText, !!selectedSalesperson && styles.filterButtonTextActive]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {selectedSalesperson ? selectedSalesperson : 'Filter'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Tabs: All | New Orders | Repeat Orders */}
      <View style={styles.categoryTabRow}>
        <TouchableOpacity
          style={[styles.categoryTabPill, !selectedCategory && styles.categoryTabPillActive]}
          onPress={() => setSelectedCategory(null)}
          activeOpacity={0.75}
        >
          <Text style={[styles.categoryTabText, !selectedCategory && styles.categoryTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.categoryTabPill, selectedCategory === 'NEW' && styles.categoryTabPillActive]}
          onPress={() => setSelectedCategory(selectedCategory === 'NEW' ? null : 'NEW')}
          activeOpacity={0.75}
        >
          <Text style={[styles.categoryTabText, selectedCategory === 'NEW' && styles.categoryTabTextActive]}>
            New Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.categoryTabPill, selectedCategory === 'REPEAT' && styles.categoryTabPillActive]}
          onPress={() => setSelectedCategory(selectedCategory === 'REPEAT' ? null : 'REPEAT')}
          activeOpacity={0.75}
        >
          <Text style={[styles.categoryTabText, selectedCategory === 'REPEAT' && styles.categoryTabTextActive]}>
            Repeat Orders
          </Text>
        </TouchableOpacity>
      </View>

      {/* Salesperson Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Salesperson</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.modalItem, !selectedSalesperson && styles.modalItemActive]}
                onPress={() => handleSelectSalesperson(null)}
              >
                <Text style={[styles.modalItemText, !selectedSalesperson && styles.modalItemTextActive]}>
                  All Salespersons (No filter)
                </Text>
                {!selectedSalesperson && <Ionicons name="checkmark" size={18} color={PRIMARY} />}
              </TouchableOpacity>

              {isLoading ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                </View>
              ) : (
                salespersons.map((sp) => {
                  const spName = sp.salespersonName;
                  const isActive = selectedSalesperson === spName;
                  return (
                    <TouchableOpacity
                      key={sp.salespersonId}
                      style={[styles.modalItem, isActive && styles.modalItemActive]}
                      onPress={() => handleSelectSalesperson(spName)}
                    >
                      <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                        {spName}
                      </Text>
                      {isActive && <Ionicons name="checkmark" size={18} color={PRIMARY} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Order Row Component ──────────────────────────────────────────────────────

const OrderRow = React.memo(function OrderRow({ item }: { item: OrdersRowItem }) {
  return (
    <OrderCard
      orderNo={item.orderNo}
      companyName={item.companyName}
      orderType={item.orderTypeName}
      orderTotal={item.orderTotal}
      orderDate={item.orderDate || item.updatedDate}
      daysLeft={item.daysLeft}
      assignedVendorCount={item.assignedVendorCount}
      expectedVendorCount={item.expectedVendorCount}
      orderCost={item.orderCost}
      markup={item.markup}
      markupPercentage={item.markupPercentage}
      customerStatus={(item as any).CUSTOMER_STATUS || (item as any).customerStatus}
      orderCategory={(item as any).ORDER_CATEGORY || item.orderCategory}
      onPress={() =>
        router.push({
          pathname: '/order-details' as any,
          params: {
            orderId: String((item as any).ORDER_ID || item.id || (item as any).ORDERD_ID || ''),
            orderData: JSON.stringify(item),
            from: '/all-orders',
          },
        })
      }
    />
  );
});

// ─── Empty States ─────────────────────────────────────────────────────────────

const DefaultEmptyState = ({ activePreset, usingSample }: { activePreset: DateFilterPreset; usingSample: boolean }) => {
  const title =
    activePreset === 'today'
      ? 'No orders today'
      : activePreset === 'week'
      ? 'No orders this week'
      : activePreset === 'month'
      ? 'No orders this month'
      : 'No orders for selected range';
  return (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={36} color={SECONDARY} />
      <Text style={styles.emptyTitle}>{usingSample ? 'Demo — ' + title : title}</Text>
      <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
    </View>
  );
};

const SearchEmptyState = ({
  query,
  type,
  onClear,
}: {
  query: string;
  type: OrdersSearchType;
  onClear: () => void;
}) => {
  const typeLabel =
    type === 'orderNo' ? 'Order No' : type === 'companyName' ? 'Company' : 'Salesperson';
  return (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={38} color={SECONDARY} />
      <Text style={styles.emptyTitle}>No matching orders</Text>
      <Text style={styles.emptySubtitle}>
        No results found for "{query}" in {typeLabel}
      </Text>
      <TouchableOpacity style={styles.clearSearchBtn} onPress={onClear} activeOpacity={0.8}>
        <Text style={styles.clearSearchBtnText}>Clear search</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Main Screen Component ────────────────────────────────────────────────────

export default function AllOrdersScreen() {
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;
  const params = useLocalSearchParams<{
    period?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }>();

  const getPresetFromParam = useCallback((p?: string): DateFilterPreset => {
    if (p === 'month' || p === 'week' || p === 'today' || p === 'custom') {
      return p as DateFilterPreset;
    }
    return 'today';
  }, []);

  const [activePreset, setActivePreset] = useState<DateFilterPreset>(
    getPresetFromParam(params.period)
  );
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | null>(
    params.startDate && params.endDate ? { startDate: params.startDate, endDate: params.endDate } : null
  );
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<'NEW' | 'REPEAT' | null>(
    params.category ? (params.category.toUpperCase() as 'NEW' | 'REPEAT') : null
  );

  useEffect(() => {
    if (params.category) {
      setSelectedCategory(params.category.toUpperCase() as 'NEW' | 'REPEAT');
    }
  }, [params.category]);

  useEffect(() => {
    if (params.period) {
      const p = getPresetFromParam(params.period);
      setActivePreset(p);
      if (p === 'custom' && params.startDate && params.endDate) {
        setCustomRange({ startDate: params.startDate, endDate: params.endDate });
      } else if (p !== 'custom') {
        setCustomRange(null);
      }
    }
  }, [params.period, params.startDate, params.endDate, getPresetFromParam]);

  const [inputText, setInputText] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SearchSuggestionItem | null>(null);

  const { data: searchSuggestions = [] } = useSearchSuggestions(debouncedValue, token);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(inputText);
    }, 350);
    return () => clearTimeout(handler);
  }, [inputText]);

  const handleClearSearch = useCallback(() => {
    setInputText('');
    setDebouncedValue('');
    setSelectedSalesperson(null);
    setSelectedCategory(null);
    setSelectedSuggestion(null);
    setCurrentPage(1);
  }, []);

  const searchParam = useMemo((): OrdersSearchParam | null => {
    if (selectedSalesperson) {
      return { type: 'salesperson', value: selectedSalesperson };
    }
    if (selectedSuggestion) {
      return { type: selectedSuggestion.type, value: selectedSuggestion.value };
    }
    const trimmed = debouncedValue.trim();
    if (!trimmed) return null;
    const isNumeric = /^\d+$/.test(trimmed);
    const detectedType: OrdersSearchType = isNumeric ? 'orderNo' : 'companyName';
    return { type: detectedType, value: trimmed };
  }, [debouncedValue, selectedSalesperson, selectedSuggestion]);

  const calculatedRange = useMemo(
    () => getDateRangeForFilter(activePreset, customRange),
    [activePreset, customRange]
  );

  const apiPeriod: DatePeriod = activePreset === 'today' ? 'today' : 'month';

  // Fetch orders from custom hook
  const {
    items,
    rawPages,
    meta,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefreshing,
  } = useOrders(apiPeriod, token, searchParam, calculatedRange, selectedCategory);

  useFocusEffect(
    useCallback(() => {
      setInputText('');
      setDebouncedValue('');
      setSelectedSalesperson(null);
      setSelectedCategory(params.category ? (params.category.toUpperCase() as 'NEW' | 'REPEAT') : null);

      const p = getPresetFromParam(params.period);
      setActivePreset(p);
      if (params.startDate && params.endDate) {
        setCustomRange({ startDate: params.startDate, endDate: params.endDate });
      } else if (p !== 'custom') {
        setCustomRange(null);
      }

      setFilterModalVisible(false);
      setCurrentPage(1);
      refetch();
    }, [params.period, params.category, params.startDate, params.endDate, getPresetFromParam, refetch])
  );

  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/orders');
      }
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const allFilteredItems = useMemo(() => {
    let filtered = items;

    if (selectedCategory) {
      if (selectedCategory === 'NEW') {
        filtered = filtered.filter((it: any) => isOrderNew(it));
      } else if (selectedCategory === 'REPEAT') {
        filtered = filtered.filter((it: any) => isOrderRepeat(it));
      }
    }

    if (selectedSalesperson) {
      const spLower = selectedSalesperson.toLowerCase();
      filtered = filtered.filter(
        (it: any) => (it.salespersonName || it.salesPersonName || '').toLowerCase() === spLower
      );
    }

    const query = debouncedValue.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((it: any) => {
        const cName = (it.companyName || it.COMPANY_NAME || '').toLowerCase();
        const oNo = String(it.orderNo || it.ORDER_NO || '').toLowerCase();
        const pNo = String(
          it.pcbpartNo ||
          it.PCBPARTNO ||
          it.partNo ||
          it.PARTNO ||
          it.partNumber ||
          it.PARTNUMBER ||
          it.orderDetails?.[0]?.PCBPARTNO ||
          it.orderDetails?.[0]?.PARTNO ||
          it.orderDetails?.[0]?.pcbpartNo ||
          ''
        ).toLowerCase();
        return cName.includes(query) || oNo.includes(query) || pNo.includes(query);
      });
    }

    return filtered;
  }, [items, selectedCategory, selectedSalesperson, debouncedValue]);

  const hasActiveFilter = !!(selectedCategory || selectedSalesperson || debouncedValue.trim());

  const totalAmountCalculated = useMemo(() => {
    if (selectedCategory === 'NEW') {
      const backendAmt = (meta?.newOrdersAmount as number | undefined) ?? (meta?.newOrderValue as number | undefined);
      if (typeof backendAmt === 'number' && backendAmt > 0) return backendAmt;
    }
    if (selectedCategory === 'REPEAT') {
      const backendAmt = (meta?.repeatedOrdersAmount as number | undefined) ?? (meta?.repeatedOrderValue as number | undefined);
      if (typeof backendAmt === 'number' && backendAmt > 0) return backendAmt;
    }
    if (!hasActiveFilter && meta?.totalAmount && meta.totalAmount > 0) return meta.totalAmount;
    return allFilteredItems.reduce((acc, it) => acc + (it.orderTotal || (it as any).ORDER_TOTAL || 0), 0);
  }, [meta, selectedCategory, hasActiveFilter, allFilteredItems]);

  const summaryCount = useMemo(() => {
    if (selectedCategory === 'NEW') {
      const backendCount =
        (meta?.totalRecords as number | undefined) ??
        (meta?.count as number | undefined) ??
        (meta?.newOrdersCount as number | undefined);
      if (typeof backendCount === 'number' && backendCount >= 0) {
        return backendCount;
      }
    }
    if (selectedCategory === 'REPEAT') {
      const backendCount =
        (meta?.totalRecords as number | undefined) ??
        (meta?.count as number | undefined) ??
        (meta?.repeatedOrdersCount as number | undefined);
      if (typeof backendCount === 'number' && backendCount >= 0) {
        return backendCount;
      }
    }

    if (!hasActiveFilter) {
      return (meta?.count as number | undefined) ?? (meta?.totalRecords as number | undefined) ?? items.length;
    }
    return allFilteredItems.length;
  }, [meta, selectedCategory, hasActiveFilter, items.length, allFilteredItems.length]);

  const availableSalespersons = useMemo(() => {
    const fromItems = items
      .map((it: any) => it.salespersonName || it.salesPersonName)
      .filter((n: any) => typeof n === 'string' && n.trim().length > 0);
    const combined = Array.from(new Set([...DEFAULT_SALESPERSONS, ...fromItems]));
    return combined.sort();
  }, [items]);

  // Pagination Cursor
  const [currentPage, setCurrentPage] = useState(1);
  const pendingAdvanceRef = useRef(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [activePreset, customRange, searchParam, selectedCategory]);

  useEffect(() => {
    if (pendingAdvanceRef.current && !isFetchingNextPage) {
      pendingAdvanceRef.current = false;
      setCurrentPage((p) => p + 1);
    }
  }, [isFetchingNextPage]);

  useEffect(() => {
    if (isRefreshing) {
      pendingAdvanceRef.current = false;
      setCurrentPage(1);
    }
  }, [isRefreshing]);

  const LIMIT = ORDERS_PAGE_LIMIT;
  const totalRecords = summaryCount;
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / LIMIT) : Math.max(1, rawPages.length);

  const displayItems = useMemo(() => {
    return allFilteredItems.slice((currentPage - 1) * LIMIT, currentPage * LIMIT);
  }, [allFilteredItems, currentPage, LIMIT]);

  const usingSample = isError && items.length === 0;
  const errorMessage = useMemo(
    () => (isError ? (error as Error | null)?.message ?? 'Failed to load orders' : null),
    [isError, error]
  );

  const handlePrev = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    const nextPage = currentPage + 1;
    const alreadyLoaded = nextPage <= rawPages.length;

    if (alreadyLoaded) {
      setCurrentPage(nextPage);
    } else if (hasNextPage && !isFetchingNextPage) {
      pendingAdvanceRef.current = true;
      fetchNextPage();
    }
  }, [currentPage, rawPages.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: OrdersRowItem }) => <OrderRow item={item} />,
    []
  );

  const keyExtractor = useCallback((item: OrdersRowItem) => item.id, []);
  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  // Available suggestions based on raw items
  const availableSuggestions = useMemo(() => {
    const companySet = new Set<string>();
    const orderSet = new Set<string>();
    const list: { text: string; type: 'company' | 'orderNo' }[] = [];

    const decodeHtml = (str: string | null | undefined): string => {
      if (!str) return '';
      return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    };

    items.forEach((it: any) => {
      const rawCompany = it.companyName || it.COMPANY_NAME || it.company_name || it.company;
      if (rawCompany && typeof rawCompany === 'string') {
        const cleanCompany = decodeHtml(rawCompany);
        if (cleanCompany && cleanCompany !== 'N/A' && !companySet.has(cleanCompany.toLowerCase())) {
          companySet.add(cleanCompany.toLowerCase());
          list.push({ text: cleanCompany, type: 'company' });
        }
      }

      const rawOrderNo = it.orderNo || it.ORDER_NO || it.order_no;
      if (rawOrderNo) {
        const cleanOrderNo = String(rawOrderNo).replace(/^#/, '').trim();
        if (cleanOrderNo && cleanOrderNo !== 'N/A' && !orderSet.has(cleanOrderNo.toLowerCase())) {
          orderSet.add(cleanOrderNo.toLowerCase());
          list.push({ text: cleanOrderNo, type: 'orderNo' });
        }
      }
    });

    return list;
  }, [items]);

  // Compute live suggestions at screen level
  const screenSuggestions = useMemo(() => {
    const query = inputText.trim().toLowerCase();
    if (!query || !showSuggestions) return [];
    const uniqueMap = new Map<string, { text: string; type: 'company' | 'orderNo' }>();
    availableSuggestions.forEach((item) => {
      if (item.text.toLowerCase().includes(query) && !uniqueMap.has(item.text.toLowerCase())) {
        uniqueMap.set(item.text.toLowerCase(), item);
      }
    });
    return Array.from(uniqueMap.values()).slice(0, 5);
  }, [inputText, showSuggestions, availableSuggestions]);

  const ListHeader = useMemo(
    () => (
      <View style={{ paddingTop: 12 }}>
        <SummaryOverviewCard
          activePreset={activePreset}
          customRange={customRange}
          totalRecords={totalRecords}
          totalAmount={totalAmountCalculated}
          loading={isLoading}
        />
        <SearchBarSection
          inputText={inputText}
          setInputText={setInputText}
          selectedSalesperson={selectedSalesperson}
          setSelectedSalesperson={setSelectedSalesperson}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          onFocusChange={setShowSuggestions}
          onClear={handleClearSearch}
        />
        {errorMessage ? (
          <TouchableOpacity style={styles.errorRow} onPress={() => refetch()} activeOpacity={0.8}>
            <Ionicons name="warning-outline" size={16} color="#8A1C1C" />
            <Text style={styles.errorRowText}>{errorMessage} — tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.listDivider} />
      </View>
    ),
    [
      activePreset,
      customRange,
      totalRecords,
      totalAmountCalculated,
      isLoading,
      inputText,
      selectedSalesperson,
      availableSalespersons,
      errorMessage,
      refetch,
      handleClearSearch,
    ]
  );

  const handleApplyFilter = (
    preset: DateFilterPreset,
    range: { startDate: string; endDate: string } | null
  ) => {
    setActivePreset(preset);
    setCustomRange(range);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        activePreset={activePreset}
        customRange={customRange}
        onOpenFilter={() => setFilterModalVisible(true)}
      />

      {/* Screen-level suggestions overlay — rendered OUTSIDE FlatList to avoid clipping */}
      {showSuggestions && searchSuggestions.length > 0 ? (
        <View style={styles.suggestionsOverlay} pointerEvents="box-none">
          {searchSuggestions.map((sug, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.suggestionRow,
                idx === searchSuggestions.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => {
                setInputText(sug.label);
                setSelectedSuggestion(sug);
                setShowSuggestions(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  sug.type === 'orderNo'
                    ? 'document-text-outline'
                    : sug.type === 'companyCode'
                    ? 'business-outline'
                    : 'cube-outline'
                }
                size={16}
                color={SECONDARY}
                style={{ marginRight: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionText} numberOfLines={1}>
                  {sug.label}
                </Text>
                {sug.sublabel ? (
                  <Text style={styles.suggestionSublabel} numberOfLines={1}>
                    {sug.sublabel}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.suggestionTypeTag}>
                {sug.type === 'orderNo' ? 'Order #' : sug.type === 'companyCode' ? 'Company' : 'Part #'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* Main Content Area: FlatList + Fixed Bottom PaginationFooter */}
      <View style={styles.mainContainer}>
        <FlatList
          data={displayItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            isLoading ? (
              <View style={{ paddingTop: 4 }}>
                <SkeletonRowItem />
                <SkeletonRowItem />
                <SkeletonRowItem />
                <SkeletonRowItem />
                <SkeletonRowItem />
              </View>
            ) : selectedSalesperson || debouncedValue.trim().length > 0 ? (
              <SearchEmptyState
                query={selectedSalesperson || debouncedValue.trim()}
                type={selectedSalesperson ? 'salesperson' : /[a-zA-Z]/.test(debouncedValue.trim()) ? 'companyName' : 'orderNo'}
                onClear={handleClearSearch}
              />
            ) : (
              <DefaultEmptyState activePreset={activePreset} usingSample={usingSample} />
            )
          }
          ItemSeparatorComponent={ItemSeparator}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flatlistContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => refetch()}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        />

        {/* Pinned Bottom Pagination Footer */}
        <PaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          isFetchingNextPage={isFetchingNextPage}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </View>

      <DateFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        activePreset={activePreset}
        customRange={customRange}
        onApply={handleApplyFilter}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  mainContainer: { flex: 1, justifyContent: 'space-between' },
  flatlistContent: { paddingBottom: 16, flexGrow: 1 },

  // Header
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: PAGE_BG,
    borderBottomWidth: hairline,
    borderBottomColor: '#E7E6E2',
  },
  headerIconWrap: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerIconInner: { position: 'relative', width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitleLeft: {
    fontSize: 19,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
    color: PRIMARY,
    marginLeft: 4,
    flex: 1,
  },
  headerRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  filterBtnText: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  headerPillRow: {
    flexDirection: 'row',
    backgroundColor: INPUT_BG,
    borderRadius: 16,
    padding: 2,
  },
  headerPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  headerPillActive: {
    backgroundColor: PRIMARY,
  },
  headerPillText: {
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  headerPillTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.headingSemiBold,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: Typography.headingSemiBold },

  // Search Section
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.body,
    color: PRIMARY,
    height: '100%',
  },
  clearButton: { padding: 4 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    minWidth: 80,
  },
  filterButtonActive: {
    backgroundColor: PRIMARY,
  },
  filterButtonText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: PRIMARY,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.headingSemiBold,
  },

  categoryTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  categoryTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F5F5F2',
    borderWidth: 1,
    borderColor: '#E7E6E2',
  },
  categoryTabPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryTabText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.headingSemiBold,
  },

  // Summary Overview Card (Light Grey / Dark Box Above Search)
  summaryCardWrap: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  summaryCardWhite: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E6E2',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryColLeft: { gap: 4 },
  summaryPeriodLabel: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: '#8C94A0',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryCount: {
    fontSize: 26,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryColRight: { alignItems: 'flex-end', justifyContent: 'center' },
  summaryValue: {
    fontSize: 22,
    fontFamily: Typography.numberHeavy,
    fontWeight: '700',
    color: '#0F172A',
  },

  suggestionsContainer: {
    // Kept for reference but no longer used (overlay moved to screen level)
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E7E6E2',
    elevation: 12,
    zIndex: 99999,
    overflow: 'hidden',
  },
  suggestionsOverlay: {
    position: 'absolute',
    top: 204, // below SafeAreaView header (~54px) + summary card (~106px) + search bar row (~44px)
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 99999,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: hairline,
    borderBottomColor: '#E7E6E2',
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  suggestionSublabel: {
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
    marginTop: 1,
  },
  suggestionTypeTag: {
    fontSize: 10,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
    backgroundColor: '#F5F5F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  activeSalespersonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F4F8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  salespersonChipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  salespersonChipText: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: PRIMARY,
  },
  changeSalespersonBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  changeSalespersonBtnText: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    color: '#FFFFFF',
  },
  clearSalespersonBtn: { padding: 2 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E6E2',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  modalList: {
    paddingHorizontal: 20,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: hairline,
    borderBottomColor: '#E7E6E2',
  },
  modalItemActive: {
    backgroundColor: '#F8FAFC',
  },
  modalItemText: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: PRIMARY,
  },
  modalItemTextActive: {
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },

  // Row items
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLeftCol: { flex: 1, paddingRight: 12, gap: 2 },
  rowRightCol: { alignItems: 'flex-end', gap: 2 },
  orderNoText: { fontSize: 14, fontFamily: Typography.headingSemiBold, color: PRIMARY },
  companyText: { fontSize: 13, fontFamily: Typography.body, color: SECONDARY },
  orderTypeText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: SECONDARY },
  amountText: { fontSize: 14, fontFamily: Typography.headingSemiBold, color: PRIMARY },
  dateText: { fontSize: 12, fontFamily: Typography.body, color: SECONDARY },
  salespersonText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: SECONDARY },

  separator: { height: 0 },
  listDivider: { height: 1, backgroundColor: '#E7E6E2' },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#FDF2F2',
    borderRadius: 6,
  },
  errorRowText: { fontSize: 12, color: '#8A1C1C', flex: 1 },

  loadingWrap: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, fontFamily: Typography.body, color: SECONDARY },

  emptyState: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: Typography.headingSemiBold, color: PRIMARY },
  emptySubtitle: { fontSize: 13, fontFamily: Typography.body, color: SECONDARY },
  clearSearchBtn: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: PRIMARY, borderRadius: 8 },
  clearSearchBtnText: { color: '#FFFFFF', fontSize: 13, fontFamily: Typography.headingSemiBold },
});
