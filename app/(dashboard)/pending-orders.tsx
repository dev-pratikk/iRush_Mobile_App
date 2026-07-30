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
  BackHandler,
  Modal,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { useAuthContext } from '../../context/AuthContext';
import { router } from 'expo-router';
import { formatCurrencyWithCents, formatNumber, formatOrderDate } from '../../services/api/orders.service';
import {
  SAMPLE_OPEN_ORDERS,
  OPEN_ORDERS_PAGE_LIMIT,
  type OpenOrderSearchType,
  type OpenOrderSearchParam,
} from '../../services/api/open-orders.service';
import { usePendingOrders, type OpenOrderRowItem } from '../../hooks/useOpenOrders';
import { PaginationFooter } from '../../components/ui/PaginationFooter';
import type { PendingOrdersSummary } from '../../types/api/open-orders';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const PAGE_BG = '#FFFFFF';
const SUMMARY_CARD_TEXT = '#FFFFFF';
const INPUT_BG = '#F5F5F2';

const DEFAULT_SALESPERSONS = ['Imran', 'John', 'Sarah', 'Alex', 'Michael', 'David'];

// ─── Header ──────────────────────────────────────────────────────────────────

const Header = () => (
  <View style={styles.header}>
    <TouchableOpacity
      style={styles.headerIconWrap}
      onPress={() => router.push('/open-orders' as any)}
      hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
    >
      <Ionicons name="arrow-back" size={20} color={PRIMARY} />
    </TouchableOpacity>
    <View style={styles.headerCenter} pointerEvents="none">
      <Text style={styles.headerTitle}>Pending orders</Text>
    </View>
    <View style={styles.headerSpacer} />
  </View>
);

// ─── Detailed Summary Breakdown Card ──────────────────────────────────────────

