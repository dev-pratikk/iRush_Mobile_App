import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../../../constants/Typography';
import { useThemeColors } from '../../../context/ThemeContext';
import { useAuthContext } from '../../../context/AuthContext';
import { NotificationHeaderButton } from '../../../components/navigation/NotificationHeaderButton';
import {
  SkeletonSummaryCard,
  SkeletonKpiCard,
} from '../../../components/ui/SkeletonLoader';
import { router, usePathname } from 'expo-router';
import {
  formatCurrencyWithCents,
  formatNumber,
} from '../../../services/api/orders.service';
import {
  fetchARData,
  searchARData,
  fetchARDetailBySearch,
  type ARItem,
  type ARDashboardResponse,
  type ARStatusTab,
} from '../../../services/api/ar.service';
import { useBackHandler } from '../../../hooks/useBackHandler';

const PRIMARY = '#0F172A';
const SECONDARY = '#64748B';

// Header Component
const Header = () => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerIconWrap}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>

      <Text style={styles.headerTitleLeft}>AR</Text>

      <View style={styles.headerRightWrap}>
        <NotificationHeaderButton iconColor={PRIMARY} size={20} />
      </View>
    </View>
  );
};

// AR Search Bar Button
const ARSearchBar = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity
      style={styles.searchInputWrap}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Ionicons name="search-outline" size={18} color={SECONDARY} style={styles.searchIcon} />
      <Text style={styles.searchPlaceholderText}>Search by invoice #, company name or code…</Text>
    </TouchableOpacity>
  );
};

