import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  TextInput,
  RefreshControl,
  BackHandler,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, useLocalSearchParams } from 'expo-router';
import { NotificationHeaderButton } from '../../components/navigation/NotificationHeaderButton';
import { useAuthContext } from '../../context/AuthContext';
import {
  fetchQuotesList,
  type QuoteListItem,
} from '../../services/api/quote-list.service';
import { useSalespersons } from '../../hooks/useSalespersons';
import { DateFilterPreset, getDateRangeForFilter, formatCustomRangeLabel } from '../../lib/date';
import { DateFilterModal } from '../../components/ui/DateFilterModal';
import { formatOrderDate } from '../../lib/formatters';
import { SkeletonRowItem, SkeletonKpiCard } from '../../components/ui/SkeletonLoader';
import { PaginationFooter } from '../../components/ui/PaginationFooter';
import { BottomNavBar as BottomNav } from '../../components/navigation/BottomNavBar';

// ─── Theme ────────────────────────────────────────────────────────────────────

const PRIMARY   = '#0F172A';
const SECONDARY = '#64748B';
const PAGE_BG   = '#FFFFFF';
const INPUT_BG  = '#F5F5F2';
const GREEN     = '#16A34A';
const GREEN_BG  = '#DCFCE7';

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const PAGE_LIMIT = 10;

type QuoteStatusFilter = null | 'converted' | 'notconverted';

const stripQuotePrefix = (raw: string | null | undefined): string => {
  if (!raw) return 'N/A';
  return raw.replace(/^[A-Za-z\-]+/, '').trim() || raw.trim();
};

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
    if (activePreset === 'custom' && customRange)
      return formatCustomRangeLabel(customRange.startDate, customRange.endDate);
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

      <Text style={styles.headerTitleLeft}>All Quotes</Text>

      <View style={styles.headerRightWrap}>
        <TouchableOpacity style={styles.filterBtnPill} onPress={onOpenFilter} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={13} color={PRIMARY} />
          <Text style={styles.filterBtnText}>{getFilterLabel()}</Text>
          <Ionicons name="chevron-down" size={12} color={PRIMARY} />
        </TouchableOpacity>
        <NotificationHeaderButton iconColor={PRIMARY} size={20} />
      </View>
    </View>
  );
};

// ─── KPI Summary Card ──────────────────────────────────────────────────────────

