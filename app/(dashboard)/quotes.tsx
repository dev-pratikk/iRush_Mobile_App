import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  BackHandler,
  Modal,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, usePathname } from 'expo-router';
import { NotificationHeaderButton } from '../../components/navigation/NotificationHeaderButton';
import { useAuthContext } from '../../context/AuthContext';
import { DateFilterPreset, getDateRangeForFilter, formatCustomRangeLabel } from '../../lib/date';
import { DateFilterModal } from '../../components/ui/DateFilterModal';
import { formatOrderDate } from '../../lib/formatters';
import { fetchQuotesList, type QuoteListItem } from '../../services/api/quote-list.service';
import { useSalespersons } from '../../hooks/useSalespersons';
import { SkeletonRowItem, SkeletonKpiCard } from '../../components/ui/SkeletonLoader';
import { PaginationFooter } from '../../components/ui/PaginationFooter';

// ─── Theme (matches all-orders.tsx exactly) ───────────────────────────────────

const PRIMARY   = '#2C2C2A';
const SECONDARY = '#9C9B95';
const PAGE_BG   = '#FFFFFF';
const INPUT_BG  = '#F5F5F2';
const GREEN     = '#16A34A';
const GREEN_BG  = '#DCFCE7';

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

type QuoteStatusFilter = null | 'converted' | 'notconverted';

const ORDERS_PAGE_LIMIT = 25;

// ─── Strip non-numeric prefix from quote number ───────────────────────────────
// e.g. "PCB-12345" → "12345", "PCBA-67890" → "67890", "12345" → "12345"

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
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>

      <Text style={styles.headerTitleLeft}>Quotes</Text>

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

// ─── Summary Card (matches all-orders SummaryOverviewCard style) ──────────────

