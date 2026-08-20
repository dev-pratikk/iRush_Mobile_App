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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../../constants/Typography';
import { useThemeColors } from '../../../context/ThemeContext';
import { useAuthContext } from '../../../context/AuthContext';
import { NotificationHeaderButton } from '../../../components/navigation/NotificationHeaderButton';
import {
  SkeletonSummaryCard,
  SkeletonKpiCard,
} from '../../../components/ui/SkeletonLoader';
import { router, useFocusEffect } from 'expo-router';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { BottomNavBar as BottomNav } from '../../../components/navigation/BottomNavBar';
import {
  formatCurrencyWithCents,
  formatNumber,
  fetchOrdersPage,
  fetchOrdersByFastSearch,
  fetchOrderById,
  type OrderItem,
} from '../../../services/api/orders.service';
import {
  OpenOrdersResponse,
  EMPTY_OPEN_ORDERS,
  SAMPLE_OPEN_ORDERS,
  getOpenOrders,
} from '../../../services/api/open-orders.service';
import { DateFilterPreset, getDateRangeForFilter, formatCustomRangeLabel } from '../../../lib/date';
import { DateFilterModal } from '../../../components/ui/DateFilterModal';
import { useBackHandler } from '../../../hooks/useBackHandler';

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
  const colors = useThemeColors();
  const navigation = useNavigation();

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
    <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={styles.headerIconWrap}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="menu-outline" size={22} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Orders</Text>

      <View style={styles.headerRightWrap}>
        <TouchableOpacity
          style={[styles.filterBtnPill, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}
          onPress={onOpenFilter}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={13} color={colors.primary} />
          <Text style={[styles.filterBtnText, { color: colors.primary }]}>{getFilterLabel()}</Text>
          <Ionicons name="chevron-down" size={12} color={colors.primary} />
        </TouchableOpacity>

        <NotificationHeaderButton iconColor={colors.textPrimary} size={20} />
      </View>
    </View>
  );
};

// ─── Search Bar ───────────────────────────────────────────────────────────────

const OrderSearchBar = ({ onPress }: { onPress: () => void }) => {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[styles.searchInputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
      <Text style={[styles.searchPlaceholderText, { color: colors.placeholder }]}>Search by order # or part number</Text>
    </TouchableOpacity>
  );
};

