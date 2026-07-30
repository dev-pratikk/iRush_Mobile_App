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
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { router, usePathname, useLocalSearchParams } from 'expo-router';
import { useAuthContext } from '../../context/AuthContext';
import {
  formatCurrencyWithCents,
  formatNumber,
  formatOrderDate,
  SAMPLE_ORDERS,
  DashboardPeriod as DatePeriod,
  ORDERS_PAGE_LIMIT,
  type OrdersSearchType,
  type OrdersSearchParam,
} from '../../services/api/orders.service';
import { useOrders, type OrdersRowItem } from '../../hooks/useOrders';
import { PaginationFooter } from '../../components/ui/PaginationFooter';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const DIVIDER = '#E7E6E2';
const PAGE_BG = '#FFFFFF';
const SUMMARY_CARD_BG = '#3A4151';
const SUMMARY_CARD_TEXT = '#FFFFFF';
const TOGGLE_TRACK = '#EDEDEC';
const INPUT_BG = '#F5F5F2';

const SEARCH_OPTIONS: { label: string; type: OrdersSearchType; placeholder: string }[] = [
  { label: 'Order No', type: 'orderNo', placeholder: 'Search by order number…' },
  { label: 'Company', type: 'companyName', placeholder: 'Search by company name…' },
  { label: 'Salesperson', type: 'salesperson', placeholder: 'Search by salesperson…' },
];

// ─── Header ──────────────────────────────────────────────────────────────────

const Header = () => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerIconWrap}
        onPress={() => router.push('/' as any)}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>
      <View style={styles.headerCenter} pointerEvents="none">
        <Text style={styles.headerTitle}>Orders</Text>
      </View>
      <View style={styles.headerIconWrap}>
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

// ─── Date Segment Control ────────────────────────────────────────────────────

