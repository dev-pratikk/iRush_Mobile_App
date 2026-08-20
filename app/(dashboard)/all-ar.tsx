import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  TextInput,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, useLocalSearchParams } from 'expo-router';
import { NotificationHeaderButton } from '../../components/navigation/NotificationHeaderButton';
import { useAuthContext } from '../../context/AuthContext';
import {
  fetchARData,
  searchARData,
  fetchARDetailBySearch,
  type ARItem,
  type ARStatusTab,
} from '../../services/api/ar.service';
import { formatCurrencyWithCents, formatOrderDate } from '../../services/api/orders.service';
import { useSalespersons } from '../../hooks/useSalespersons';
import { SkeletonRowItem, SkeletonKpiCard } from '../../components/ui/SkeletonLoader';
import { PaginationFooter } from '../../components/ui/PaginationFooter';
import { useBackHandler } from '../../hooks/useBackHandler';

const PRIMARY = '#0F172A';
const SECONDARY = '#64748B';
const PAGE_BG = '#FFFFFF';
const INPUT_BG = '#F5F5F2';

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;
const PAGE_LIMIT = 20;

// Header
const Header = ({ activeTab }: { activeTab: ARStatusTab }) => {
  const getHeaderTitle = (tab: ARStatusTab): string => {
    switch (tab) {
      case 'dueToday':
        return 'Due Today';
      case 'crossed':
        return 'Crossed Dues';
      case 'future':
        return 'Future Dues';
      default:
        return 'All AR Invoices';
    }
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerIconWrap}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/ar' as any))}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>

      <Text style={styles.headerTitleLeft}>{getHeaderTitle(activeTab)}</Text>

      <View style={styles.headerRightWrap}>
        <NotificationHeaderButton iconColor={PRIMARY} size={20} />
      </View>
    </View>
  );
};

// Summary Card
const KpiSummaryCard = ({
  totalRecords,
  totalAmount,
  loading,
}: {
  totalRecords: number;
  totalAmount: number;
  loading: boolean;
}) => {
  if (loading && totalRecords === 0) {
    return <SkeletonKpiCard />;
  }

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryColLeft}>
          <Text style={styles.summaryCountLabel}>Total AR Invoices</Text>
          <Text style={styles.summaryCount}>{totalRecords}</Text>
        </View>
        <View style={styles.summaryColRight}>
          <Text style={styles.summaryCountLabel}>Total Due Amount</Text>
          <Text style={styles.summaryValue}>{formatCurrencyWithCents(totalAmount)}</Text>
        </View>
      </View>
    </View>
  );
};