// ─── Search Overlay Modal ─────────────────────────────────────────────────────

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
  const colors = useThemeColors();
  const inputRef = useRef<TextInput>(null);
  const [fetchedOrders, setFetchedOrders] = useState<OrderItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let active = true;
    if (!visible) return;

    const performLiveSearch = async () => {
      const q = query.trim();
      if (!q) {
        setFetchedOrders([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const results = await fetchOrdersByFastSearch(q, { token: token ?? null });
        if (active) setFetchedOrders(results);
      } catch (e) {
        if (__DEV__) console.log('[SearchOverlay] Fast live search error:', e);
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

    const getPartNoString = (item: any): string => {
      return String(
        item.pcbpartNo ||
        item.PCBPARTNO ||
        item.partNo ||
        item.PARTNO ||
        item.partNumber ||
        item.PARTNUMBER ||
        item.orderDetails?.[0]?.PCBPARTNO ||
        ''
      ).trim();
    };

    return fetchedOrders.filter((item: any) => {
      const orderNoStr = String(item.orderNo || item.ORDER_NO || '').toLowerCase();
      const companyStr = decodeHtml(item.companyName || item.COMPANY_NAME || '').toLowerCase();
      const partNoStr = getPartNoString(item).toLowerCase();
      return orderNoStr.includes(q) || companyStr.includes(q) || partNoStr.includes(q);
    });
  }, [query, fetchedOrders]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      onShow={() => inputRef.current?.focus()}
    >
      <SafeAreaView style={[styles.searchOverlaySafeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.searchOverlayHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.searchOverlayInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={[styles.searchOverlayInput, { color: colors.textPrimary }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by order # or part #"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.searchCancelBtn} activeOpacity={0.7}>
            <Text style={[styles.searchCancelText, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.searchSuggestionsScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.searchSuggestionsContainer}>
            {searching ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>Searching live orders…</Text>
              </View>
            ) : searchResults.length > 0 ? (
              searchResults.map((item: any, idx: number) => {
                const orderNoDisplay = item.orderNo || item.ORDER_NO || item.id;
                const companyDisplay = decodeHtml(item.companyName || item.COMPANY_NAME || 'Higher Ground, LLC');
                const statusDisplay = item.orderStatus || item.ORDER_STATUS || 'Open';

                return (
                  <TouchableOpacity
                    key={item.ORDER_ID || item.id || idx}
                    style={[styles.suggestionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => onSelectOrder(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.suggestionLeftCol}>
                      <Text style={[styles.suggestionOrderNo, { color: colors.textPrimary }]}>Order #{orderNoDisplay}</Text>
                      <Text style={[styles.suggestionCompany, { color: colors.textSecondary }]} numberOfLines={1}>
                        {companyDisplay}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.suggestionStatusPill, { backgroundColor: `${colors.primary}12` }]}>
                        <Text style={[styles.suggestionStatusText, { color: colors.primary }]}>{statusDisplay}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 6 }} />
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptySearchWrap}>
                <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptySearchTitle, { color: colors.textPrimary }]}>
                  {query.trim().length > 0 ? 'No matching orders found' : 'Type an order number or part #'}
                </Text>
                <Text style={[styles.emptySearchSub, { color: colors.textSecondary }]}>
                  {query.trim().length > 0
                    ? 'Try searching for a different order number or company name.'
                    : 'Live order suggestions will appear automatically as you type.'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Hero Summary Overview Card ───────────────────────────────────────────────

const SummaryCard = ({
  count,
  totalAmount,
  loading,
  onPress,
}: {
  count: number;
  totalAmount: number;
  loading: boolean;
  onPress?: () => void;
}) => {
  const colors = useThemeColors();

  if (loading && count === 0 && totalAmount === 0) {
    return <SkeletonSummaryCard />;
  }

  const content = (
    <View style={[styles.heroCard, { backgroundColor: `${colors.primary}0D`, borderColor: `${colors.primary}25` }]}>
      <View style={styles.heroHeaderRow}>
        <View style={[styles.heroIconBadge, { backgroundColor: colors.primary }]}>
          <Ionicons name="document-text" size={16} color="#FFFFFF" />
        </View>
        <Text style={[styles.heroTitle, { color: colors.textSecondary }]}>TOTAL ORDERS OVERVIEW</Text>
        {onPress && <Ionicons name="arrow-forward" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />}
      </View>

      <View style={styles.heroBodyRow}>
        <View style={styles.heroCountCol}>
          <Text style={[styles.heroCountText, { color: colors.textPrimary }]}>{formatNumber(count)}</Text>
          <Text style={[styles.heroCountLabel, { color: colors.textSecondary }]}>Total Orders</Text>
        </View>

        <View style={styles.heroAmountCol}>
          <Text style={[styles.heroAmountText, { color: colors.primary }]}>{formatCurrencyWithCents(totalAmount)}</Text>
          <Text style={[styles.heroAmountLabel, { color: colors.textSecondary }]}>Total Volume</Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// ─── Dual KPI Action Cards (NEW & REPEAT) ─────────────────────────────────────

const OrdersKpiGrid = ({
  newCount = 0,
  newAmount = 0,
  repeatCount = 0,
  repeatAmount = 0,
  loading = false,
  onPressNew,
  onPressRepeat,
}: {
  newCount?: number;
  newAmount?: number;
  repeatCount?: number;
  repeatAmount?: number;
  loading?: boolean;
  onPressNew: () => void;
  onPressRepeat: () => void;
}) => {
  const colors = useThemeColors();

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
        <TouchableOpacity
          style={[styles.kpiCardAction, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onPressNew}
          activeOpacity={0.8}
        >
          <View style={styles.kpiCardHeader}>
            <View style={[styles.kpiTag, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Text style={[styles.kpiTagText, { color: '#1D4ED8' }]}>NEW</Text>
            </View>
            <Ionicons name="sparkles" size={14} color="#2563EB" />
          </View>

          <Text style={[styles.kpiCountValue, { color: colors.textPrimary }]}>{formatNumber(newCount)}</Text>
          <Text style={[styles.kpiAmountValue, { color: colors.textSecondary }]}>{formatCurrencyWithCents(newAmount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.kpiCardAction, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onPressRepeat}
          activeOpacity={0.8}
        >
          <View style={styles.kpiCardHeader}>
            <View style={[styles.kpiTag, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
              <Text style={[styles.kpiTagText, { color: '#6D28D9' }]}>REPEAT</Text>
            </View>
            <Ionicons name="repeat-outline" size={14} color="#7C3AED" />
          </View>

          <Text style={[styles.kpiCountValue, { color: colors.textPrimary }]}>{formatNumber(repeatCount)}</Text>
          <Text style={[styles.kpiAmountValue, { color: colors.textSecondary }]}>{formatCurrencyWithCents(repeatAmount)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Open Orders Status Cards Grid ───────────────────────────────────────────

const PendingAndPartialKpiGrid = ({ data }: { data: OpenOrdersResponse }) => {
  const colors = useThemeColors();
  const pendingCount = data.pendingOrdersCount ?? data.pendingOrdersSummary?.totalOrders ?? 0;
  const pendingAmount = data.pendingOrdersAmount ?? data.pendingOrdersSummary?.totalOrderedAmount ?? 0;

  const partialCount = data.partialOrdersCount ?? data.partialOrdersSummary?.totalOrders ?? 0;
  const partialAmount = data.partialOrdersAmount ?? data.partialOrdersSummary?.totalOrderedAmount ?? 0;

  const openCount = data.totalOpenOrders ?? pendingCount + partialCount;
  const openAmount = data.totalOpenOrdersAmount ?? pendingAmount + partialAmount;

  return (
    <View style={{ gap: 10, marginTop: 10 }}>
      {/* ALL OPEN ORDERS CARD */}
      <TouchableOpacity
        style={[styles.openOrdersFullCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push('/open-orders' as any)}
        activeOpacity={0.8}
      >
        <View style={styles.openOrdersHeader}>
          <View style={[styles.openIconWrap, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="cube" size={15} color="#16A34A" />
          </View>
          <Text style={[styles.openOrdersTitle, { color: colors.textPrimary }]}>ALL OPEN ORDERS</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
        </View>

        <View style={styles.openOrdersBody}>
          <View>
            <Text style={[styles.openOrdersCount, { color: colors.textPrimary }]}>{formatNumber(openCount)}</Text>
            <Text style={[styles.openOrdersSub, { color: colors.textSecondary }]}>Active Orders</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.openOrdersAmount, { color: '#16A34A' }]}>{formatCurrencyWithCents(openAmount)}</Text>
            <Text style={[styles.openOrdersSub, { color: colors.textSecondary }]}>Value</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* PENDING & PARTIAL CARDS */}
      <View style={styles.kpiRow}>
        <TouchableOpacity
          style={[styles.splitCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/pending-orders' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.splitHeader}>
            <View style={[styles.dotPill, { backgroundColor: '#FEF3C7' }]}>
              <View style={[styles.dot, { backgroundColor: '#D97706' }]} />
              <Text style={{ fontSize: 10, fontFamily: Typography.headingSemiBold, color: '#D97706' }}>PENDING</Text>
            </View>
          </View>
          <Text style={[styles.splitCount, { color: colors.textPrimary }]}>{formatNumber(pendingCount)}</Text>
          <Text style={[styles.splitAmount, { color: colors.textSecondary }]}>{formatCurrencyWithCents(pendingAmount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.splitCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/partial-orders' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.splitHeader}>
            <View style={[styles.dotPill, { backgroundColor: '#CCFBF1' }]}>
              <View style={[styles.dot, { backgroundColor: '#0D9488' }]} />
              <Text style={{ fontSize: 10, fontFamily: Typography.headingSemiBold, color: '#0D9488' }}>PARTIAL</Text>
            </View>
          </View>
          <Text style={[styles.splitCount, { color: colors.textPrimary }]}>{formatNumber(partialCount)}</Text>
          <Text style={[styles.splitAmount, { color: colors.textSecondary }]}>{formatCurrencyWithCents(partialAmount)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Financial Breakdown Table Card ───────────────────────────────────────────

const FixedSummaryTable = ({
  title,
  count,
  amount,
  summary,
  onPress,
}: {
  title: string;
  count: number;
  amount: number;
  summary?: any;
  onPress: () => void;
}) => {
  const colors = useThemeColors();

  const statRows = [
    { label: 'No. of Orders', value: formatNumber(count), icon: 'receipt-outline' },
    { label: 'Total Ordered Value', value: formatCurrencyWithCents(amount), icon: 'cash-outline' },
    { label: 'Assigned To Vendors', value: formatNumber(summary?.ordersWithVendorCount ?? 0), icon: 'people-outline' },
    { label: 'Assigned Vendor Order Value', value: formatCurrencyWithCents(summary?.ordersWithVendorAmount ?? summary?.vendorOrderAmount ?? 0), icon: 'pricetag-outline' },
    { label: 'Orders Without Vendor', value: formatNumber(summary?.ordersWithoutVendorCount ?? 0), icon: 'alert-circle-outline' },
    { label: 'Shipped Quantity Value', value: formatCurrencyWithCents(summary?.totalShippedAmount ?? 0), icon: 'car-outline' },
    { label: 'Pending Quantity Value', value: formatCurrencyWithCents(summary?.totalPendingAmount ?? amount), icon: 'time-outline' },
    { label: 'Invoiced Quantity Value', value: formatCurrencyWithCents(summary?.totalInvoicedAmount ?? 0), icon: 'document-text-outline' },
    { label: 'Payment Received', value: formatCurrencyWithCents(summary?.totalPaymentsReceived ?? 0), icon: 'checkmark-circle-outline' },
    { label: 'Advance Payment', value: formatCurrencyWithCents(summary?.advancePaymentReceived ?? 0), icon: 'wallet-outline' },
  ];

  return (
    <TouchableOpacity style={[styles.tableCardContainer, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.88}>
      <View style={[styles.tableHeader, { backgroundColor: colors.primary }]}>
        <Text style={styles.tableTitle}>{title}</Text>
        <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
      </View>

      <View style={styles.tableBody}>
        {statRows.map((row, index) => (
          <View
            key={index}
            style={[
              styles.tableRow,
              index < statRows.length - 1 && [styles.tableRowBorder, { borderBottomColor: colors.border }],
            ]}
          >
            <View style={styles.tableLabelWrap}>
              <Ionicons name={row.icon as any} size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.tableRowLabel, { color: colors.textSecondary }]}>{row.label}</Text>
            </View>
            <Text style={[styles.tableRowValue, { color: colors.textPrimary }]}>{row.value}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen Component ───────────────────────────────────────────────────

export default function OrdersScreen() {
  const colors = useThemeColors();
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
  const [openOrdersData, setOpenOrdersData] = useState<OpenOrdersResponse>(EMPTY_OPEN_ORDERS);

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
        const newAmt = (res as any).newOrderValue ?? res.newOrdersAmount ?? 0;
        const repeatCount = res.repeatedOrdersCount ?? 0;
        const repeatAmt = (res as any).repeatedOrderValue ?? res.repeatedOrdersAmount ?? 0;

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

  useEffect(() => {
    fetchOrdersForPreset(activePreset, customRange);
  }, [activePreset, customRange, fetchOrdersForPreset]);

  useEffect(() => {
    (async () => {
      try {
        if (!token) {
          setOpenOrdersData(SAMPLE_OPEN_ORDERS);
          return;
        }
        const res = await getOpenOrders({ token, timeoutMs: 20000 });
        setOpenOrdersData(res);
      } catch (e: any) {
        if (__DEV__) console.log('[OrdersScreen] getOpenOrders error:', e?.message || e);
        setOpenOrdersData(SAMPLE_OPEN_ORDERS);
      }
    })();
  }, [token]);

  useBackHandler({
    modalVisible: filterModalVisible || searchModalVisible,
    onDismissModal: () => {
      setFilterModalVisible(false);
      setSearchModalVisible(false);
      setQuery('');
    },
  });

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

  const handleSelectOrder = async (item: any) => {
    const orderId = item.ORDER_ID || item.orderId || item.ORDERD_ID || item.id;
    let fullOrder = item;

    if (orderId) {
      try {
        const res = await fetchOrderById(orderId, { token });
        if (res) fullOrder = res;
      } catch (e) {
        if (__DEV__) console.log('[OrdersScreen] fetchOrderById error on navigate:', e);
      }
    }

    router.push({
      pathname: '/order-details' as any,
      params: {
        orderId: orderId ? String(orderId) : undefined,
        orderData: JSON.stringify(fullOrder),
        from: '/orders',
      },
    });
  };

  const navigateToAllOrders = useCallback(
    (category?: 'NEW' | 'REPEAT') => {
      const navParams: Record<string, string> = {};
      if (category) navParams.category = category;
      if (activePreset) navParams.period = activePreset;

      const currentRange = customRange || getDateRangeForFilter(activePreset, customRange);
      if (currentRange?.startDate && currentRange?.endDate) {
        navParams.startDate = currentRange.startDate;
        navParams.endDate = currentRange.endDate;
      }

      router.push({
        pathname: '/all-orders' as any,
        params: navParams,
      });
    },
    [activePreset, customRange]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <View style={styles.contentContainer}>
          <OrderSearchBar onPress={() => setSearchModalVisible(true)} />

          <SummaryCard
            count={totalCount}
            totalAmount={totalAmount}
            loading={loading}
            onPress={() => navigateToAllOrders()}
          />

          <OrdersKpiGrid
            newCount={newOrdersCount}
            newAmount={newOrdersAmount}
            repeatCount={repeatedOrdersCount}
            repeatAmount={repeatedOrdersAmount}
            loading={loading}
            onPressNew={() => navigateToAllOrders('NEW')}
            onPressRepeat={() => navigateToAllOrders('REPEAT')}
          />

          <PendingAndPartialKpiGrid data={openOrdersData} />

          <View style={{ gap: 14, marginTop: 12 }}>
            <FixedSummaryTable
              title="All Open Orders Breakdown"
              count={openOrdersData.totalOpenOrders ?? (openOrdersData.pendingOrdersCount ?? 0) + (openOrdersData.partialOrdersCount ?? 0)}
              amount={openOrdersData.totalOpenOrdersAmount ?? (openOrdersData.pendingOrdersAmount ?? 0) + (openOrdersData.partialOrdersAmount ?? 0)}
              summary={(openOrdersData as any).openOrdersSummary}
              onPress={() => router.push('/open-orders' as any)}
            />

            <FixedSummaryTable
              title="Pending Orders Breakdown"
              count={openOrdersData.pendingOrdersCount ?? 0}
              amount={openOrdersData.pendingOrdersAmount ?? 0}
              summary={openOrdersData.pendingOrdersSummary}
              onPress={() => router.push('/pending-orders' as any)}
            />

            <FixedSummaryTable
              title="Partial Orders Breakdown"
              count={openOrdersData.partialOrdersCount ?? 0}
              amount={openOrdersData.partialOrdersAmount ?? 0}
              summary={openOrdersData.partialOrdersSummary}
              onPress={() => router.push('/partial-orders' as any)}
            />
          </View>
        </View>
      </ScrollView>

      <BottomNav />

      <DateFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        activePreset={activePreset}
        customRange={customRange}
        onApply={handleApplyFilter}
      />

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
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerIconWrap: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 18, fontFamily: Typography.headingSemiBold },
  headerRightWrap: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterBtnText: { fontSize: 12, fontFamily: Typography.headingSemiBold },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  contentContainer: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchPlaceholderText: { fontSize: 13, fontFamily: Typography.bodyMedium },
  
  // Hero Summary Card
  heroCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  heroIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    letterSpacing: 0.5,
  },
  heroBodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroCountCol: { flex: 1 },
  heroCountText: { fontSize: 26, fontFamily: Typography.headingExtraBold },
  heroCountLabel: { fontSize: 12, fontFamily: Typography.bodyMedium, marginTop: 2 },
  heroAmountCol: { alignItems: 'flex-end' },
  heroAmountText: { fontSize: 22, fontFamily: Typography.headingExtraBold },
  heroAmountLabel: { fontSize: 12, fontFamily: Typography.bodyMedium, marginTop: 2 },

  // Dual KPI Grid
  kpiContainer: { gap: 10 },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCardAction: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  kpiTagText: { fontSize: 10, fontFamily: Typography.headingSemiBold },
  kpiCountValue: { fontSize: 22, fontFamily: Typography.headingSemiBold, marginBottom: 2 },
  kpiAmountValue: { fontSize: 12, fontFamily: Typography.bodyMedium },

  // Open Orders Cards
  openOrdersFullCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  openOrdersHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  openIconWrap: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  openOrdersTitle: { fontSize: 12, fontFamily: Typography.headingSemiBold, letterSpacing: 0.3 },
  openOrdersBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  openOrdersCount: { fontSize: 22, fontFamily: Typography.headingSemiBold },
  openOrdersAmount: { fontSize: 18, fontFamily: Typography.headingSemiBold },
  openOrdersSub: { fontSize: 11, fontFamily: Typography.bodyMedium, marginTop: 1 },

  splitCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  splitHeader: { flexDirection: 'row', marginBottom: 8 },
  dotPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  splitCount: { fontSize: 19, fontFamily: Typography.headingSemiBold },
  splitAmount: { fontSize: 12, fontFamily: Typography.bodyMedium, marginTop: 2 },

  // Breakdown Tables
  tableCardContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tableTitle: { fontSize: 13, fontFamily: Typography.headingSemiBold, color: '#FFFFFF' },
  tableBody: { paddingHorizontal: 14, paddingVertical: 4 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  tableRowBorder: { borderBottomWidth: 1 },
  tableLabelWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 },
  tableRowLabel: { fontSize: 12.5, fontFamily: Typography.bodyMedium },
  tableRowValue: { fontSize: 13, fontFamily: Typography.headingSemiBold },

  // Search Modal
  searchOverlaySafeArea: { flex: 1 },
  searchOverlayHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  searchOverlayInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 40, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10 },
  searchOverlayInput: { flex: 1, fontSize: 14, fontFamily: Typography.bodyMedium },
  clearBtn: { padding: 4 },
  searchCancelBtn: { marginLeft: 10, paddingVertical: 6, paddingHorizontal: 4 },
  searchCancelText: { fontSize: 14, fontFamily: Typography.headingSemiBold },
  searchSuggestionsScroll: { flex: 1 },
  searchSuggestionsContainer: { padding: 14, gap: 10 },
  suggestionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1 },
  suggestionLeftCol: { flex: 1, paddingRight: 10 },
  suggestionOrderNo: { fontSize: 14, fontFamily: Typography.headingSemiBold },
  suggestionCompany: { fontSize: 12, fontFamily: Typography.bodyMedium, marginTop: 2 },
  suggestionStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  suggestionStatusText: { fontSize: 11, fontFamily: Typography.headingSemiBold },
  emptySearchWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptySearchTitle: { fontSize: 15, fontFamily: Typography.headingSemiBold, marginTop: 10 },
  emptySearchSub: { fontSize: 12, fontFamily: Typography.bodyMedium, textAlign: 'center', marginTop: 4 },
});
