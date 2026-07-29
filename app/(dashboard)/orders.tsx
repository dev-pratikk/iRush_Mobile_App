import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, ActivityIndicator, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { router, usePathname } from 'expo-router';
import { useAuthContext } from '../../context/AuthContext';
import {
  getDashboardOrders,
  OrdersListResponse,
  OrderItem,
  formatCurrency,
  formatNumber,
  formatOrderDate,
  SAMPLE_ORDERS,
  DashboardPeriod as DatePeriod,
} from '../../services/api/orders.service';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const SUMMARY_TEXT = '#8A8A85';
const TAG_BG = '#EFEFEC';
const TAG_TEXT = '#54534F';
const DIVIDER = '#E7E6E2';
const TOGGLE_TRACK = '#EDEDEC';
const PAGE_BG = '#FFFFFF';

const Header = () => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerIconWrap}
        onPress={() => router.back()}
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

const OrderSummaryBar = ({
  data,
  loading,
  usingSample,
}: {
  data: OrdersListResponse | null;
  loading: boolean;
  usingSample: boolean;
}) => {
  const active = data ?? SAMPLE_ORDERS;

  return (
    <View style={styles.summaryBar}>
      <View style={styles.summaryRow}>
        {loading && !data ? (
          <ActivityIndicator size="small" color={SUMMARY_TEXT} style={{ height: 14 }} />
        ) : (
          <Text style={styles.summaryText}>
            {formatNumber(active.count)} order{active.count === 1 ? '' : 's'} · {formatCurrency(active.totalAmount)}
          </Text>
        )}
        {usingSample && !loading ? (
          <View style={styles.demoPill}>
            <Text style={styles.demoPillText}>Demo</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const OrderRow = React.memo(function OrderRow({ item }: { item: OrderItem }) {
  const typeName = (item.ORDER_TYPE_NAME || '').trim();
  const salesperson = (item.SALESPERSON_NAME || '').trim();
  const dateStr = formatOrderDate(item.ORDER_DATE || item.UPDATED_DATE);

  return (
    <View style={styles.row}>
      <View style={styles.rowLine1}>
        <Text
          style={styles.rowLine1Left}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          <Text style={styles.orderNoText}>#{item.ORDER_NO}</Text>
          <Text>{' '}</Text>
          <Text style={styles.companyText}>{item.COMPANY_NAME}</Text>
        </Text>
        <Text style={styles.amountText}>
          {formatCurrency(item.ORDER_TOTAL)}
        </Text>
      </View>
      <View style={styles.rowLine2}>
        <View style={styles.rowLine2Left}>
          {typeName ? (
            <View style={styles.tagBadge}>
              <Text style={styles.tagText} numberOfLines={1}>
                {typeName}
              </Text>
            </View>
          ) : null}
          {salesperson ? (
            <Text style={styles.salespersonText} numberOfLines={1}>
              {salesperson}
            </Text>
          ) : null}
        </View>
        {dateStr ? (
          <Text style={styles.dateText}>{dateStr}</Text>
        ) : null}
      </View>
    </View>
  );
});

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
              name={isActive ? `${tab.icon}` : `${tab.icon}-outline` as any}
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

const ListHeaderComponent = React.memo(function ListHeaderComponent({
  period,
  setPeriod,
  disabled,
  error,
  onRetryTap,
  attempts,
  usingSample,
  data,
  summaryLoading,
}: {
  period: DatePeriod;
  setPeriod: (p: DatePeriod) => void;
  disabled: boolean;
  error: string | null;
  onRetryTap: () => void;
  attempts: number;
  usingSample: boolean;
  data: OrdersListResponse | null;
  summaryLoading: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View>
      <DateSegmentControl period={period} setPeriod={setPeriod} disabled={disabled} />
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
          {attempts > 0 && usingSample && (
            <Text style={styles.sampleHint}>Showing demo data below</Text>
          )}
        </TouchableOpacity>
      ) : null}
      <OrderSummaryBar data={data} loading={summaryLoading} usingSample={usingSample} />
      <View style={styles.dividerHairline} />
    </View>
  );
});

export default function OrdersListScreen() {
  const colors = useThemeColors();
  const { user } = useAuthContext();
  const [period, setPeriod] = useState<DatePeriod>('today');
  const [data, setData] = useState<OrdersListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const usingSample = data === null;
  const activeData = data ?? SAMPLE_ORDERS;

  const fetchOrders = useCallback(
    async (isRefresh = false, overridePeriod?: DatePeriod) => {
      const targetPeriod = overridePeriod ?? period;
      const setSpin = isRefresh ? setRefreshing : setLoading;
      try {
        setSpin(true);
        setError(null);
        const token: string | null = (user as any)?.token ?? null;
        const result = await getDashboardOrders(targetPeriod as any, { token });
        setData(result);
        setError(null);
      } catch (e: any) {
        const msg = e?.message || 'Failed to load orders';
        setError(msg);
        setAttempts((n) => n + 1);
      } finally {
        setSpin(false);
      }
    },
    [period, user]
  );

  useEffect(() => {
    let cancelled = false;
    fetchOrders(false, period);
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        setLoading((prev) => {
          if (prev) {
            setError('Taking too long — pull down to retry');
            return false;
          }
          return prev;
        });
      }
    }, 12000);
    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const allOrders = useMemo<OrderItem[]>(() => activeData.orders ?? [], [activeData]);

  const renderItem = useCallback(({ item }: { item: OrderItem }) => {
    return <OrderRow item={item} />;
  }, []);

  const keyExtractor = useCallback((item: OrderItem) => {
    return String(item.ORDER_ID ?? item.ORDER_NO);
  }, []);

  const listHeader = useMemo(() => (
    <ListHeaderComponent
      period={period}
      setPeriod={setPeriod}
      disabled={loading && !data}
      error={error}
      onRetryTap={() => fetchOrders(false)}
      attempts={attempts}
      usingSample={usingSample}
      data={data}
      summaryLoading={loading && !refreshing}
    />
  ), [period, loading, data, error, attempts, usingSample, refreshing, fetchOrders]);

  const listEmpty = useMemo(() => {
    if (loading && !data) return null;
    return <EmptyState period={period} usingSample={usingSample} />;
  }, [loading, data, period, usingSample]);

  const listFooter = useMemo(() => {
    if (loading && !refreshing) {
      return (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {data ? 'Updating…' : 'Loading orders…'}
          </Text>
        </View>
      );
    }
    return null;
  }, [loading, refreshing, data, colors]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: PAGE_BG }]} edges={['top']}>
      <Header />
      <FlatList
        data={allOrders}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={9}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOrders(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
      <BottomNav />
    </SafeAreaView>
  );
}

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
    marginBottom: 16,
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

  // Summary line
  summaryBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryText: {
    fontSize: 13,
    fontFamily: Typography.body,
    fontWeight: '400',
    color: SUMMARY_TEXT,
    includeFontPadding: false,
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
    height: StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5,
    backgroundColor: DIVIDER,
  },

  // Order rows
  row: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5,
    borderBottomColor: DIVIDER,
    backgroundColor: 'transparent',
  },
  rowLine1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  rowLine1Left: {
    flex: 1,
    paddingRight: 14,
    flexShrink: 1,
  },
  orderNoText: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: PRIMARY,
  },
  companyText: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: PRIMARY,
  },
  amountText: {
    fontSize: 16,
    fontFamily: Typography.numberHeavy,
    fontWeight: '600',
    color: PRIMARY,
    includeFontPadding: false,
    flexShrink: 0,
  },
  rowLine2: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLine2Left: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    flexShrink: 1,
    paddingRight: 10,
  },
  tagBadge: {
    backgroundColor: TAG_BG,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    fontWeight: '500',
    color: TAG_TEXT,
    includeFontPadding: false,
  },
  salespersonText: {
    fontSize: 12.5,
    fontFamily: Typography.body,
    fontWeight: '400',
    color: SECONDARY,
    includeFontPadding: false,
  },
  dateText: {
    fontSize: 12.5,
    fontFamily: Typography.body,
    fontWeight: '400',
    color: SECONDARY,
    includeFontPadding: false,
    flexShrink: 0,
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
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  errorBannerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  errorBannerTitle: {
    fontSize: 14,
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
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 2,
  },
  retryChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
  },
  sampleHint: {
    fontSize: 11,
    fontFamily: Typography.body,
    color: '#8A8A85',
    marginTop: 2,
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
    borderTopWidth: 1,
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
