import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, RefreshControl, BackHandler } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router } from 'expo-router';
import { DateFilterPreset, formatCustomRangeLabel } from '../../lib/date';
import { DateFilterModal } from '../../components/ui/DateFilterModal';

const PRIMARY = '#0F172A';
const SECONDARY = '#64748B';
const PAGE_BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#E2E8F0';
const DARK_CARD = '#3A4151';

interface SalesBreakdown {
  name: string;
  totalOrders: number;
  breakdown?: { typeName: string; count: number }[];
}

interface ServiceBreakdown {
  serviceType: string;
  converted: number;
  totalQuotes: number;
}

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
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/quotes' as any))}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>

      <Text style={styles.headerTitleLeft}>Quotes → orders</Text>

      <View style={styles.headerRightWrap}>
        <TouchableOpacity
          style={styles.filterBtnPill}
          onPress={onOpenFilter}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={13} color={PRIMARY} />
          <Text style={styles.filterBtnText}>{getFilterLabel()}</Text>
          <Ionicons name="chevron-down" size={12} color={PRIMARY} />
        </TouchableOpacity>

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

const TopSummaryCard = ({
  convertedCount = 14,
  newQuotesCount = 6,
  oldQuotesCount = 8,
}: {
  convertedCount?: number;
  newQuotesCount?: number;
  oldQuotesCount?: number;
}) => {
  return (
    <View style={styles.topCard}>
      <View style={styles.topCardHeaderRow}>
        <View>
          <Text style={styles.topCardSubtext}>Quotes converted to orders</Text>
          <Text style={styles.topCardBigNumber}>{convertedCount}</Text>
        </View>
        <Text style={styles.topCardOrdersCount}>{convertedCount} orders</Text>
      </View>

      <View style={styles.topCardBottomRow}>
        <Text style={styles.topCardBreakdownText}>{newQuotesCount} new quotes</Text>
        <Text style={styles.topCardBreakdownText}>{oldQuotesCount} old quotes</Text>
      </View>
    </View>
  );
};

const SalespersonCard = ({ rep }: { rep: SalesBreakdown }) => {
  const [expanded, setExpanded] = useState(rep.name === 'Imran');

  return (
    <View style={styles.salesCard}>
      <TouchableOpacity
        style={styles.salesCardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.75}
      >
        <Text style={styles.salesNameText}>{rep.name}</Text>
        <View style={styles.salesRightWrap}>
          <Text style={styles.salesOrdersCount}>{rep.totalOrders} orders</Text>
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={16}
            color={SECONDARY}
          />
        </View>
      </TouchableOpacity>

      {expanded && rep.breakdown && rep.breakdown.length > 0 && (
        <View style={styles.salesExpandWrap}>
          <View style={styles.expandDivider} />
          {rep.breakdown.map((item, idx) => (
            <View key={idx} style={styles.expandRow}>
              <Text style={styles.expandLabel}>{item.typeName}</Text>
              <Text style={styles.expandValue}>{item.count} {item.count === 1 ? 'order' : 'orders'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default function QuotesToOrdersScreen() {
  const [activePreset, setActivePreset] = useState<DateFilterPreset>('today');
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/quotes');
      }
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const salesReps: SalesBreakdown[] = [
    {
      name: 'Imran',
      totalOrders: 4,
      breakdown: [
        { typeName: 'Full Turnkey', count: 3 },
        { typeName: 'PCB Fab', count: 1 },
      ],
    },
    {
      name: 'Mehraj',
      totalOrders: 3,
      breakdown: [
        { typeName: 'Full Turnkey', count: 2 },
        { typeName: 'PCB Fab', count: 1 },
      ],
    },
    {
      name: 'Unassigned',
      totalOrders: 7,
      breakdown: [
        { typeName: 'Full Turnkey', count: 5 },
        { typeName: 'PCB Fab', count: 2 },
      ],
    },
  ];

  const serviceTypes: ServiceBreakdown[] = [
    { serviceType: 'Full Turnkey', converted: 8, totalQuotes: 25 },
    { serviceType: 'PCB Fab', converted: 4, totalQuotes: 6 },
  ];

  const handleApplyFilter = (
    preset: DateFilterPreset,
    range: { startDate: string; endDate: string } | null
  ) => {
    setActivePreset(preset);
    setCustomRange(range);
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
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 500);
            }}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {/* Top Summary Card */}
        <TopSummaryCard convertedCount={14} newQuotesCount={6} oldQuotesCount={8} />

        {/* Section 1: By salesperson */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionLabel}>By salesperson</Text>
          <View style={styles.cardGroup}>
            {salesReps.map((rep, idx) => (
              <SalespersonCard key={idx} rep={rep} />
            ))}
          </View>
        </View>

        {/* Section 2: By service type */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionLabel}>By service type</Text>
          <View style={styles.cardGroup}>
            {serviceTypes.map((item, idx) => (
              <View key={idx} style={styles.serviceRowCard}>
                <Text style={styles.serviceNameText}>{item.serviceType}</Text>
                <Text style={styles.serviceConvertedText}>
                  {item.converted} of {item.totalQuotes} quotes converted
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <DateFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        activePreset={activePreset}
        customRange={customRange}
        onApply={handleApplyFilter}
      />
    </SafeAreaView>
  );
}

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
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
    paddingBottom: 32,
    gap: 18,
  },

  // Top Dark Card
  topCard: {
    backgroundColor: DARK_CARD,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  topCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topCardSubtext: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  topCardBigNumber: {
    fontSize: 34,
    fontFamily: Typography.titleSerif,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  topCardOrdersCount: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topCardBottomRow: {
    flexDirection: 'row',
    gap: 16,
  },
  topCardBreakdownText: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Sections
  sectionWrap: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
    marginLeft: 2,
  },
  cardGroup: {
    gap: 10,
  },

  // Salesperson Accordion Card
  salesCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  salesCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  salesNameText: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: PRIMARY,
  },
  salesRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  salesOrdersCount: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  salesExpandWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  expandDivider: {
    height: hairline,
    backgroundColor: '#F1F5F9',
    marginBottom: 6,
  },
  expandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandLabel: {
    fontSize: 13.5,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  expandValue: {
    fontSize: 13.5,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: PRIMARY,
  },

  // Service Type Row Card
  serviceRowCard: {
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
  serviceNameText: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: PRIMARY,
  },
  serviceConvertedText: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
});
