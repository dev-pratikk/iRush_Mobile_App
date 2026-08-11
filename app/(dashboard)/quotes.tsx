import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
  RefreshControl,
  Modal,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { NotificationHeaderButton } from '../../components/navigation/NotificationHeaderButton';
import { SkeletonSummaryCard, SkeletonKpiCard } from '../../components/ui/SkeletonLoader';
import { router, usePathname, useFocusEffect } from 'expo-router';
import {
  fetchQuotesList,
  type QuoteListItem,
} from '../../services/api/quote-list.service';
import { DateFilterPreset, getDateRangeForFilter, formatCustomRangeLabel } from '../../lib/date';
import { DateFilterModal } from '../../components/ui/DateFilterModal';
import { formatOrderDate } from '../../lib/formatters';

const PRIMARY = '#0F172A';
const SECONDARY = '#64748B';
const GREEN = '#16A34A';
const GREEN_BG = '#DCFCE7';

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

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

// ─── Search Bar (tap to open search overlay) ──────────────────────────────────

const QuoteSearchBar = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.searchInputWrap} onPress={onPress} activeOpacity={0.9}>
    <Ionicons name="search-outline" size={18} color={SECONDARY} style={styles.searchIcon} />
    <Text style={styles.searchPlaceholderText}>Search by quote no, company…</Text>
  </TouchableOpacity>
);

// ─── Search Overlay Modal ─────────────────────────────────────────────────────

