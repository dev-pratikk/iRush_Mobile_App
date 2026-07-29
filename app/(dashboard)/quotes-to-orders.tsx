import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, usePathname } from 'expo-router';
import {
  QuotesToOrdersBySalesperson,
  QuotesToOrdersByServiceType,
  SAMPLE_QUOTES,
  cleanupName,
  formatNumber,
} from '../../services/api/quotes.service';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const SUMMARY_TEXT = '#9C9B95';
const DIVIDER = '#E7E6E2';
const CARD_BORDER = '#D8D7D2';
const SECTION_LABEL = '#9C9B95';
const WHITE = '#FFFFFF';
const PAGE_BG = '#FFFFFF';

const Header = () => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerIconWrap}
        onPress={() => router.push('/quotes' as any)}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>
      <View style={styles.headerCenter} pointerEvents="none">
        <Text style={styles.headerTitle}>Quotes → orders</Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );
};

const SummaryLine = () => {
  const q = SAMPLE_QUOTES.totalConvertedQuotesCount;
  return (
    <View style={styles.summaryBar}>
      <Text style={styles.summaryText}>
        {formatNumber(q)} converted quote{q === 1 ? '' : 's'}
      </Text>
    </View>
  );
};

const SectionHeader = ({ title }: { title: string }) => {
  return <Text style={styles.sectionLabel}>{title}</Text>;
};

