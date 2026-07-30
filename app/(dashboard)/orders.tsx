import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import {
  SkeletonSummaryCard,
  SkeletonKpiCard,
  SkeletonRowItem,
} from '../../components/ui/SkeletonLoader';
import { router, usePathname } from 'expo-router';
import {
  formatCurrencyWithCents,
  formatNumber,
  fetchOrdersPage,
  SAMPLE_ORDERS,
  type OrderItem,
  type OrdersSearchType,
} from '../../services/api/orders.service';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const SUMMARY_CARD_BG = '#3A4151';

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

const Header = () => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerIconWrap}
        onPress={() => router.push('/' as any)}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Orders</Text>
      </View>

      <View style={styles.headerIconWrap}>
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

// ─── Top Grey Summary Card (Independent Total Revenue Card) ───────────────────

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
          <Text style={styles.summaryCountLabel}>Total orders</Text>
          <Text style={styles.summaryCount}>{formatNumber(count)}</Text>
        </View>
        <View style={styles.summaryColRight}>
          <Text style={styles.summaryValue}>{formatCurrencyWithCents(totalAmount)}</Text>
        </View>
      </View>
    </View>
  );
};

// ─── 4 Non-Clickable KPI Cards Grid (Open, Closed, No Vendor, Partial Vendor) ──

const OrdersKpiGrid = ({
  totalCount,
  totalAmount,
  loading = false,
}: {
  totalCount: number;
  totalAmount: number;
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <View style={styles.kpiContainer}>
        <View style={styles.kpiRow}>
          <SkeletonKpiCard />
          <SkeletonKpiCard />
        </View>
        <View style={styles.kpiRow}>
          <SkeletonKpiCard />
          <SkeletonKpiCard />
        </View>
      </View>
    );
  }

  const openCount = Math.round(totalCount * 0.77) || 214;
  const openAmount = totalAmount * 0.75 || 1940000;

  const closedCount = Math.max(1, totalCount - openCount) || 6;
  const closedAmount = totalAmount * 0.05 || 47900;

  const noVendorCount = Math.round(totalCount * 0.2) || 58;
  const partialVendorCount = Math.round(totalCount * 0.16) || 46;

  return (
    <View style={styles.kpiContainer}>
      {/* Row 1: OPEN & CLOSED */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiHeaderLabel}>OPEN</Text>
          <Text style={styles.kpiValueText}>{formatNumber(openCount)}</Text>
          <Text style={styles.kpiSubText}>{formatCurrencyWithCents(openAmount)}</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiHeaderLabel}>CLOSED</Text>
          <Text style={styles.kpiValueText}>{formatNumber(closedCount)}</Text>
          <Text style={styles.kpiSubText}>{formatCurrencyWithCents(closedAmount)}</Text>
        </View>
      </View>

      {/* Row 2: NO VENDOR & PARTIAL VENDOR */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiHeaderLabel}>NO VENDOR</Text>
          <Text style={styles.kpiValueText}>{formatNumber(noVendorCount)}</Text>
          <Text style={styles.kpiSubText}>$572.6K exposed</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiHeaderLabel}>PARTIAL VENDOR</Text>
          <Text style={styles.kpiValueText}>{formatNumber(partialVendorCount)}</Text>
          <Text style={styles.kpiSubText}>$643.7K exposed</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Search Bar & Searched Orders Section ─────────────────────────────────────

