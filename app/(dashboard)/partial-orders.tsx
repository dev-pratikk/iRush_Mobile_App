import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
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
import { SAMPLE_OPEN_ORDERS, OPEN_ORDERS_PAGE_LIMIT } from '../../services/api/open-orders.service';
import { usePartialOrders, type OpenOrderRowItem } from '../../hooks/useOpenOrders';
import type { PartialOrdersSummary } from '../../types/api/open-orders';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const DIVIDER = '#E7E6E2';
const PAGE_BG = '#FFFFFF';
const SUMMARY_CARD_BG = '#3A4151';
const SUMMARY_CARD_TEXT = '#FFFFFF';
const PENDING_ORANGE = '#E66A2C';
const GREEN = '#27500A';
const AMBER = '#8A5A00';
const RED = '#8A1C1C';

const getDaysColor = (days: number): string => {
  if (days < 0) return RED;
  if (days <= 3) return AMBER;
  return GREEN;
};

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
      <Text style={styles.headerTitle}>Partial orders</Text>
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
  summary: PartialOrdersSummary | null;
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
  const count = summary?.totalOrders ?? SAMPLE_OPEN_ORDERS.partialOrdersCount;
  const amount = summary?.totalOrderedAmount ?? SAMPLE_OPEN_ORDERS.partialOrdersAmount;
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

// ─── Order row card ───────────────────────────────────────────────────────────

const OrderRow = React.memo(function OrderRow({ item }: { item: OpenOrderRowItem }) {
  const orderDate = formatOrderDate(item.orderDate);
  const daysColor = getDaysColor(item.daysLeft);
  const daysLabel =
    item.daysLeft < 0 ? `+${Math.abs(item.daysLeft)}d late` : `${item.daysLeft}d left`;

  return (
    <View style={styles.row}>
      <View style={styles.rowLine1}>
        <Text style={styles.orderNoText} numberOfLines={1} ellipsizeMode="tail">
          {item.orderNo}
        </Text>
        <View style={styles.amountsCol}>
          <Text style={styles.amountText}>{formatCurrencyWithCents(item.orderTotal)}</Text>
          <Text style={styles.pendingLabelText}>
            Pending{' '}
            <Text style={styles.pendingAmountText}>{formatCurrencyWithCents(item.pendingAmount)}</Text>
          </Text>
        </View>
      </View>
      <View style={styles.rowLine2}>
        <Text style={styles.companyText} numberOfLines={1} ellipsizeMode="tail">
          {item.companyName}
        </Text>
        <Text style={styles.dateText}>{orderDate}</Text>
      </View>
      <View style={styles.rowLine3}>
        <Text style={styles.vendorCountText}>
          {item.vendorCompletedCount}/{item.vendorCount} vendors
        </Text>
        <Text style={[styles.daysText, { color: daysColor }]}>{daysLabel}</Text>
      </View>
    </View>
  );
});

// ─── Pagination footer ────────────────────────────────────────────────────────

