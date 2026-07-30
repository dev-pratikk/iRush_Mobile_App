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
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthContext } from '../../context/AuthContext';
import {
  formatCurrencyWithCents,
  formatNumber,
  formatOrderDate,
  DashboardPeriod as DatePeriod,
  ORDERS_PAGE_LIMIT,
  type OrdersSearchType,
  type OrdersSearchParam,
} from '../../services/api/orders.service';
import { useOrders, type OrdersRowItem } from '../../hooks/useOrders';
import { PaginationFooter } from '../../components/ui/PaginationFooter';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const PAGE_BG = '#FFFFFF';
const SUMMARY_CARD_BG = '#3A4151';
const SUMMARY_CARD_TEXT = '#FFFFFF';
const INPUT_BG = '#F5F5F2';

const DEFAULT_SALESPERSONS = ['Imran', 'John', 'Sarah', 'Alex', 'Michael', 'David'];

// ─── Header Component ─────────────────────────────────────────────────────────

const Header = () => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerIconWrap}
        onPress={() => router.push('/orders' as any)}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>All Orders</Text>
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

// ─── Today / Month Segment Control ────────────────────────────────────────────

const DateSegmentControl = ({
  period,
  setPeriod,
}: {
  period: DatePeriod;
  setPeriod: (p: DatePeriod) => void;
}) => {
  return (
    <View style={styles.segmentContainer}>
      <View style={styles.segmentWrapper}>
        <TouchableOpacity
          style={[styles.segmentButton, period === 'today' && styles.segmentButtonActive]}
          onPress={() => setPeriod('today')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, period === 'today' && styles.segmentTextActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentButton, period === 'month' && styles.segmentButtonActive]}
          onPress={() => setPeriod('month')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, period === 'month' && styles.segmentTextActive]}>
            This month
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Top Grey Summary Card ────────────────────────────────────────────────────