const DateSegmentControl = ({
  period,
  setPeriod,
  disabled,
}: {
  period: DatePeriod;
  setPeriod: (p: DatePeriod) => void;
  disabled?: boolean;
}) => {
  const options: { label: string; value: DatePeriod }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Month', value: 'month' },
  ];

  return (
    <View style={[styles.segmentContainer, disabled && { opacity: 0.6 }]}>
      <View style={styles.segmentWrapper}>
        {options.map((option) => {
          const isActive = period === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => !disabled && setPeriod(option.value)}
              disabled={disabled}
              style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: isActive ? PRIMARY : SECONDARY },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ─── Dark/Grey KPI Summary Box ───────────────────────────────────────────────
// Note: On Orders screen, this box UPDATES when searching to reflect filtered totals!

const SummaryCard = ({
  count,
  totalAmount,
  loading,
  usingSample,
}: {
  count: number;
  totalAmount: number;
  loading: boolean;
  usingSample: boolean;
}) => {
  if (loading && count === 0 && totalAmount === 0) {
    return (
      <View style={[styles.summaryCard, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="small" color={SUMMARY_CARD_TEXT} />
      </View>
    );
  }

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
      <Text style={styles.summaryAmount}>{formatCurrencyWithCents(totalAmount)}</Text>
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
  searchType: OrdersSearchType;
  setSearchType: (type: OrdersSearchType) => void;
  inputText: string;
  setInputText: (text: string) => void;
  onClear: () => void;
}) => {
  const currentOption = SEARCH_OPTIONS.find((o) => o.type === searchType) ?? SEARCH_OPTIONS[0];

  const handleTypeSelect = (newType: OrdersSearchType) => {
    if (newType !== searchType) {
      setSearchType(newType);
      onClear(); // Auto-clear input on pill switch to avoid mismatched queries
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

// ─── Order Row Component ──────────────────────────────────────────────────────

const OrderRow = React.memo(function OrderRow({ item }: { item: OrdersRowItem }) {
  const orderDate = formatOrderDate(item.orderDate || item.updatedDate);
  // Clean order number: remove any leading #
  const orderNo = (item.orderNo || '').replace(/^#/, '').trim() || 'N/A';
  const companyName = item.companyName || 'N/A';
  const orderType = item.orderTypeName || 'Full Turnkey';
  const salesperson = item.salespersonName || '';

  return (
    <View style={styles.row}>
      {/* Left Column: Order No -> Company Name -> Order/Service Type */}
      <View style={styles.rowLeftCol}>
        <Text style={styles.orderNoText} numberOfLines={1} ellipsizeMode="tail">
          {orderNo}
        </Text>
        <Text style={styles.companyText} numberOfLines={1} ellipsizeMode="tail">
          {companyName}
        </Text>
        <Text style={styles.orderTypeText} numberOfLines={1} ellipsizeMode="tail">
          {orderType}
        </Text>
      </View>

      {/* Right Column: Amount -> Date -> Salesperson */}
      <View style={styles.rowRightCol}>
        <Text style={styles.amountText}>{formatCurrencyWithCents(item.orderTotal)}</Text>
        {orderDate ? <Text style={styles.dateText}>{orderDate}</Text> : null}
        {salesperson ? (
          <Text style={styles.salespersonText} numberOfLines={1} ellipsizeMode="tail">
            {salesperson}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

// ─── Empty States ─────────────────────────────────────────────────────────────

const DefaultEmptyState = ({ period, usingSample }: { period: DatePeriod; usingSample: boolean }) => {
  const title = period === 'today' ? 'No orders today' : 'No orders this month';
  return (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={36} color={SECONDARY} />
      <Text style={styles.emptyTitle}>
        {usingSample ? 'Demo — ' + title : title}
      </Text>
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

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

const BottomNav = () => {
  const colors = useThemeColors();
  const pathname = usePathname();
  const tabs = [
    { icon: 'home', label: 'Dashboard', route: '/' },
    { icon: 'document-text', label: 'Orders', route: '/orders' },
    { icon: 'cube', label: 'Open orders', route: '/open-orders' },
    { icon: 'chatbox', label: 'Quotes', route: '/quotes' },
  ];

  return (
    <View style={[styles.bottomNav, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {tabs.map((tab, index) => {
        const isActive = pathname === tab.route;
        return (
          <TouchableOpacity key={index} style={styles.navTab} onPress={() => router.push(tab.route as any)}>
            <Ionicons
              name={isActive ? `${tab.icon}` : (`${tab.icon}-outline` as any)}
              size={24}
              color={isActive ? colors.primary : colors.inactive}
            />
            <Text
              style={[
                styles.navLabel,
                {
                  color: isActive ? colors.primary : colors.inactive,
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Header Component for FlatList ───────────────────────────────────────────

const ListHeaderComponent = React.memo(function ListHeaderComponent({
  period,
  setPeriod,
  disabled,
  error,
  onRetryTap,
  usingSample,
  count,
  totalAmount,
  summaryLoading,
  searchType,
  setSearchType,
  inputText,
  setInputText,
  onClearSearch,
}: {
  period: DatePeriod;
  setPeriod: (p: DatePeriod) => void;
  disabled: boolean;
  error: string | null;
  onRetryTap: () => void;
  usingSample: boolean;
  count: number;
  totalAmount: number;
  summaryLoading: boolean;
  searchType: OrdersSearchType;
  setSearchType: (type: OrdersSearchType) => void;
  inputText: string;
  setInputText: (text: string) => void;
  onClearSearch: () => void;
}) {
  const colors = useThemeColors();
  return (
    <View>
      <DateSegmentControl period={period} setPeriod={setPeriod} disabled={disabled} />
      <SummaryCard
        count={count}
        totalAmount={totalAmount}
        loading={summaryLoading}
        usingSample={usingSample}
      />
      <SearchBarSection
        searchType={searchType}
        setSearchType={setSearchType}
        inputText={inputText}
        setInputText={setInputText}
        onClear={onClearSearch}
      />
      {error ? (
        <TouchableOpacity
          style={[styles.errorBanner, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}55` }]}
          onPress={onRetryTap}
          activeOpacity={0.8}
        >
          <View style={styles.errorBannerIconRow}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.errorBannerTitle, { color: colors.primary }]}>
              Couldn't load live data
            </Text>
          </View>
          <Text style={[styles.errorBannerDetail, { color: colors.textSecondary }]} numberOfLines={3}>
            {error}
          </Text>
          <View style={[styles.retryChip, { backgroundColor: colors.primary }]}>
            <Ionicons name="refresh-outline" size={13} color="#FFFFFF" />
            <Text style={styles.retryChipText}>Tap to retry</Text>
          </View>
        </TouchableOpacity>
      ) : null}
      <View style={styles.dividerHairline} />
    </View>
  );
});

// ─── Main Screen Component ────────────────────────────────────────────────────

export default function OrdersListScreen() {
  const colors = useThemeColors();
  const { user } = useAuthContext();
  const routeParams = useLocalSearchParams<{ period?: DatePeriod }>();
  const [period, setPeriod] = useState<DatePeriod>(routeParams.period === 'month' ? 'month' : 'today');

  useEffect(() => {
    if (routeParams.period === 'month' || routeParams.period === 'today') {
      setPeriod(routeParams.period);
    }
  }, [routeParams.period]);

  // Hardware Back button listener for Android
  useEffect(() => {
    const onBackPress = () => {
      router.push('/' as any);
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  // ── Search State & Debouncing ───────────────────────────────────────────────
  const [searchType, setSearchType] = useState<OrdersSearchType>('orderNo');
  const [inputText, setInputText] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  // Debounce input text by 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputText);
    }, 400);
    return () => clearTimeout(timer);
  }, [inputText]);

  // Construct search param
  const searchParam: OrdersSearchParam | null = useMemo(() => {
    const trimmed = debouncedValue.trim();
    if (!trimmed) return null;
    return { type: searchType, value: trimmed };
  }, [searchType, debouncedValue]);

  // Fetch orders backed by React Query infinite resource
  const token = (user as any)?.token ?? null;
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
  } = useOrders(period, token, searchParam);

  // ── Pagination Cursor ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const pendingAdvanceRef = useRef(false);

  // Reset to page 1 whenever period or searchParam changes
  useEffect(() => {
    setCurrentPage(1);
  }, [period, searchParam]);

  // Advance cursor when Next fetch finishes
  useEffect(() => {
    if (pendingAdvanceRef.current && !isFetchingNextPage) {
      pendingAdvanceRef.current = false;
      setCurrentPage((p) => p + 1);
    }
  }, [isFetchingNextPage]);

  // Reset to page 1 on refresh
  useEffect(() => {
    if (isRefreshing) {
      pendingAdvanceRef.current = false;
      setCurrentPage(1);
    }
  }, [isRefreshing]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const usingSample = isError && items.length === 0;
  const sampleItems = useMemo(
    () =>
      SAMPLE_ORDERS.orders.map((raw) => ({
        id: String(raw.ORDER_ID ?? raw.ORDER_NO),
        orderNo: String(raw.ORDER_NO ?? '').replace(/^#/, ''),
        companyName: String(raw.COMPANY_NAME ?? ''),
        orderDate: raw.ORDER_DATE ?? '',
        updatedDate: raw.UPDATED_DATE ?? '',
        orderTypeName: (raw.ORDER_TYPE_NAME ?? '').trim(),
        salespersonName: (raw.SALESPERSON_NAME ?? '').trim(),
        orderTotal: Number.isFinite(raw.ORDER_TOTAL) ? raw.ORDER_TOTAL : 0,
        orderStatus: raw.ORDER_STATUS ?? '',
        orderCategory: raw.ORDER_CATEGORY ?? '',
      })),
    []
  );

  const displayItems = usingSample ? sampleItems : items;

  // On /dashboard/orders, count & totalAmount in meta DIRECTLY reflect search filters!
  const displayCount = usingSample ? SAMPLE_ORDERS.count : (meta?.count ?? items.length);
  const displayTotal = usingSample ? SAMPLE_ORDERS.totalAmount : (meta?.totalAmount ?? 0);

  const LIMIT = ORDERS_PAGE_LIMIT; // 10
  const totalRecords = (meta?.totalRecords as number | undefined) ?? displayCount;
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / LIMIT) : Math.max(1, rawPages.length);

  // Slice items for current page (local cursor)
  const pagedItems = useMemo(
    () => displayItems.slice((currentPage - 1) * LIMIT, currentPage * LIMIT),
    [displayItems, currentPage, LIMIT]
  );

  const errorMessage = useMemo(() => {
    if (!isError) return null;
    return (error as Error | null)?.message ?? 'Failed to load orders';
  }, [isError, error]);

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

  const renderItem = useCallback(({ item }: { item: OrdersRowItem }) => {
    return <OrderRow item={item} />;
  }, []);

  const keyExtractor = useCallback((item: OrdersRowItem) => item.id, []);

  const ItemSeparator = useCallback(() => <View style={styles.dividerHairline} />, []);

  const listHeader = useMemo(
    () => (
      <ListHeaderComponent
        period={period}
        setPeriod={setPeriod}
        disabled={isLoading && items.length === 0}
        error={errorMessage}
        onRetryTap={() => refetch()}
        usingSample={usingSample}
        count={displayCount}
        totalAmount={displayTotal}
        summaryLoading={isLoading && !isRefreshing}
        searchType={searchType}
        setSearchType={setSearchType}
        inputText={inputText}
        setInputText={setInputText}
        onClearSearch={handleClearSearch}
      />
    ),
    [
      period,
      isLoading,
      items.length,
      errorMessage,
      usingSample,
      displayCount,
      displayTotal,
      isRefreshing,
      refetch,
      searchType,
      inputText,
      handleClearSearch,
    ]
  );

  const listEmpty = useMemo(() => {
    if (isLoading && items.length === 0) return null;
    if (debouncedValue.trim().length > 0) {
      return <SearchEmptyState query={debouncedValue.trim()} type={searchType} onClear={handleClearSearch} />;
    }
    return <DefaultEmptyState period={period} usingSample={usingSample} />;
  }, [isLoading, items.length, debouncedValue, searchType, period, usingSample, handleClearSearch]);

  const listFooter = useMemo(() => {
    if (isLoading && !isRefreshing && items.length === 0) {
      return (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading orders…
          </Text>
        </View>
      );
    }
    if (displayItems.length > 0 || !isLoading) {
      return (
        <PaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          limit={LIMIT}
          isFetchingNextPage={isFetchingNextPage}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      );
    }
    return null;
  }, [
    isLoading,
    isRefreshing,
    items.length,
    displayItems.length,
    currentPage,
    totalPages,
    totalRecords,
    LIMIT,
    isFetchingNextPage,
    handlePrev,
    handleNext,
    colors,
  ]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: PAGE_BG }]} edges={['top']}>
      <Header />
      <FlatList
        data={pagedItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        ItemSeparatorComponent={ItemSeparator}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
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
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  flatListContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },

  // Header
  header: {
    height: 54,
    minHeight: 52,
    maxHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: PAGE_BG,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconInner: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
    color: PRIMARY,
    includeFontPadding: false,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.headingSemiBold,
    includeFontPadding: false,
    lineHeight: 10,
  },

  // Segmented toggle
  segmentContainer: {
    marginTop: 4,
    marginHorizontal: 16,
    marginBottom: 12,
    width: 'auto',
  },
  segmentWrapper: {
    flexDirection: 'row',
    height: 44,
    backgroundColor: TOGGLE_TRACK,
    borderRadius: 10,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    includeFontPadding: false,
  },

  // Dark/Grey KPI Summary Box
  summaryCard: {
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
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
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
  demoPillText: {
    fontSize: 10,
    fontFamily: Typography.headingSemiBold,
    color: '#B48A00',
  },

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

  dividerHairline: {
    height: hairline,
    backgroundColor: DIVIDER,
    marginHorizontal: 16,
  },

  // Order rows (2-column layout)
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
  orderTypeText: {
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
    fontWeight: '400',
    color: SECONDARY,
    includeFontPadding: false,
  },
  salespersonText: {
    fontSize: 12,
    fontFamily: Typography.body,
    fontWeight: '400',
    color: SECONDARY,
    includeFontPadding: false,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 6,
  },
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
    fontWeight: '400',
    color: SECONDARY,
    textAlign: 'center',
    opacity: 0.8,
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

  // Error banner
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  errorBannerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  errorBannerTitle: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
  },
  errorBannerDetail: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    lineHeight: 17,
  },
  retryChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 2,
  },
  retryChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
  },

  // Loading row
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
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
  navTab: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
    marginTop: 4,
  },
});