// AR Row Card
const ARRowCard = ({
  item,
  onPress,
}: {
  item: ARItem;
  onPress: () => void;
}) => {
  const statusRaw = (item.status || '').toLowerCase();
  const isCrossed = statusRaw.includes('crossed') || statusRaw.includes('overdue');
  const isToday = statusRaw.includes('today') || statusRaw.includes('due');

  const statusLabel = isCrossed ? 'Crossed' : isToday ? 'Due Today' : 'Future';
  const statusBadgeStyle = isCrossed
    ? styles.badgeCrossed
    : isToday
      ? styles.badgeToday
      : styles.badgeFuture;

  return (
    <TouchableOpacity style={styles.arCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.arCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.invNumberText}>{item.INV_NUMBER}</Text>
          <Text style={styles.companyNameText} numberOfLines={1}>
            {item.CompanyName}
          </Text>
        </View>
        <View style={[styles.badgeBase, statusBadgeStyle]}>
          <Text style={styles.badgeText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.arCardFooter}>
        <View style={styles.footerCol}>
          <Text style={styles.footerLabel}>Inv Date</Text>
          <Text style={styles.footerVal}>{formatOrderDate(item.INV_DATE)}</Text>
        </View>
        <View style={styles.footerCol}>
          <Text style={styles.footerLabel}>Company Code</Text>
          <Text style={styles.footerVal}>{item.CompanyCode || 'N/A'}</Text>
        </View>
        <View style={styles.footerCol}>
          <Text style={styles.footerLabel}>Due Amount</Text>
          <Text style={[styles.footerVal, { color: '#DC2626', fontWeight: '700' }]}>
            {formatCurrencyWithCents(item.DUE_AMOUNT)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function AllARScreen() {
  const params = useLocalSearchParams<{
    status?: string;
    salesPerson?: string;
  }>();

  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;

  const [activeTab, setActiveTab] = useState<ARStatusTab>(
    (params.status as ARStatusTab) || 'all'
  );
  const [query, setQuery] = useState('');
  const [selectedSalesperson, setSelectedSalesperson] = useState<string | null>(
    params.salesPerson || null
  );

  const [salespersonModalVisible, setSalespersonModalVisible] = useState(false);

  const { data: salespersons = [] } = useSalespersons(token);

  const [items, setItems] = useState<ARItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);

  const loadData = useCallback(
    async (
      page: number,
      tab: ARStatusTab,
      sp: string | null,
      searchTerm: string,
      silent = false
    ) => {
      if (!silent) setLoading(true);
      setSearchError(null);
      try {
        const trimmedTerm = searchTerm.trim();
        if (__DEV__) {
          console.log(
            `[AllARScreen/loadData] page=${page} tab=${tab} sp=${sp || 'all'} ` +
            `search="${trimmedTerm}" (${trimmedTerm ? 'searchARData' : 'fetchARData'})`
          );
        }
        const res = trimmedTerm
          ? await searchARData({
              search: trimmedTerm,
              status: tab,
              salesPerson: sp,
              page,
              limit: PAGE_LIMIT,
              token,
            })
          : await fetchARData({
              status: tab,
              salesPerson: sp,
              page,
              limit: PAGE_LIMIT,
              token,
            });

        setItems(res.invoices || []);
        setCurrentPage(res.page || page);
        setTotalPages(res.totalPages || 1);
        setTotalRecords(res.totalInvoiceCount || res.count || res.totalRecords || 0);
        setTotalAmount(res.totalARDueAmount || 0);
        if (__DEV__) {
          console.log(`[AllARScreen/loadData] OK — items=${res.invoices?.length ?? 0} total=${res.totalInvoiceCount ?? res.count}`);
        }
      } catch (err: any) {
        if (__DEV__) console.log('[AllARScreen] loadData error:', err);
        setSearchError(err?.message || 'Search failed');
        setItems([]);
        setTotalRecords(0);
        setTotalAmount(0);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadData(1, activeTab, selectedSalesperson, query);
  }, [activeTab, selectedSalesperson, loadData]);

  // Debounced search — fires only when query changes (no race with filter-change effect above)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(1, activeTab, selectedSalesperson, query, true);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, activeTab, selectedSalesperson, loadData]);

  useBackHandler({
    modalVisible: salespersonModalVisible,
    onDismissModal: () => {
      setSalespersonModalVisible(false);
    },
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(currentPage, activeTab, selectedSalesperson, query, true);
  }, [currentPage, activeTab, selectedSalesperson, query, loadData]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      loadData(newPage, activeTab, selectedSalesperson, query);
    }
  };

  const handleItemPress = async (item: ARItem) => {
    const invNo = item.INV_NUMBER || item.invoiceNumber || '';
    let fullItem = item;

    if (invNo) {
      try {
        const fullDetail = await fetchARDetailBySearch(invNo, { token });
        if (fullDetail) {
          fullItem = { ...item, ...fullDetail };
        }
      } catch (e) {
        if (__DEV__) console.log('[handleItemPress] fetchARDetailBySearch error:', e);
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

  const selectedSalespersonName = useMemo(() => {
    if (!selectedSalesperson) return 'All Salespersons';
    const found = salespersons.find(
      (s: any) => s.salespersonName?.toLowerCase() === selectedSalesperson.toLowerCase()
    );
    return found ? found.salespersonName : selectedSalesperson;
  }, [selectedSalesperson, salespersons]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header activeTab={activeTab} />

      <View style={{ flex: 1 }}>
        <FlatList
          data={loading && items.length === 0 ? [] : items}
          keyExtractor={(item, index) => `${item.INV_NUMBER}-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />
          }
          ListHeaderComponent={
            <View style={styles.listHeaderWrap}>
              <KpiSummaryCard totalRecords={totalRecords} totalAmount={totalAmount} loading={loading} />

              {/* Search Box & Salesperson Filter */}
              <View style={styles.filterRow}>
                <View style={styles.searchInputWrap}>
                  <Ionicons name="search-outline" size={16} color={SECONDARY} style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.searchInput}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search invoice #, company name or code..."
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />
                  {query.length > 0 ? (
                    <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 4 }}>
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.spFilterPill}
                  onPress={() => setSalespersonModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-outline" size={13} color={PRIMARY} />
                  <Text style={styles.spFilterText} numberOfLines={1}>
                    {selectedSalespersonName}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color={PRIMARY} />
                </TouchableOpacity>
              </View>

              {/* Status Tabs Removed - Use dynamic header instead */}
            </View>
          }
          renderItem={({ item }) => (
            <ARRowCard item={item} onPress={() => handleItemPress(item)} />
          )}
          ListEmptyComponent={
            loading ? (
              <View style={{ gap: 10, paddingHorizontal: 16 }}>
                <SkeletonRowItem />
                <SkeletonRowItem />
                <SkeletonRowItem />
              </View>
            ) : searchError ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="alert-circle-outline" size={36} color="#DC2626" />
                <Text style={[styles.emptyTitle, { color: '#DC2626' }]}>Search Error</Text>
                <Text style={styles.emptySub}>{searchError}</Text>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="receipt-outline" size={36} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No AR Invoices Found</Text>
                <Text style={styles.emptySub}>No invoices match your selected filters or search query.</Text>
              </View>
            )
          }
        />

        <PaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          limit={PAGE_LIMIT}
          onPrev={() => handlePageChange(currentPage - 1)}
          onNext={() => handlePageChange(currentPage + 1)}
          recordLabel="AR Invoices"
        />
      </View>

      {/* Salesperson Picker Modal */}
      <Modal visible={salespersonModalVisible} transparent animationType="fade" onRequestClose={() => setSalespersonModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSalespersonModalVisible(false)}
        >
          <View style={styles.spModalCard}>
            <Text style={styles.spModalTitle}>Filter by Salesperson</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity
                style={[styles.spOption, selectedSalesperson === null && styles.spOptionActive]}
                onPress={() => {
                  setSelectedSalesperson(null);
                  setSalespersonModalVisible(false);
                }}
              >
                <Text style={[styles.spOptionText, selectedSalesperson === null && styles.spOptionTextActive]}>
                  All Salespersons
                </Text>
              </TouchableOpacity>
              {salespersons.map((sp: any) => {
                const isSel = selectedSalesperson?.toLowerCase() === sp.salespersonName?.toLowerCase();
                return (
                  <TouchableOpacity
                    key={sp.salespersonId}
                    style={[styles.spOption, isSel && styles.spOptionActive]}
                    onPress={() => {
                      setSelectedSalesperson(sp.salespersonName);
                      setSalespersonModalVisible(false);
                    }}
                  >
                    <Text style={[styles.spOptionText, isSel && styles.spOptionTextActive]}>
                      {sp.salespersonName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: hairline,
    borderBottomColor: '#E2E8F0',
  },
  headerIconWrap: { width: 32, height: 32, justifyContent: 'center' },
  headerTitleLeft: {
    fontSize: 18,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
    color: PRIMARY,
    flex: 1,
  },
  headerRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  listHeaderWrap: {
    paddingVertical: 12,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#3A4151',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryColLeft: { gap: 2 },
  summaryColRight: { alignItems: 'flex-end', gap: 2 },
  summaryCountLabel: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  summaryCount: {
    fontSize: 22,
    fontFamily: Typography.numberHeavy,
    color: '#FFFFFF',
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: Typography.numberHeavy,
    color: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.body,
    color: PRIMARY,
  },
  spFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    gap: 4,
    maxWidth: 140,
  },
  spFilterText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: PRIMARY,
    flexShrink: 1,
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
    paddingVertical: 7,
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
  arCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 8,
  },
  arCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invNumberText: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  companyNameText: {
    fontSize: 12.5,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
    marginTop: 1,
  },
  badgeBase: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
  },
  badgeCrossed: {
    backgroundColor: '#FEE2E2',
  },
  badgeToday: {
    backgroundColor: '#FEF3C7',
  },
  badgeFuture: {
    backgroundColor: '#E0F2FE',
  },
  cardDivider: {
    height: hairline,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  arCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerCol: { gap: 2 },
  footerLabel: {
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  footerVal: {
    fontSize: 12.5,
    fontFamily: Typography.bodyMedium,
    color: PRIMARY,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  emptySub: {
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: SECONDARY,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  spModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  spModalTitle: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  spOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  spOptionActive: {
    backgroundColor: '#F1F5F9',
  },
  spOptionText: {
    fontSize: 13.5,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  spOptionTextActive: {
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
});
