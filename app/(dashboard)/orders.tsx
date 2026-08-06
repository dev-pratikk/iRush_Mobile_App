import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import {
  SkeletonSummaryCard,
  SkeletonKpiCard,
} from '../../components/ui/SkeletonLoader';
import { router, usePathname, useFocusEffect } from 'expo-router';
import {
  formatCurrencyWithCents,
  formatNumber,
  fetchOrdersPage,
  SAMPLE_ORDERS,
  type OrderItem,
  type OrdersSearchType,
} from '../../services/api/orders.service';
import { DateFilterPreset, getDateRangeForFilter, formatCustomRangeLabel } from '../../lib/date';
import { DateFilterModal } from '../../components/ui/DateFilterModal';

const PRIMARY = '#0F172A';
const SECONDARY = '#64748B';

const decodeHtml = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

// ─── Header Component ─────────────────────────────────────────────────────────

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
      <Text style={styles.headerTitleLeft}>Orders</Text>

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

// ─── Main Dashboard Search Bar Button ─────────────────────────────────────────

const OrderSearchBar = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity
      style={styles.searchInputWrap}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Ionicons name="search-outline" size={18} color={SECONDARY} style={styles.searchIcon} />
      <Text style={styles.searchPlaceholderText}>Search by order no or company name…</Text>
    </TouchableOpacity>
  );
};

// ─── Dedicated Search Overlay Modal ────────────────────────────────────────────

