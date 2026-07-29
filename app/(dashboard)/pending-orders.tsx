import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, RefreshControl, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { useAuthContext } from '../../context/AuthContext';
import { router, usePathname } from 'expo-router';
import {
  OpenOrderItem,
  getOpenOrders,
  SAMPLE_OPEN_ORDERS,
  extractOrderDate,
  extractDaysLeft,
  extractVendorCount,
  trimStr,
} from '../../services/api/openOrders';
import { formatCurrencyWithCents, formatNumber, formatOrderDate } from '../../services/api/orders';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const DIVIDER = '#E7E6E2';
const PAGE_BG = '#FFFFFF';
const SUMMARY_CARD_BG = '#3A4151';
const SUMMARY_CARD_TEXT = '#FFFFFF';

const DEFAULT_TIMEOUT_MS = 20000;
const PAGE_SIZE = 20;

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
        <Text style={styles.headerTitle}>Pending orders</Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );
};

const SummaryCard = ({ count, total }: { count: number; total: number }) => {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryCountText}>{formatNumber(count)}</Text>
      <Text style={styles.summaryAmountText}>{formatCurrencyWithCents(total)}</Text>
    </View>
  );
};

const OrderRow = React.memo(function OrderRow({ item }: { item: OpenOrderItem }) {
  const vendors = extractVendorCount(item);
  const daysLeft = extractDaysLeft(item);
  const orderDate = formatOrderDate(extractOrderDate(item.ORDER_DATE));
  return (
    <View style={styles.row}>
      <View style={styles.rowLine1}>
        <Text style={styles.orderNoText} numberOfLines={1} ellipsizeMode="tail">
          {trimStr(item.ORDER_NO)}
        </Text>
        <Text style={styles.amountText}>{formatCurrencyWithCents(item.ORDER_TOTALCOST_AF_DISCCHRG)}</Text>
      </View>
      <View style={styles.rowLine2}>
        <Text style={styles.companyText} numberOfLines={1} ellipsizeMode="tail">
          {trimStr(item.companyName)}
        </Text>
        <Text style={styles.dateText}>{orderDate}</Text>
      </View>
      <View style={styles.rowLine3}>
        <Text style={styles.vendorCountText}>
          {vendors.completed}/{vendors.total} vendors
        </Text>
        <Text style={styles.daysText}>
          {daysLeft < 0 ? `+${Math.abs(daysLeft)}d late` : `${daysLeft}d left`}
        </Text>
      </View>
    </View>
  );
});

const EmptyState = () => {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={36} color={SECONDARY} />
      <Text style={styles.emptyTitle}>No pending orders</Text>
      <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
    </View>
  );
};

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
          <TouchableOpacity key={index} style={styles.navTab} onPress={() => router.push(tab.route as any)}>
            <Ionicons
              name={isActive ? `${tab.icon}` : `${tab.icon}-outline` as any}
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