const KpiSummaryCard = ({
  totalRecords,
  convertedCount,
  notConvertedCount,
  loading,
  statusFilter,
}: {
  totalRecords: number;
  convertedCount: number;
  notConvertedCount: number;
  loading: boolean;
  statusFilter: QuoteStatusFilter;
}) => {
  if (loading && totalRecords === 0) {
    return <View style={styles.kpiSummaryWrap}><SkeletonKpiCard /></View>;
  }

  const displayCount = statusFilter === 'converted'
    ? convertedCount
    : statusFilter === 'notconverted'
    ? notConvertedCount
    : totalRecords;

  const label = statusFilter === 'converted'
    ? 'Converted Quotes'
    : statusFilter === 'notconverted'
    ? 'Not Converted'
    : 'Total Quotes';

  return (
    <View style={styles.kpiSummaryCard}>
      <View style={styles.kpiSummaryRow}>
        <View>
          <Text style={styles.kpiSummaryLabel}>{label}</Text>
          <Text style={styles.kpiSummaryCount}>{displayCount}</Text>
        </View>
        <View style={styles.kpiSummaryRight}>
          <View style={styles.kpiMiniStat}>
            <Ionicons name="checkmark-circle" size={13} color={GREEN} />
            <Text style={styles.kpiMiniStatText}>{convertedCount} converted</Text>
          </View>
          <View style={styles.kpiMiniStat}>
            <Ionicons name="time-outline" size={13} color="#F59E0B" />
            <Text style={styles.kpiMiniStatText}>{notConvertedCount} pending</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Search & Filter Bar ──────────────────────────────────────────────────────

const SearchBarSection = ({
  inputText,
  setInputText,
  selectedSalesperson,
  setSelectedSalesperson,
  statusFilter,
  setStatusFilter,
  onClear,
  token,
}: {
  inputText: string;
  setInputText: (t: string) => void;
  selectedSalesperson: string | null;
  setSelectedSalesperson: (s: string | null) => void;
  statusFilter: QuoteStatusFilter;
  setStatusFilter: (s: QuoteStatusFilter) => void;
  onClear: () => void;
  token: string | null;
}) => {
  const { data: salespersons = [], isLoading: spLoading } = useSalespersons(token);
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.searchSection}>
      {/* Search Input + Salesperson Filter */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color={SECONDARY} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Search by quote no or part no…"
            placeholderTextColor={SECONDARY}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {inputText.length > 0 ? (
            <TouchableOpacity onPress={onClear} style={styles.clearButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={SECONDARY} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.filterButton, !!selectedSalesperson && styles.filterButtonActive]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="funnel-outline"
            size={14}
            color={selectedSalesperson ? '#FFFFFF' : PRIMARY}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[styles.filterButtonText, !!selectedSalesperson && styles.filterButtonTextActive]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {selectedSalesperson ?? 'Filter'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status Tabs: All / Converted / Not Converted */}
      <View style={styles.categoryTabRow}>
        <TouchableOpacity
          style={[styles.categoryTabPill, statusFilter === null && styles.categoryTabPillActive]}
          onPress={() => setStatusFilter(null)}
          activeOpacity={0.75}
        >
          <Text style={[styles.categoryTabText, statusFilter === null && styles.categoryTabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.categoryTabPill, statusFilter === 'converted' && styles.categoryTabPillActive]}
          onPress={() => setStatusFilter(statusFilter === 'converted' ? null : 'converted')}
          activeOpacity={0.75}
        >
          <Text style={[styles.categoryTabText, statusFilter === 'converted' && styles.categoryTabTextActive]}>Converted</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.categoryTabPill, statusFilter === 'notconverted' && styles.categoryTabPillActive]}
          onPress={() => setStatusFilter(statusFilter === 'notconverted' ? null : 'notconverted')}
          activeOpacity={0.75}
        >
          <Text style={[styles.categoryTabText, statusFilter === 'notconverted' && styles.categoryTabTextActive]}>Not Converted</Text>
        </TouchableOpacity>
      </View>

      {/* Salesperson Picker Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Salesperson</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={PRIMARY} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.modalItem, !selectedSalesperson && styles.modalItemActive]}
                onPress={() => { setSelectedSalesperson(null); setModalVisible(false); }}
              >
                <Text style={[styles.modalItemText, !selectedSalesperson && styles.modalItemTextActive]}>
                  All Salespersons (No filter)
                </Text>
                {!selectedSalesperson && <Ionicons name="checkmark" size={18} color={PRIMARY} />}
              </TouchableOpacity>

              {spLoading ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                </View>
              ) : (
                salespersons.map((sp) => {
                  const spName = sp.salespersonName;
                  const isActive = selectedSalesperson === spName;
                  return (
                    <TouchableOpacity
                      key={sp.salespersonId}
                      style={[styles.modalItem, isActive && styles.modalItemActive]}
                      onPress={() => { setSelectedSalesperson(spName); setModalVisible(false); }}
                    >
                      <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>{spName}</Text>
                      {isActive && <Ionicons name="checkmark" size={18} color={PRIMARY} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Quote Row Card ───────────────────────────────────────────────────────────

const QuoteRow = React.memo(function QuoteRow({
  item,
  onPress,
}: {
  item: QuoteListItem;
  onPress: () => void;
}) {
  const isConverted = item.orderId != null && item.orderId > 0;
  const displayNo = stripQuotePrefix(item.quoteNo);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.mainRow}>
        {/* Left: Quote No badge + company + company code */}
        <View style={styles.leftCol}>
          <View style={styles.quoteNoBadge}>
            <Text style={styles.quoteNoText} numberOfLines={1}>{displayNo}</Text>
          </View>
          <Text style={styles.companyText} numberOfLines={1} ellipsizeMode="tail">
            {item.companyName || 'N/A'}
          </Text>
          {item.companyCode ? (
            <Text style={styles.codeText} numberOfLines={1}>{item.companyCode}</Text>
          ) : null}
        </View>

        {/* Right: Status badge + date + salesperson */}
        <View style={styles.rightCol}>
          <View style={[styles.statusBadge, isConverted ? styles.statusBadgeConverted : styles.statusBadgeNotConverted]}>
            <Text style={[styles.statusBadgeText, isConverted ? styles.statusBadgeTextConverted : styles.statusBadgeTextNotConverted]}>
              {isConverted ? 'CONVERTED' : 'NOT CONVERTED'}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatOrderDate(item.quoteDate)}</Text>
          {item.salesPersonName ? (
            <Text style={styles.salespersonText}>{item.salesPersonName}</Text>
          ) : null}
          {isConverted && item.orderNo ? (
            <View style={styles.orderLinkPill}>
              <Ionicons name="checkmark-circle-outline" size={11} color={GREEN} />
              <Text style={styles.orderLinkText}>#{item.orderNo}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Empty States ─────────────────────────────────────────────────────────────

const DefaultEmptyState = () => (
  <View style={styles.emptyState}>
    <Ionicons name="document-text-outline" size={36} color={SECONDARY} />
    <Text style={styles.emptyTitle}>No quotes found</Text>
    <Text style={styles.emptySubtitle}>Try adjusting the date filter or search</Text>
  </View>
);

const SearchEmptyState = ({ query, onClear }: { query: string; onClear: () => void }) => (
  <View style={styles.emptyState}>
    <Ionicons name="search-outline" size={38} color={SECONDARY} />
    <Text style={styles.emptyTitle}>No matching quotes</Text>
    <Text style={styles.emptySubtitle}>No results for "{query}"</Text>
    <TouchableOpacity style={styles.clearSearchBtn} onPress={onClear} activeOpacity={0.8}>
      <Text style={styles.clearSearchBtnText}>Clear search</Text>
    </TouchableOpacity>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AllQuotesScreen() {
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;
  const params = useLocalSearchParams<{
    quoteStatus?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
  }>();

  // Derive initial preset from navigation params
  const initialPreset: DateFilterPreset = (() => {
    if (params.period === 'week') return 'week';
    if (params.period === 'today') return 'today';
    if (params.period === 'month') return 'month';
    if (params.startDate && params.endDate) return 'custom';
    return 'month';
  })();

  const initialCustomRange =
    params.startDate && params.endDate
      ? { startDate: params.startDate, endDate: params.endDate }
      : null;

  const initialStatus: QuoteStatusFilter =
    params.quoteStatus === 'converted'
      ? 'converted'
      : params.quoteStatus === 'notconverted'
      ? 'notconverted'
      : null;

  const [activePreset, setActivePreset] = useState<DateFilterPreset>(initialPreset);
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | null>(initialCustomRange);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [inputText, setInputText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSalesperson, setSelectedSalesperson] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>(initialStatus);

  const [allItems, setAllItems] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [apiTotalPages, setApiTotalPages] = useState(1);
  const [convertedCount, setConvertedCount] = useState(0);
  const [notConvertedCount, setNotConvertedCount] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(inputText), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputText]);

  const dateRange = useMemo(
    () => getDateRangeForFilter(activePreset, customRange),
    [activePreset, customRange]
  );

  const loadQuotes = useCallback(
    async (pageArg: number, silent = false) => {
      if (!silent) setLoading(pageArg === 1);
      setError(null);

      try {
        const q = debouncedSearch.trim();
        const isNumeric = /^\d+$/.test(q);

        // Build query: search by quoteNo (numeric) OR part no (companyName fallback)
        const res = await fetchQuotesList({
          token,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          quoteNo: isNumeric ? q : undefined,
          companyName: !isNumeric && q ? q : undefined,
          quoteStatus: statusFilter ?? undefined,
          salesPerson: selectedSalesperson ?? undefined,
          page: pageArg,
          limit: PAGE_LIMIT,
        });

        if (pageArg === 1) {
          setAllItems(res.data);
        } else {
          setAllItems((prev) => [...prev, ...res.data]);
        }

        const total = res.totalRecords || res.count;
        const totalPagesFromApi = typeof res.totalPages === 'number' ? res.totalPages : Math.max(1, Math.ceil(total / PAGE_LIMIT));
        setTotalRecords(total);
        setApiTotalPages(totalPagesFromApi);
        setHasMore(pageArg < totalPagesFromApi);

        if (pageArg === 1) {
          if (statusFilter === null) {
            setConvertedCount(Number.isFinite(res.convertedCount) ? res.convertedCount : 0);
            setNotConvertedCount(Number.isFinite(res.notConvertedCount) ? res.notConvertedCount : 0);
          } else if (statusFilter === 'converted') {
            setConvertedCount(res.convertedCount || total);
            setNotConvertedCount(0);
          } else {
            setConvertedCount(0);
            setNotConvertedCount(res.notConvertedCount || total);
          }
        }
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load quotes');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, dateRange, debouncedSearch, statusFilter, selectedSalesperson]
  );

  useEffect(() => {
    setCurrentPage(1);
    setAllItems([]);
    loadQuotes(1);
  }, [loadQuotes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activePreset, customRange, statusFilter, selectedSalesperson, debouncedSearch]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) router.back();
      else router.replace('/quotes');
      return true;
    });
    return () => sub.remove();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    loadQuotes(1, true);
  }, [loadQuotes]);

  const handleClear = useCallback(() => {
    setInputText('');
    setDebouncedSearch('');
    setSelectedSalesperson(null);
    setStatusFilter(null);
    setCurrentPage(1);
  }, []);

  const filteredItems = useMemo(() => {
    if (statusFilter === null) return allItems;
    return allItems.filter((item) => {
      const isConverted = item.orderId != null && item.orderId > 0;
      return statusFilter === 'converted' ? isConverted : !isConverted;
    });
  }, [allItems, statusFilter]);

  const totalPages = Math.max(1, apiTotalPages);

  const displayItems = useMemo(
    () => filteredItems.slice((currentPage - 1) * PAGE_LIMIT, currentPage * PAGE_LIMIT),
    [filteredItems, currentPage]
  );

  const handlePrev = useCallback(() => setCurrentPage((p) => Math.max(1, p - 1)), []);
  const handleNext = useCallback(() => {
    const next = currentPage + 1;
    if (next * PAGE_LIMIT > allItems.length && hasMore) {
      loadQuotes(Math.ceil(allItems.length / PAGE_LIMIT) + 1);
    }
    setCurrentPage(next);
  }, [currentPage, allItems.length, hasMore, loadQuotes]);

  const keyExtractor = useCallback((item: QuoteListItem, index: number) => `${item.quoteId}-${index}`, []);

  const renderItem = useCallback(({ item }: { item: QuoteListItem }) => (
    <QuoteRow
      item={item}
      onPress={() =>
        router.push({ pathname: '/quote-details' as any, params: { quoteId: String(item.quoteId) } })
      }
    />
  ), []);

  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  const ListHeader = useMemo(() => (
    <View style={{ paddingTop: 12 }}>
      <KpiSummaryCard
        totalRecords={totalRecords || allItems.length}
        convertedCount={convertedCount}
        notConvertedCount={notConvertedCount}
        loading={loading}
        statusFilter={statusFilter}
      />
      <SearchBarSection
        inputText={inputText}
        setInputText={setInputText}
        selectedSalesperson={selectedSalesperson}
        setSelectedSalesperson={setSelectedSalesperson}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onClear={handleClear}
        token={token}
      />
      {error ? (
        <TouchableOpacity style={styles.errorRow} onPress={() => loadQuotes(1)} activeOpacity={0.8}>
          <Ionicons name="warning-outline" size={16} color="#8A1C1C" />
          <Text style={styles.errorRowText}>{error} — tap to retry</Text>
        </TouchableOpacity>
      ) : null}
      <View style={styles.listDivider} />
    </View>
  ), [
    totalRecords, allItems.length, convertedCount, notConvertedCount, loading, statusFilter,
    inputText, selectedSalesperson, error, handleClear, loadQuotes, token,
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header
          activePreset={activePreset}
          customRange={customRange}
          onOpenFilter={() => setFilterModalVisible(true)}
        />

        <View style={styles.mainContainer}>
          <FlatList
            data={displayItems}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={
              loading ? (
                <View style={{ paddingTop: 4 }}>
                  <SkeletonRowItem />
                  <SkeletonRowItem />
                  <SkeletonRowItem />
                  <SkeletonRowItem />
                </View>
              ) : inputText.trim() || selectedSalesperson || statusFilter ? (
                <SearchEmptyState query={inputText.trim() || selectedSalesperson || ''} onClear={handleClear} />
              ) : (
                <DefaultEmptyState />
              )
            }
            ItemSeparatorComponent={ItemSeparator}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.flatlistContent}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={PRIMARY}
                colors={[PRIMARY]}
              />
            }
            keyboardShouldPersistTaps="handled"
          />

          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalRecords || filteredItems.length}
            limit={PAGE_LIMIT}
            isFetchingNextPage={false}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </View>

        <DateFilterModal
          visible={filterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          activePreset={activePreset}
          customRange={customRange}
          onApply={(preset, range) => {
            setActivePreset(preset);
            setCustomRange(range);
            setCurrentPage(1);
            setAllItems([]);
          }}
        />
      </SafeAreaView>
      <BottomNav />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  mainContainer: { flex: 1, justifyContent: 'space-between' },
  flatlistContent: { paddingBottom: 16, flexGrow: 1 },

  // Header
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: PAGE_BG,
    borderBottomWidth: hairline,
    borderBottomColor: '#E7E6E2',
  },
  headerIconWrap: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitleLeft: {
    fontSize: 19,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
    color: PRIMARY,
    marginLeft: 4,
    flex: 1,
  },
  headerRightWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  filterBtnText: { fontSize: 12, fontFamily: Typography.headingSemiBold, color: PRIMARY },

  // KPI Summary Card
  kpiSummaryWrap: { paddingHorizontal: 16, marginBottom: 12 },
  kpiSummaryCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#3A4151',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  kpiSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiSummaryLabel: { fontSize: 12, fontFamily: Typography.bodyMedium, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  kpiSummaryCount: { fontSize: 30, fontFamily: Typography.numberHeavy, color: '#FFFFFF' },
  kpiSummaryRight: { alignItems: 'flex-end', gap: 6 },
  kpiMiniStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  kpiMiniStatText: { fontSize: 13, fontFamily: Typography.headingSemiBold, color: 'rgba(255,255,255,0.9)' },

  // Search Section
  searchSection: { paddingHorizontal: 16, marginBottom: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: Typography.body, color: PRIMARY, height: '100%' },
  clearButton: { padding: 4 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    minWidth: 80,
  },
  filterButtonActive: { backgroundColor: PRIMARY },
  filterButtonText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: PRIMARY },
  filterButtonTextActive: { color: '#FFFFFF', fontFamily: Typography.headingSemiBold },

  // Status Tabs
  categoryTabRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  categoryTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: '#E7E6E2',
  },
  categoryTabPillActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  categoryTabText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: '#64748B' },
  categoryTabTextActive: { color: '#FFFFFF', fontFamily: Typography.headingSemiBold },

  // Salesperson Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', paddingBottom: 24 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E6E2',
  },
  modalTitle: { fontSize: 17, fontFamily: Typography.headingSemiBold, color: PRIMARY },
  modalList: { paddingHorizontal: 20 },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: hairline,
    borderBottomColor: '#E7E6E2',
  },
  modalItemActive: { backgroundColor: '#F8FAFC' },
  modalItemText: { fontSize: 14, fontFamily: Typography.body, color: PRIMARY },
  modalItemTextActive: { fontFamily: Typography.headingSemiBold, color: PRIMARY },

  // Quote Row Card
  card: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leftCol: { flex: 1, paddingRight: 10 },
  quoteNoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  quoteNoText: { fontSize: 14, fontFamily: Typography.heading, color: '#0F172A', letterSpacing: -0.2 },
  companyText: { fontSize: 14, fontFamily: Typography.headingSemiBold, color: '#334155' },
  codeText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: '#64748B', marginTop: 2 },
  rightCol: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, marginBottom: 4 },
  statusBadgeConverted: { backgroundColor: GREEN_BG, borderColor: '#BBF7D0' },
  statusBadgeNotConverted: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  statusBadgeText: { fontSize: 10, fontFamily: Typography.headingSemiBold },
  statusBadgeTextConverted: { color: GREEN },
  statusBadgeTextNotConverted: { color: '#64748B' },
  dateText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: '#64748B', marginTop: 2 },
  salespersonText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: SECONDARY, marginTop: 3 },
  orderLinkPill: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  orderLinkText: { fontSize: 11, fontFamily: Typography.headingSemiBold, color: GREEN },

  separator: { height: 0 },
  listDivider: { height: 1, backgroundColor: '#E7E6E2' },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#FDF2F2',
    borderRadius: 6,
  },
  errorRowText: { fontSize: 12, color: '#8A1C1C', flex: 1 },

  emptyState: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: Typography.headingSemiBold, color: PRIMARY },
  emptySubtitle: { fontSize: 13, fontFamily: Typography.body, color: SECONDARY },
  clearSearchBtn: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: PRIMARY, borderRadius: 8 },
  clearSearchBtnText: { color: '#FFFFFF', fontSize: 13, fontFamily: Typography.headingSemiBold },
});
