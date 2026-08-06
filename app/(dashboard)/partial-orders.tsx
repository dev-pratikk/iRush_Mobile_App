import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  BackHandler,
  Modal,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { useAuthContext } from '../../context/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import { OrderCard } from '../../components/dashboard/OrderCard';
import { formatCurrencyWithCents, formatNumber, formatOrderDate } from '../../services/api/orders.service';
import {
  SAMPLE_OPEN_ORDERS,
  OPEN_ORDERS_PAGE_LIMIT,
  type OpenOrderSearchType,
  type OpenOrderSearchParam,
} from '../../services/api/open-orders.service';
import { usePartialOrders, type OpenOrderRowItem } from '../../hooks/useOpenOrders';
import { useSalespersons } from '../../hooks/useSalespersons';
import { useSearchSuggestions } from '../../hooks/useSearchSuggestions';
import type { SearchSuggestionItem } from '../../services/api/search.service';
import { PaginationFooter } from '../../components/ui/PaginationFooter';
import type { PartialOrdersSummary } from '../../types/api/open-orders';
import { SkeletonRowItem, SkeletonSummaryCard } from '../../components/ui/SkeletonLoader';

import { DateFilterPreset, getDateRangeForFilter, formatCustomRangeLabel } from '../../lib/date';
import { DateFilterModal } from '../../components/ui/DateFilterModal';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const PAGE_BG = '#FFFFFF';
const SUMMARY_CARD_TEXT = '#FFFFFF';
const GREEN = '#27500A';
const AMBER = '#8A5A00';
const RED = '#8A1C1C';
const INPUT_BG = '#F5F5F2';

const DEFAULT_SALESPERSONS = ['Imran', 'John', 'Sarah', 'Alex', 'Michael', 'David'];

const getDaysColor = (days: number): string => {
  if (days < 0) return RED;
  if (days <= 3) return AMBER;
  return GREEN;
};

// ─── Header ──────────────────────────────────────────────────────────────────

const Header = () => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerIconWrap}
        onPress={() => router.push('/open-orders' as any)}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>

      {/* Centered Title */}
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitleCenter}>Partial orders</Text>
      </View>

      <View style={styles.headerRightWrap}>
        {/* Notification Bell */}
        <TouchableOpacity
          style={styles.headerIconInner}
          onPress={() => router.push('/notifications' as any)}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        >
          <Ionicons name="notifications-outline" size={20} color={PRIMARY} />
          <View style={styles.badge} pointerEvents="none">
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Detailed Summary Breakdown Card ──────────────────────────────────────────

