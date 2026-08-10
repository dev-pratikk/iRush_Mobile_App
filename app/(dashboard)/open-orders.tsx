import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, RefreshControl, Alert, BackHandler } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { Typography } from '../../constants/Typography';
import { router, usePathname, useFocusEffect } from 'expo-router';
import { NotificationHeaderButton } from '../../components/navigation/NotificationHeaderButton';
import {
  OpenOrdersResponse,
  EMPTY_OPEN_ORDERS,
  SAMPLE_OPEN_ORDERS,
  getOpenOrders,
} from '../../services/api/open-orders.service';
import { formatCurrencyWithCents, formatNumber } from '../../services/api/orders.service';
import { SkeletonSummaryCard, SkeletonKpiCard } from '../../components/ui/SkeletonLoader';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const DEFAULT_TIMEOUT_MS = 20000;

const Header = () => {
  const colors = useThemeColors();
  return (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Open orders
        </Text>
      </View>
      <View style={styles.headerRight}>
        <NotificationHeaderButton iconColor={colors.textPrimary} size={22} />
      </View>
    </View>
  );
};

const SummaryCard = ({ data }: { data: OpenOrdersResponse }) => {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryColLeft}>
          <Text style={styles.summaryCountLabel}>Open orders</Text>
          <Text style={styles.summaryCount}>{formatNumber(data.totalOpenOrders)}</Text>
        </View>
        <View style={styles.summaryColRight}>
          <Text style={styles.summaryValue}>{formatCurrencyWithCents(data.totalOpenOrdersAmount)}</Text>
        </View>
      </View>
    </View>
  );
};

const PendingAndPartialKpiGrid = ({ data }: { data: OpenOrdersResponse }) => {
  const pendingCount = data.pendingOrdersCount ?? data.pendingOrdersSummary?.totalOrders ?? 0;
  const pendingAmount = data.pendingOrdersAmount ?? data.pendingOrdersSummary?.totalOrderedAmount ?? 0;

  const partialCount = data.partialOrdersCount ?? data.partialOrdersSummary?.totalOrders ?? 0;
  const partialAmount = data.partialOrdersAmount ?? data.partialOrdersSummary?.totalOrderedAmount ?? 0;

  return (
    <View style={styles.kpiRow}>
      <TouchableOpacity
        style={styles.whiteKpiCard}
        onPress={() => router.push('/pending-orders' as any)}
        activeOpacity={0.7}
      >
        <Text style={styles.kpiHeaderLabel}>PENDING ORDERS</Text>
        <Text style={styles.kpiCountText}>{formatNumber(pendingCount)}</Text>
        <Text style={styles.kpiAmountText}>{formatCurrencyWithCents(pendingAmount)}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.whiteKpiCard}
        onPress={() => router.push('/partial-orders' as any)}
        activeOpacity={0.7}
      >
        <Text style={styles.kpiHeaderLabel}>PARTIAL ORDERS</Text>
        <Text style={styles.kpiCountText}>{formatNumber(partialCount)}</Text>
        <Text style={styles.kpiAmountText}>{formatCurrencyWithCents(partialAmount)}</Text>
      </TouchableOpacity>
    </View>
  );
};