const SummaryCard = ({
  count,
  totalAmount,
  loading,
  usingSample,
}: {
  count: number;
  totalAmount: number;
  loading: boolean;
  usingSample: boolean;
}) => {
  if (loading && count === 0 && totalAmount === 0) {
    return (
      <View style={[styles.summaryCard, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="small" color={SUMMARY_CARD_TEXT} />
      </View>
    );
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
          {usingSample && (
            <View style={styles.demoPill}>
              <Text style={styles.demoPillText}>Demo</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// ─── Search Bar & Salesperson Filter Section ──────────────────────────────────

const SearchBarSection = ({
  searchType,
  setSearchType,
  inputText,
  setInputText,
  selectedSalesperson,
  setSelectedSalesperson,
  availableSalespersons,
  onClear,
}: {
  searchType: OrdersSearchType;
  setSearchType: (type: OrdersSearchType) => void;
  inputText: string;
  setInputText: (text: string) => void;
  selectedSalesperson: string | null;
  setSelectedSalesperson: (sp: string | null) => void;
  availableSalespersons: string[];
  onClear: () => void;
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleTypeSelect = (type: OrdersSearchType) => {
    if (type === 'salesperson') {
      setModalVisible(true);
    } else {
      setSearchType(type);
      setSelectedSalesperson(null);
      onClear();
    }
  };

  const handleSelectSalesperson = (sp: string | null) => {
    setSelectedSalesperson(sp);
    if (sp) {
      setSearchType('salesperson');
      setInputText('');
    } else {
      setSearchType('orderNo');
    }
    setModalVisible(false);
  };

  return (
    <View style={styles.searchSection}>
      {/* Search Type Pills */}
      <View style={styles.pillsRow}>
        <TouchableOpacity
          style={[styles.pill, searchType === 'orderNo' && !selectedSalesperson && styles.pillActive]}
          onPress={() => handleTypeSelect('orderNo')}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.pillText, searchType === 'orderNo' && !selectedSalesperson && styles.pillTextActive]}
          >
            Order No
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, searchType === 'companyName' && !selectedSalesperson && styles.pillActive]}
          onPress={() => handleTypeSelect('companyName')}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.pillText, searchType === 'companyName' && !selectedSalesperson && styles.pillTextActive]}
          >
            Company
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, (searchType === 'salesperson' || !!selectedSalesperson) && styles.pillActive]}
          onPress={() => handleTypeSelect('salesperson')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="funnel-outline"
            size={12}
            color={searchType === 'salesperson' || !!selectedSalesperson ? '#FFFFFF' : SECONDARY}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.pillText,
              (searchType === 'salesperson' || !!selectedSalesperson) && styles.pillTextActive,
            ]}
          >
            {selectedSalesperson ? `Rep: ${selectedSalesperson}` : 'Salesperson'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Input or Active Salesperson Badge */}
      {!selectedSalesperson ? (
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color={SECONDARY} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              searchType === 'companyName' ? 'Search by company name…' : 'Search by order number…'
            }
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
      ) : (
        <View style={styles.activeSalespersonCard}>
          <View style={styles.salespersonChipInfo}>
            <Ionicons name="person-circle-outline" size={20} color={PRIMARY} />
            <Text style={styles.salespersonChipText}>
              Filtering Salesperson: <Text style={{ fontWeight: '700' }}>{selectedSalesperson}</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={styles.changeSalespersonBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.changeSalespersonBtnText}>Change</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.clearSalespersonBtn}
            onPress={() => handleSelectSalesperson(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={18} color={SECONDARY} />
          </TouchableOpacity>
        </View>
      )}

      {/* Salesperson Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Salesperson</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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

const OrderRow = React.memo(function OrderRow({ item }: { item: OrdersRowItem }) {
  const orderDate = formatOrderDate(item.orderDate || item.updatedDate);
  const orderNo = (item.orderNo || '').replace(/^#/, '').trim() || 'N/A';
  const companyName = item.companyName || 'N/A';
  const orderType = item.orderTypeName || 'Full Turnkey';
  const salesperson = item.salespersonName || '';

  return (
    <View style={styles.row}>
      <View style={styles.rowLeftCol}>
        <Text style={styles.orderNoText} numberOfLines={1} ellipsizeMode="tail">
          {orderNo}
        </Text>
        <Text style={styles.companyText} numberOfLines={1} ellipsizeMode="tail">
          {companyName}
        </Text>
        <Text style={styles.orderTypeText} numberOfLines={1} ellipsizeMode="tail">
          {orderType}
        </Text>
      </View>

      <View style={styles.rowRightCol}>
        <Text style={styles.amountText}>{formatCurrencyWithCents(item.orderTotal)}</Text>
        {orderDate ? <Text style={styles.dateText}>{orderDate}</Text> : null}
        {salesperson ? (
          <Text style={styles.salespersonText} numberOfLines={1} ellipsizeMode="tail">
            {salesperson}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

// ─── Empty States ─────────────────────────────────────────────────────────────

const DefaultEmptyState = ({ period, usingSample }: { period: DatePeriod; usingSample: boolean }) => {
  const title = period === 'today' ? 'No orders today' : 'No orders this month';
  return (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={36} color={SECONDARY} />
      <Text style={styles.emptyTitle}>{usingSample ? 'Demo — ' + title : title}</Text>
      <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
    </View>
  );
};

const SearchEmptyState = ({
  query,
  type,
  onClear,
}: {
  query: string;
  type: OrdersSearchType;
  onClear: () => void;
}) => {
  const typeLabel =
    type === 'orderNo' ? 'Order No' : type === 'companyName' ? 'Company' : 'Salesperson';
  return (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={38} color={SECONDARY} />
      <Text style={styles.emptyTitle}>No matching orders</Text>
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

export default function AllOrdersScreen() {
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;
  const searchParams = useLocalSearchParams<{ period?: string }>();

  // Hardware Back button handling (Android)
  useEffect(() => {
    const onBackPress = () => {
      router.push('/orders' as any);
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const initialPeriod: DatePeriod =
    searchParams.period === 'today' || searchParams.period === 'month'
      ? searchParams.period
      : 'month';

  const [period, setPeriod] = useState<DatePeriod>(initialPeriod);
  const [searchType, setSearchType] = useState<OrdersSearchType>('orderNo');
  const [inputText, setInputText] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  const [selectedSalesperson, setSelectedSalesperson] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.period === 'today' || searchParams.period === 'month') {
      setPeriod(searchParams.period);
    }
  }, [searchParams.period]);

  // Debounce search input by 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputText);
    }, 400);
    return () => clearTimeout(timer);
  }, [inputText]);

  // Construct active search param
  const searchParam: OrdersSearchParam | null = useMemo(() => {
    if (selectedSalesperson) {
      return { type: 'salesperson', value: selectedSalesperson };
    }
    const trimmed = debouncedValue.trim();
    if (!trimmed) return null;
    return { type: searchType, value: trimmed };
  }, [searchType, debouncedValue, selectedSalesperson]);

  // Fetch orders from custom hook
  const {
    items,
    rawPages,
    meta,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefreshing,
  } = useOrders(period, token, searchParam);

  const summaryCount = (meta?.count as number | undefined) ?? (meta?.totalRecords as number | undefined) ?? items.length;
  const summaryTotalAmount = (meta?.totalAmount as number | undefined) ?? 0;

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
  }, [period, searchParam]);

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

  const LIMIT = ORDERS_PAGE_LIMIT;
  const totalRecords = meta?.totalRecords ?? summaryCount;
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / LIMIT) : Math.max(1, rawPages.length);

  const displayItems = useMemo(
    () => items.slice((currentPage - 1) * LIMIT, currentPage * LIMIT),
    [items, currentPage, LIMIT]
  );

  const usingSample = isError && items.length === 0;
  const errorMessage = useMemo(
    () => (isError ? (error as Error | null)?.message ?? 'Failed to load orders' : null),
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
    ({ item }: { item: OrdersRowItem }) => <OrderRow item={item} />,
    []
  );

  const keyExtractor = useCallback((item: OrdersRowItem) => item.id, []);
  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  const ListHeader = useMemo(
    () => (
      <View>
        <DateSegmentControl period={period} setPeriod={setPeriod} />
        <SummaryCard
          count={summaryCount}
          totalAmount={summaryTotalAmount}
          loading={isLoading}
          usingSample={usingSample}
        />
        <SearchBarSection
          searchType={searchType}
          setSearchType={setSearchType}
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
      period,
      summaryCount,
      summaryTotalAmount,
      isLoading,
      usingSample,
      searchType,
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
          <Text style={styles.loadingText}>Loading orders…</Text>
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
            <DefaultEmptyState period={period} usingSample={usingSample} />
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

  // Header
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: PAGE_BG,
  },
  headerIconWrap: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerIconInner: { position: 'relative', width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 19,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
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

  // Segment Control (Today / Month)
  segmentContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
  },
  segmentWrapper: {
    flexDirection: 'row',
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentButtonActive: {
    backgroundColor: PRIMARY,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.headingSemiBold,
  },

  // Summary Card (Top Grey Box)
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 12,
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
  summaryColRight: { alignItems: 'flex-end', gap: 4 },
  summaryValue: {
    fontSize: 22,
    fontFamily: Typography.numberHeavy,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  demoPill: { backgroundColor: '#4A5568', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  demoPillText: { color: '#FFFFFF', fontSize: 10, fontFamily: Typography.headingSemiBold },

  // Search Section
  searchSection: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: INPUT_BG,
  },
  pillActive: {
    backgroundColor: PRIMARY,
  },
  pillText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.headingSemiBold,
  },

  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.body,
    color: PRIMARY,
    height: '100%',
  },
  clearButton: { padding: 4 },

  activeSalespersonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F4F8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
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

  // Row items
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
  orderTypeText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: SECONDARY },
  amountText: { fontSize: 14, fontFamily: Typography.headingSemiBold, color: PRIMARY },
  dateText: { fontSize: 12, fontFamily: Typography.body, color: SECONDARY },
  salespersonText: { fontSize: 12, fontFamily: Typography.bodyMedium, color: SECONDARY },

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