const SummaryBreakdownCard = ({
  summary,
  loading,
  usingSample,
}: {
  summary: PartialOrdersSummary | null;
  loading: boolean;
  usingSample: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);

  if (loading && !summary) {
    return <SkeletonSummaryCard />;
  }

  const count = summary?.totalOrders ?? SAMPLE_OPEN_ORDERS.partialOrdersCount;
  const amount = summary?.totalOrderedAmount ?? SAMPLE_OPEN_ORDERS.partialOrdersAmount;

  const statRows = [
    { label: 'No of Orders', value: formatNumber(count) },
    { label: 'Total Partial Order Value', value: formatCurrencyWithCents(amount) },
    { label: 'Orders Assigned To Vendors', value: formatNumber(summary?.ordersWithVendorCount ?? 0) },
    {
      label: 'Assigned Vendor Order Value',
      value: formatCurrencyWithCents(summary?.ordersWithVendorAmount ?? summary?.vendorOrderAmount ?? 0),
    },
    { label: 'Orders Without Vendor Assignment', value: formatNumber(summary?.ordersWithoutVendorCount ?? 0) },
    { label: 'Shipped Order Quantity Value', value: formatCurrencyWithCents(summary?.totalShippedAmount ?? 0) },
    { label: 'Pending Order Quantity Value', value: formatCurrencyWithCents(summary?.totalPendingAmount ?? 0) },
    { label: 'Invoiced Order Quantity Value', value: formatCurrencyWithCents(summary?.totalInvoicedAmount ?? 0) },
    { label: 'Payment Received', value: formatCurrencyWithCents(summary?.totalPaymentsReceived ?? 0) },
    { label: 'Advance Payment Received', value: formatCurrencyWithCents(summary?.advancePaymentReceived ?? 0) },
  ];

  return (
    <View style={styles.breakdownCard}>
      <TouchableOpacity
        style={styles.breakdownHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.85}
      >
        <View style={styles.breakdownTitleRow}>
          <Text style={styles.breakdownTitle}>Partial Orders Summary</Text>
          <Text style={styles.breakdownSubtitle}>
            {formatNumber(count)} orders · {formatCurrencyWithCents(amount)}
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.breakdownContent}>
          {statRows.map((row, index) => (
            <View
              key={index}
              style={[styles.breakdownRow, index < statRows.length - 1 && styles.breakdownRowBorder]}
            >
              <Text style={styles.breakdownRowLabel}>{row.label}</Text>
              <Text style={styles.breakdownRowValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Search Bar & Salesperson Filter Section ──────────────────────────────────

const SearchBarSection = ({
  inputText,
  setInputText,
  selectedSalesperson,
  setSelectedSalesperson,
  onFocusChange,
  onClear,
}: {
  inputText: string;
  setInputText: (text: string) => void;
  selectedSalesperson: string | null;
  setSelectedSalesperson: (sp: string | null) => void;
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
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color={SECONDARY} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={inputText}
            onChangeText={(txt) => { setInputText(txt); onFocusChange(true); }}
            onFocus={() => onFocusChange(true)}
            onBlur={() => { setTimeout(() => onFocusChange(false), 200); }}
            placeholder="Search by order no or company name…"
            placeholderTextColor={SECONDARY}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {inputText.length > 0 ? (
            <TouchableOpacity onPress={() => { onClear(); onFocusChange(false); }} style={styles.clearButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={SECONDARY} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={[styles.filterButton, !!selectedSalesperson && styles.filterButtonActive]} onPress={() => { onFocusChange(false); setModalVisible(true); }} activeOpacity={0.8}>
          <Ionicons name="funnel-outline" size={14} color={selectedSalesperson ? '#FFFFFF' : PRIMARY} style={{ marginRight: 4 }} />
          <Text style={[styles.filterButtonText, !!selectedSalesperson && styles.filterButtonTextActive]} numberOfLines={1} ellipsizeMode="tail">
            {selectedSalesperson ? selectedSalesperson : 'Filter'}
          </Text>
        </TouchableOpacity>
      </View>
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Salesperson</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={PRIMARY} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={[styles.modalItem, !selectedSalesperson && styles.modalItemActive]} onPress={() => handleSelectSalesperson(null)}>
                <Text style={[styles.modalItemText, !selectedSalesperson && styles.modalItemTextActive]}>All Salespersons (No filter)</Text>
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
                    <TouchableOpacity key={sp.salespersonId} style={[styles.modalItem, isActive && styles.modalItemActive]} onPress={() => handleSelectSalesperson(spName)}>
                      <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>{spName}</Text>
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

const OrderRow = React.memo(function OrderRow({ item }: { item: OpenOrderRowItem }) {
  return (
    <OrderCard
      orderNo={item.orderNo}
      companyName={item.companyName}
      orderType={item.orderType}
      orderTotal={item.orderTotal}
      orderDate={item.orderDate}
      daysLeft={item.daysLeft}
      assignedVendorCount={item.assignedVendorCount}
      expectedVendorCount={item.expectedVendorCount}
      orderCost={item.orderCost}
      markup={item.markup}
      markupPercentage={item.markupPercentage}
      onPress={() =>
        router.push({
          pathname: '/order-details' as any,
          params: { orderData: JSON.stringify(item), from: '/partial-orders' },
        })
      }
    />
  );
});

// ─── Empty States ─────────────────────────────────────────────────────────────

const DefaultEmptyState = () => (
  <View style={styles.emptyState}>
    <Ionicons name="cube-outline" size={36} color={SECONDARY} />
    <Text style={styles.emptyTitle}>No partial orders</Text>
    <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
  </View>
);

const SearchEmptyState = ({
  query,
  type,
  onClear,
}: {
  query: string;
  type: OpenOrderSearchType;
  onClear: () => void;
}) => {
  const typeLabel =
    type === 'orderNo' ? 'Order No' : type === 'companyName' ? 'Company' : 'Salesperson';
  return (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={38} color={SECONDARY} />
      <Text style={styles.emptyTitle}>No matching partial orders</Text>
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

export default function PartialOrdersScreen() {
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;

  // Hardware Back button handling (Android)
  useEffect(() => {
    const onBackPress = () => {
      router.push('/open-orders' as any);
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  // Date Filter State
  const [activePreset, setActivePreset] = useState<DateFilterPreset>('today');
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const calculatedRange = useMemo(
    () => getDateRangeForFilter(activePreset, customRange),
    [activePreset, customRange]
  );

  // Search & Filter State
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

  const searchParam: OpenOrderSearchParam | null = useMemo(() => {
    if (selectedSalesperson) {
      return { type: 'salesperson', value: selectedSalesperson };
    }
    if (selectedSuggestion) {
      return { type: selectedSuggestion.type, value: selectedSuggestion.value };
    }
    const trimmed = debouncedValue.trim();
    if (!trimmed) return null;
    const isDigitsOnly = /^\d+$/.test(trimmed);
    const hasPartHyphenOrRev = /[-_]/.test(trimmed) || /rev/i.test(trimmed);
    
    let detectedType: OpenOrderSearchType = 'orderNo';
    if (hasPartHyphenOrRev || (trimmed.length >= 7 && !isDigitsOnly)) {
      detectedType = 'partNumber';
    } else if (!isDigitsOnly) {
      detectedType = 'companyName';
    }
    return { type: detectedType, value: trimmed };
  }, [debouncedValue, selectedSalesperson, selectedSuggestion]);

  // Fetch partial orders
  const {
    items,
    rawPages,
    summary,
    meta,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefreshing,
  } = usePartialOrders(token, searchParam);

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
  }, [searchParam]);

  useFocusEffect(
    useCallback(() => {
      setInputText('');
      setDebouncedValue('');
      setSelectedSalesperson(null);
      setActivePreset('today');
      setCustomRange(null);
      setFilterModalVisible(false);
      setCurrentPage(1);
      refetch();
    }, [refetch])
  );

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

  const LIMIT = OPEN_ORDERS_PAGE_LIMIT;
  const totalRecords = (meta?.totalRecords as number | undefined) ?? 0;
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / LIMIT) : Math.max(1, rawPages.length);

  const displayItems = useMemo(() => {
    let filtered = items;

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

    return filtered.slice((currentPage - 1) * LIMIT, currentPage * LIMIT);
  }, [items, selectedSalesperson, debouncedValue, currentPage, LIMIT]);

  const usingSample = isError && items.length === 0;
  const errorMessage = useMemo(
    () => (isError ? (error as Error | null)?.message ?? 'Failed to load partial orders' : null),
    [isError, error]
  );

  const handleClearSearch = useCallback(() => {
    setInputText('');
    setDebouncedValue('');
    setSelectedSalesperson(null);
    setSelectedSuggestion(null);
    setCurrentPage(1);
  }, []);

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
    ({ item }: { item: OpenOrderRowItem }) => <OrderRow item={item} />,
    []
  );

  const keyExtractor = useCallback((item: OpenOrderRowItem) => item.id, []);
  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  const availableSuggestions = useMemo(() => {
    const list: { text: string; type: 'company' | 'orderNo' }[] = [];
    const companySet = new Set<string>();
    const orderSet = new Set<string>();

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
        <SearchBarSection
          inputText={inputText}
          setInputText={setInputText}
          selectedSalesperson={selectedSalesperson}
          setSelectedSalesperson={setSelectedSalesperson}
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
      summary, isLoading, usingSample, inputText, selectedSalesperson,
      availableSalespersons, errorMessage, refetch, handleClearSearch,
    ]
  );

  const ListFooter = useMemo(() => {
    if (isLoading && items.length === 0) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading partial orders…</Text>
        </View>
      );
    }
    if (items.length > 0 || !isLoading) {
      return (
        <PaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          isFetchingNextPage={isFetchingNextPage}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      );
    }
    return null;
  }, [isLoading, items.length, currentPage, totalPages, totalRecords, isFetchingNextPage, handlePrev, handleNext]);

  const handleApplyFilter = (
    preset: DateFilterPreset,
    range: { startDate: string; endDate: string } | null
  ) => {
    setActivePreset(preset);
    setCustomRange(range);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />
      {showSuggestions && searchSuggestions.length > 0 ? (
        <View style={styles.suggestionsOverlay} pointerEvents="box-none">
          {searchSuggestions.map((sug, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.suggestionRow, idx === searchSuggestions.length - 1 && { borderBottomWidth: 0 }]}
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
                <Text style={styles.suggestionText} numberOfLines={1}>{sug.label}</Text>
                {sug.sublabel ? (
                  <Text style={styles.suggestionSublabel} numberOfLines={1}>{sug.sublabel}</Text>
                ) : null}
              </View>
              <Text style={styles.suggestionTypeTag}>
                {sug.type === 'orderNo' ? 'Order #' : sug.type === 'companyCode' ? 'Company' : 'Part #'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <FlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
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
            <DefaultEmptyState />
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


    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  flatlistContent: { paddingBottom: 24, flexGrow: 1 },

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
  headerIconWrap: { width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-start' },
  headerIconInner: { position: 'relative', width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitleCenter: {
    fontSize: 18,
    fontFamily: Typography.titleSerif,
    fontWeight: '600',
    color: PRIMARY,
  },
  headerRightWrap: {
    width: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
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

  // Summary breakdown card
  summaryCard: {
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#3A4151',
    borderRadius: 14,
    padding: 16,
  },

  breakdownCard: {
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E6E2',
    overflow: 'hidden',
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3A4151',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  breakdownTitleRow: { gap: 2 },
  breakdownTitle: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: '#FFFFFF',
  },
  breakdownSubtitle: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  breakdownContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownRowBorder: {
    borderBottomWidth: hairline,
    borderBottomColor: '#E7E6E2',
  },
  breakdownRowLabel: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
    flex: 1,
  },
  breakdownRowValue: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },

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

  suggestionsContainer: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E7E6E2',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 99999,
    overflow: 'hidden',
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

  suggestionsOverlay: {
    position: 'absolute',
    top: 118,
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
    backgroundColor: INPUT_BG,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

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

  // List rows
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
  vendorCountText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: SECONDARY },
  amountText: { fontSize: 14, fontFamily: Typography.headingSemiBold, color: PRIMARY },
  pendingLabelText: { fontSize: 12, fontFamily: Typography.body, color: SECONDARY },
  pendingAmountText: { fontFamily: Typography.headingSemiBold, color: PRIMARY },
  dateDaysRow: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 12, fontFamily: Typography.body, color: SECONDARY },
  daysText: { fontSize: 12, fontFamily: Typography.bodyMedium },

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

  loadingWrap: { paddingVertical: 24, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, fontFamily: Typography.body, color: SECONDARY },

  emptyState: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: Typography.headingSemiBold, color: PRIMARY },
  emptySubtitle: { fontSize: 13, fontFamily: Typography.body, color: SECONDARY },
  clearSearchBtn: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: PRIMARY, borderRadius: 8 },
  clearSearchBtnText: { color: '#FFFFFF', fontSize: 13, fontFamily: Typography.headingSemiBold },
});
