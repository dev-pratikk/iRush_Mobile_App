import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, usePathname } from 'expo-router';
import { useAuthContext } from '../../context/AuthContext';
import {
  QuotesDashboardResponse,
  SAMPLE_QUOTES,
  computeConversionRate,
  formatNumber,
} from '../../services/api/quotes.service';
import { useQuotes } from '../../hooks/useQuotes';
import { SkeletonSummaryCard, SkeletonKpiCard } from '../../components/ui/SkeletonLoader';
import { DateFilterPreset, getDateRangeForFilter, formatCustomRangeLabel } from '../../lib/date';
import { DateFilterModal } from '../../components/ui/DateFilterModal';

const PRIMARY = '#0F172A';
const SECONDARY = '#64748B';
const PAGE_BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#E2E8F0';
const DARK_CARD = '#3A4151';

// ─── Header ──────────────────────────────────────────────────────────────────

const Header = ({
  activePreset,
  customRange,
  onOpenFilter,
}: {
  activePreset: DateFilterPreset;
  customRange?: { startDate: string; endDate: string } | null;
  onOpenFilter: () => void;
}) => {
  const getFilterLabel = () => {
    if (activePreset === 'today') return 'Today';
    if (activePreset === 'week') return 'This Week';
    if (activePreset === 'month') return 'This Month';
    if (activePreset === 'custom' && customRange) {
      return formatCustomRangeLabel(customRange.startDate, customRange.endDate);
    }
    return 'Custom';
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerIconWrap}
        onPress={() => router.push('/' as any)}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>

      {/* Left-aligned Title */}
      <Text style={styles.headerTitleLeft}>Quotes</Text>

      <View style={styles.headerRightWrap}>
        {/* Date Filter Button */}
        <TouchableOpacity
          style={styles.filterBtnPill}
          onPress={onOpenFilter}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={13} color={PRIMARY} />
          <Text style={styles.filterBtnText}>{getFilterLabel()}</Text>
          <Ionicons name="chevron-down" size={12} color={PRIMARY} />
        </TouchableOpacity>

        {/* Notification Bell */}
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

// ─── Top Main Hero Card ────────────────────────────────────────────────────────

const TopSummaryCard = ({
  data,
}: {
  data: QuotesDashboardResponse;
}) => {
  const total = data.quoteCount || 31;
  const converted = data.convertedCount || 14;
  const rate = computeConversionRate(total, converted);

  return (
    <View style={styles.topCard}>
      <View style={styles.topCardHeaderRow}>
        <View style={styles.topCardLeftWrap}>
          <Text style={styles.topCardTag}>Quotes</Text>
          <Text style={styles.topCardBigNumber}>{formatNumber(total)}</Text>
        </View>

        <View style={styles.topCardRightWrap}>
          <Text style={styles.topCardConvertedCount}>{formatNumber(converted)} converted</Text>
          <Text style={styles.topCardConvertedPct}>{rate}% conversion</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Sub-KPI Cards Grid (2 Columns) ──────────────────────────────────────────

const SubKpiRow = ({ data }: { data: QuotesDashboardResponse }) => {
  const newQuotes = data.quotesByNewCustomer ?? 11;
  const existingQuotes = data.quotesByExistingCustomer ?? 20;

  return (
    <View style={styles.subKpiGrid}>
      <View style={styles.subKpiCard}>
        <Text style={styles.subKpiLabel}>New customer</Text>
        <Text style={styles.subKpiValue}>{formatNumber(newQuotes)}</Text>
        <Text style={styles.subKpiSubtext}>3 converted</Text>
      </View>

      <View style={styles.subKpiCard}>
        <Text style={styles.subKpiLabel}>Existing customer</Text>
        <Text style={styles.subKpiValue}>{formatNumber(existingQuotes)}</Text>
        <Text style={styles.subKpiSubtext}>3 converted</Text>
      </View>
    </View>
  );
};

// ─── Navigation List Cards ───────────────────────────────────────────────────

const NavList = ({ data }: { data: QuotesDashboardResponse }) => {
  const repsCount = data.quotesBySalesperson?.length || 5;
  const typesCount = data.quotesByServiceType?.length || 2;
  const totalCount = data.quoteCount || 31;
  const convertedCount = data.convertedCount || 14;

  const items = [
    { label: 'All quotes', value: `${formatNumber(totalCount)}`, route: '/all-quotes' },
    { label: 'By salesperson', value: `${repsCount} reps`, route: '/quotes-by-salesperson' },
    { label: 'By service type', value: `${typesCount} types`, route: '/quotes-by-service-type' },
    { label: 'Quotes → orders', value: `${formatNumber(convertedCount)}`, route: '/quotes-to-orders' },
  ];

  return (
    <View style={styles.navListWrap}>
      {items.map((item, idx) => (
        <TouchableOpacity
          key={idx}
          style={styles.navRowCard}
          onPress={() => router.push(item.route as any)}
          activeOpacity={0.75}
        >
          <Text style={styles.navRowLabel}>{item.label}</Text>
          <View style={styles.navRowRightWrap}>
            <Text style={styles.navRowValue}>{item.value}</Text>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ─── Bottom Navigation ────────────────────────────────────────────────────────

const BottomNav = () => {
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
          paddingBottom: Math.max(insets.bottom, 4),
          height: 56 + Math.max(insets.bottom, 4),
        },
      ]}
    >
      {tabs.map((tab, index) => {
        const isActive = pathname === tab.route;
        return (
          <TouchableOpacity key={index} style={styles.navTab} onPress={() => router.push(tab.route as any)}>
            <Ionicons
              name={isActive ? (tab.icon as any) : (`${tab.icon}-outline` as any)}
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

// ─── Main Screen Component ────────────────────────────────────────────────────

import { UnderDevelopment } from '../../components/ui/UnderDevelopment';

export default function QuotesOverviewScreen() {
  return <UnderDevelopment featureName="Quotes" />;
}

function LegacyQuotesOverviewScreen() {
  const { user } = useAuthContext();
  const [activePreset, setActivePreset] = useState<DateFilterPreset>('today');
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const calculatedRange = useMemo(
    () => getDateRangeForFilter(activePreset, customRange),
    [activePreset, customRange]
  );

  const token = (user as any)?.token ?? null;
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuotes(
    activePreset === 'today' ? 'today' : 'month',
    token
  );

  const active = data ?? SAMPLE_QUOTES;

  const handleApplyFilter = (
    preset: DateFilterPreset,
    range: { startDate: string; endDate: string } | null
  ) => {
    setActivePreset(preset);
    setCustomRange(range);
  };

  const getPresetLabel = () => {
    if (activePreset === 'today') return 'Today';
    if (activePreset === 'week') return 'This Week';
    if (activePreset === 'month') return 'This Month';
    if (activePreset === 'custom' && customRange) {
      return formatCustomRangeLabel(customRange.startDate, customRange.endDate);
    }
    return 'Today';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        activePreset={activePreset}
        customRange={customRange}
        onOpenFilter={() => setFilterModalVisible(true)}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {isLoading && !data ? (
          <View style={{ gap: 12, paddingTop: 4 }}>
            <SkeletonSummaryCard />
            <View style={styles.subKpiGrid}>
              <SkeletonKpiCard />
              <SkeletonKpiCard />
            </View>
          </View>
        ) : (
          <>
            <TopSummaryCard data={active} />
            <SubKpiRow data={active} />
            <NavList data={active} />
          </>
        )}
      </ScrollView>

      <DateFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        activePreset={activePreset}
        customRange={customRange}
        onApply={handleApplyFilter}
      />

      <BottomNav />
    </SafeAreaView>
  );
}

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: hairline,
    borderBottomColor: CARD_BORDER,
  },
  headerIconWrap: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerIconInner: { position: 'relative', width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitleLeft: {
    fontSize: 19,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
    color: PRIMARY,
    marginLeft: 4,
    flex: 1,
  },
  headerRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  filterBtnText: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
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

  scrollView: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },

  // 1. Top Summary Hero Card
  topCard: {
    backgroundColor: DARK_CARD,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  topCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topCardLeftWrap: {
    gap: 2,
  },
  topCardTag: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  topCardRightWrap: {
    alignItems: 'flex-end',
  },
  topCardConvertedCount: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topCardConvertedPct: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 1,
  },
  topCardBigNumber: {
    fontSize: 34,
    fontFamily: Typography.titleSerif,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 2. Sub-KPI 2 Column Grid
  subKpiGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  subKpiCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  subKpiLabel: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  subKpiValue: {
    fontSize: 22,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: PRIMARY,
  },
  subKpiSubtext: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },

  // 3. Navigation List Rows
  navListWrap: {
    gap: 10,
    marginTop: 4,
  },
  navRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  navRowLabel: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: PRIMARY,
  },
  navRowRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navRowValue: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },

  // Bottom Nav
  bottomNav: {
    height: 58,
    flexDirection: 'row',
    borderTopWidth: hairline,
    borderTopColor: CARD_BORDER,
    backgroundColor: '#FFFFFF',
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
