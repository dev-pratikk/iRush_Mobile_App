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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, usePathname } from 'expo-router';
import { NotificationHeaderButton } from '../../components/navigation/NotificationHeaderButton';
import { useAuthContext } from '../../context/AuthContext';
import { DateFilterPreset, getDateRangeForFilter, formatCustomRangeLabel } from '../../lib/date';
import { DateFilterModal } from '../../components/ui/DateFilterModal';
import { formatOrderDate } from '../../lib/formatters';
import { fetchQuotesList, type QuoteListItem } from '../../services/api/quote-list.service';

// ─── Theme ────────────────────────────────────────────────────────────────────

const PRIMARY   = '#2C2C2A';
const SECONDARY = '#9C9B95';
const PAGE_BG   = '#F8FAFC';
const CARD_BG   = '#FFFFFF';
const BORDER    = '#E2E8F0';
const DARK_CARD = '#1E293B';
const GREEN     = '#16A34A';
const GREEN_BG  = '#DCFCE7';
const INPUT_BG  = '#F1F5F9';

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

type QuoteStatusFilter = 'all' | 'converted' | 'notconverted';

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

      <Text style={styles.headerTitle}>Quotes</Text>

      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.filterPill} onPress={onOpenFilter} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={13} color={PRIMARY} />
          <Text style={styles.filterPillText}>{getFilterLabel()}</Text>
          <Ionicons name="chevron-down" size={12} color={PRIMARY} />
        </TouchableOpacity>
        <NotificationHeaderButton iconColor={PRIMARY} size={20} />
      </View>
    </View>
  );
};

// ─── Summary Hero Card ────────────────────────────────────────────────────────

const SummaryCard = ({
  total,
  converted,
  loading,
  salesPerson,
  statusFilter,
}: {
  total: number;
  converted: number;
  loading: boolean;
  salesPerson: string | null;
  statusFilter: QuoteStatusFilter;
}) => {
  const notConverted = Math.max(0, total - converted);
  const pct = total > 0 ? Math.round((converted / total) * 100) : 0;

  let label = 'Total Quotes';
  const qualifiers: string[] = [];
  if (salesPerson) qualifiers.push(salesPerson);
  if (statusFilter === 'converted') qualifiers.push('Converted');
  if (statusFilter === 'notconverted') qualifiers.push('Not Converted');
  if (qualifiers.length > 0) label = `Quotes (${qualifiers.join(' · ')})`;

  if (loading && total === 0) {
    return (
      <View style={[styles.summaryCard, { minHeight: 88, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="rgba(255,255,255,0.7)" />
      </View>
    );
  }

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.summaryLabel}>{label}</Text>
          <Text style={styles.summaryBigNum}>{total}</Text>
        </View>
        <View style={styles.summaryRight}>
          <View style={styles.summaryChip}>
            <Ionicons name="checkmark-circle" size={13} color="#DCFCE7" />
            <Text style={styles.summaryChipText}>{converted} converted</Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.summaryChipText}>{notConverted} pending</Text>
          </View>
          {statusFilter === 'all' && (
            <Text style={styles.summaryPct}>{pct}% conversion</Text>
          )}
        </View>
      </View>
    </View>
  );
};

// ─── Search Bar ───────────────────────────────────────────────────────────────

const SearchBar = ({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (t: string) => void;
  onClear: () => void;
}) => (
  <View style={styles.searchWrap}>
    <Ionicons name="search-outline" size={17} color={SECONDARY} />
    <TextInput
      style={styles.searchInput}
      value={value}
      onChangeText={onChange}
      placeholder="Search by quote no or company…"
      placeholderTextColor={SECONDARY}
      returnKeyType="search"
      autoCorrect={false}
    />
    {value.length > 0 && (
      <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle" size={17} color={SECONDARY} />
      </TouchableOpacity>
    )}
  </View>
);

// ─── Status Filter Chips ──────────────────────────────────────────────────────