const SummaryCard = ({
  totalRecords,
  convertedCount,
  loading,
  selectedSalesperson,
  statusFilter,
  activePreset,
  customRange,
}: {
  totalRecords: number;
  convertedCount: number;
  loading: boolean;
  selectedSalesperson: string | null;
  statusFilter: QuoteStatusFilter;
  activePreset: DateFilterPreset;
  customRange?: { startDate: string; endDate: string } | null;
}) => {
  let periodLabel =
    activePreset === 'today'
      ? 'Today'
      : activePreset === 'week'
      ? 'This week'
      : activePreset === 'month'
      ? 'This month'
      : 'Custom range';

  const qualifiers: string[] = [];
  if (selectedSalesperson) qualifiers.push(selectedSalesperson);
  if (statusFilter === 'converted') qualifiers.push('Converted');
  if (statusFilter === 'notconverted') qualifiers.push('Not Converted');
  if (qualifiers.length > 0) periodLabel = `${periodLabel} (${qualifiers.join(' · ')})`;

  if (loading && totalRecords === 0) {
    return (
      <View style={styles.summaryCardWrap}>
        <SkeletonKpiCard />
      </View>
    );
  }

  return (
    <View style={styles.summaryCardWrap}>
      <View style={styles.summaryCardWhite}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryColLeft}>
            <Text style={styles.summaryPeriodLabel}>{periodLabel}</Text>
            <Text style={styles.summaryCount}>{totalRecords}</Text>
          </View>
          <View style={styles.summaryColRight}>
            <View style={styles.convertedBadge}>
              <Ionicons name="checkmark-circle" size={13} color={GREEN} />
              <Text style={styles.convertedBadgeText}>{convertedCount} converted</Text>
            </View>
            {statusFilter === null && totalRecords > 0 ? (
              <Text style={styles.conversionPct}>
                {Math.round((convertedCount / totalRecords) * 100)}% conversion rate
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Search + Filter Bar Section (matches all-orders SearchBarSection) ─────────

const SearchBarSection = ({
  inputText,
  setInputText,
  selectedSalesperson,
  setSelectedSalesperson,
  statusFilter,
  setStatusFilter,
  onClear,
}: {
  inputText: string;
  setInputText: (t: string) => void;
  selectedSalesperson: string | null;
  setSelectedSalesperson: (s: string | null) => void;
  statusFilter: QuoteStatusFilter;
  setStatusFilter: (s: QuoteStatusFilter) => void;
  onClear: () => void;
}) => {
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;
  const { data: salespersons = [], isLoading: spLoading } = useSalespersons(token);
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.searchSection}>
      {/* Row 1: Search Input + Filter Button */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color={SECONDARY} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Search by quote no or company…"
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

        {/* Salesperson filter button — same as all-orders */}
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

      {/* Row 2: Status tabs — All / Converted / Not Converted */}
      <View style={styles.categoryTabRow}>
        <TouchableOpacity
          style={[styles.categoryTabPill, statusFilter === null && styles.categoryTabPillActive]}
          onPress={() => setStatusFilter(null)}
          activeOpacity={0.75}
        >
          <Text style={[styles.categoryTabText, statusFilter === null && styles.categoryTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.categoryTabPill, statusFilter === 'converted' && styles.categoryTabPillActive]}
          onPress={() => setStatusFilter(statusFilter === 'converted' ? null : 'converted')}
          activeOpacity={0.75}
        >
          <Text style={[styles.categoryTabText, statusFilter === 'converted' && styles.categoryTabTextActive]}>
            Converted
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.categoryTabPill, statusFilter === 'notconverted' && styles.categoryTabPillActive]}
          onPress={() => setStatusFilter(statusFilter === 'notconverted' ? null : 'notconverted')}
          activeOpacity={0.75}
        >
          <Text style={[styles.categoryTabText, statusFilter === 'notconverted' && styles.categoryTabTextActive]}>
            Not Converted
          </Text>
        </TouchableOpacity>
      </View>

      {/* Salesperson Modal */}
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
                      <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                        {spName}
                      </Text>
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

// ─── Quote Row Card (matches OrderCard style: full-width, divider-based) ──────

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
          <View style={[styles.quoteNoBadge, { marginBottom: 6 }]}>
            <Text style={styles.quoteNoText} numberOfLines={1}>{displayNo}</Text>
          </View>
          <Text style={styles.companyText} numberOfLines={1} ellipsizeMode="tail">
            {item.companyName || 'N/A'}
          </Text>
          {item.companyCode ? (
            <Text style={styles.orderTypeText} numberOfLines={1}>{item.companyCode}</Text>
          ) : null}
        </View>

        {/* Right: Status badge (CONVERTED / NOT CONVERTED) above Date */}
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
    <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
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

// ─── Bottom Navigation ────────────────────────────────────────────────────────

const BottomNav = () => {
  const pathname = usePathname();
  const tabs = [
    { icon: 'home', label: 'Dashboard', route: '/' },
    { icon: 'document-text', label: 'Orders', route: '/orders' },
    { icon: 'cube', label: 'Open orders', route: '/open-orders' },
    { icon: 'chatbox', label: 'Quotes', route: '/quotes' },
  ];
  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab, i) => {
        const active = pathname === tab.route;
        return (
          <TouchableOpacity key={i} style={styles.navTab} onPress={() => router.push(tab.route as any)}>
            <Ionicons name={(active ? tab.icon : `${tab.icon}-outline`) as any} size={24} color={active ? PRIMARY : SECONDARY} />
            <Text style={[styles.navLabel, { color: active ? PRIMARY : SECONDARY }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function QuotesScreen() {
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;

  const [activePreset, setActivePreset] = useState<DateFilterPreset>('month');
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [inputText, setInputText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSalesperson, setSelectedSalesperson] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>(null);

  const [allItems, setAllItems] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

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

        const res = await fetchQuotesList({
          token,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          quoteNo: isNumeric ? q : undefined,
          companyName: !isNumeric && q ? q : undefined,
          quoteStatus: statusFilter ?? undefined,
          salesPerson: selectedSalesperson ?? undefined,
          page: pageArg,
          limit: ORDERS_PAGE_LIMIT,
        });

        if (pageArg === 1) {
          setAllItems(res.data);
        } else {
          setAllItems((prev) => [...prev, ...res.data]);
        }
        setTotalRecords(res.totalRecords || res.data.length);
        setHasMore(res.data.length >= ORDERS_PAGE_LIMIT);
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
      else router.replace('/');
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

  const convertedCount = useMemo(
    () => allItems.filter((it) => it.orderId != null && it.orderId > 0).length,
    [allItems]
  );

  // Pagination
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / ORDERS_PAGE_LIMIT) : Math.max(1, Math.ceil(allItems.length / ORDERS_PAGE_LIMIT));
  const displayItems = useMemo(
    () => allItems.slice((currentPage - 1) * ORDERS_PAGE_LIMIT, currentPage * ORDERS_PAGE_LIMIT),
    [allItems, currentPage]
  );

  const handlePrev = useCallback(() => setCurrentPage((p) => Math.max(1, p - 1)), []);
  const handleNext = useCallback(() => {
    const next = currentPage + 1;
    if (next * ORDERS_PAGE_LIMIT > allItems.length && hasMore) {
      loadQuotes(Math.ceil(allItems.length / ORDERS_PAGE_LIMIT) + 1);
    }
    setCurrentPage(next);
  }, [currentPage, allItems.length, hasMore, loadQuotes]);

  const keyExtractor = useCallback((item: QuoteListItem, index: number) => `${item.quoteId}-${index}`, []);
  const renderItem = useCallback(({ item }: { item: QuoteListItem }) => (
    <QuoteRow
      item={item}
      onPress={() => router.push({ pathname: '/quote-details', params: { quoteId: String(item.quoteId) } })}
    />
  ), []);
  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  const ListHeader = useMemo(() => (
    <View style={{ paddingTop: 12 }}>
      <SummaryCard
        totalRecords={totalRecords || allItems.length}
        convertedCount={convertedCount}
        loading={loading}
        selectedSalesperson={selectedSalesperson}
        statusFilter={statusFilter}
        activePreset={activePreset}
        customRange={customRange}
      />
      <SearchBarSection
        inputText={inputText}
        setInputText={setInputText}
        selectedSalesperson={selectedSalesperson}
        setSelectedSalesperson={setSelectedSalesperson}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onClear={handleClear}
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
    totalRecords, allItems.length, convertedCount, loading, selectedSalesperson,
    statusFilter, activePreset, customRange, inputText, error, loadQuotes, handleClear,
  ]);

  return (
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
          totalRecords={totalRecords || allItems.length}
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

      <BottomNav />
    </SafeAreaView>
  );
}

// ─── Styles (mirrors all-orders.tsx styles exactly) ───────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  mainContainer: { flex: 1, justifyContent: 'space-between' },
  flatlistContent: { paddingBottom: 16, flexGrow: 1 },

  // Header — identical to all-orders
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

  // Summary Card — matches all-orders SummaryCardWhite
  summaryCardWrap: { paddingHorizontal: 16, marginBottom: 12 },
  summaryCardWhite: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E6E2',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryColLeft: { gap: 4 },
  summaryPeriodLabel: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: '#8C94A0',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryCount: { fontSize: 26, fontFamily: Typography.numberHeavy, fontWeight: '800', color: '#0F172A' },
  summaryColRight: { alignItems: 'flex-end', gap: 4 },
  convertedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  convertedBadgeText: { fontSize: 14, fontFamily: Typography.headingSemiBold, fontWeight: '700', color: '#0F172A' },
  conversionPct: { fontSize: 12, fontFamily: Typography.bodyMedium, color: SECONDARY },

  // Search Section — matches all-orders SearchBarSection
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

  // Category tabs — matches all-orders categoryTabRow
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

  // Modal — identical to all-orders
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

  // Quote Row Card — matches OrderCard style
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
  },
  quoteNoText: { fontSize: 14, fontFamily: Typography.heading, color: '#0F172A', letterSpacing: -0.2 },

  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
  },
  statusBadgeConverted: { backgroundColor: GREEN_BG, borderColor: '#BBF7D0' },
  statusBadgeNotConverted: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  statusBadgeText: { fontSize: 10, fontFamily: Typography.headingSemiBold },
  statusBadgeTextConverted: { color: GREEN },
  statusBadgeTextNotConverted: { color: '#64748B' },

  companyText: { fontSize: 14, fontFamily: Typography.headingSemiBold, color: '#334155' },
  orderTypeText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: '#64748B', marginTop: 2 },

  rightCol: { alignItems: 'flex-end' },
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

  // Bottom nav
  bottomNav: { height: 56, flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: hairline, borderTopColor: '#E7E6E2' },
  navTab: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navLabel: { fontSize: 10, fontFamily: Typography.body, marginTop: 3 },
});
