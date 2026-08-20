import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { useAuthContext } from '../../context/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import { NotificationHeaderButton } from '../../components/navigation/NotificationHeaderButton';
import { useBackHandler } from '../../hooks/useBackHandler';
import { OrderCard } from '../../components/dashboard/OrderCard';
import {
  formatCurrencyWithCents,
  formatNumber,
  formatOrderDate,
  fetchOrdersByFastSearch,
  fetchOrderById,
} from '../../services/api/orders.service';
import {
  SAMPLE_OPEN_ORDERS,
  OPEN_ORDERS_PAGE_LIMIT,
  type OpenOrderSearchType,
  type OpenOrderSearchParam,
} from '../../services/api/open-orders.service';
import { useOpenOrders, type OpenOrderRowItem } from '../../hooks/useOpenOrders';
import { useSalespersons } from '../../hooks/useSalespersons';
import { PaginationFooter } from '../../components/ui/PaginationFooter';
import type { OpenOrdersSummary } from '../../types/api/open-orders';
import { SkeletonRowItem, SkeletonSummaryCard } from '../../components/ui/SkeletonLoader';
import { DateFilterPreset, getDateRangeForFilter, formatCustomRangeLabel } from '../../lib/date';
import { DateFilterModal } from '../../components/ui/DateFilterModal';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const PAGE_BG = '#FFFFFF';
const SUMMARY_CARD_TEXT = '#FFFFFF';
const INPUT_BG = '#F5F5F2';

const DEFAULT_SALESPERSONS = ['Imran', 'John', 'Sarah', 'Alex', 'Michael', 'David'];

const SEARCH_MODAL_PRIMARY = '#0F172A';
const SEARCH_MODAL_SECONDARY = '#64748B';

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

const SimpleKpiCard = ({
  title,
  count,
  amount,
  loading,
}: {
  title: string;
  count: number;
  amount: number;
  loading?: boolean;
}) => {
  if (loading && count === 0) {
    return <SkeletonSummaryCard />;
  }
  return (
    <View style={styles.simpleKpiCard}>
      <View>
        <Text style={styles.simpleKpiLabel}>{title}</Text>
        <Text style={styles.simpleKpiCount}>{formatNumber(count)}</Text>
      </View>
      <View style={styles.simpleKpiRight}>
        <Text style={styles.simpleKpiAmount}>{formatCurrencyWithCents(amount)}</Text>
      </View>
    </View>
  );
};