const PaginationFooter = ({
  currentPage,
  totalPages,
  totalRecords,
  isFetchingNextPage,
  onPrev,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  isFetchingNextPage: boolean;
  onPrev: () => void;
  onNext: () => void;
}) => {
  const LIMIT = OPEN_ORDERS_PAGE_LIMIT;
  const pageStart = totalRecords === 0 ? 0 : (currentPage - 1) * LIMIT + 1;
  // For the partial last page, pageEnd = totalRecords (e.g. 68, not 70)
  const pageEnd = Math.min(currentPage * LIMIT, totalRecords);

  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages || isFetchingNextPage;

  return (
    <View style={styles.paginationWrap}>
      <Text style={styles.paginationSummary}>
        {totalRecords === 0 ? 'No orders' : `Showing ${pageStart}–${pageEnd} of ${formatNumber(totalRecords)}`}
      </Text>
      <View style={styles.paginationControls}>
        <TouchableOpacity
          style={[styles.pageButton, prevDisabled && styles.pageButtonDisabled]}
          onPress={onPrev}
          disabled={prevDisabled}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={15} color={prevDisabled ? SECONDARY : PRIMARY} />
          <Text style={[styles.pageButtonText, prevDisabled && styles.pageButtonTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        <Text style={styles.pageIndicator}>
          {isFetchingNextPage ? '…' : `${currentPage} / ${totalPages}`}
        </Text>

        <TouchableOpacity
          style={[styles.pageButton, nextDisabled && styles.pageButtonDisabled]}
          onPress={onNext}
          disabled={nextDisabled}
          activeOpacity={0.7}
        >
          {isFetchingNextPage ? (
            <ActivityIndicator size="small" color={PRIMARY} style={{ marginRight: 4 }} />
          ) : null}
          <Text style={[styles.pageButtonText, nextDisabled && styles.pageButtonTextDisabled]}>
            Next
          </Text>
          <Ionicons name="chevron-forward" size={15} color={nextDisabled ? SECONDARY : PRIMARY} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Empty / loading states ───────────────────────────────────────────────────

const EmptyState = () => (
  <View style={styles.emptyState}>
    <Ionicons name="cube-outline" size={36} color={SECONDARY} />
    <Text style={styles.emptyTitle}>No partial orders</Text>
    <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
  </View>
);

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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PartialOrdersScreen() {
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;

  useEffect(() => {
    const onBackPress = () => {
      router.push('/open-orders' as any);
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

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
  } = usePartialOrders(token);

  // ── Pagination cursor ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const pendingAdvanceRef = useRef(false);

  // When a fetch triggered by Next completes, advance the cursor
  useEffect(() => {
    if (pendingAdvanceRef.current && !isFetchingNextPage) {
      pendingAdvanceRef.current = false;
      setCurrentPage((p) => p + 1);
    }
  }, [isFetchingNextPage]);

  // Reset to page 1 on pull-to-refresh
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

  // Slice to current page — purely local, no network
  const displayItems = useMemo(
    () => items.slice((currentPage - 1) * LIMIT, currentPage * LIMIT),
    [items, currentPage, LIMIT]
  );

  const usingSample = isError && items.length === 0;
  const errorMessage = useMemo(
    () => (isError ? (error as Error | null)?.message ?? 'Failed to load partial orders' : null),
    [isError, error]
  );

  // ── Pagination handlers ────────────────────────────────────────────────────

  const handlePrev = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1)); // Free — data already in memory
  }, []);

  const handleNext = useCallback(() => {
    const nextPage = currentPage + 1;
    const alreadyLoaded = nextPage <= rawPages.length;

    if (alreadyLoaded) {
      // Already in memory — instant, zero network
      setCurrentPage(nextPage);
    } else if (hasNextPage && !isFetchingNextPage) {
      // Fetch from API, advance cursor once it resolves
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
        {errorMessage ? (
          <TouchableOpacity style={styles.errorRow} onPress={() => refetch()} activeOpacity={0.8}>
            <Ionicons name="warning-outline" size={16} color="#8A1C1C" />
            <Text style={styles.errorRowText}>{errorMessage} — tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.listDivider} />
      </View>
    ),
    [summary, isLoading, usingSample, errorMessage, refetch]
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />
      <FlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={isLoading ? null : <EmptyState />}
        ItemSeparatorComponent={ItemSeparator}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flatlistContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        // No onEndReached — navigation is button-driven only
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
    marginBottom: 12,
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

  listDivider: { height: hairline, backgroundColor: DIVIDER },

  // Error
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
  row: { paddingVertical: 13, paddingHorizontal: 18 },
  rowLine1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNoText: {
    fontSize: 14,
    fontFamily: Typography.numberHeavy,
    fontWeight: '500',
    color: PRIMARY,
    flex: 1,
    paddingRight: 14,
    flexShrink: 1,
  },
  amountsCol: { alignItems: 'flex-end', flexShrink: 0 },
  amountText: { fontSize: 14, fontFamily: Typography.numberHeavy, fontWeight: '500', color: PRIMARY },
  pendingLabelText: { marginTop: 2, fontSize: 12, fontFamily: Typography.body, color: SECONDARY },
  pendingAmountText: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '600',
    color: PENDING_ORANGE,
  },
  rowLine2: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  companyText: { fontSize: 13, fontFamily: Typography.body, color: PRIMARY, flex: 1, paddingRight: 14, flexShrink: 1 },
  dateText: { fontSize: 12, fontFamily: Typography.body, color: SECONDARY, flexShrink: 0 },
  rowLine3: { marginTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vendorCountText: { fontSize: 12, fontFamily: Typography.body, color: SECONDARY },
  daysText: { fontSize: 12, fontFamily: Typography.body },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 6 },
  emptyTitle: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: SECONDARY,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: SECONDARY,
    opacity: 0.8,
    textAlign: 'center',
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