// Search Overlay Modal
const SearchOverlayModal = ({
  visible,
  onClose,
  query,
  setQuery,
  token,
  onSelectAR,
  activeStatus,
}: {
  visible: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  token?: string | null;
  onSelectAR: (item: ARItem) => void;
  activeStatus: ARStatusTab;
}) => {
  const inputRef = useRef<TextInput>(null);
  const [fetchedInvoices, setFetchedInvoices] = useState<ARItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!visible) return;

    const performLiveSearch = async () => {
      const q = query.trim();
      if (!q) {
        setFetchedInvoices([]);
        setSearching(false);
        setSearchError(null);
        return;
      }

      setSearching(true);
      setSearchError(null);
      try {
        if (__DEV__) console.log('[ARSearchOverlay] searching for:', JSON.stringify(q));
        const res = await searchARData({ search: q, token, limit: 30, status: activeStatus });
        if (active) {
          if (__DEV__) console.log('[ARSearchOverlay] results count:', res.invoices?.length ?? 0);
          setFetchedInvoices(res.invoices || []);
        }
      } catch (e: any) {
        if (__DEV__) console.log('[ARSearchOverlay] Error:', e);
        if (active) {
          setSearchError(e?.message || 'Search failed');
          setFetchedInvoices([]);
        }
      } finally {
        if (active) setSearching(false);
      }
    };

    const timer = setTimeout(performLiveSearch, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, visible, token, activeStatus]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fetchedInvoices;

    const scored = fetchedInvoices
      .map((item: ARItem) => {
        const invNo = String(item.INV_NUMBER || '').toLowerCase();
        const companyName = String(item.CompanyName || '').toLowerCase();
        const companyCode = String(item.CompanyCode || '').toLowerCase();
        const orderNo = String(item.ORDER_NO || '').toLowerCase();

        let score = -1;

        if (invNo === q) {
          score = 20000;
        } else if (invNo.startsWith(q)) {
          score = 15000 - (invNo.length - q.length);
        } else if (invNo.includes(q)) {
          score = 10000 - invNo.indexOf(q) * 10;
        } else if (companyCode === q) {
          score = 9000;
        } else if (companyCode.startsWith(q)) {
          score = 8000 - (companyCode.length - q.length);
        } else if (companyCode.includes(q)) {
          score = 7000 - companyCode.indexOf(q) * 10;
        } else if (companyName.startsWith(q)) {
          score = 5000 - (companyName.length - q.length);
        } else if (companyName.includes(q)) {
          score = 3000 - companyName.indexOf(q) * 10;
        } else if (orderNo.includes(q)) {
          score = 2000 - orderNo.indexOf(q) * 10;
        } else {
          score = 1000;
        }

        return { item, score, invNo };
      })
      .filter((entry) => entry.score >= 0);

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.invNo.localeCompare(a.invNo);
    });

    return scored.map((entry) => entry.item);
  }, [query, fetchedInvoices]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      onShow={() => inputRef.current?.focus()}
    >
      <SafeAreaView style={styles.searchOverlaySafeArea} edges={['top', 'bottom']}>
        <View style={styles.searchOverlayHeader}>
          <View style={styles.searchOverlayInputWrap}>
            <Ionicons name="search-outline" size={18} color={SECONDARY} style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={styles.searchOverlayInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by invoice #, company name or code…"
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
                <Text style={{ fontSize: 13, color: SECONDARY, marginTop: 8 }}>Searching AR invoices…</Text>
              </View>
            ) : searchError ? (
              <View style={styles.emptySearchWrap}>
                <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
                <Text style={[styles.emptySearchTitle, { color: '#DC2626' }]}>Search Error</Text>
                <Text style={styles.emptySearchSub}>{searchError}</Text>
              </View>
            ) : searchResults.length > 0 ? (
              searchResults.map((item: ARItem, idx: number) => {
                return (
                  <TouchableOpacity
                    key={item.INV_NUMBER || idx}
                    style={styles.suggestionCard}
                    onPress={() => onSelectAR(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.suggestionLeftCol}>
                      <Text style={styles.suggestionOrderNo}>Invoice #{item.INV_NUMBER}</Text>
                      <Text style={styles.suggestionCompany} numberOfLines={1}>
                        {item.CompanyName}
                      </Text>
                      {item.CompanyCode ? (
                        <Text style={{ fontSize: 12, fontFamily: Typography.body, color: SECONDARY }}>
                          Code: {item.CompanyCode}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : query.trim().length > 0 ? (
              <View style={styles.emptySearchWrap}>
                <Ionicons name="search-outline" size={32} color="#94A3B8" />
                <Text style={styles.emptySearchTitle}>No matching AR invoices found</Text>
                <Text style={styles.emptySearchSub}>Try searching for a different invoice number, company name or code.</Text>
              </View>
            ) : (
              <View style={styles.emptySearchWrap}>
                <Ionicons name="receipt-outline" size={32} color="#94A3B8" />
                <Text style={styles.emptySearchTitle}>Type an invoice #, company name or code</Text>
                <Text style={styles.emptySearchSub}>Live AR invoice suggestions will appear automatically as you type.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// Summary Card
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
          <Text style={styles.summaryCountLabel}>Total AR Invoices</Text>
          <Text style={styles.summaryCount}>{formatNumber(count)}</Text>
        </View>
        <View style={styles.summaryColRight}>
          <Text style={styles.summaryCountLabel}>Total Due Amount</Text>
          <Text style={styles.summaryValue}>{formatCurrencyWithCents(totalAmount)}</Text>
        </View>
      </View>
    </View>
  );
};

// 3 KPI Cards Grid (Due Today, Crossed, Future Dues)
const ARKpiGrid = ({
  dueTodayCount = 0,
  dueTodayAmount = 0,
  crossedCount = 0,
  crossedAmount = 0,
  futureCount = 0,
  futureAmount = 0,
  loading = false,
  onPressToday,
  onPressCrossed,
  onPressFuture,
}: {
  dueTodayCount?: number;
  dueTodayAmount?: number;
  crossedCount?: number;
  crossedAmount?: number;
  futureCount?: number;
  futureAmount?: number;
  loading?: boolean;
  onPressToday: () => void;
  onPressCrossed: () => void;
  onPressFuture: () => void;
}) => {
  if (loading) {
    return (
      <View style={styles.kpiContainer}>
        <View style={styles.kpiRow3}>
          <SkeletonKpiCard />
          <SkeletonKpiCard />
          <SkeletonKpiCard />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.kpiContainer}>
      <View style={styles.kpiRow3}>
        {/* DUE TODAY */}
        <TouchableOpacity
          style={styles.kpiCard3}
          onPress={onPressToday}
          activeOpacity={0.75}
        >
          <Text style={styles.kpiHeaderLabel}>DUE TODAY</Text>
          <Text style={styles.kpiValueText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatNumber(dueTodayCount)}
          </Text>
          <Text style={styles.kpiSubText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatCurrencyWithCents(dueTodayAmount)}
          </Text>
        </TouchableOpacity>

        {/* CROSSED */}
        <TouchableOpacity
          style={[styles.kpiCard3, { borderColor: '#FCA5A5' }]}
          onPress={onPressCrossed}
          activeOpacity={0.75}
        >
          <Text style={[styles.kpiHeaderLabel, { color: '#DC2626' }]}>CROSSED</Text>
          <Text style={[styles.kpiValueText, { color: '#DC2626' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatNumber(crossedCount)}
          </Text>
          <Text style={[styles.kpiSubText, { color: '#DC2626' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatCurrencyWithCents(crossedAmount)}
          </Text>
        </TouchableOpacity>

        {/* FUTURE DUES */}
        <TouchableOpacity
          style={styles.kpiCard3}
          onPress={onPressFuture}
          activeOpacity={0.75}
        >
          <Text style={styles.kpiHeaderLabel}>FUTURE DUES</Text>
          <Text style={styles.kpiValueText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatNumber(futureCount)}
          </Text>
          <Text style={styles.kpiSubText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatCurrencyWithCents(futureAmount)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};



// Bottom Nav Component
const BottomNav = () => {
  const colors = useThemeColors();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const tabs = [
    { icon: 'home', label: 'Dashboard', route: '/' },
    { icon: 'document-text', label: 'Orders', route: '/orders' },
    { icon: 'chatbox', label: 'Quotes', route: '/all-quotes' },
    { icon: 'receipt', label: 'AR', route: '/ar' },
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

// Main Screen Component
export default function ARScreen() {
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;

  const [activeStatus, setActiveStatus] = useState<ARStatusTab>('all');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [query, setQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ARDashboardResponse | null>(null);

  const fetchARWithStatus = useCallback(
    async (status: ARStatusTab, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetchARData({
          status,
          token: token ?? null,
        });
        setData(res);
      } catch (err) {
        if (__DEV__) console.log('[ARScreen] fetchARData error:', err);
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchARWithStatus(activeStatus);
  }, [activeStatus, fetchARWithStatus]);

  useBackHandler({
    modalVisible: searchModalVisible,
    onDismissModal: () => {
      setSearchModalVisible(false);
      setQuery('');
    },
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchARWithStatus(activeStatus, true);
  }, [activeStatus, fetchARWithStatus]);

  const handleSelectAR = async (item: ARItem) => {
    const invNo = item.INV_NUMBER || item.invoiceNumber || '';
    let fullItem = item;

    if (invNo) {
      try {
        const fullDetail = await fetchARDetailBySearch(invNo, { token });
        if (fullDetail) {
          fullItem = { ...item, ...fullDetail };
        }
      } catch (e) {
        if (__DEV__) console.log('[handleSelectAR] fetchARDetailBySearch error:', e);
      }
    }

    router.push({
      pathname: '/ar-details' as any,
      params: {
        invNumber: invNo,
        invoiceData: JSON.stringify(fullItem),
      },
    });
  };

  const navigateToAllAR = useCallback(
    (status?: 'dueToday' | 'crossed' | 'future') => {
      const navParams: Record<string, string> = {};
      if (status) navParams.status = status;
      else if (activeStatus !== 'all') navParams.status = activeStatus;

      router.push({
        pathname: '/all-ar' as any,
        params: navParams,
      });
    },
    [activeStatus]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
          {/* 1. Search Bar */}
          <ARSearchBar onPress={() => setSearchModalVisible(true)} />

          {/* 2. Grey Summary Card */}
          <SummaryCard
            count={data?.totalInvoiceCount ?? data?.count ?? 0}
            totalAmount={data?.totalARDueAmount ?? 0}
            loading={loading}
          />

          {/* 3. 3 KPI Cards Grid (Due Today, Crossed, Future Dues) */}
          <ARKpiGrid
            dueTodayCount={data?.dueTodayCount ?? 0}
            dueTodayAmount={data?.dueTodayDueTotal ?? 0}
            crossedCount={data?.crossedCount ?? 0}
            crossedAmount={data?.crossedDueTotal ?? 0}
            futureCount={data?.futureDuesCount ?? 0}
            futureAmount={data?.futureDuesDueTotal ?? 0}
            loading={loading}
            onPressToday={() => navigateToAllAR('dueToday')}
            onPressCrossed={() => navigateToAllAR('crossed')}
            onPressFuture={() => navigateToAllAR('future')}
          />

          {/* 5. View All AR List Button */}
          <View style={styles.viewAllRowContainer}>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigateToAllAR()}
              activeOpacity={0.85}
            >
              <Text style={styles.viewAllButtonText}>View All AR List</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Search Overlay */}
      <SearchOverlayModal
        visible={searchModalVisible}
        onClose={() => {
          setSearchModalVisible(false);
          setQuery('');
        }}
        query={query}
        setQuery={setQuery}
        token={token}
        onSelectAR={handleSelectAR}
        activeStatus={activeStatus}
      />

      <BottomNav />
    </SafeAreaView>
  );
}

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 10, paddingBottom: 24 },
  contentContainer: { paddingHorizontal: 16, gap: 14 },

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
    fontSize: 18,
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

  tabsWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  tabBtnTextActive: {
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },

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
  searchSuggestionsScroll: { flex: 1 },
  searchSuggestionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 10,
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
    fontFamily: Typography.numberHeavy,
    color: '#FFFFFF',
  },
  summaryColRight: { alignItems: 'flex-end' },
  summaryValue: {
    fontSize: 20,
    fontFamily: Typography.numberHeavy,
    color: '#FFFFFF',
  },

  // 3 KPI Cards Row
  kpiContainer: { gap: 10 },
  kpiRow3: { flexDirection: 'row', gap: 8 },
  kpiCard3: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 3,
  },
  kpiHeaderLabel: {
    fontSize: 10.5,
    fontFamily: Typography.headingSemiBold,
    color: SECONDARY,
    letterSpacing: 0.3,
  },
  kpiValueText: {
    fontSize: 18,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: PRIMARY,
  },
  kpiSubText: {
    fontSize: 11,
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