const SearchOverlayModal = ({
  visible,
  onClose,
  query,
  setQuery,
  token,
  onSelectOrder,
}: {
  visible: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  token?: string | null;
  onSelectOrder: (item: OrderItem) => void;
}) => {
  const inputRef = useRef<TextInput>(null);
  const [fetchedOrders, setFetchedOrders] = useState<OrderItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [visible]);

  useEffect(() => {
    let active = true;
    if (!visible) return;

    const performLiveSearch = async () => {
      setSearching(true);
      try {
        const q = query.trim();
        const res = await fetchOrdersPage('month', {
          token: token ?? null,
          page: 1,
          limit: 30,
          search: q ? { type: 'orderNo', value: q } : null,
        });

        if (active) {
          setFetchedOrders(res.data ?? []);
        }
      } catch (e) {
        if (__DEV__) console.log('[SearchOverlay] Live search error:', e);
      } finally {
        if (active) setSearching(false);
      }
    };

    const timer = setTimeout(performLiveSearch, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, visible, token]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fetchedOrders;

    const scored = fetchedOrders
      .map((item: any) => {
        const orderNoStr = String(item.orderNo || item.ORDER_NO || '').toLowerCase();
        const companyStr = decodeHtml(item.companyName || item.COMPANY_NAME || '').toLowerCase();
        const partNoStr = String(item.pcbpartNo || item.PCBPARTNO || item.orderSpecifications?.[0]?.PCBPARTNO || '').toLowerCase();

        let score = -1;

        if (orderNoStr.startsWith(q)) {
          score = 10000 - (orderNoStr.length - q.length);
        } else if (orderNoStr.includes(q)) {
          const idx = orderNoStr.indexOf(q);
          score = 5000 - idx * 10 - (orderNoStr.length - q.length);
        } else if (partNoStr.startsWith(q)) {
          score = 3000 - (partNoStr.length - q.length);
        } else if (partNoStr.includes(q)) {
          const idx = partNoStr.indexOf(q);
          score = 2500 - idx * 10;
        } else if (companyStr.startsWith(q)) {
          score = 2000 - (companyStr.length - q.length);
        } else if (companyStr.includes(q)) {
          const idx = companyStr.indexOf(q);
          score = 1000 - idx * 10;
        }

        return { item, score, orderNoStr };
      })
      .filter((entry) => entry.score >= 0);

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.orderNoStr.localeCompare(a.orderNoStr);
    });

    return scored.map((entry) => entry.item);
  }, [query, fetchedOrders]);

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.searchOverlaySafeArea} edges={['top', 'bottom']}>
        {/* Top Search Input Bar */}
        <View style={styles.searchOverlayHeader}>
          <View style={styles.searchOverlayInputWrap}>
            <Ionicons name="search-outline" size={18} color={SECONDARY} style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={styles.searchOverlayInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by order #, company, or part #…"
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

        {/* Blank Screen with Live Suggestions */}
        <ScrollView style={styles.searchSuggestionsScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.searchSuggestionsContainer}>
            {searching ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={{ fontSize: 13, color: SECONDARY, marginTop: 8 }}>Searching live orders…</Text>
              </View>
            ) : searchResults.length > 0 ? (
              searchResults.map((item: any, idx: number) => {
                const orderNoDisplay = item.orderNo || item.ORDER_NO || item.id;
                const companyDisplay = decodeHtml(item.companyName || item.COMPANY_NAME || 'Higher Ground, LLC');
                const statusDisplay = item.orderStatus || item.ORDER_STATUS || 'Open';
                const partNoDisplay = item.pcbpartNo || item.PCBPARTNO || item.orderSpecifications?.[0]?.PCBPARTNO;

                return (
                  <TouchableOpacity
                    key={item.ORDER_ID || item.id || idx}
                    style={styles.suggestionCard}
                    onPress={() => onSelectOrder(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.suggestionLeftCol}>
                      <Text style={styles.suggestionOrderNo}>Order #{orderNoDisplay}</Text>
                      <Text style={styles.suggestionCompany} numberOfLines={1}>
                        {companyDisplay}
                      </Text>
                      {partNoDisplay ? (
                        <Text style={{ fontSize: 11, color: SECONDARY, marginTop: 2 }} numberOfLines={1}>
                          Part: {partNoDisplay}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.suggestionStatusPill}>
                        <Text style={styles.suggestionStatusText}>{statusDisplay}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#94A3B8" style={{ marginLeft: 6 }} />
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : query.trim().length > 0 ? (
              <View style={styles.emptySearchWrap}>
                <Ionicons name="search-outline" size={32} color="#94A3B8" />
                <Text style={styles.emptySearchTitle}>No matching orders found</Text>
                <Text style={styles.emptySearchSub}>Try searching for a different order number or company name.</Text>
              </View>
            ) : (
              <View style={styles.emptySearchWrap}>
                <Ionicons name="hardware-chip-outline" size={32} color="#94A3B8" />
                <Text style={styles.emptySearchTitle}>Type an order number or part #</Text>
                <Text style={styles.emptySearchSub}>Live order suggestions will appear automatically as you type.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Top Grey Summary Card ────────────────────────────────────────────────────

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
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryColLeft}>
          <Text style={styles.summaryCountLabel}>Orders</Text>
          <Text style={styles.summaryCount}>{formatNumber(count)}</Text>
        </View>
        <View style={styles.summaryColRight}>
          <Text style={styles.summaryValue}>{formatCurrencyWithCents(totalAmount)}</Text>
        </View>
      </View>
    </View>
  );
};

// ─── NEW & REPEAT KPI Cards Grid ──────────────────────────────────────────

const OrdersKpiGrid = ({
  newCount = 0,
  newAmount = 0,
  repeatCount = 0,
  repeatAmount = 0,
  loading = false,
}: {
  newCount?: number;
  newAmount?: number;
  repeatCount?: number;
  repeatAmount?: number;
  loading?: boolean;
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
        <View style={styles.kpiCard}>
          <Text style={styles.kpiHeaderLabel}>NEW</Text>
          <Text style={styles.kpiValueText}>{formatNumber(newCount)}</Text>
          <Text style={styles.kpiSubText}>{formatCurrencyWithCents(newAmount)}</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiHeaderLabel}>REPEAT</Text>
          <Text style={styles.kpiValueText}>{formatNumber(repeatCount)}</Text>
          <Text style={styles.kpiSubText}>{formatCurrencyWithCents(repeatAmount)}</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Bottom Navigation ────────────────────────────────────────────────────────

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

// ─── Main Screen Component ────────────────────────────────────────────────────

export default function OrdersScreen() {
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
  const [totalAmount, setTotalAmount] = useState(0);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [newOrdersAmount, setNewOrdersAmount] = useState(0);
  const [repeatedOrdersCount, setRepeatedOrdersCount] = useState(0);
  const [repeatedOrdersAmount, setRepeatedOrdersAmount] = useState(0);

  const fetchOrdersForPreset = useCallback(
    async (preset: DateFilterPreset, range: { startDate: string; endDate: string } | null, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const calculatedRange = getDateRangeForFilter(preset, range);
        const res = await fetchOrdersPage('month', {
          token: token ?? null,
          page: 1,
          customRange: calculatedRange,
        });

        const count = res.totalRecords ?? res.count ?? res.data?.length ?? 0;
        const amount = res.totalAmount ?? 0;
        const newCount = res.newOrdersCount ?? 0;
        const newAmt = res.newOrdersAmount ?? 0;
        const repeatCount = res.repeatedOrdersCount ?? 0;
        const repeatAmt = res.repeatedOrdersAmount ?? 0;

        setTotalCount(count);
        setTotalAmount(amount);
        setNewOrdersCount(newCount);
        setNewOrdersAmount(newAmt);
        setRepeatedOrdersCount(repeatCount);
        setRepeatedOrdersAmount(repeatAmt);
      } catch (err) {
        if (__DEV__) console.log('[OrdersScreen] fetchOrders error:', err);
        setTotalCount(0);
        setTotalAmount(0);
        setNewOrdersCount(0);
        setNewOrdersAmount(0);
        setRepeatedOrdersCount(0);
        setRepeatedOrdersAmount(0);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  // Update data when activePreset or customRange is changed by user on screen
  useEffect(() => {
    fetchOrdersForPreset(activePreset, customRange);
  }, [activePreset, customRange, fetchOrdersForPreset]);

  // Reset to default 'today' state ONLY when screen gains focus (re-entering page)
  useFocusEffect(
    useCallback(() => {
      setActivePreset('today');
      setCustomRange(null);
      setQuery('');
      setFilterModalVisible(false);
      setSearchModalVisible(false);
      fetchOrdersForPreset('today', null);
    }, [fetchOrdersForPreset])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrdersForPreset(activePreset, customRange, true);
  }, [activePreset, customRange, fetchOrdersForPreset]);

  const handleApplyFilter = (
    preset: DateFilterPreset,
    range: { startDate: string; endDate: string } | null
  ) => {
    setActivePreset(preset);
    setCustomRange(range);
  };

  const handleSelectOrder = (item: OrderItem) => {
    router.push({
      pathname: '/order-details' as any,
      params: {
        orderData: JSON.stringify(item),
        from: '/orders',
      },
    });
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
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />
        }
      >
        <View style={styles.contentContainer}>
          {/* 1. Search Bar at Top (Opens Dedicated Search View) */}
          <OrderSearchBar onPress={() => setSearchModalVisible(true)} />

          {/* 2. Summary Card & NEW / REPEAT KPI Cards */}
          <SummaryCard count={totalCount} totalAmount={totalAmount} loading={loading} />
          <OrdersKpiGrid
            newCount={newOrdersCount}
            newAmount={newOrdersAmount}
            repeatCount={repeatedOrdersCount}
            repeatAmount={repeatedOrdersAmount}
            loading={loading}
          />

          {/* 3. View All Orders List Button */}
          <View style={styles.viewAllRowContainer}>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/all-orders' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.viewAllButtonText}>View All Orders List</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Dedicated Full Screen Search Overlay Modal */}
      <SearchOverlayModal
        visible={searchModalVisible}
        onClose={() => {
          setSearchModalVisible(false);
          setQuery('');
        }}
        query={query}
        setQuery={setQuery}
        token={token}
        onSelectOrder={handleSelectOrder}
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

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

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

  // Search Input Bar (Dashboard)
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
  searchPlaceholderText: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: SECONDARY,
  },
  clearBtn: { padding: 4 },

  // ─── Search Overlay Modal Styles ──────────────────────────────────────────────
  searchOverlaySafeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
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
  searchOverlayInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.body,
    color: PRIMARY,
  },
  searchCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  searchCancelText: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    color: '#2563EB',
  },
  searchSuggestionsScroll: {
    flex: 1,
  },
  searchSuggestionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 10,
  },
  suggestionSectionTitle: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: SECONDARY,
    marginBottom: 4,
    marginLeft: 2,
  },
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
  suggestionLeftCol: {
    flex: 1,
    paddingRight: 12,
    gap: 3,
  },
  suggestionOrderNo: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: PRIMARY,
  },
  suggestionCompany: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  suggestionStatusPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suggestionStatusText: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  emptySearchWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptySearchTitle: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
    marginTop: 8,
    textAlign: 'center',
  },
  emptySearchSub: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Top Grey Summary Card
  summaryCard: {
    backgroundColor: '#3A4151',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryColLeft: { gap: 2 },
  summaryCountLabel: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  summaryCount: {
    fontSize: 32,
    fontFamily: Typography.titleSerif,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryColRight: { alignItems: 'flex-end' },
  summaryValue: {
    fontSize: 20,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: '#FFFFFF',
  },

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
  kpiHeaderLabel: {
    fontSize: 11.5,
    fontFamily: Typography.headingSemiBold,
    color: SECONDARY,
    letterSpacing: 0.5,
  },
  kpiValueText: {
    fontSize: 22,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: PRIMARY,
  },
  kpiSubText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },

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
  viewAllButtonText: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: '#FFFFFF',
  },

  // Bottom Nav
  bottomNav: {
    height: 58,
    flexDirection: 'row',
    borderTopWidth: hairline,
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