const StatusFilterChips = ({
  value,
  onChange,
}: {
  value: QuoteStatusFilter;
  onChange: (v: QuoteStatusFilter) => void;
}) => {
  const chips: { label: string; key: QuoteStatusFilter }[] = [
    { label: 'All', key: 'all' },
    { label: 'Converted', key: 'converted' },
    { label: 'Not Converted', key: 'notconverted' },
  ];
  return (
    <View style={styles.chipsRow}>
      {chips.map((chip) => {
        const active = value === chip.key;
        return (
          <TouchableOpacity
            key={chip.key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(chip.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Salesperson Dropdown ─────────────────────────────────────────────────────

const SALESPERSON_LIST = ['Imran', 'Roy', 'John', 'Sarah', 'Alex', 'Michael', 'David'];

const SalespersonPicker = ({
  value,
  onChange,
  knownNames,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  knownNames: string[];
}) => {
  const insets = useSafeAreaInsets();
  const [modalOpen, setModalOpen] = useState(false);

  // Merge hardcoded + dynamically discovered names, dedup
  const allNames = useMemo(() => {
    const set = new Set<string>([...SALESPERSON_LIST, ...knownNames].map((n) => n.trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [knownNames]);

  return (
    <>
      <TouchableOpacity
        style={[styles.spPicker, value ? styles.spPickerActive : null]}
        onPress={() => setModalOpen(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="person-outline" size={14} color={value ? PRIMARY : SECONDARY} />
        <Text style={[styles.spPickerText, value ? styles.spPickerTextActive : null]} numberOfLines={1}>
          {value ?? 'All Salespersons'}
        </Text>
        <Ionicons name="chevron-down" size={13} color={value ? PRIMARY : SECONDARY} />
      </TouchableOpacity>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <TouchableOpacity style={styles.spOverlay} activeOpacity={1} onPress={() => setModalOpen(false)} />
        <View style={[styles.spSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.spSheetHandle} />
          <Text style={styles.spSheetTitle}>Filter by Salesperson</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.spScroll}>
            {/* Clear option */}
            <TouchableOpacity
              style={[styles.spRow, !value && styles.spRowActive]}
              onPress={() => { onChange(null); setModalOpen(false); }}
            >
              <Text style={[styles.spRowText, !value && styles.spRowTextActive]}>All Salespersons</Text>
              {!value && <Ionicons name="checkmark" size={16} color={PRIMARY} />}
            </TouchableOpacity>

            {allNames.map((name) => (
              <TouchableOpacity
                key={name}
                style={[styles.spRow, value === name && styles.spRowActive]}
                onPress={() => { onChange(name); setModalOpen(false); }}
              >
                <Text style={[styles.spRowText, value === name && styles.spRowTextActive]}>{name}</Text>
                {value === name && <Ionicons name="checkmark" size={16} color={PRIMARY} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

// ─── Quote Card ───────────────────────────────────────────────────────────────

const QuoteCard = ({
  item,
  onPress,
}: {
  item: QuoteListItem;
  onPress: () => void;
}) => {
  const isConverted = item.orderId != null && item.orderId > 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Top row: Quote number (bare) + Converted badge */}
      <View style={styles.cardTopRow}>
        <Text style={styles.cardQuoteNo}>{item.quoteNo}</Text>
        <View style={[styles.statusPill, isConverted ? styles.statusConverted : styles.statusPending]}>
          <Text style={[styles.statusText, isConverted ? styles.statusTextConverted : styles.statusTextPending]}>
            {isConverted ? 'Converted' : 'Pending'}
          </Text>
        </View>
      </View>

      {/* Company */}
      <Text style={styles.cardCompany} numberOfLines={1}>
        {item.companyName || 'N/A'}
        {item.companyCode ? <Text style={styles.cardCompanyCode}> · {item.companyCode}</Text> : null}
      </Text>

      {/* Bottom row: Date + Salesperson + Order link */}
      <View style={styles.cardBottomRow}>
        <View style={styles.cardMetaItem}>
          <Ionicons name="calendar-outline" size={12} color={SECONDARY} />
          <Text style={styles.cardMetaText}>{formatOrderDate(item.quoteDate)}</Text>
        </View>
        {item.salesPersonName ? (
          <View style={styles.cardMetaItem}>
            <Ionicons name="person-outline" size={12} color={SECONDARY} />
            <Text style={styles.cardMetaText}>{item.salesPersonName}</Text>
          </View>
        ) : null}
        {isConverted && item.orderNo ? (
          <View style={styles.cardMetaItem}>
            <Ionicons name="checkmark-circle-outline" size={12} color={GREEN} />
            <Text style={[styles.cardMetaText, { color: GREEN }]}>Order #{item.orderNo}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ query }: { query: string }) => (
  <View style={styles.emptyWrap}>
    <Ionicons name="document-text-outline" size={40} color="#CBD5E1" />
    <Text style={styles.emptyTitle}>
      {query ? 'No matching quotes' : 'No quotes found'}
    </Text>
    <Text style={styles.emptySubtitle}>
      {query ? 'Try a different search term.' : 'Pull down to refresh.'}
    </Text>
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
            <Ionicons
              name={(active ? tab.icon : `${tab.icon}-outline`) as any}
              size={24}
              color={active ? PRIMARY : SECONDARY}
            />
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

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Server-side filters
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>('all');
  const [salesPersonFilter, setSalesPersonFilter] = useState<string | null>(null);

  const [allItems, setAllItems] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_LIMIT = 30;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchText]);

  // Compute date range
  const dateRange = useMemo(
    () => getDateRangeForFilter(activePreset, customRange),
    [activePreset, customRange]
  );

  const loadQuotes = useCallback(
    async (currentPage: number, silent = false) => {
      if (!silent) {
        if (currentPage === 1) setLoading(true);
        else setLoadingMore(true);
      }
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
          quoteStatus: statusFilter !== 'all' ? statusFilter : undefined,
          salesPerson: salesPersonFilter ?? undefined,
          page: currentPage,
          limit: PAGE_LIMIT,
        });

        setAllItems((prev) => currentPage === 1 ? res.data : [...prev, ...res.data]);
        setHasMore(res.data.length >= PAGE_LIMIT);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load quotes');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [token, dateRange, debouncedSearch, statusFilter, salesPersonFilter]
  );

  // Reload when any filter/search changes
  useEffect(() => {
    setPage(1);
    setAllItems([]);
    loadQuotes(1);
  }, [loadQuotes]);

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
    setPage(1);
    setAllItems([]);
    loadQuotes(1, true);
  }, [loadQuotes]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadQuotes(nextPage);
    }
  }, [loadingMore, hasMore, loading, page, loadQuotes]);

  const convertedCount = useMemo(
    () => allItems.filter((it) => it.orderId != null && it.orderId > 0).length,
    [allItems]
  );

  // Collect salesperson names from current results for the picker
  const knownSalespersons = useMemo(() => {
    const names = allItems
      .map((it) => it.salesPersonName)
      .filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
    return Array.from(new Set(names));
  }, [allItems]);

  const keyExtractor = useCallback((item: QuoteListItem, index: number) =>
    `${item.quoteId}-${index}`, []);

  const renderItem = useCallback(({ item }: { item: QuoteListItem }) => (
    <QuoteCard
      item={item}
      onPress={() =>
        router.push({
          pathname: '/quote-details',
          params: { quoteId: String(item.quoteId) },
        })
      }
    />
  ), []);

  const handleStatusChange = useCallback((v: QuoteStatusFilter) => {
    setStatusFilter(v);
    setPage(1);
    setAllItems([]);
  }, []);

  const handleSalesPersonChange = useCallback((v: string | null) => {
    setSalesPersonFilter(v);
    setPage(1);
    setAllItems([]);
  }, []);

  const ListHeader = useMemo(() => (
    <View style={styles.listHeader}>
      <SummaryCard
        total={allItems.length}
        converted={convertedCount}
        loading={loading}
        salesPerson={salesPersonFilter}
        statusFilter={statusFilter}
      />
      <SearchBar
        value={searchText}
        onChange={(t) => setSearchText(t)}
        onClear={() => setSearchText('')}
      />
      <View style={styles.filterRow}>
        <StatusFilterChips value={statusFilter} onChange={handleStatusChange} />
      </View>
      <SalespersonPicker
        value={salesPersonFilter}
        onChange={handleSalesPersonChange}
        knownNames={knownSalespersons}
      />
      {error ? (
        <TouchableOpacity style={styles.errorRow} onPress={() => loadQuotes(1)}>
          <Ionicons name="warning-outline" size={15} color="#8A1C1C" />
          <Text style={styles.errorText}>{error} — tap to retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  ), [
    allItems.length, convertedCount, loading, searchText, statusFilter,
    salesPersonFilter, knownSalespersons, error, loadQuotes,
    handleStatusChange, handleSalesPersonChange,
  ]);

  const ListFooter = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerWrap}>
          <ActivityIndicator color={PRIMARY} size="small" />
        </View>
      );
    }
    if (!hasMore && allItems.length > 0) {
      return (
        <View style={styles.footerWrap}>
          <Text style={styles.footerText}>All {allItems.length} quotes loaded</Text>
        </View>
      );
    }
    return null;
  }, [loadingMore, hasMore, allItems.length]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        activePreset={activePreset}
        customRange={customRange}
        onOpenFilter={() => setFilterModalVisible(true)}
      />

      {loading && allItems.length === 0 ? (
        <View style={styles.centeredLoading}>
          <ActivityIndicator color={PRIMARY} size="large" />
          <Text style={styles.loadingText}>Loading quotes…</Text>
        </View>
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={<EmptyState query={debouncedSearch} />}
          ListFooterComponent={ListFooter}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.25}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <DateFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        activePreset={activePreset}
        customRange={customRange}
        onApply={(preset, range) => {
          setActivePreset(preset);
          setCustomRange(range);
          setPage(1);
          setAllItems([]);
        }}
      />

      <BottomNav />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },

  // Header
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: CARD_BG,
    borderBottomWidth: hairline,
    borderBottomColor: BORDER,
    gap: 8,
  },
  headerIconWrap: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    flex: 1,
    fontSize: 19,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
    color: PRIMARY,
    marginLeft: 2,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  filterPillText: { fontSize: 12, fontFamily: Typography.headingSemiBold, color: PRIMARY },

  // Summary card
  summaryCard: {
    backgroundColor: DARK_CARD,
    borderRadius: 16,
    padding: 18,
    marginBottom: 4,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLabel: { fontSize: 13, fontFamily: Typography.bodyMedium, color: 'rgba(255,255,255,0.65)' },
  summaryBigNum: { fontSize: 38, fontFamily: Typography.numberHeavy, color: '#FFFFFF', lineHeight: 44 },
  summaryRight: { alignItems: 'flex-end', gap: 6 },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: `${GREEN}33`,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  summaryChipText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: '#FFFFFF' },
  summaryPct: { fontSize: 12, fontFamily: Typography.bodyMedium, color: 'rgba(255,255,255,0.55)' },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.body,
    color: PRIMARY,
    padding: 0,
  },

  // Filter row
  filterRow: { flexDirection: 'row', alignItems: 'center' },

  // Status filter chips
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: SECONDARY },
  chipTextActive: { color: '#FFFFFF' },

  // Salesperson picker
  spPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  spPickerActive: { borderColor: PRIMARY, backgroundColor: `${PRIMARY}0D` },
  spPickerText: { flex: 1, fontSize: 14, fontFamily: Typography.body, color: SECONDARY },
  spPickerTextActive: { color: PRIMARY, fontFamily: Typography.bodyMedium },

  // Salesperson modal sheet
  spOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  spSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    maxHeight: '55%',
  },
  spSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  spSheetTitle: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: PRIMARY,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  spScroll: { paddingHorizontal: 12 },
  spRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 10,
  },
  spRowActive: { backgroundColor: `${PRIMARY}0D` },
  spRowText: { fontSize: 14, fontFamily: Typography.bodyMedium, color: PRIMARY },
  spRowTextActive: { fontFamily: Typography.headingSemiBold, fontWeight: '600' },

  // Error row
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: Typography.bodyMedium, color: '#8A1C1C' },

  // List
  listHeader: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  listContent: { paddingBottom: 20 },
  separator: { height: 8, marginHorizontal: 16 },

  // Quote card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 5,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardQuoteNo: { fontSize: 15, fontFamily: Typography.numberHeavy, color: PRIMARY },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusConverted: { backgroundColor: GREEN_BG },
  statusPending: { backgroundColor: INPUT_BG },
  statusText: { fontSize: 11, fontFamily: Typography.headingSemiBold, fontWeight: '600' },
  statusTextConverted: { color: GREEN },
  statusTextPending: { color: SECONDARY },

  cardCompany: { fontSize: 14, fontFamily: Typography.bodyMedium, color: PRIMARY },
  cardCompanyCode: { fontSize: 12, fontFamily: Typography.body, color: SECONDARY },
  cardBottomRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 12, fontFamily: Typography.body, color: SECONDARY },

  // Loading / empty / footer
  centeredLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: Typography.bodyMedium, color: SECONDARY },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontFamily: Typography.headingSemiBold, fontWeight: '600', color: PRIMARY },
  emptySubtitle: { fontSize: 13, fontFamily: Typography.body, color: SECONDARY, textAlign: 'center' },
  footerWrap: { paddingVertical: 20, alignItems: 'center' },
  footerText: { fontSize: 12, fontFamily: Typography.body, color: SECONDARY },

  // Bottom nav
  bottomNav: {
    height: 56,
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderTopWidth: hairline,
    borderTopColor: BORDER,
  },
  navTab: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navLabel: { fontSize: 10, fontFamily: Typography.body, marginTop: 3 },
});
