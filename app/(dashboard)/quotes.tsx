import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, ActivityIndicator, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, usePathname } from 'expo-router';
import { useAuthContext } from '../../context/AuthContext';
import { DatePeriod } from '../../constants/mockDashboardData';
import {
  getDashboardQuotes,
  QuotesDashboardResponse,
  SAMPLE_QUOTES,
  computeConversionRate,
  formatNumber,
} from '../../services/api/quotes';

const PRIMARY = '#2C2C2A';
const MUTED = '#6F6E6A';
const SECONDARY = '#9C9B95';
const CARD_BORDER = '#D8D7D2';
const DARK_CARD = '#3D4453';
const WHITE = '#FFFFFF';
const PAGE_BG = '#FFFFFF';
const TOGGLE_TRACK = '#EDEDEC';
const TAG_BG = '#EFEFEC';
const TAG_TEXT = '#54534F';
const DIVIDER = '#E7E6E2';

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
        <Text style={styles.headerTitle}>Quotes</Text>
      </View>
      <View style={styles.headerIconWrap}>
        <TouchableOpacity style={styles.headerIconInner} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
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
              <Text style={[styles.segmentText, { color: isActive ? PRIMARY : SECONDARY }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const OverviewDarkCard = ({ data, usingSample }: { data: QuotesDashboardResponse; usingSample: boolean }) => {
  return (
    <View style={styles.overviewCard}>
      <View style={styles.overviewRow}>
        <Text style={styles.overviewCount}>{formatNumber(data.quoteCount)}</Text>
        <Text style={styles.overviewConverted}>
          {formatNumber(data.convertedCount)} converted
        </Text>
      </View>
      {usingSample && (
        <View style={styles.demoRow}>
          <View style={styles.demoPill}>
            <Text style={styles.demoPillText}>Demo data</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const StatsRow = ({ data }: { data: QuotesDashboardResponse }) => {
  const rate = computeConversionRate(data.quoteCount, data.convertedCount);
  return (
    <View style={styles.statsRow}>
      <Text style={styles.statText}>
        New customer <Text style={styles.statValue}>{formatNumber(data.quotesByNewCustomer)}</Text>
      </Text>
      <Text style={styles.statText}>
        Existing customer <Text style={styles.statValue}>{formatNumber(data.quotesByExistingCustomer)}</Text>
      </Text>
      <Text style={styles.statText}>
        Conversion <Text style={styles.statValue}>{rate}%</Text>
      </Text>
    </View>
  );
};

const NavRow = React.memo(function NavRow({
  label,
  value,
  onPress,
  showDivider,
}: {
  label: string;
  value: string;
  onPress: () => void;
  showDivider: boolean;
}) {
  return (
    <TouchableOpacity style={styles.navRow} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.navRowLeft}>
        <Text style={styles.navRowLabel}>{label}</Text>
      </View>
      <View style={styles.navRowRight}>
        <Text style={styles.navRowValue}>{value}</Text>
        <Ionicons name="chevron-forward" size={16} color={SECONDARY} style={styles.navChevron} />
      </View>
      {showDivider ? <View style={styles.navDivider} /> : null}
    </TouchableOpacity>
  );
});

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

export default function QuotesOverviewScreen() {
  const { user } = useAuthContext();
  const [period, setPeriod] = useState<DatePeriod>('today');
  const [data, setData] = useState<QuotesDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usingSample = data === null;
  const active = data ?? SAMPLE_QUOTES;

  const fetchQuotes = useCallback(
    async (isRefresh = false, overridePeriod?: DatePeriod) => {
      const targetPeriod = overridePeriod ?? period;
      const setSpin = isRefresh ? setRefreshing : setLoading;
      try {
        setSpin(true);
        setError(null);
        const token: string | null = (user as any)?.token ?? null;
        const result = await getDashboardQuotes(targetPeriod as any, { token });
        setData(result);
      } catch (e: any) {
        const msg = e?.message || 'Failed to load quotes';
        setError(msg);
      } finally {
        setSpin(false);
      }
    },
    [period, user]
  );

  useEffect(() => {
    let cancelled = false;
    fetchQuotes(false, period);
    const safety = setTimeout(() => {
      if (!cancelled) setLoading((prev) => (prev ? (setError('Loading took too long — pull down to retry'), false) : prev));
    }, 12000);
    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const repsCount = useMemo(() => active.quotesBySalesperson.length, [active]);
  const typesCount = useMemo(() => active.quotesByServiceType.length, [active]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchQuotes(true)}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        <DateSegmentControl period={period} setPeriod={setPeriod} disabled={loading && !data} />

        {error ? (
          <TouchableOpacity style={styles.errorBanner} activeOpacity={0.8} onPress={() => fetchQuotes(false)}>
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={18} color="#8A1C1C" />
              <Text style={styles.errorTitle}>Couldn't load live quotes</Text>
            </View>
            <Text style={styles.errorDetail} numberOfLines={3}>
              {error}
            </Text>
            <View style={styles.retryChip}>
              <Ionicons name="refresh-outline" size={13} color={WHITE} />
              <Text style={styles.retryChipText}>Tap to retry</Text>
            </View>
            {usingSample && <Text style={styles.sampleHint}>Showing demo data below</Text>}
          </TouchableOpacity>
        ) : null}

        {loading && !data ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={PRIMARY} />
            <Text style={styles.loadingText}>Loading quotes…</Text>
          </View>
        ) : (
          <>
            <OverviewDarkCard data={active} usingSample={usingSample} />
            <StatsRow data={active} />

            <View style={styles.navBox}>
              <NavRow
                label="All quotes"
                value={formatNumber(active.quoteCount)}
                showDivider
                onPress={() => router.push('/all-quotes' as any)}
              />
              <NavRow
                label="By salesperson"
                value={`${repsCount} ${repsCount === 1 ? 'rep' : 'reps'}`}
                showDivider
                onPress={() => router.push('/quotes-by-salesperson' as any)}
              />
              <NavRow
                label="By service type"
                value={`${typesCount} ${typesCount === 1 ? 'type' : 'types'}`}
                showDivider
                onPress={() => router.push('/quotes-by-service-type' as any)}
              />
              <NavRow
                label="Quotes → orders"
                value={`${formatNumber(active.totalConvertedQuotesCount)} converted`}
                showDivider={false}
                onPress={() => router.push('/quotes-to-orders' as any)}
              />
            </View>
          </>
        )}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  scrollView: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 32, gap: 12 },

  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: PAGE_BG,
  },
  headerIconWrap: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerIconInner: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: 20,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
    color: PRIMARY,
    includeFontPadding: false,
  },
  badge: {
    position: 'absolute', top: 6, right: 6,
    width: 15, height: 15,
    borderRadius: 7.5,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: WHITE, fontSize: 10, fontFamily: Typography.headingSemiBold, includeFontPadding: false, lineHeight: 10 },

  segmentContainer: { marginBottom: 4, width: '100%' },
  segmentWrapper: { flexDirection: 'row', height: 44, backgroundColor: TOGGLE_TRACK, borderRadius: 10, padding: 3 },
  segmentButton: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentButtonActive: {
    backgroundColor: WHITE,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontSize: 15, fontFamily: Typography.headingSemiBold, fontWeight: '600', includeFontPadding: false },

  overviewCard: {
    backgroundColor: DARK_CARD,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  overviewCount: {
    color: WHITE,
    fontSize: 32,
    fontWeight: '500',
    fontFamily: Typography.numberHeavy,
    includeFontPadding: false,
  },
  overviewConverted: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Typography.bodyMedium,
    includeFontPadding: false,
  },
  demoRow: { flexDirection: 'row' },
  demoPill: {
    backgroundColor: 'rgba(255,212,59,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  demoPillText: { fontSize: 10, fontFamily: Typography.headingSemiBold, color: '#B48A00' },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 16,
    columnGap: 10,
  },
  statText: { fontSize: 11, color: SECONDARY, fontFamily: Typography.body, includeFontPadding: false },
  statValue: { fontWeight: '700', color: PRIMARY, fontFamily: Typography.headingSemiBold },

  navBox: {
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: WHITE,
  },
  navRow: {
    backgroundColor: WHITE,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navRowLeft: { flex: 1, paddingRight: 10 },
  navRowLabel: {
    color: PRIMARY,
    fontSize: 18,
    fontFamily: Typography.bodyMedium,
    fontWeight: '500',
  },
  navRowRight: { flexDirection: 'row', alignItems: 'center' },
  navRowValue: { color: MUTED, fontSize: 13, fontFamily: Typography.bodyMedium },
  navChevron: { marginLeft: 8 },
  navDivider: { position: 'absolute', left: 18, right: 18, bottom: 0, height: hairline, backgroundColor: DIVIDER },

  errorBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(138,28,28,0.35)',
    backgroundColor: 'rgba(138,28,28,0.06)',
    padding: 14,
    gap: 8,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  errorTitle: { fontSize: 14, fontFamily: Typography.headingSemiBold, color: '#8A1C1C', fontWeight: '600' },
  errorDetail: { fontSize: 12, fontFamily: Typography.bodyMedium, color: MUTED, lineHeight: 17 },
  retryChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#8A1C1C',
  },
  retryChipText: { color: WHITE, fontSize: 11, fontFamily: Typography.headingSemiBold, fontWeight: '600' },
  sampleHint: { fontSize: 11, fontFamily: Typography.body, color: SECONDARY },

  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 8 },
  loadingText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: SECONDARY },

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

  tagBadge: { backgroundColor: TAG_BG, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 12, fontFamily: Typography.bodyMedium, fontWeight: '500', color: TAG_TEXT },
});