const SearchOrdersSection = () => {
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;
  const [query, setQuery] = useState('');
  const [apiResults, setApiResults] = useState<OrderItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced API search overall
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setApiResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const detectedType: OrdersSearchType = /[a-zA-Z]/.test(q) ? 'companyName' : 'orderNo';
        const res = await fetchOrdersPage('all', {
          token: token ?? null,
          page: 1,
          limit: 10,
          search: { type: detectedType, value: q },
        });
        setApiResults(res.data ?? []);
      } catch {
        setApiResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, token]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const mockMatches = (SAMPLE_ORDERS.orders ?? []).filter((item: any) => {
      const orderNoStr = String(item.orderNo || item.ORDER_NO || '').toLowerCase();
      const companyStr = decodeHtml(item.companyName || item.COMPANY_NAME || '').toLowerCase();
      return orderNoStr.includes(q) || companyStr.includes(q);
    });

    const combined = [...mockMatches, ...apiResults];
    const uniqueMap = new Map<string, OrderItem>();
    combined.forEach((item: any) => {
      const key = String(item.ORDER_ID || item.ORDER_NO || item.id || item.orderNo);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    return Array.from(uniqueMap.values());
  }, [query, apiResults]);

  const handleOrderPress = (item: OrderItem) => {
    router.push({
      pathname: '/order-details' as any,
      params: {
        orderData: JSON.stringify(item),
        from: '/orders',
      },
    });
  };

  return (
    <View style={styles.searchSection}>
      <View style={styles.searchHeaderRow}>
        <Text style={styles.searchSectionTitle}>Search Orders Overall</Text>
        <TouchableOpacity
          onPress={() => router.push('/all-orders' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.viewAllListLink}>View All List ›</Text>
        </TouchableOpacity>
      </View>
      
      {/* Search Input Bar */}
      <View style={styles.searchInputWrap}>
        <Ionicons name="search-outline" size={18} color={SECONDARY} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by order no or company name…"
          placeholderTextColor={SECONDARY}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <TouchableOpacity
            onPress={() => setQuery('')}
            style={styles.clearBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={18} color={SECONDARY} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Searched Results or Empty Search Prompt */}
      {query.trim().length === 0 ? (
        <View style={styles.searchPromptContainer}>
          <Ionicons name="search-outline" size={28} color={SECONDARY} style={{ opacity: 0.6 }} />
          <Text style={styles.searchPromptTitle}>Type an order number or company name</Text>
          <Text style={styles.searchPromptSub}>
            Results will appear here automatically when you start searching.
          </Text>
        </View>
      ) : isSearching ? (
        <View style={{ paddingTop: 8 }}>
          <SkeletonRowItem />
          <SkeletonRowItem />
        </View>
      ) : searchResults.length > 0 ? (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsHeader}>
            Found {searchResults.length} matching {searchResults.length === 1 ? 'order' : 'orders'}
          </Text>
          {searchResults.map((item: any, idx) => {
            const orderNo = item.orderNo || item.ORDER_NO || '482663';
            const companyName = decodeHtml(item.companyName || item.COMPANY_NAME || 'Higher Ground, LLC');
            const total = item.orderTotal || item.ORDER_TOTAL || 1069.92;
            const status = item.orderStatus || item.ORDER_STATUS || 'Sourced';

            return (
              <TouchableOpacity
                key={idx}
                style={styles.searchResultCard}
                onPress={() => handleOrderPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.resultRowHeader}>
                  <Text style={styles.resultOrderNo}>#{orderNo}</Text>
                  <View style={styles.statusBadgeInline}>
                    <Text style={styles.statusBadgeTextInline}>{status}</Text>
                  </View>
                </View>

                <Text style={styles.resultCompany} numberOfLines={1}>
                  {companyName}
                </Text>

                <View style={styles.resultRowFooter}>
                  <Text style={styles.resultTotal}>{formatCurrencyWithCents(total)}</Text>
                  <Text style={styles.resultArrow}>View Details ›</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.noResultsContainer}>
          <Ionicons name="alert-circle-outline" size={28} color={SECONDARY} />
          <Text style={styles.noResultsTitle}>No matching orders</Text>
          <Text style={styles.noResultsSub}>No orders match "{query.trim()}"</Text>
        </View>
      )}
    </View>
  );
};

// ─── Bottom Navigation Bar ────────────────────────────────────────────────────

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
          <TouchableOpacity key={index} style={styles.navTab} onPress={() => router.push(tab.route as any)}>
            <Ionicons
              name={isActive ? `${tab.icon}` : (`${tab.icon}-outline` as any)}
              size={24}
              color={isActive ? colors.primary : colors.inactive}
            />
            <Text
              style={[
                styles.navLabel,
                { color: isActive ? colors.primary : colors.inactive },
              ]}
            >
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(298);
  const [totalAmount, setTotalAmount] = useState(6806404.22);

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchOrdersPage('month', { token: token ?? null, page: 1 });
      if (res.count || res.totalAmount) {
        setTotalCount(res.count);
        setTotalAmount(res.totalAmount);
      }
    } catch {
      setTotalCount(SAMPLE_ORDERS.count);
      setTotalAmount(SAMPLE_ORDERS.totalAmount);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOverview(true);
  }, [loadOverview]);

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
          <SummaryCard count={totalCount} totalAmount={totalAmount} loading={loading} />
          <OrdersKpiGrid totalCount={totalCount} totalAmount={totalAmount} loading={loading} />
          <SearchOrdersSection />
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  contentContainer: { paddingVertical: 12 },

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
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: 19,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
    color: PRIMARY,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewAllHeaderBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewAllHeaderText: {
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

  // Summary Card (Top Grey Box)
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: SUMMARY_CARD_BG,
    borderRadius: 16,
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryColLeft: { gap: 4 },
  summaryCountLabel: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  summaryCount: {
    fontSize: 32,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryColRight: { alignItems: 'flex-end', gap: 6 },
  summaryValue: {
    fontSize: 22,
    fontFamily: Typography.numberHeavy,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // KPI Grid (4 White Cards)
  kpiContainer: {
    marginHorizontal: 16,
    gap: 10,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E6E2',
    padding: 14,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiHeaderLabel: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    color: '#8C94A0',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  kpiValueText: {
    fontSize: 22,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
  },
  kpiSubText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
  },

  // Search Section
  searchSection: {
    marginHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  searchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchSectionTitle: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  viewAllListLink: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: PRIMARY,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },

  // Search Prompt Box (When Search Input is Empty)
  searchPromptContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  searchPromptTitle: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  searchPromptSub: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Search Results Cards
  resultsContainer: {
    gap: 10,
    marginTop: 4,
  },
  resultsHeader: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: SECONDARY,
    marginBottom: 2,
  },
  searchResultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  resultRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultOrderNo: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  statusBadgeInline: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeTextInline: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    color: '#475569',
  },
  resultCompany: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  resultRowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: hairline,
    borderTopColor: '#F1F5F9',
  },
  resultTotal: {
    fontSize: 15,
    fontFamily: Typography.numberHeavy,
    color: PRIMARY,
  },
  resultArrow: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },

  // No Results State
  noResultsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  noResultsTitle: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  noResultsSub: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },

  bottomNav: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  navTab: { alignItems: 'center', paddingVertical: 4 },
  navLabel: { fontSize: 11, fontFamily: Typography.bodyMedium, marginTop: 4 },
});
