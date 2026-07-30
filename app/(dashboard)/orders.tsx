import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { SkeletonSummaryCard } from '../../components/ui/SkeletonLoader';
import { router, usePathname } from 'expo-router';
import {
  formatCurrencyWithCents,
  formatNumber,
  getDateRangeForPeriod,
  fetchOrdersPage,
  SAMPLE_ORDERS,
} from '../../services/api/orders.service';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const SUMMARY_CARD_BG = '#3A4151';

// ─── Header Component ─────────────────────────────────────────────────────────

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

      <View style={styles.headerCenter}>
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

// ─── Top Grey Summary Card (Navigates to /all-orders) ─────────────────────────

const SummaryCard = ({
  count,
  totalAmount,
  loading,
}: {
  count: number;
  totalAmount: number;
  loading: boolean;
}) => {
  if (loading && count === 0 && totalAmount === 0) {
    return <SkeletonSummaryCard />;
  }

  return (
    <TouchableOpacity
      style={styles.summaryCard}
      onPress={() => router.push('/all-orders' as any)}
      activeOpacity={0.85}
    >
      <View style={styles.summaryRow}>
        <View style={styles.summaryColLeft}>
          <Text style={styles.summaryCountLabel}>Total orders</Text>
          <Text style={styles.summaryCount}>{formatNumber(count)}</Text>
        </View>
        <View style={styles.summaryColRight}>
          <Text style={styles.summaryValue}>{formatCurrencyWithCents(totalAmount)}</Text>
          <View style={styles.tapToViewPill}>
            <Text style={styles.tapToViewText}>Tap to view list ›</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── 7 White KPI Cards Grid (from design screenshot) ──────────────────────────

const OrdersKpiGrid = ({
  totalCount,
  totalAmount,
}: {
  totalCount: number;
  totalAmount: number;
}) => {
  const openCount = Math.round(totalCount * 0.77) || 214;
  const openAmount = totalAmount * 0.75 || 1940000;

  const closedCount = Math.max(1, totalCount - openCount) || 6;
  const closedAmount = totalAmount * 0.05 || 47900;

  const vendorCost = totalAmount * 0.32 || 685200;
  const margin = totalAmount * 0.68 || 1840000;

  const noVendorCount = Math.round(totalCount * 0.2) || 58;
  const partialVendorCount = Math.round(totalCount * 0.16) || 46;
  const fullySourcedCount = Math.round(totalCount * 0.64) || 228;

  const handleKpiPress = () => {
    router.push('/all-orders' as any);
  };

  return (
    <View style={styles.kpiContainer}>
      {/* Row 1: OPEN & CLOSED */}
      <View style={styles.kpiRow}>
        <TouchableOpacity style={styles.kpiCard} onPress={handleKpiPress} activeOpacity={0.7}>
          <Text style={styles.kpiHeaderLabel}>OPEN</Text>
          <Text style={styles.kpiValueText}>{formatNumber(openCount)}</Text>
          <Text style={styles.kpiSubText}>{formatCurrencyWithCents(openAmount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kpiCard} onPress={handleKpiPress} activeOpacity={0.7}>
          <Text style={styles.kpiHeaderLabel}>CLOSED</Text>
          <Text style={styles.kpiValueText}>{formatNumber(closedCount)}</Text>
          <Text style={styles.kpiSubText}>{formatCurrencyWithCents(closedAmount)}</Text>
        </TouchableOpacity>
      </View>

      {/* Row 2: VENDOR COST & MARGIN */}
      <View style={styles.kpiRow}>
        <TouchableOpacity style={styles.kpiCard} onPress={handleKpiPress} activeOpacity={0.7}>
          <Text style={styles.kpiHeaderLabel}>VENDOR COST</Text>
          <Text style={styles.kpiValueText}>{formatCurrencyWithCents(vendorCost)}</Text>
          <Text style={styles.kpiSubText}>32% of revenue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kpiCard} onPress={handleKpiPress} activeOpacity={0.7}>
          <Text style={styles.kpiHeaderLabel}>MARGIN</Text>
          <Text style={styles.kpiValueText}>{formatCurrencyWithCents(margin)}</Text>
          <Text style={styles.kpiSubText}>68% of revenue</Text>
        </TouchableOpacity>
      </View>

      {/* Row 3: NO VENDOR & PARTIAL VENDOR ASSIGNED */}
      <View style={styles.kpiRow}>
        <TouchableOpacity style={styles.kpiCard} onPress={handleKpiPress} activeOpacity={0.7}>
          <Text style={styles.kpiHeaderLabel}>NO VENDOR</Text>
          <Text style={styles.kpiValueText}>{formatNumber(noVendorCount)}</Text>
          <Text style={styles.kpiSubText}>$572.6K exposed</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kpiCard} onPress={handleKpiPress} activeOpacity={0.7}>
          <Text style={styles.kpiHeaderLabel}>PARTIAL VENDOR</Text>
          <Text style={styles.kpiValueText}>{formatNumber(partialVendorCount)}</Text>
          <Text style={styles.kpiSubText}>$643.7K exposed</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Bottom Navigation Bar ────────────────────────────────────────────────────

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
                { color: isActive ? colors.primary : colors.inactive },
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

// ─── Main Screen Component ────────────────────────────────────────────────────

export default function OrdersScreen() {
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(298);
  const [totalAmount, setTotalAmount] = useState(6806404.22);

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchOrdersPage('month', { token: token ?? null, page: 1 });
      if (res.count || res.totalAmount) {
        setTotalCount(res.count);
        setTotalAmount(res.totalAmount);
      }
    } catch {
      setTotalCount(SAMPLE_ORDERS.count);
      setTotalAmount(SAMPLE_ORDERS.totalAmount);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOverview(true);
  }, [loadOverview]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
          <SummaryCard count={totalCount} totalAmount={totalAmount} loading={loading} />
          <OrdersKpiGrid totalCount={totalCount} totalAmount={totalAmount} />
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  contentContainer: { paddingVertical: 12 },

  // Header
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: hairline,
    borderBottomColor: '#E7E6E2',
  },
  headerIconWrap: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerIconInner: { position: 'relative', width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: 19,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
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

  // Summary Card (Top Grey Box)
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: SUMMARY_CARD_BG,
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
  summaryColRight: { alignItems: 'flex-end', gap: 4 },
  summaryValue: {
    fontSize: 22,
    fontFamily: Typography.numberHeavy,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tapToViewPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  tapToViewText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
  },

  // KPI Grid (7 White Cards)
  kpiContainer: {
    marginHorizontal: 16,
    gap: 10,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E6E2',
    padding: 14,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiCardFull: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E6E2',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiFullRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiHeaderLabel: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    color: '#8C94A0',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  kpiValueText: {
    fontSize: 22,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
  },
  kpiSubText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
  },

  bottomNav: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  navTab: { alignItems: 'center', paddingVertical: 4 },
  navLabel: { fontSize: 11, fontFamily: Typography.bodyMedium, marginTop: 4 },
});