const OrderSearchBar = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity
      style={styles.searchInputWrap}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Ionicons name="search-outline" size={18} color={SECONDARY} style={styles.searchIcon} />
      <Text style={styles.searchPlaceholderText}>Search by order no or part number</Text>
    </TouchableOpacity>
  );
};

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
  onSelectOrder: (item: any) => void;
}) => {
  const inputRef = useRef<TextInput>(null);
  const [fetchedOrders, setFetchedOrders] = useState<any[]>([]);
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
      const q = query.trim();
      if (!q) {
        setFetchedOrders([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const results = await fetchOrdersByFastSearch(q, { token: token ?? null });
        if (active) {
          setFetchedOrders(results);
        }
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
        item.orderDetails?.[0]?.PARTNO ||
        item.orderDetails?.[0]?.pcbpartNo ||
        item.orderSpecifications?.[0]?.PCBPARTNO ||
        ''
      ).trim();
    };

    const scored = fetchedOrders
      .map((item: any) => {
        const orderNoStr = String(item.orderNo || item.ORDER_NO || '').toLowerCase();
        const companyStr = decodeHtml(item.companyName || item.COMPANY_NAME || '').toLowerCase();
        const partNoStr = getPartNoString(item).toLowerCase();

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
        } else {
          score = 500;
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
        <View style={styles.searchOverlayHeader}>
          <View style={styles.searchOverlayInputWrap}>
            <Ionicons name="search-outline" size={18} color={SEARCH_MODAL_SECONDARY} style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={styles.searchOverlayInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by order #, or part #"
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
                <ActivityIndicator size="small" color={SEARCH_MODAL_PRIMARY} />
                <Text style={{ fontSize: 13, color: SEARCH_MODAL_SECONDARY, marginTop: 8 }}>Searching live orders…</Text>
              </View>
            ) : searchResults.length > 0 ? (
              searchResults.map((item: any, idx: number) => {
                const orderNoDisplay = item.orderNo || item.ORDER_NO || item.id;
                const companyDisplay = decodeHtml(item.companyName || item.COMPANY_NAME || 'Higher Ground, LLC');
                const statusDisplay = item.orderStatus || item.ORDER_STATUS || 'Open';
                const partNoDisplay =
                  item.pcbpartNo ||
                  item.PCBPARTNO ||
                  item.partNo ||
                  item.PARTNO ||
                  item.partNumber ||
                  item.PARTNUMBER ||
                  item.orderDetails?.[0]?.PCBPARTNO ||
                  item.orderDetails?.[0]?.PARTNO ||
                  item.orderDetails?.[0]?.pcbpartNo ||
                  item.orderSpecifications?.[0]?.PCBPARTNO;

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
                        <Text style={{ fontSize: 11, color: SEARCH_MODAL_SECONDARY, marginTop: 2 }} numberOfLines={1}>
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

const Header = () => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerIconWrap}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/orders'))}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <Text style={styles.headerTitleCenter}>Open Orders</Text>
      </View>

      <View style={styles.headerRightWrap}>
        <NotificationHeaderButton iconColor={PRIMARY} size={20} />
      </View>
    </View>
  );
};

const SummaryBreakdownCard = ({
  summary,
  loading,
  usingSample,
}: {
  summary: OpenOrdersSummary | null;
  loading: boolean;
  usingSample: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);

  if (loading && !summary) {
    return <SkeletonSummaryCard />;
  }

  const count = summary?.totalOrders ?? SAMPLE_OPEN_ORDERS.pendingOrdersCount;
  const amount = summary?.totalOrderedAmount ?? SAMPLE_OPEN_ORDERS.pendingOrdersAmount;

  const statRows = [
    { label: 'No of Orders', value: formatNumber(count) },
    { label: 'Total Open Orders Value', value: formatCurrencyWithCents(amount) },
    { label: 'Orders Assigned To Vendors', value: formatNumber(summary?.ordersWithVendorCount ?? 0) },
    {
      label: 'Assigned Vendor Order Value',
      value: formatCurrencyWithCents(summary?.ordersWithVendorAmount ?? summary?.vendorOrderAmount ?? 0),
    },
    { label: 'Orders Without Vendor Assignment', value: formatNumber(summary?.ordersWithoutVendorCount ?? 0) },
    { label: 'Shipped Order Quantity Value', value: formatCurrencyWithCents(summary?.totalShippedAmount ?? 0) },
    { label: 'Pending Order Quantity Value', value: formatCurrencyWithCents(summary?.totalPendingAmount ?? amount) },
    { label: 'Invoiced Order Quantity Value', value: formatCurrencyWithCents(summary?.totalInvoicedAmount ?? 0) },
    { label: 'Payment Received', value: formatCurrencyWithCents(summary?.totalPaymentsReceived ?? 0) },
    { label: 'Advance Payment Received', value: formatCurrencyWithCents(summary?.advancePaymentReceived ?? 0) },
  ];

  return (
    <View style={styles.breakdownCard}>
      <TouchableOpacity
        style={styles.breakdownHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.85}
      >
        <View style={styles.breakdownTitleRow}>
          <Text style={styles.breakdownTitle}>Open Orders Summary</Text>
          <Text style={styles.breakdownSubtitle}>
            {formatNumber(count)} orders · {formatCurrencyWithCents(amount)}
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.breakdownContent}>
          {statRows.map((row, index) => (
            <View
              key={index}
              style={[styles.breakdownRow, index < statRows.length - 1 && styles.breakdownRowBorder]}
            >
              <Text style={styles.breakdownRowLabel}>{row.label}</Text>
              <Text style={styles.breakdownRowValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const SearchBarSection = ({
  onOpenSearch,
  selectedSalesperson,
  setSelectedSalesperson,
}: {
  onOpenSearch: () => void;
  selectedSalesperson: string | null;
  setSelectedSalesperson: (sp: string | null) => void;
}) => {
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;
  const { data: salespersons = [], isLoading } = useSalespersons(token);
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectSalesperson = (sp: string | null) => {
    setSelectedSalesperson(sp);
    setModalVisible(false);
  };

  return (
    <View style={styles.searchSection}>
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <OrderSearchBar onPress={onOpenSearch} />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, !!selectedSalesperson && styles.filterButtonActive]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="funnel-outline" size={14} color={selectedSalesperson ? '#FFFFFF' : PRIMARY} style={{ marginRight: 4 }} />
          <Text style={[styles.filterButtonText, !!selectedSalesperson && styles.filterButtonTextActive]} numberOfLines={1} ellipsizeMode="tail">
            {selectedSalesperson ? selectedSalesperson : 'Filter'}
          </Text>
        </TouchableOpacity>
      </View>

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
              <TouchableOpacity style={[styles.modalItem, !selectedSalesperson && styles.modalItemActive]} onPress={() => handleSelectSalesperson(null)}>
                <Text style={[styles.modalItemText, !selectedSalesperson && styles.modalItemTextActive]}>All Salespersons (No filter)</Text>
                {!selectedSalesperson && <Ionicons name="checkmark" size={18} color={PRIMARY} />}
              </TouchableOpacity>
              {isLoading ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                </View>
              ) : (
                salespersons.map((sp) => {
                  const spName = sp.salespersonName;
                  const isActive = selectedSalesperson === spName;
                  return (
                    <TouchableOpacity key={sp.salespersonId} style={[styles.modalItem, isActive && styles.modalItemActive]} onPress={() => handleSelectSalesperson(spName)}>
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

const OrderRow = React.memo(function OrderRow({ item }: { item: OpenOrderRowItem }) {
  return (
    <OrderCard
      orderNo={item.orderNo}
      companyName={item.companyName}
      orderType={item.orderType}
      orderTotal={item.orderTotal}
      orderDate={item.orderDate}
      daysLeft={item.daysLeft}
      assignedVendorCount={item.assignedVendorCount}
      expectedVendorCount={item.expectedVendorCount}
      orderCost={item.orderCost}
      markup={item.markup}
      markupPercentage={item.markupPercentage}
      onPress={() =>
        router.push({
          pathname: '/order-details' as any,
          params: { orderData: JSON.stringify(item), from: '/open-orders' },
        })
      }
    />
  );
});

const DefaultEmptyState = () => (
  <View style={styles.emptyState}>
    <Ionicons name="cube-outline" size={36} color={SECONDARY} />
    <Text style={styles.emptyTitle}>No open orders</Text>
    <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
  </View>
);

const SearchEmptyState = ({
  query,
  type,
  onClear,
}: {
  query: string;
  type: OpenOrderSearchType;
  onClear: () => void;
}) => {
  const typeLabel =
    type === 'orderNo' ? 'Order No' : type === 'companyName' ? 'Company' : 'Salesperson';
  return (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={38} color={SECONDARY} />
      <Text style={styles.emptyTitle}>No matching open orders</Text>
      <Text style={styles.emptySubtitle}>
        No results found for "{query}" in {typeLabel}
      </Text>
      <TouchableOpacity style={styles.clearSearchBtn} onPress={onClear} activeOpacity={0.8}>
        <Text style={styles.clearSearchBtnText}>Clear search</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function OpenOrdersScreen() {
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;

  const [activePreset, setActivePreset] = useState<DateFilterPreset>('today');
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSalesperson, setSelectedSalesperson] = useState<string | null>(null);

  useBackHandler({
    modalVisible: filterModalVisible || searchModalVisible,
    onDismissModal: () => {
      setFilterModalVisible(false);
      setSearchModalVisible(false);
      setSearchQuery('');
    },
  });

  const calculatedRange = useMemo(
    () => getDateRangeForFilter(activePreset, customRange),
    [activePreset, customRange]
  );

  const searchParam: OpenOrderSearchParam | null = useMemo(() => {
    if (selectedSalesperson) {
      return { type: 'salesperson', value: selectedSalesperson };
    }
    return null;
  }, [selectedSalesperson]);

  const {
    items,
    rawPages,
    summary,
    meta,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefreshing,
  } = useOpenOrders(token, searchParam);

  const [currentPage, setCurrentPage] = useState(1);
  const pendingAdvanceRef = useRef(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchParam]);

  useFocusEffect(
    useCallback(() => {
      setSelectedSalesperson(null);
      setSearchModalVisible(false);
      setSearchQuery('');
      setCurrentPage(1);
      refetch();
    }, [refetch])
  );

  useEffect(() => {
    if (pendingAdvanceRef.current && !isFetchingNextPage) {
      pendingAdvanceRef.current = false;
      setCurrentPage((p) => p + 1);
    }
  }, [isFetchingNextPage]);

  useEffect(() => {
    if (isRefreshing) {
      pendingAdvanceRef.current = false;
      setCurrentPage(1);
    }
  }, [isRefreshing]);

  const LIMIT = OPEN_ORDERS_PAGE_LIMIT;
  const totalRecords = (meta?.totalRecords as number | undefined) ?? 0;
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / LIMIT) : Math.max(1, rawPages.length);

  const displayItems = useMemo(() => {
    let filtered = items;

    if (selectedSalesperson) {
      const spLower = selectedSalesperson.toLowerCase();
      filtered = filtered.filter(
        (it: any) => (it.salespersonName || it.salesPersonName || '').toLowerCase() === spLower
      );
    }

    return filtered.slice((currentPage - 1) * LIMIT, currentPage * LIMIT);
  }, [items, selectedSalesperson, currentPage, LIMIT]);

  const usingSample = isError && items.length === 0;
  const errorMessage = useMemo(
    () => (isError ? (error as Error | null)?.message ?? 'Failed to load open orders' : null),
    [isError, error]
  );

  const handleClearSearch = useCallback(() => {
    setSelectedSalesperson(null);
    setCurrentPage(1);
  }, []);

  const handleSelectOrder = useCallback(
    async (item: any) => {
      const orderId = item.ORDER_ID || item.orderId || item.ORDERD_ID || item.id;
      let fullOrder = item;

      if (orderId) {
        try {
          const res = await fetchOrderById(orderId, { token });
          if (res) fullOrder = res;
        } catch (e) {
          if (__DEV__) console.log('[OpenOrdersScreen] fetchOrderById error on navigate:', e);
        }
      }

      setSearchModalVisible(false);
      setSearchQuery('');

      router.push({
        pathname: '/order-details' as any,
        params: {
          orderId: orderId ? String(orderId) : undefined,
          orderData: JSON.stringify(fullOrder),
          from: '/open-orders',
        },
      });
    },
    [token]
  );

  const handlePrev = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    const nextPage = currentPage + 1;
    const alreadyLoaded = nextPage <= rawPages.length;

    if (alreadyLoaded) {
      setCurrentPage(nextPage);
    } else if (hasNextPage && !isFetchingNextPage) {
      pendingAdvanceRef.current = true;
      fetchNextPage();
    }
  }, [currentPage, rawPages.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: OpenOrderRowItem }) => <OrderRow item={item} />,
    []
  );

  const keyExtractor = useCallback((item: OpenOrderRowItem) => item.id, []);
  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  const ListHeader = useMemo(
    () => (
      <View style={{ paddingTop: 12 }}>
        <View style={styles.headerPadding}>
          <SummaryBreakdownCard summary={summary} loading={isLoading} usingSample={usingSample} />
        </View>
        <SimpleKpiCard
          title="ALL OPEN ORDERS"
          count={summary?.totalOrders ?? SAMPLE_OPEN_ORDERS.pendingOrdersCount}
          amount={summary?.totalOrderedAmount ?? SAMPLE_OPEN_ORDERS.pendingOrdersAmount}
          loading={isLoading}
        />
        <SearchBarSection
          onOpenSearch={() => setSearchModalVisible(true)}
          selectedSalesperson={selectedSalesperson}
          setSelectedSalesperson={setSelectedSalesperson}
        />
        {errorMessage ? (
          <TouchableOpacity style={styles.errorRow} onPress={() => refetch()} activeOpacity={0.8}>
            <Ionicons name="warning-outline" size={16} color="#8A1C1C" />
            <Text style={styles.errorRowText}>{errorMessage} — tap to retry</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.listDivider} />
      </View>
    ),
    [
      summary,
      isLoading,
      usingSample,
      selectedSalesperson,
      errorMessage,
      refetch,
    ]
  );

  const ListFooter = useMemo(() => {
    if (isLoading && items.length === 0) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading open orders…</Text>
        </View>
      );
    }
    return null;
  }, [isLoading, items.length]);

  const handleApplyFilter = (
    preset: DateFilterPreset,
    range: { startDate: string; endDate: string } | null
  ) => {
    setActivePreset(preset);
    setCustomRange(range);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />

      <View style={styles.mainContainer}>
        <FlatList
          data={displayItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={
            isLoading ? (
              <View style={{ paddingTop: 4 }}>
                <SkeletonRowItem />
                <SkeletonRowItem />
                <SkeletonRowItem />
                <SkeletonRowItem />
                <SkeletonRowItem />
              </View>
            ) : selectedSalesperson ? (
              <SearchEmptyState
                query={selectedSalesperson}
                type="salesperson"
                onClear={handleClearSearch}
              />
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
              refreshing={isRefreshing}
              onRefresh={() => refetch()}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
        />

        <PaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          isFetchingNextPage={isFetchingNextPage}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </View>

      <SearchOverlayModal
        visible={searchModalVisible}
        onClose={() => {
          setSearchModalVisible(false);
          setSearchQuery('');
        }}
        query={searchQuery}
        setQuery={setSearchQuery}
        token={token}
        onSelectOrder={handleSelectOrder}
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
  mainContainer: { flex: 1, justifyContent: 'space-between' },
  flatlistContent: { paddingBottom: 16, flexGrow: 1 },

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
  headerIconWrap: { width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-start' },
  headerIconInner: { position: 'relative', width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitleCenter: {
    fontSize: 18,
    fontFamily: Typography.titleSerif,
    fontWeight: '600',
    color: PRIMARY,
  },
  headerRightWrap: {
    width: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerPadding: { paddingHorizontal: 16, marginBottom: 12 },
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

  summaryCard: {
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#3A4151',
    borderRadius: 14,
    padding: 16,
  },

  breakdownCard: {
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E6E2',
    overflow: 'hidden',
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3A4151',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  breakdownTitleRow: { gap: 2 },
  breakdownTitle: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: '#FFFFFF',
  },
  breakdownSubtitle: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  breakdownContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownRowBorder: {
    borderBottomWidth: hairline,
    borderBottomColor: '#E7E6E2',
  },
  breakdownRowLabel: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
    flex: 1,
  },
  breakdownRowValue: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },

  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.body,
    color: PRIMARY,
    height: '100%',
  },
  clearButton: { padding: 4 },
  clearBtn: { padding: 4 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    minWidth: 80,
  },

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
  filterButtonActive: {
    backgroundColor: PRIMARY,
  },
  filterButtonText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: PRIMARY,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.headingSemiBold,
  },

  suggestionsContainer: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E7E6E2',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 99999,
    overflow: 'hidden',
  },
  salespersonChipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  salespersonChipText: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: PRIMARY,
  },
  changeSalespersonBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  changeSalespersonBtnText: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    color: '#FFFFFF',
  },
  clearSalespersonBtn: { padding: 2 },

  suggestionsOverlay: {
    position: 'absolute',
    top: 118,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 99999,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: hairline,
    borderBottomColor: '#E7E6E2',
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  suggestionSublabel: {
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
    marginTop: 1,
  },
  suggestionTypeTag: {
    fontSize: 10,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
    backgroundColor: INPUT_BG,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E6E2',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  modalList: {
    paddingHorizontal: 20,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: hairline,
    borderBottomColor: '#E7E6E2',
  },
  modalItemActive: {
    backgroundColor: '#F8FAFC',
  },
  modalItemText: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: PRIMARY,
  },
  modalItemTextActive: {
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLeftCol: { flex: 1, paddingRight: 12, gap: 2 },
  rowRightCol: { alignItems: 'flex-end', gap: 2 },
  orderNoText: { fontSize: 14, fontFamily: Typography.headingSemiBold, color: PRIMARY },
  companyText: { fontSize: 13, fontFamily: Typography.body, color: SECONDARY },
  vendorCountText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: SECONDARY },
  amountText: { fontSize: 14, fontFamily: Typography.headingSemiBold, color: PRIMARY },
  dateText: { fontSize: 12, fontFamily: Typography.body, color: SECONDARY },
  daysText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: SECONDARY },

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

  loadingWrap: { paddingVertical: 24, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, fontFamily: Typography.body, color: SECONDARY },

  emptyState: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: Typography.headingSemiBold, color: PRIMARY },
  emptySubtitle: { fontSize: 13, fontFamily: Typography.body, color: SECONDARY },
  clearSearchBtn: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: PRIMARY, borderRadius: 8 },
  clearSearchBtnText: { color: '#FFFFFF', fontSize: 13, fontFamily: Typography.headingSemiBold },

  simpleKpiCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  simpleKpiLabel: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: '#64748B',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  simpleKpiCount: {
    fontSize: 18,
    fontFamily: Typography.headingSemiBold,
    color: '#2C2C2A',
  },
  simpleKpiRight: {
    alignItems: 'flex-end',
  },
  simpleKpiAmount: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
  },
});