const SummaryBreakdownCard = ({
  summary,
  loading,
  usingSample,
}: {
  summary: PendingOrdersSummary | null;
  loading: boolean;
  usingSample: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);

  if (loading && !summary) {
    return (
      <View style={[styles.summaryCard, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="small" color={SUMMARY_CARD_TEXT} />
      </View>
    );
  }

  const count = summary?.totalOrders ?? SAMPLE_OPEN_ORDERS.pendingOrdersCount;
  const amount = summary?.totalOrderedAmount ?? SAMPLE_OPEN_ORDERS.pendingOrdersAmount;

  const statRows = [
    { label: 'No of Orders', value: formatNumber(count) },
    { label: 'Total Pending Orders Value', value: formatCurrencyWithCents(amount) },
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
          <Text style={styles.breakdownTitle}>Pending Orders Summary</Text>
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

// ─── Search Bar & Salesperson Filter Section ──────────────────────────────────

const SearchBarSection = ({
  inputText,
  setInputText,
  selectedSalesperson,
  setSelectedSalesperson,
  availableSalespersons,
  onClear,
}: {
  inputText: string;
  setInputText: (text: string) => void;
  selectedSalesperson: string | null;
  setSelectedSalesperson: (sp: string | null) => void;
  availableSalespersons: string[];
  onClear: () => void;
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectSalesperson = (sp: string | null) => {
    setSelectedSalesperson(sp);
    setModalVisible(false);
  };

  return (
    <View style={styles.searchSection}>
      <View style={styles.searchRow}>
        {/* Unified Search Input */}
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color={SECONDARY} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Search by order no or company name…"
            placeholderTextColor={SECONDARY}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {inputText.length > 0 ? (
            <TouchableOpacity
              onPress={onClear}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color={SECONDARY} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Salesperson Filter Button in Same Row */}
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
            {selectedSalesperson ? selectedSalesperson : 'Filter'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Salesperson Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Salesperson</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.modalItem, !selectedSalesperson && styles.modalItemActive]}
                onPress={() => handleSelectSalesperson(null)}
              >
                <Text style={[styles.modalItemText, !selectedSalesperson && styles.modalItemTextActive]}>
                  All Salespersons (No filter)
                </Text>
                {!selectedSalesperson && <Ionicons name="checkmark" size={18} color={PRIMARY} />}
              </TouchableOpacity>

              {availableSalespersons.map((sp, idx) => {
                const isActive = selectedSalesperson === sp;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => handleSelectSalesperson(sp)}
                  >
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                      {sp}
                    </Text>
                    {isActive && <Ionicons name="checkmark" size={18} color={PRIMARY} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Order Row Component ──────────────────────────────────────────────────────

const OrderRow = React.memo(function OrderRow({ item }: { item: OpenOrderRowItem }) {
  const orderDate = formatOrderDate(item.orderDate);
  const daysLabel =
    item.daysLeft < 0 ? `+${Math.abs(item.daysLeft)}d late` : `${item.daysLeft}d left`;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() =>
        router.push({
          pathname: '/order-details' as any,
          params: { orderData: JSON.stringify(item), from: '/pending-orders' },
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.rowLeftCol}>
        <Text style={styles.orderNoText} numberOfLines={1} ellipsizeMode="tail">
          {item.orderNo}
        </Text>
        <Text style={styles.companyText} numberOfLines={1} ellipsizeMode="tail">
          {item.companyName}
        </Text>
        <Text style={styles.vendorCountText}>
          {item.vendorCompletedCount}/{item.vendorCount} vendors
        </Text>
      </View>
      <View style={styles.rowRightCol}>
        <Text style={styles.amountText}>{formatCurrencyWithCents(item.orderTotal)}</Text>
        <Text style={styles.dateText}>{orderDate}</Text>
        <Text style={styles.daysText}>{daysLabel}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ─── Empty States ─────────────────────────────────────────────────────────────

const DefaultEmptyState = () => (
  <View style={styles.emptyState}>
    <Ionicons name="cube-outline" size={36} color={SECONDARY} />
    <Text style={styles.emptyTitle}>No pending orders</Text>
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
      <Text style={styles.emptyTitle}>No matching pending orders</Text>
      <Text style={styles.emptySubtitle}>
        No results found for "{query}" in {typeLabel}
      </Text>
      <TouchableOpacity style={styles.clearSearchBtn} onPress={onClear} activeOpacity={0.8}>
        <Text style={styles.clearSearchBtnText}>Clear search</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Main Screen Component ────────────────────────────────────────────────────

export default function PendingOrdersScreen() {
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;

  // Hardware Back button handling (Android)
  useEffect(() => {
    const onBackPress = () => {
      router.push('/open-orders' as any);
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  // Search & Filter State
  const [searchType, setSearchType] = useState<OpenOrderSearchType>('orderNo');
  const [inputText, setInputText] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  const [selectedSalesperson, setSelectedSalesperson] = useState<string | null>(null);

  // Debounce input text by 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputText);
    }, 400);
    return () => clearTimeout(timer);
  }, [inputText]);

  // Construct active search param
  const searchParam: OpenOrderSearchParam | null = useMemo(() => {
    if (selectedSalesperson) {
      return { type: 'salesperson', value: selectedSalesperson };
    }
    const trimmed = debouncedValue.trim();
    if (!trimmed) return null;
    return { type: searchType, value: trimmed };
  }, [searchType, debouncedValue, selectedSalesperson]);

  // Fetch pending orders
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
  } = usePendingOrders(token, searchParam);

  const availableSalespersons = useMemo(() => {
    const fromItems = items
      .map((it: any) => it.salespersonName || it.salesPersonName)
      .filter((n: any) => typeof n === 'string' && n.trim().length > 0);
    const combined = Array.from(new Set([...DEFAULT_SALESPERSONS, ...fromItems]));
    return combined.sort();
  }, [items]);

  // Pagination Cursor
  const [currentPage, setCurrentPage] = useState(1);
  const pendingAdvanceRef = useRef(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchParam]);

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

  const displayItems = useMemo(
    () => items.slice((currentPage - 1) * LIMIT, currentPage * LIMIT),
    [items, currentPage, LIMIT]
  );

  const usingSample = isError && items.length === 0;
  const errorMessage = useMemo(
    () => (isError ? (error as Error | null)?.message ?? 'Failed to load pending orders' : null),
    [isError, error]
  );

  const handleClearSearch = useCallback(() => {
    setInputText('');
    setDebouncedValue('');
    setSelectedSalesperson(null);
    setCurrentPage(1);
  }, []);

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
        <SummaryBreakdownCard summary={summary} loading={isLoading} usingSample={usingSample} />
        <SearchBarSection
          inputText={inputText}
          setInputText={setInputText}
          selectedSalesperson={selectedSalesperson}
          setSelectedSalesperson={setSelectedSalesperson}
          availableSalespersons={availableSalespersons}
          onClear={handleClearSearch}
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
      inputText,
      selectedSalesperson,
      availableSalespersons,
      errorMessage,
      refetch,
      handleClearSearch,
    ]
  );

  const ListFooter = useMemo(() => {
    if (isLoading && items.length === 0) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading pending orders…</Text>
        </View>
      );
    }
    if (items.length > 0 || !isLoading) {
      return (
        <PaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          isFetchingNextPage={isFetchingNextPage}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      );
    }
    return null;
  }, [isLoading, items.length, currentPage, totalPages, totalRecords, isFetchingNextPage, handlePrev, handleNext]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />
      <FlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          isLoading ? null : selectedSalesperson || debouncedValue.trim().length > 0 ? (
            <SearchEmptyState
              query={selectedSalesperson || debouncedValue.trim()}
              type={selectedSalesperson ? 'salesperson' : searchType}
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
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  flatlistContent: { paddingBottom: 24, flexGrow: 1 },

  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: PAGE_BG,
  },
  headerIconWrap: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: 19,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
    color: PRIMARY,
  },
  headerSpacer: { width: 40, height: 40 },

  // Summary breakdown card
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

  // Search Section
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.body,
    color: PRIMARY,
    height: '100%',
  },
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

  // Modal
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

  // List rows
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

  separator: { height: hairline, backgroundColor: '#E7E6E2', marginHorizontal: 16 },
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
});
