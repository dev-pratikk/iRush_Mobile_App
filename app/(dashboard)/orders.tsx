import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, ActivityIndicator, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { router, usePathname } from 'expo-router';
import { useAuthContext } from '../../context/AuthContext';
import {
  formatCurrencyWithCents,
  formatNumber,
  formatOrderDate,
  SAMPLE_ORDERS,
  DashboardPeriod as DatePeriod,
} from '../../services/api/orders.service';
import { useOrders, type OrdersRowItem } from '../../hooks/useOrders';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const DIVIDER = '#E7E6E2';
const PAGE_BG = '#FFFFFF';
const SUMMARY_CARD_BG = '#3A4151';
const SUMMARY_CARD_TEXT = '#FFFFFF';
const TOGGLE_TRACK = '#EDEDEC';

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

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ period, usingSample }: { period: DatePeriod; usingSample: boolean }) => {
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

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

const BottomNav = () => {
  const colors = useThemeColors();
  const pathname = usePathname();
  const tabs = [
    { icon: 'home', label: 'Dashboard', route: '/' },
    { icon: 'cube', label: 'Open orders', route: '/open-orders' },
    { icon: 'chatbox', label: 'Quotes', route: '/quotes' },
    { icon: 'bar-chart', label: 'Reports', route: '/reports' },
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
  const [period, setPeriod] = useState<DatePeriod>('today');

  const token = (user as any)?.token ?? null;
  const {
    items,
    meta,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefreshing,
  } = useOrders(period, token);

  // Fall back to sample data when we have an error and no items loaded yet
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
  const displayCount = usingSample ? SAMPLE_ORDERS.count : (meta?.count ?? 0);
  const displayTotal = usingSample ? SAMPLE_ORDERS.totalAmount : (meta?.totalAmount ?? 0);

  const errorMessage = useMemo(() => {
    if (!isError) return null;
    return (error as Error | null)?.message ?? 'Failed to load orders';
  }, [isError, error]);

  const renderItem = useCallback(({ item }: { item: OrdersRowItem }) => {
    return <OrderRow item={item} />;
  }, []);

  const keyExtractor = useCallback((item: OrdersRowItem) => item.id, []);

  const ItemSeparator = useCallback(() => <View style={styles.dividerHairline} />, []);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
      />
    ),
    [period, isLoading, items.length, errorMessage, usingSample, displayCount, displayTotal, isRefreshing, refetch]
  );

  const listEmpty = useMemo(() => {
    if (isLoading && items.length === 0) return null;
    return <EmptyState period={period} usingSample={usingSample} />;
  }, [isLoading, items.length, period, usingSample]);

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
    if (isFetchingNextPage) {
      return (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading more…
          </Text>
        </View>
      );
    }
    return null;
  }, [isLoading, isRefreshing, items.length, isFetchingNextPage, colors]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: PAGE_BG }]} edges={['top']}>
      <Header />
      <FlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        ItemSeparatorComponent={ItemSeparator}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={9}
        removeClippedSubviews
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
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
  dividerHairline: {
    height: hairline,
    backgroundColor: DIVIDER,
    marginHorizontal: 16,
  },

  // Order rows (2-column layout matching pending & partial orders)
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
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: Typography.body,
    fontWeight: '400',
    color: SECONDARY,
    textAlign: 'center',
    opacity: 0.8,
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