export default function PendingOrdersScreen() {
  const { user } = useAuthContext();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<OpenOrderItem[]>([]);
  const [summary, setSummary] = useState<{ count: number; total: number }>({ count: 0, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const token: string | null = (user as any)?.token ?? null;
      const res = await getOpenOrders({ token, timeoutMs: DEFAULT_TIMEOUT_MS });
      const list = (res.pendingOrders || []).map((o) => ({
        ...o,
        orderType: trimStr(o.orderType),
        pcbpartNo: trimStr(o.pcbpartNo),
        orderStatus: trimStr(o.orderStatus),
        companyName: trimStr(o.companyName),
        companyCode: trimStr(o.companyCode),
        quoteNo: trimStr(o.quoteNo),
        salesPersonName: trimStr(o.salesPersonName),
        netTerm: trimStr(o.netTerm),
      }));
      setItems(list);
      setCurrentPage(1);
      setSummary({
        count: typeof res.pendingOrdersCount === 'number' ? res.pendingOrdersCount : list.length,
        total: typeof res.pendingOrdersAmount === 'number' ? res.pendingOrdersAmount : 0,
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to load pending orders');
      const fallback = SAMPLE_OPEN_ORDERS.pendingOrders || [];
      setItems(fallback);
      setCurrentPage(1);
      setSummary({
        count: SAMPLE_OPEN_ORDERS.pendingOrdersCount,
        total: SAMPLE_OPEN_ORDERS.pendingOrdersAmount,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const keyExtractor = useCallback(
    (item: OpenOrderItem, i: number) => `${trimStr(item.ORDER_ID) || item.ORDER_NO}-${i}`,
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: OpenOrderItem }) => <OrderRow item={item} />,
    []
  );

  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(items.length / PAGE_SIZE)), [items.length]);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return items.slice(startIndex, startIndex + PAGE_SIZE);
  }, [items, currentPage]);
  const pageStart = items.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, items.length);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const ListHeader = useMemo(
    () => (
      <View>
        <SummaryCard count={summary.count} total={summary.total} />
        {!!error && (
          <View style={styles.errorRow}>
            <Ionicons name="warning-outline" size={16} color="#8A1C1C" />
            <Text style={styles.errorRowText}>
              {error} — showing sample data
            </Text>
          </View>
        )}
      </View>
    ),
    [summary.count, summary.total, error]
  );

  const ListFooter = useMemo(() => {
    if (items.length === 0) return null;

    return (
      <View style={styles.paginationWrap}>
        <Text style={styles.paginationSummary}>
          Showing {pageStart}-{pageEnd} of {items.length}
        </Text>
        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
            onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <Text style={[styles.pageButtonText, currentPage === 1 && styles.pageButtonTextDisabled]}>Previous</Text>
          </TouchableOpacity>
          <Text style={styles.pageIndicator}>
            {currentPage} / {totalPages}
          </Text>
          <TouchableOpacity
            style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
            onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <Text style={[styles.pageButtonText, currentPage === totalPages && styles.pageButtonTextDisabled]}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [items.length, pageStart, pageEnd, currentPage, totalPages]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading pending orders…</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={paginatedItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flatlistContent}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={9}
        removeClippedSubviews
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />
        }
      />
    );
  }, [loading, paginatedItems, renderItem, keyExtractor, ListHeader, ListFooter, ItemSeparator, refreshing, onRefresh]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />
      {content}
      <BottomNav />
    </SafeAreaView>
  );
}

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  flatlistContent: { paddingBottom: 40, flexGrow: 1 },

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
  },
  summaryCountText: {
    fontSize: 34,
    lineHeight: 38,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: SUMMARY_CARD_TEXT,
    includeFontPadding: false,
  },
  summaryAmountText: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: SUMMARY_CARD_TEXT,
    includeFontPadding: false,
  },

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
  errorRowText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Typography.body,
    color: '#8A1C1C',
  },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  loadingText: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: SECONDARY,
  },

  separator: { height: hairline, backgroundColor: DIVIDER, marginHorizontal: 16 },

  row: {
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  rowLine1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  orderNoText: {
    fontSize: 14,
    fontFamily: Typography.numberHeavy,
    fontWeight: '500',
    color: PRIMARY,
    includeFontPadding: false,
    flex: 1,
    paddingRight: 14,
    flexShrink: 1,
  },
  amountText: {
    fontSize: 14,
    fontFamily: Typography.numberHeavy,
    fontWeight: '500',
    color: PRIMARY,
    includeFontPadding: false,
    flexShrink: 0,
  },
  rowLine2: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  companyText: {
    fontSize: 13,
    fontFamily: Typography.body,
    fontWeight: '400',
    color: PRIMARY,
    includeFontPadding: false,
    flex: 1,
    paddingRight: 14,
    flexShrink: 1,
  },
  dateText: {
    fontSize: 12,
    fontFamily: Typography.body,
    fontWeight: '400',
    color: SECONDARY,
    includeFontPadding: false,
    flexShrink: 0,
  },
  rowLine3: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vendorCountText: {
    fontSize: 12,
    fontFamily: Typography.body,
    fontWeight: '400',
    color: SECONDARY,
    includeFontPadding: false,
  },
  daysText: {
    fontSize: 12,
    fontFamily: Typography.body,
    fontWeight: '400',
    color: SECONDARY,
    includeFontPadding: false,
  },

  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 6 },
  emptyTitle: { fontSize: 15, fontFamily: Typography.headingSemiBold, fontWeight: '600', color: SECONDARY, marginTop: 10 },
  emptySubtitle: { fontSize: 12, fontFamily: Typography.body, color: SECONDARY, opacity: 0.8, textAlign: 'center' },

  paginationWrap: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
    gap: 10,
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
    gap: 10,
  },
  pageButton: {
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EFEFEC',
    alignItems: 'center',
  },
  pageButtonDisabled: {
    backgroundColor: '#F5F5F2',
  },
  pageButtonText: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: PRIMARY,
  },
  pageButtonTextDisabled: {
    color: SECONDARY,
  },
  pageIndicator: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: PRIMARY,
  },

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
