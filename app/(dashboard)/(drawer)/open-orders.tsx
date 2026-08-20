import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../../context/ThemeContext';
import { useAuthContext } from '../../../context/AuthContext';
import { Typography } from '../../../constants/Typography';
import { router, usePathname } from 'expo-router';
import { BottomNavBar as BottomNav } from '../../../components/navigation/BottomNavBar';
import {
  OpenOrdersResponse,
  EMPTY_OPEN_ORDERS,
  SAMPLE_OPEN_ORDERS,
  getOpenOrders,
} from '../../../services/api/open-orders.service';
import { formatCurrencyWithCents, formatNumber } from '../../../services/api/orders.service';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const DIVIDER = '#E7E6E2';
const SUMMARY_CARD_BG = '#3A4151';
const SUMMARY_CARD_TEXT = '#FFFFFF';
const CARD_BG = '#FFFFFF';
const MUTED_LABEL = '#9C9B95';

const DEFAULT_TIMEOUT_MS = 20000;

const Header = () => {
  const colors = useThemeColors();
  return (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => router.back()}
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
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const SummaryCard = ({ data }: { data: OpenOrdersResponse }) => {
  return (
    <TouchableOpacity
      style={styles.summaryCard}
      onPress={() => router.push('/open-orders' as any)}
      activeOpacity={0.85}
    >
      <View style={styles.summaryRow}>
        <View style={styles.summaryColLeft}>
          <Text style={styles.summaryCountLabel}>Open orders</Text>
          <Text style={styles.summaryCount}>{formatNumber(data.totalOpenOrders)}</Text>
        </View>
        <View style={styles.summaryColRight}>
          <Text style={styles.summaryValue}>{formatCurrencyWithCents(data.totalOpenOrdersAmount)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const OrderSectionCard = ({
  title,
  sectionStats,
  navigateTo,
}: {
  title: string;
  sectionStats: { label: string; value: string }[];
  navigateTo: string;
}) => {
  const colors = useThemeColors();
  return (
    <View style={[styles.card, { backgroundColor: CARD_BG }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push(navigateTo as any)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={20} color={SECONDARY} />
        </TouchableOpacity>
      </View>
      <View style={styles.sectionContent}>
        {sectionStats.map((item, index) => (
          <View
            key={index}
            style={[styles.sectionRow, index < sectionStats.length - 1 && styles.sectionRowBorder]}
          >
            <Text style={[styles.rowLabel, { color: MUTED_LABEL }]}>{item.label}</Text>
            <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const pendingStats = [
    { label: 'No of Orders', value: '236' },
    { label: 'Total Pending Orders Value', value: '$3,614,422.33' },
    { label: 'Orders Assigned To Vendors', value: '178' },
    { label: 'Assigned Vendor Order Value', value: '$1,221,905.30' },
    { label: 'Orders Without Vendor Assignment', value: '58' },
    { label: 'Shipped Order Quantity Value', value: '0' },
    { label: 'Pending Order Quantity Value', value: '$3,614,422.33' },
    { label: 'Invoiced Order Quantity Value', value: '0' },
    { label: 'Payment Recived', value: '0' },
    { label: 'Advance Payment Recieved', value: '0' },
  ];

  const partialStats = [
    { label: 'No of Orders', value: '66' },
    { label: 'Total Partial Order Value', value: '$3,157,894.75' },
    { label: 'Orders Assigned To Vendors', value: '65' },
    { label: 'Assigned Vendor Order Value', value: '$1,020,945.56' },
    { label: 'Orders Without Vendor Assignment', value: '1' },
    { label: 'Shipped Order Quantity Value', value: '$2,140,192.83' },
    { label: 'Pending Order Quantity Value', value: '$1,017,701.92' },
    { label: 'Invoiced Order Quantity Value', value: '$2,210,717.97' },
    { label: 'Payment Recived', value: '$1,711,314.30' },
    { label: 'Advance Payment Recieved', value: '0' },
  ];

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
          <SummaryCard data={data} />
          <OrderSectionCard
            title="Pending orders"
            sectionStats={pendingStats}
            navigateTo="/pending-orders"
          />
          <OrderSectionCard
            title="Partial orders"
            sectionStats={partialStats}
            navigateTo="/partial-orders"
          />
          {!!error && (
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

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

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
    paddingVertical: 12,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontFamily: Typography.titleSerif },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerButton: { position: 'relative', width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  badge: {
    position: 'absolute', top: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: 'white', fontSize: 10, fontFamily: Typography.headingSemiBold },

  summaryCard: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: SUMMARY_CARD_BG,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  summaryColLeft: { flex: 1, paddingRight: 12 },
  summaryColRight: { alignItems: 'flex-end', flexShrink: 0 },
  summaryCountLabel: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: 'rgba(255,255,255,0.75)',
    includeFontPadding: false,
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 34,
    lineHeight: 38,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: SUMMARY_CARD_TEXT,
    includeFontPadding: false,
  },
  summaryAmountLabel: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: 'rgba(255,255,255,0.75)',
    includeFontPadding: false,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: SUMMARY_CARD_TEXT,
    includeFontPadding: false,
  },

  card: {
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    padding: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleWrap: { flex: 1 },
  sectionTitle: { fontSize: 16, fontFamily: Typography.headingSemiBold, fontWeight: '600' },
  sectionContent: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: hairline,
    borderTopColor: DIVIDER,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  sectionRowBorder: {
    borderBottomWidth: hairline,
    borderBottomColor: DIVIDER,
  },
  rowLabel: { fontSize: 13, fontFamily: Typography.body, fontWeight: '400' },
  rowValue: { fontSize: 13, fontFamily: Typography.bodySemiBold, fontWeight: '600' },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FBEAEA',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Typography.body,
    color: '#8A1C1C',
  },

  bottomNav: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    borderTopWidth: hairline,
  },
  navTab: { alignItems: 'center', paddingVertical: 4 },
  navLabel: { fontSize: 11, fontFamily: Typography.bodyMedium, marginTop: 4 },
});