const SalesRow = React.memo(function SalesRow({ item }: { item: QuotesToOrdersBySalesperson }) {
  const name = cleanupName(item.salespersonName, 'Unassigned');
  return (
    <View style={styles.row}>
      <View style={styles.rowLine1}>
        <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
        <Text style={styles.quotesText}>
          {formatNumber(item.totalOrders)} order{item.totalOrders === 1 ? '' : 's'}
        </Text>
      </View>
      <View style={styles.rowLine2}>
        <Text style={styles.convertedText}>
          {formatNumber(item.totalConvertedQuotes)} converted quote{item.totalConvertedQuotes === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );
});

const ServiceRow = React.memo(function ServiceRow({ item }: { item: QuotesToOrdersByServiceType }) {
  const name = cleanupName(item.serviceTypeName, 'Service');
  return (
    <View style={styles.row}>
      <View style={styles.rowLine1}>
        <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
        <Text style={styles.quotesText}>
          {formatNumber(item.totalOrders)} order{item.totalOrders === 1 ? '' : 's'}
        </Text>
      </View>
      <View style={styles.rowLine2}>
        <Text style={styles.convertedText}>
          {formatNumber(item.totalConvertedQuotes)} converted quote{item.totalConvertedQuotes === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );
});

type SectionItem =
  | { kind: 'summary'; id: string }
  | { kind: 'divider'; id: string }
  | { kind: 'label'; id: string; title: string }
  | { kind: 'cardTop'; id: string; boxId: string }
  | { kind: 'sales'; item: QuotesToOrdersBySalesperson; id: string }
  | { kind: 'service'; item: QuotesToOrdersByServiceType; id: string }
  | { kind: 'cardBottom'; id: string; boxId: string };

const emptyStateList: SectionItem[] = [
  { kind: 'summary', id: 'empty-summary' },
  { kind: 'divider', id: 'empty-divider' },
];

const BottomNav = () => {
  const pathname = usePathname();
  const tabs = [
    { icon: 'home', label: 'Dashboard', route: '/' },
    { icon: 'cube', label: 'Open orders', route: '/open-orders' },
    { icon: 'chatbox', label: 'Quotes', route: '/quotes' },
    { icon: 'bar-chart', label: 'Reports', route: '/reports' },
  ];
  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab, i) => {
        const active = pathname === tab.route;
        return (
          <TouchableOpacity key={i} style={styles.navTab} onPress={() => router.push(tab.route as any)}>
            <Ionicons
              name={active ? `${tab.icon}` : `${tab.icon}-outline` as any}
              size={24}
              color={active ? PRIMARY : SECONDARY}
            />
            <Text style={[styles.navLabel, { color: active ? PRIMARY : SECONDARY }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default function QuotesToOrdersScreen() {
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const sections: SectionItem[] = useMemo(() => {
    const items: SectionItem[] = [{ kind: 'summary', id: 'summary' }, { kind: 'divider', id: 'divider' }];

    const salesList = SAMPLE_QUOTES.quotesToOrdersBySalesperson ?? [];
    if (salesList.length > 0) {
      items.push({ kind: 'label', id: 'sl', title: 'By salesperson' });
      items.push({ kind: 'cardTop', id: 'sct', boxId: 'sales' });
      salesList.forEach((it, i) => items.push({ kind: 'sales', item: it, id: `s-${it.salespersonId ?? i}` }));
      items.push({ kind: 'cardBottom', id: 'scb', boxId: 'sales' });
    }

    const svcList = SAMPLE_QUOTES.quotesToOrdersByServiceType ?? [];
    if (svcList.length > 0) {
      items.push({ kind: 'label', id: 'tl', title: 'By service type' });
      items.push({ kind: 'cardTop', id: 'tct', boxId: 'service' });
      svcList.forEach((it, i) => items.push({ kind: 'service', item: it, id: `t-${i}-${it.serviceTypeName}` }));
      items.push({ kind: 'cardBottom', id: 'tcb', boxId: 'service' });
    }

    return items;
  }, []);

  const hasAnySalesOrService = useMemo(
    () =>
      (SAMPLE_QUOTES.quotesToOrdersBySalesperson?.length ?? 0) +
        (SAMPLE_QUOTES.quotesToOrdersByServiceType?.length ?? 0) >
      0,
    []
  );

  const keyExtractor = useCallback((it: SectionItem) => it.id || it.kind, []);

  const renderItem = useCallback(({ item }: { item: SectionItem }) => {
    switch (item.kind) {
      case 'summary':
        return <SummaryLine />;
      case 'divider':
        return <View style={styles.divider} />;
      case 'label':
        return <SectionHeader title={item.title} />;
      case 'cardTop':
        return (
          <View
            style={[
              styles.boxTop,
              styles.boxBorder,
              styles.boxRadiusTop,
              styles.boxBg,
            ]}
          />
        );
      case 'cardBottom':
        return (
          <View
            style={[
              styles.boxBottom,
              styles.boxBorder,
              styles.boxRadiusBottom,
              styles.boxBg,
              styles.boxMarginBottom,
            ]}
          />
        );
      case 'sales': {
        return (
          <View style={[styles.boxRowWrap, styles.boxBg, styles.boxBorderLeft, styles.boxBorderRight]}>
            <SalesRow item={item.item} />
          </View>
        );
      }
      case 'service':
        return (
          <View style={[styles.boxRowWrap, styles.boxBg, styles.boxBorderLeft, styles.boxBorderRight]}>
            <ServiceRow item={item.item} />
          </View>
        );
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />
      <FlatList
        data={hasAnySalesOrService ? sections : emptyStateList}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="swap-horizontal-outline" size={36} color={SECONDARY} />
            <Text style={styles.emptyTitle}>No conversions</Text>
            <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flatlistContent}
        initialNumToRender={30}
        maxToRenderPerBatch={30}
        windowSize={9}
        removeClippedSubviews
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />
        }
      />
      <BottomNav />
    </SafeAreaView>
  );
}

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  flatlistContent: { paddingBottom: 40, paddingHorizontal: 0 },

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
    includeFontPadding: false,
  },
  headerSpacer: { width: 40, height: 40 },

  summaryBar: { paddingHorizontal: 16, paddingVertical: 12 },
  summaryText: {
    fontSize: 12,
    color: SUMMARY_TEXT,
    fontFamily: Typography.body,
    fontWeight: '400',
    includeFontPadding: false,
  },
  divider: { height: hairline, backgroundColor: DIVIDER, marginBottom: 16 },

  sectionLabel: {
    fontSize: 13,
    color: SECTION_LABEL,
    fontFamily: Typography.body,
    fontWeight: '500',
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 8,
    includeFontPadding: false,
  },

  boxBg: { backgroundColor: WHITE },
  boxBorder: { borderWidth: 1, borderColor: CARD_BORDER },
  boxBorderLeft: { borderLeftWidth: 1, borderLeftColor: CARD_BORDER },
  boxBorderRight: { borderRightWidth: 1, borderRightColor: CARD_BORDER },
  boxRadiusTop: { borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomWidth: 0 },
  boxRadiusBottom: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopWidth: 0,
  },
  boxTop: { height: hairline, marginTop: 0 },
  boxBottom: { height: hairline },
  boxMarginBottom: { marginBottom: 20 },
  boxRowWrap: { marginHorizontal: 16 },

  row: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderBottomWidth: hairline,
    borderBottomColor: DIVIDER,
  },
  rowLine1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameText: {
    fontSize: 13.5,
    fontFamily: Typography.bodyMedium,
    fontWeight: '500',
    color: PRIMARY,
    flex: 1,
    paddingRight: 12,
  },
  quotesText: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    fontWeight: '500',
    color: PRIMARY,
    includeFontPadding: false,
  },
  rowLine2: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convertedText: {
    fontSize: 11,
    fontFamily: Typography.body,
    fontWeight: '400',
    color: SECONDARY,
    includeFontPadding: false,
  },

  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 6 },
  emptyTitle: { fontSize: 15, fontFamily: Typography.headingSemiBold, fontWeight: '600', color: SECONDARY, marginTop: 10 },
  emptySubtitle: { fontSize: 12, fontFamily: Typography.body, color: SECONDARY, opacity: 0.8, textAlign: 'center' },

  bottomNav: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    borderTopWidth: hairline,
    borderTopColor: DIVIDER,
    backgroundColor: PAGE_BG,
  },
  navTab: { alignItems: 'center', paddingVertical: 4 },
  navLabel: { fontSize: 11, fontFamily: Typography.bodyMedium, marginTop: 4 },
});
