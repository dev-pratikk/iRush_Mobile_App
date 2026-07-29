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
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { useAuthContext } from '../../context/AuthContext';
import { router, usePathname } from 'expo-router';
import { formatCurrencyWithCents, formatNumber, formatOrderDate } from '../../services/api/orders.service';
import {
  SAMPLE_OPEN_ORDERS,
  OPEN_ORDERS_PAGE_LIMIT,
  type OpenOrderSearchType,
  type OpenOrderSearchParam,
} from '../../services/api/open-orders.service';
import { usePendingOrders, type OpenOrderRowItem } from '../../hooks/useOpenOrders';
import { PaginationFooter } from '../../components/ui/PaginationFooter';
import type { PendingOrdersSummary } from '../../types/api/open-orders';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const DIVIDER = '#E7E6E2';
const PAGE_BG = '#FFFFFF';
const SUMMARY_CARD_BG = '#3A4151';
const SUMMARY_CARD_TEXT = '#FFFFFF';
const INPUT_BG = '#F5F5F2';

const SEARCH_OPTIONS: { label: string; type: OpenOrderSearchType; placeholder: string }[] = [
  { label: 'Order No', type: 'orderNo', placeholder: 'Search by order number…' },
  { label: 'Company', type: 'companyName', placeholder: 'Search by company name…' },
  { label: 'Salesperson', type: 'salesperson', placeholder: 'Search by salesperson…' },
];

// ─── Header ──────────────────────────────────────────────────────────────────

const Header = () => (
  <View style={styles.header}>
    <TouchableOpacity
      style={styles.headerIconWrap}
      onPress={() => router.push('/open-orders' as any)}
      hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
    >
      <Ionicons name="arrow-back" size={20} color={PRIMARY} />
    </TouchableOpacity>
    <View style={styles.headerCenter} pointerEvents="none">
      <Text style={styles.headerTitle}>Pending orders</Text>
    </View>
    <View style={styles.headerSpacer} />
  </View>
);

// ─── KPI Summary Card ─────────────────────────────────────────────────────────

const SummaryCard = ({
  summary,
  loading,
  usingSample,
}: {
  summary: PendingOrdersSummary | null;
  loading: boolean;
  usingSample: boolean;
}) => {
  if (loading && !summary) {
    return (
      <View style={[styles.summaryCard, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="small" color={SUMMARY_CARD_TEXT} />
      </View>
    );
  }
  const count = summary?.totalOrders ?? SAMPLE_OPEN_ORDERS.pendingOrdersCount;
  const amount = summary?.totalOrderedAmount ?? SAMPLE_OPEN_ORDERS.pendingOrdersAmount;
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryLeft}>
        <Text style={styles.summaryCount}>{formatNumber(count)}</Text>
        {usingSample && (
          <View style={styles.demoPill}>
            <Text style={styles.demoPillText}>Demo</Text>
          </View>
        )}
      </View>
      <Text style={styles.summaryAmount}>{formatCurrencyWithCents(amount)}</Text>
    </View>
  );
};

// ─── Search Bar Component ────────────────────────────────────────────────────