const BottomNav = () => {
  const colors = useThemeColors();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const tabs = [
    { icon: 'home', label: 'Dashboard', route: '/' },
    { icon: 'document-text', label: 'Orders', route: '/orders' },
    { icon: 'cube', label: 'Open orders', route: '/open-orders' },
    { icon: 'chatbox', label: 'Quotes', route: '/quotes' },
  ];
  return (
    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 4),
          height: 56 + Math.max(insets.bottom, 4),
        },
      ]}
    >
      {tabs.map((tab, index) => {
        const isActive = pathname === tab.route;
        return (
          <TouchableOpacity
            key={index}
            style={styles.navTab}
            onPress={() => router.push(tab.route as any)}
          >
            <Ionicons
              name={isActive ? (tab.icon as any) : (`${tab.icon}-outline` as any)}
              size={24}
              color={isActive ? colors.primary : colors.inactive}
            />
            <Text style={[styles.navLabel, { color: isActive ? colors.primary : colors.inactive }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const FixedSummaryTable = ({
  title,
  count,
  amount,
  summary,
  onPress,
}: {
  title: string;
  count: number;
  amount: number;
  summary?: any;
  onPress: () => void;
}) => {
  const statRows = [
    { label: 'No of Orders', value: formatNumber(count) },
    { label: 'Total Ordered Value', value: formatCurrencyWithCents(amount) },
    { label: 'Orders Assigned To Vendors', value: formatNumber(summary?.ordersWithVendorCount ?? 0) },
    {
      label: 'Assigned Vendor Order Value',
      value: formatCurrencyWithCents(summary?.ordersWithVendorAmount ?? summary?.vendorOrderAmount ?? 0),
    },
    { label: 'Orders Without Vendor Assignment', value: formatNumber(summary?.ordersWithoutVendorCount ?? 0) },
    { label: 'Shipped Order Quantity Value', value: formatCurrencyWithCents(summary?.totalShippedAmount ?? 0) },
    { label: 'Pending Order Quantity Value', value: formatCurrencyWithCents(summary?.totalPendingAmount ?? amount) },
    { label: 'Invoiced Order Quantity Value', value: formatCurrencyWithCents(summary?.totalInvoicedAmount ?? 0) },
    { label: 'Payment Received', value: formatCurrencyWithCents(summary?.totalPaymentsReceived ?? 0) },
    { label: 'Advance Payment Received', value: formatCurrencyWithCents(summary?.advancePaymentReceived ?? 0) },
  ];

  return (
    <TouchableOpacity style={styles.breakdownCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.breakdownHeaderFixed}>
        <View style={styles.breakdownTitleRow}>
          <Text style={styles.breakdownTitle}>{title}</Text>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </View>
      </View>
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
    </TouchableOpacity>
  );
};

export default function OpenOrdersScreen() {
  const colors = useThemeColors();
  const { user } = useAuthContext();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OpenOrdersResponse>(EMPTY_OPEN_ORDERS);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const token: string | null = (user as any)?.token ?? null;
      const res = await getOpenOrders({ token, timeoutMs: DEFAULT_TIMEOUT_MS });
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to load open orders');
      setData(SAMPLE_OPEN_ORDERS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const pendingCount = data.pendingOrdersCount ?? data.pendingOrdersSummary?.totalOrders ?? 0;
  const pendingAmount = data.pendingOrdersAmount ?? data.pendingOrdersSummary?.totalOrderedAmount ?? 0;

  const partialCount = data.partialOrdersCount ?? data.partialOrdersSummary?.totalOrders ?? 0;
  const partialAmount = data.partialOrdersAmount ?? data.partialOrdersSummary?.totalOrderedAmount ?? 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <Header />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />
        }
      >
        <View style={styles.contentContainer}>
          {loading ? (
            <>
              <SkeletonSummaryCard />
              <View style={styles.kpiRow}>
                <SkeletonKpiCard />
                <SkeletonKpiCard />
              </View>
              <SkeletonSummaryCard />
              <SkeletonSummaryCard />
            </>
          ) : (
            <>
              <SummaryCard data={data} />
              <PendingAndPartialKpiGrid data={data} />
              
              <FixedSummaryTable
                title="Pending Orders Summary"
                count={pendingCount}
                amount={pendingAmount}
                summary={data.pendingOrdersSummary}
                onPress={() => router.push('/pending-orders' as any)}
              />

              <FixedSummaryTable
                title="Partial Orders Summary"
                count={partialCount}
                amount={partialAmount}
                summary={data.partialOrdersSummary}
                onPress={() => router.push('/partial-orders' as any)}
              />
            </>
          )}
          {!!error && !loading && (
            <View style={styles.errorCard}>
              <Ionicons name="warning-outline" size={18} color="#8A1C1C" />
              <Text style={styles.errorText}>{error} — showing sample data</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  contentContainer: { padding: 16, gap: 16 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: Typography.titleSerif },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: Typography.headingSemiBold },

  summaryCard: {
    backgroundColor: '#3A4151',
    borderRadius: 16,
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryColLeft: { gap: 4 },
  summaryCountLabel: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  summaryCount: {
    fontSize: 32,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryColRight: { alignItems: 'flex-end' },
  summaryValue: {
    fontSize: 22,
    fontFamily: Typography.numberHeavy,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  whiteKpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E6E2',
    padding: 16,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiHeaderLabel: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    color: '#8C94A0',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  kpiCountText: {
    fontSize: 26,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
  },
  kpiAmountText: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
  },

  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E6E2',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginTop: 4,
  },
  breakdownHeaderFixed: {
    backgroundColor: '#3A4151',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  breakdownTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownTitle: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    color: '#FFFFFF',
  },
  breakdownSubtitle: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  breakdownContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  breakdownRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  breakdownRowLabel: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
  },
  breakdownRowValue: {
    fontSize: 13,
    fontFamily: Typography.numberHeavy,
    fontWeight: '700',
    color: '#0F172A',
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDF2F2',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F8B4B4',
  },
  errorText: { fontSize: 12, color: '#8A1C1C', flex: 1 },

  bottomNav: {
    height: 58,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5,
  },
  navTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 10,
    fontFamily: Typography.body,
    marginTop: 3,
  },
});