const SearchOverlayModal = ({
  visible,
  onClose,
  query,
  setQuery,
  token,
  onSelectQuote,
}: {
  visible: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  token?: string | null;
  onSelectQuote: (item: QuoteListItem) => void;
}) => {
  const inputRef = useRef<TextInput>(null);
  const [results, setResults] = useState<QuoteListItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (visible) setTimeout(() => inputRef.current?.focus(), 120);
  }, [visible]);

  useEffect(() => {
    let active = true;
    if (!visible) return;

    const q = query.trim();
    if (!q) { setResults([]); setSearching(false); return; }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const isNumeric = /^\d+$/.test(q);
        const res = await fetchQuotesList({
          token,
          quoteNo: isNumeric ? q : undefined,
          companyName: !isNumeric ? q : undefined,
          page: 1,
          limit: 20,
        });
        if (active) setResults(res.data);
      } catch { /* silent */ } finally {
        if (active) setSearching(false);
      }
    }, 250);

    return () => { active = false; clearTimeout(timer); };
  }, [query, visible, token]);

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.searchOverlaySafeArea} edges={['top', 'bottom']}>
        <View style={styles.searchOverlayHeader}>
          <View style={styles.searchOverlayInputWrap}>
            <Ionicons name="search-outline" size={18} color={SECONDARY} style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={styles.searchOverlayInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by quote #, company…"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.searchCancelBtn} activeOpacity={0.7}>
            <Text style={styles.searchCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.searchSuggestionsScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.searchSuggestionsContainer}>
            {searching ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={{ fontSize: 13, color: SECONDARY, marginTop: 8 }}>Searching quotes…</Text>
              </View>
            ) : results.length > 0 ? (
              results.map((item, idx) => {
                const isConverted = item.orderId != null && item.orderId > 0;
                return (
                  <TouchableOpacity
                    key={`${item.quoteId}-${idx}`}
                    style={styles.suggestionCard}
                    onPress={() => onSelectQuote(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.suggestionLeftCol}>
                      <Text style={styles.suggestionOrderNo}>Quote #{stripQuotePrefix(item.quoteNo)}</Text>
                      <Text style={styles.suggestionCompany} numberOfLines={1}>{item.companyName}</Text>
                      {item.salesPersonName ? (
                        <Text style={{ fontSize: 11, color: SECONDARY, marginTop: 2 }}>{item.salesPersonName}</Text>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.suggestionStatusPill, isConverted && { backgroundColor: GREEN_BG }]}>
                        <Text style={[styles.suggestionStatusText, isConverted && { color: GREEN }]}>
                          {isConverted ? 'Converted' : 'Not Converted'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#94A3B8" style={{ marginLeft: 6 }} />
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : query.trim().length > 0 ? (
              <View style={styles.emptySearchWrap}>
                <Ionicons name="search-outline" size={32} color="#94A3B8" />
                <Text style={styles.emptySearchTitle}>No matching quotes</Text>
                <Text style={styles.emptySearchSub}>Try a different quote number or company name.</Text>
              </View>
            ) : (
              <View style={styles.emptySearchWrap}>
                <Ionicons name="chatbox-outline" size={32} color="#94A3B8" />
                <Text style={styles.emptySearchTitle}>Search quotes</Text>
                <Text style={styles.emptySearchSub}>Type a quote number or company name to get suggestions.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Summary Card (dark grey like orders.tsx) ──────────────────────────────────

const SummaryCard = ({
  count,
  convertedCount,
  loading,
}: {
  count: number;
  convertedCount: number;
  loading: boolean;
}) => {
  if (loading && count === 0) return <SkeletonSummaryCard />;

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryColLeft}>
          <Text style={styles.summaryCountLabel}>Total Quotes</Text>
          <Text style={styles.summaryCount}>{count}</Text>
        </View>
        <View style={styles.summaryColRight}>
          <View style={styles.conversionPillRow}>
            <Ionicons name="checkmark-circle" size={14} color={GREEN} />
            <Text style={styles.conversionPillText}>{convertedCount} converted</Text>
          </View>
          {count > 0 ? (
            <Text style={styles.conversionRateText}>
              {Math.round((convertedCount / count) * 100)}% rate
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

// ─── Converted / Not Converted KPI Cards ──────────────────────────────────────

const QuotesKpiGrid = ({
  convertedCount = 0,
  notConvertedCount = 0,
  loading = false,
  onPressConverted,
  onPressNotConverted,
}: {
  convertedCount?: number;
  notConvertedCount?: number;
  loading?: boolean;
  onPressConverted: () => void;
  onPressNotConverted: () => void;
}) => {
  if (loading) {
    return (
      <View style={styles.kpiContainer}>
        <View style={styles.kpiRow}>
          <SkeletonKpiCard />
          <SkeletonKpiCard />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.kpiContainer}>
      <View style={styles.kpiRow}>
        <TouchableOpacity style={styles.kpiCard} onPress={onPressConverted} activeOpacity={0.75}>
          <View style={styles.kpiIconRow}>
            <Ionicons name="checkmark-circle" size={15} color={GREEN} />
            <Text style={[styles.kpiHeaderLabel, { color: GREEN }]}>CONVERTED</Text>
          </View>
          <Text style={styles.kpiValueText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {convertedCount}
          </Text>
          <Text style={styles.kpiSubText}>quotes → orders</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.kpiCard} onPress={onPressNotConverted} activeOpacity={0.75}>
          <View style={styles.kpiIconRow}>
            <Ionicons name="time-outline" size={15} color="#F59E0B" />
            <Text style={[styles.kpiHeaderLabel, { color: '#B45309' }]}>NOT CONVERTED</Text>
          </View>
          <Text style={styles.kpiValueText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {notConvertedCount}
          </Text>
          <Text style={styles.kpiSubText}>quotes pending</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Bottom Navigation ────────────────────────────────────────────────────────

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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function QuotesScreen() {
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;

  const [activePreset, setActivePreset] = useState<DateFilterPreset>('today');
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [query, setQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [convertedCount, setConvertedCount] = useState(0);
  const [notConvertedCount, setNotConvertedCount] = useState(0);

  const fetchQuotesForPreset = useCallback(
    async (preset: DateFilterPreset, range: { startDate: string; endDate: string } | null, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const calculatedRange = getDateRangeForFilter(preset, range);

        // Fetch all, converted, and not-converted in parallel
        const [allRes, convertedRes, notConvertedRes] = await Promise.allSettled([
          fetchQuotesList({ token, startDate: calculatedRange.startDate, endDate: calculatedRange.endDate, page: 1, limit: 1 }),
          fetchQuotesList({ token, startDate: calculatedRange.startDate, endDate: calculatedRange.endDate, quoteStatus: 'converted', page: 1, limit: 1 }),
          fetchQuotesList({ token, startDate: calculatedRange.startDate, endDate: calculatedRange.endDate, quoteStatus: 'notconverted', page: 1, limit: 1 }),
        ]);

        const total = allRes.status === 'fulfilled' ? (allRes.value.totalRecords || allRes.value.count) : 0;
        const converted = convertedRes.status === 'fulfilled' ? (convertedRes.value.totalRecords || convertedRes.value.count) : 0;
        const notConverted = notConvertedRes.status === 'fulfilled' ? (notConvertedRes.value.totalRecords || notConvertedRes.value.count) : 0;

        setTotalCount(total);
        setConvertedCount(converted);
        setNotConvertedCount(notConverted);
      } catch (err) {
        if (__DEV__) console.log('[QuotesScreen] fetchQuotes error:', err);
        setTotalCount(0); setConvertedCount(0); setNotConvertedCount(0);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchQuotesForPreset(activePreset, customRange);
  }, [activePreset, customRange, fetchQuotesForPreset]);

  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) router.back();
      else router.replace('/');
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setActivePreset('today');
      setCustomRange(null);
      setQuery('');
      setFilterModalVisible(false);
      setSearchModalVisible(false);
      fetchQuotesForPreset('today', null);
    }, [fetchQuotesForPreset])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchQuotesForPreset(activePreset, customRange, true);
  }, [activePreset, customRange, fetchQuotesForPreset]);

  const handleApplyFilter = (preset: DateFilterPreset, range: { startDate: string; endDate: string } | null) => {
    setActivePreset(preset);
    setCustomRange(range);
  };

  const navigateToAllQuotes = useCallback(
    (status?: 'converted' | 'notconverted') => {
      const navParams: Record<string, string> = {};
      if (status) navParams.quoteStatus = status;
      if (activePreset) navParams.period = activePreset;

      const currentRange = customRange || getDateRangeForFilter(activePreset, customRange);
      if (currentRange?.startDate && currentRange?.endDate) {
        navParams.startDate = currentRange.startDate;
        navParams.endDate = currentRange.endDate;
      }

      router.push({ pathname: '/all-quotes' as any, params: navParams });
    },
    [activePreset, customRange]
  );

  const handleSelectQuote = useCallback((item: QuoteListItem) => {
    setSearchModalVisible(false);
    setQuery('');
    router.push({
      pathname: '/quote-details' as any,
      params: { quoteId: String(item.quoteId) },
    });
  }, []);

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
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />
        }
      >
        <View style={styles.contentContainer}>
          {/* 1. Search Bar */}
          <QuoteSearchBar onPress={() => setSearchModalVisible(true)} />

          {/* 2. Summary Card & Converted / Not Converted KPI Cards */}
          <SummaryCard count={totalCount} convertedCount={convertedCount} loading={loading} />
          <QuotesKpiGrid
            convertedCount={convertedCount}
            notConvertedCount={notConvertedCount}
            loading={loading}
            onPressConverted={() => navigateToAllQuotes('converted')}
            onPressNotConverted={() => navigateToAllQuotes('notconverted')}
          />

          {/* 3. View All Quotes List Button */}
          <View style={styles.viewAllRowContainer}>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigateToAllQuotes()}
              activeOpacity={0.85}
            >
              <Text style={styles.viewAllButtonText}>View All Quotes List</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <SearchOverlayModal
        visible={searchModalVisible}
        onClose={() => { setSearchModalVisible(false); setQuery(''); }}
        query={query}
        setQuery={setQuery}
        token={token}
        onSelectQuote={handleSelectQuote}
      />

      <BottomNav />

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 10, paddingBottom: 24 },
  contentContainer: { paddingHorizontal: 16, gap: 14 },

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

  // Search Bar
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchPlaceholderText: { fontSize: 14, fontFamily: Typography.body, color: SECONDARY },
  clearBtn: { padding: 4 },

  // Search Overlay
  searchOverlaySafeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  searchOverlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: hairline,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  searchOverlayInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchOverlayInput: { flex: 1, fontSize: 14, fontFamily: Typography.body, color: PRIMARY },
  searchCancelBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  searchCancelText: { fontSize: 15, fontFamily: Typography.headingSemiBold, color: '#2563EB' },
  searchSuggestionsScroll: { flex: 1 },
  searchSuggestionsContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 10 },
  suggestionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  suggestionLeftCol: { flex: 1, paddingRight: 12, gap: 3 },
  suggestionOrderNo: { fontSize: 15, fontFamily: Typography.headingSemiBold, fontWeight: '700', color: PRIMARY },
  suggestionCompany: { fontSize: 13, fontFamily: Typography.bodyMedium, color: SECONDARY },
  suggestionStatusPill: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  suggestionStatusText: { fontSize: 12, fontFamily: Typography.headingSemiBold, color: PRIMARY },
  emptySearchWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  emptySearchTitle: { fontSize: 16, fontFamily: Typography.headingSemiBold, color: PRIMARY, marginTop: 8, textAlign: 'center' },
  emptySearchSub: { fontSize: 13, fontFamily: Typography.bodyMedium, color: SECONDARY, textAlign: 'center', lineHeight: 18 },

  // Summary Card (dark grey)
  summaryCard: {
    backgroundColor: '#3A4151',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryColLeft: { gap: 2 },
  summaryCountLabel: { fontSize: 13, fontFamily: Typography.bodyMedium, color: 'rgba(255,255,255,0.75)' },
  summaryCount: { fontSize: 32, fontFamily: Typography.numberHeavy, color: '#FFFFFF' },
  summaryColRight: { alignItems: 'flex-end', gap: 4 },
  conversionPillRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  conversionPillText: { fontSize: 14, fontFamily: Typography.headingSemiBold, fontWeight: '700', color: '#FFFFFF' },
  conversionRateText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: 'rgba(255,255,255,0.65)' },

  // KPI Grid
  kpiContainer: { gap: 10 },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 4,
  },
  kpiIconRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  kpiHeaderLabel: { fontSize: 11.5, fontFamily: Typography.headingSemiBold, letterSpacing: 0.5 },
  kpiValueText: { fontSize: 22, fontFamily: Typography.headingSemiBold, fontWeight: '700', color: PRIMARY },
  kpiSubText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: SECONDARY },

  // View All Button
  viewAllRowContainer: { marginTop: 4 },
  viewAllButton: {
    height: 46,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  viewAllButtonText: { fontSize: 14, fontFamily: Typography.headingSemiBold, color: '#FFFFFF' },

  // Bottom Nav
  bottomNav: { height: 58, flexDirection: 'row', borderTopWidth: hairline },
  navTab: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navLabel: { fontSize: 10, fontFamily: Typography.body, marginTop: 3 },
});