const SearchBarSection = ({
  searchType,
  setSearchType,
  inputText,
  setInputText,
  onClear,
}: {
  searchType: OpenOrderSearchType;
  setSearchType: (type: OpenOrderSearchType) => void;
  inputText: string;
  setInputText: (text: string) => void;
  onClear: () => void;
}) => {
  const currentOption = SEARCH_OPTIONS.find((o) => o.type === searchType) ?? SEARCH_OPTIONS[0];

  const handleTypeSelect = (newType: OpenOrderSearchType) => {
    if (newType !== searchType) {
      setSearchType(newType);
      onClear(); // Auto-clear text when switching type to avoid cross-query mismatches
    }
  };

  return (
    <View style={styles.searchSection}>
      {/* Type Selector Pills */}
      <View style={styles.pillsRow}>
        {SEARCH_OPTIONS.map((opt) => {
          const isActive = opt.type === searchType;
          return (
            <TouchableOpacity
              key={opt.type}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => handleTypeSelect(opt.type)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Input */}
      <View style={styles.searchInputWrap}>
        <Ionicons name="search-outline" size={18} color={SECONDARY} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder={currentOption.placeholder}
          placeholderTextColor={SECONDARY}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {inputText.length > 0 ? (
          <TouchableOpacity
            onPress={onClear}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={18} color={SECONDARY} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

// ─── Order row card ───────────────────────────────────────────────────────────

const OrderRow = React.memo(function OrderRow({ item }: { item: OpenOrderRowItem }) {
  const orderDate = formatOrderDate(item.orderDate);
  const daysLabel =
    item.daysLeft < 0 ? `+${Math.abs(item.daysLeft)}d late` : `${item.daysLeft}d left`;

  return (
    <View style={styles.row}>
      <View style={styles.rowLeftCol}>
        <Text style={styles.orderNoText} numberOfLines={1} ellipsizeMode="tail">
          {item.orderNo}
        </Text>
        <Text style={styles.companyText} numberOfLines={1} ellipsizeMode="tail">
          {item.companyName}
        </Text>
        <Text style={styles.vendorCountText}>
          {item.vendorCompletedCount}/{item.vendorCount} vendors
        </Text>
      </View>
      <View style={styles.rowRightCol}>
        <Text style={styles.amountText}>{formatCurrencyWithCents(item.orderTotal)}</Text>
        <Text style={styles.dateText}>{orderDate}</Text>
        <Text style={styles.daysText}>{daysLabel}</Text>
      </View>
    </View>
  );
});



// ─── Empty states ─────────────────────────────────────────────────────────────

const DefaultEmptyState = () => (
  <View style={styles.emptyState}>
    <Ionicons name="cube-outline" size={36} color={SECONDARY} />
    <Text style={styles.emptyTitle}>No pending orders</Text>
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
      <Text style={styles.emptyTitle}>No matching pending orders</Text>
      <Text style={styles.emptySubtitle}>
        No results found for "{query}" in {typeLabel}
      </Text>
      <TouchableOpacity style={styles.clearSearchBtn} onPress={onClear} activeOpacity={0.8}>
        <Text style={styles.clearSearchBtnText}>Clear search</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Bottom nav ───────────────────────────────────────────────────────────────

const BottomNav = () => {
  const pathname = usePathname();
  const tabs = [
    { icon: 'home', label: 'Dashboard', route: '/' },
    { icon: 'cube', label: 'Open orders', route: '/open-orders' },
    { icon: 'chatbox', label: 'Quotes', route: '/quotes' },
    { icon: 'bar-chart', label: 'Reports', route: '/reports' },
  ];
  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab, index) => {
        const isActive = pathname === tab.route;
        return (
          <TouchableOpacity
            key={index}
            style={styles.navTab}
            onPress={() => router.push(tab.route as any)}
          >
            <Ionicons
              name={isActive ? `${tab.icon}` : (`${tab.icon}-outline` as any)}
              size={24}
              color={isActive ? PRIMARY : SECONDARY}
            />
            <Text style={[styles.navLabel, { color: isActive ? PRIMARY : SECONDARY }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PendingOrdersScreen() {
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

  // ── Search State & Debouncing ───────────────────────────────────────────────
  const [searchType, setSearchType] = useState<OpenOrderSearchType>('orderNo');
  const [inputText, setInputText] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  // Debounce input text by 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputText);
    }, 400);
    return () => clearTimeout(timer);
  }, [inputText]);

  // Construct active search param
  const searchParam: OpenOrderSearchParam | null = useMemo(() => {
    const trimmed = debouncedValue.trim();
    if (!trimmed) return null;
    return { type: searchType, value: trimmed };
  }, [searchType, debouncedValue]);

  // Fetch pending orders backed by React Query infinite resource
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
  } = usePendingOrders(token, searchParam);

  // ── Pagination Cursor ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const pendingAdvanceRef = useRef(false);

  // Reset to page 1 whenever searchParam changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchParam]);

  // When a fetch triggered by Next completes, advance the cursor
  useEffect(() => {
    if (pendingAdvanceRef.current && !isFetchingNextPage) {
      pendingAdvanceRef.current = false;
      setCurrentPage((p) => p + 1);
    }
  }, [isFetchingNextPage]);

  // Reset to page 1 when pull-to-refresh fires
  useEffect(() => {
    if (isRefreshing) {
      pendingAdvanceRef.current = false;
      setCurrentPage(1);
    }
  }, [isRefreshing]);

  // ── Derived pagination values ───────────────────────────────────────────────
  const LIMIT = OPEN_ORDERS_PAGE_LIMIT;
  const totalRecords = (meta?.totalRecords as number | undefined) ?? 0;
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / LIMIT) : Math.max(1, rawPages.length);

  // Slice items for current page (local cursor)
  const displayItems = useMemo(
    () => items.slice((currentPage - 1) * LIMIT, currentPage * LIMIT),
    [items, currentPage, LIMIT]
  );

  const usingSample = isError && items.length === 0;
  const errorMessage = useMemo(
    () => (isError ? (error as Error | null)?.message ?? 'Failed to load pending orders' : null),
    [isError, error]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleClearSearch = useCallback(() => {
    setInputText('');
    setDebouncedValue('');
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

  // ── FlatList components ────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: OpenOrderRowItem }) => <OrderRow item={item} />,
    []
  );

  const keyExtractor = useCallback((item: OpenOrderRowItem) => item.id, []);

  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  const ListHeader = useMemo(
    () => (
      <View>
        <SummaryCard summary={summary} loading={isLoading} usingSample={usingSample} />
        <SearchBarSection
          searchType={searchType}
          setSearchType={setSearchType}
          inputText={inputText}
          setInputText={setInputText}
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
    [summary, isLoading, usingSample, searchType, inputText, errorMessage, refetch, handleClearSearch]
  );

  const ListFooter = useMemo(() => {
    if (isLoading && items.length === 0) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading pending orders…</Text>
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />
      <FlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          isLoading ? null : debouncedValue.trim().length > 0 ? (
            <SearchEmptyState query={debouncedValue.trim()} type={searchType} onClear={handleClearSearch} />
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
      <BottomNav />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  flatlistContent: { paddingBottom: 24, flexGrow: 1 },

  // Header
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: PAGE_BG,
  },
  headerIconWrap: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: 19,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
    color: PRIMARY,
    includeFontPadding: false,
  },
  headerSpacer: { width: 40, height: 40 },

  // KPI summary card
  summaryCard: {
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: SUMMARY_CARD_BG,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    minHeight: 72,
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryCount: {
    fontSize: 34,
    lineHeight: 38,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: SUMMARY_CARD_TEXT,
    includeFontPadding: false,
  },
  summaryAmount: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: SUMMARY_CARD_TEXT,
    includeFontPadding: false,
    flexShrink: 1,
    textAlign: 'right',
  },
  demoPill: {
    backgroundColor: 'rgba(255,212,59,0.18)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  demoPillText: { fontSize: 10, fontFamily: Typography.headingSemiBold, color: '#B48A00' },

  // Search Section
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F5F5F2',
  },
  pillActive: {
    backgroundColor: PRIMARY,
  },
  pillText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.bodySemiBold,
    fontWeight: '600',
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.body,
    color: PRIMARY,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 2,
    marginLeft: 6,
  },

  listDivider: { height: hairline, backgroundColor: DIVIDER },

  // Error banner
  errorRow: {
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FBEAEA',
  },
  errorRowText: { flex: 1, fontSize: 12, fontFamily: Typography.body, color: '#8A1C1C' },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 60,
  },
  loadingText: { fontSize: 13, fontFamily: Typography.body, color: SECONDARY },

  // Separator
  separator: { height: hairline, backgroundColor: DIVIDER, marginHorizontal: 16 },

  // Order row
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  rowLeftCol: {
    flex: 1,
    paddingRight: 12,
    gap: 3,
  },
  rowRightCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: 3,
  },
  orderNoText: {
    fontSize: 14,
    fontFamily: Typography.numberHeavy,
    fontWeight: '500',
    color: PRIMARY,
    includeFontPadding: false,
  },
  companyText: {
    fontSize: 13,
    fontFamily: Typography.body,
    fontWeight: '400',
    color: PRIMARY,
    includeFontPadding: false,
  },
  vendorCountText: {
    fontSize: 12,
    fontFamily: Typography.body,
    fontWeight: '400',
    color: SECONDARY,
    includeFontPadding: false,
  },
  amountText: {
    fontSize: 14,
    fontFamily: Typography.numberHeavy,
    fontWeight: '500',
    color: PRIMARY,
    includeFontPadding: false,
  },
  dateText: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: SECONDARY,
    includeFontPadding: false,
  },
  daysText: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: SECONDARY,
    includeFontPadding: false,
  },

  // Empty states
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 6 },
  emptyTitle: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: SECONDARY,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: SECONDARY,
    opacity: 0.8,
    textAlign: 'center',
  },
  clearSearchBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EFEFEC',
  },
  clearSearchBtnText: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '600',
    color: PRIMARY,
  },

  // Pagination footer
  paginationWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    borderTopWidth: hairline,
    borderTopColor: DIVIDER,
    backgroundColor: '#FAFAF8',
    marginTop: 4,
  },
  paginationSummary: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: SECONDARY,
    textAlign: 'center',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 96,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EFEFEC',
    justifyContent: 'center',
  },
  pageButtonDisabled: { backgroundColor: '#F5F5F2' },
  pageButtonText: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '600',
    color: PRIMARY,
  },
  pageButtonTextDisabled: { color: SECONDARY },
  pageIndicator: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '600',
    color: PRIMARY,
    minWidth: 64,
    textAlign: 'center',
  },

  // Bottom nav
  bottomNav: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    borderTopWidth: hairline,
    borderTopColor: DIVIDER,
    backgroundColor: PAGE_BG,
  },
  navTab: { alignItems: 'center', paddingVertical: 4 },
  navLabel: { fontSize: 11, fontFamily: Typography.bodyMedium, marginTop: 4 },
});
