import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  TextInput,
  RefreshControl,
  BackHandler,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router } from 'expo-router';
import {
  QuoteItem,
  SAMPLE_QUOTES,
  formatQuoteDateTime,
  cleanupName,
} from '../../services/api/quotes.service';
import { DateFilterPreset, formatCustomRangeLabel } from '../../lib/date';
import { DateFilterModal } from '../../components/ui/DateFilterModal';
import { PaginationFooter } from '../../components/ui/PaginationFooter';

const PRIMARY = '#0F172A';
const SECONDARY = '#64748B';
const PAGE_BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#E2E8F0';
const DARK_CARD = '#3A4151';

// Sample extended quotes for full demo list matching image 1
const FULL_SAMPLE_QUOTES: QuoteItem[] = [
  { quoteNo: 'PCB305522', companyName: 'Anduril', quoteType: 'Full Turnkey', layer: '6', quoteDate: '2026-07-27' },
  { quoteNo: 'PCB305523', companyName: 'mechtechvic', quoteType: 'Full Turnkey', layer: '4', quoteDate: '2026-07-27' },
  { quoteNo: 'PCB305526', companyName: 'University of Minnesota', quoteType: 'PCB Fab', layer: '4', quoteDate: '2026-07-27' },
  { quoteNo: 'PCB305534', companyName: 'Hercules Anti Jackknife System LLC', quoteType: 'Full Turnkey', layer: 'Not specified', quoteDate: '2026-07-27' },
  { quoteNo: 'PCB305540', companyName: 'Tesla Motors', quoteType: 'Full Turnkey', layer: '8', quoteDate: '2026-07-26' },
  { quoteNo: 'PCB305542', companyName: 'SpaceX', quoteType: 'PCB Fab', layer: '12', quoteDate: '2026-07-26' },
  { quoteNo: 'PCB305545', companyName: 'Apple Inc.', quoteType: 'Full Turnkey', layer: '10', quoteDate: '2026-07-25' },
  { quoteNo: 'PCB305550', companyName: 'Google X', quoteType: 'Full Turnkey', layer: '6', quoteDate: '2026-07-25' },
  { quoteNo: 'PCB305552', companyName: 'Rivian Automotive', quoteType: 'PCB Fab', layer: '4', quoteDate: '2026-07-24' },
  { quoteNo: 'PCB305558', companyName: 'Lucid Motors', quoteType: 'Full Turnkey', layer: '6', quoteDate: '2026-07-24' },
];

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
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/quotes'))}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>

      <Text style={styles.headerTitleLeft}>All quotes</Text>

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
      </View>
    </View>
  );
};

const TopCard = ({ totalCount }: { totalCount: number }) => {
  return (
    <View style={styles.topCard}>
      <Text style={styles.topCardBigNumber}>{totalCount}</Text>
      <Text style={styles.topCardSubtext}>All quotes</Text>
    </View>
  );
};

const QuoteRow = React.memo(function QuoteRow({ item }: { item: QuoteItem }) {
  const typeName = cleanupName(item.quoteType, 'Full Turnkey');
  const layerRaw = item.layer || '6L';
  const subInfo = `${item.quoteNo}${layerRaw ? ` · ${layerRaw.includes('L') ? layerRaw : `${layerRaw}L`}` : ''}`;

  return (
    <TouchableOpacity
      style={styles.rowCard}
      activeOpacity={0.75}
      onPress={() =>
        router.push({
          pathname: '/order-details' as any,
          params: { orderData: JSON.stringify(item), from: '/all-quotes' },
        })
      }
    >
      <View style={styles.rowLeftCol}>
        <Text style={styles.companyNameText} numberOfLines={1}>
          {item.companyName}
        </Text>
        <Text style={styles.subInfoText} numberOfLines={1}>
          {subInfo}
        </Text>
      </View>

      <View style={styles.rowRightCol}>
        <Text style={styles.typeNameText}>{typeName}</Text>
        <Text style={styles.dateText}>Jul 27</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function AllQuotesScreen() {
  const [activePreset, setActivePreset] = useState<DateFilterPreset>('today');
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchMode, setSearchMode] = useState<'company' | 'quoteNo'>('company');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
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

  const rawItems = FULL_SAMPLE_QUOTES;
  const filteredItems = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rawItems;
    return rawItems.filter((item) => {
      if (searchMode === 'company') {
        return item.companyName.toLowerCase().includes(q);
      }
      return item.quoteNo.toLowerCase().includes(q);
    });
  }, [rawItems, searchText, searchMode]);

  const LIMIT = 10;
  const totalRecords = 31;
  const totalPages = Math.ceil(totalRecords / LIMIT);

  const displayItems = useMemo(() => {
    return filteredItems.slice(0, LIMIT);
  }, [filteredItems]);

  const handleApplyFilter = (
    preset: DateFilterPreset,
    range: { startDate: string; endDate: string } | null
  ) => {
    setActivePreset(preset);
    setCustomRange(range);
  };

  const keyExtractor = useCallback((item: QuoteItem, i: number) => `${item.quoteNo}-${i}`, []);
  const renderItem = useCallback(({ item }: { item: QuoteItem }) => <QuoteRow item={item} />, []);

  const ListHeader = useMemo(
    () => (
      <View style={styles.listHeaderWrap}>
        <TopCard totalCount={totalRecords} />

        {/* Filter Pills Bar (Company / Quote No) */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[styles.pillBtn, searchMode === 'company' && styles.pillBtnActive]}
            onPress={() => setSearchMode('company')}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillBtnText, searchMode === 'company' && styles.pillBtnTextActive]}>
              Company
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pillBtn, searchMode === 'quoteNo' && styles.pillBtnActive]}
            onPress={() => setSearchMode('quoteNo')}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillBtnText, searchMode === 'quoteNo' && styles.pillBtnTextActive]}>
              Quote no
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={17} color={SECONDARY} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder={searchMode === 'company' ? 'Search by company…' : 'Search by quote no…'}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>
    ),
    [totalRecords, searchMode, searchText]
  );

  const ListFooter = useMemo(
    () => (
      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        isFetchingNextPage={false}
        onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
      />
    ),
    [currentPage, totalPages, totalRecords]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        activePreset={activePreset}
        customRange={customRange}
        onOpenFilter={() => setFilterModalVisible(true)}
      />

      <FlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flatlistContent}
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
      />

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
  flatlistContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },

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

  listHeaderWrap: {
    paddingTop: 16,
    gap: 14,
    marginBottom: 8,
  },
  topCard: {
    backgroundColor: DARK_CARD,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 2,
  },
  topCardBigNumber: {
    fontSize: 34,
    fontFamily: Typography.titleSerif,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topCardSubtext: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.75)',
  },

  // Filter Pills (Company | Quote no)
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  pillBtnActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  pillBtnText: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: SECONDARY,
  },
  pillBtnTextActive: {
    color: '#FFFFFF',
  },

  // Search Bar
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.body,
    color: PRIMARY,
  },

  // List Rows
  rowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowLeftCol: {
    flex: 1,
    paddingRight: 12,
    gap: 3,
  },
  companyNameText: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: PRIMARY,
  },
  subInfoText: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  rowRightCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  typeNameText: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  dateText: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
});
