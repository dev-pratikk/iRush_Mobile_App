import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, usePathname } from 'expo-router';
import {
  QuoteItem,
  SAMPLE_QUOTES,
  formatQuoteDateTime,
  cleanupName,
} from '../../services/api/quotes.service';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const SUMMARY_TEXT = '#9C9B95';
const DIVIDER = '#E7E6E2';
const TAG_BG = '#EFEFEC';
const TAG_TEXT = '#54534F';
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
        <Text style={styles.headerTitle}>All quotes</Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );
};

const SummaryLine = () => {
  return (
    <View style={styles.summaryBar}>
      <Text style={styles.summaryText}>
        {SAMPLE_QUOTES.quoteCount} quote{SAMPLE_QUOTES.quoteCount === 1 ? '' : 's'} · {SAMPLE_QUOTES.convertedCount} converted
      </Text>
    </View>
  );
};

const QuoteRow = React.memo(function QuoteRow({ item }: { item: QuoteItem }) {
  const typeName = cleanupName(item.quoteType, 'Quote');
  const layerRaw = cleanupName(item.layer, '');
  const showLayer = layerRaw.length > 0 && layerRaw.toLowerCase() !== 'unknown';
  return (
    <View style={styles.row}>
      <View style={styles.rowLine1}>
        <Text style={styles.rowLine1Left} numberOfLines={1} ellipsizeMode="tail">
          <Text style={styles.quoteNoText}>{item.quoteNo}</Text>
          <Text>{' '}</Text>
          <Text style={styles.companyText}>{item.companyName}</Text>
        </Text>
      </View>
      <View style={styles.rowLine2}>
        <View style={styles.rowLine2Left}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText} numberOfLines={1}>{typeName}</Text>
          </View>
          {showLayer ? (
            <Text style={styles.layerText}>{layerRaw}L</Text>
          ) : null}
        </View>
        <Text style={styles.dateText}>{formatQuoteDateTime(item.quoteDate)}</Text>
      </View>
    </View>
  );
});

const EmptyState = () => {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="chatbox-outline" size={36} color={SECONDARY} />
      <Text style={styles.emptyTitle}>No quotes</Text>
      <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
    </View>
  );
};

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

export default function AllQuotesScreen() {
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const items = useMemo(() => SAMPLE_QUOTES.quotes ?? [], []);
  const keyExtractor = useCallback((item: QuoteItem, i: number) => `${item.quoteNo}-${i}`, []);
  const renderItem = useCallback(({ item }: { item: QuoteItem }) => <QuoteRow item={item} />, []);
  const ListHeader = useMemo(
    () => (
      <View>
        <SummaryLine />
        <View style={styles.divider} />
      </View>
    ),
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flatlistContent}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
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
  flatlistContent: { paddingBottom: 40, flexGrow: 1 },

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
  divider: { height: hairline, backgroundColor: DIVIDER },

  row: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderBottomWidth: hairline,
    borderBottomColor: DIVIDER,
  },
  rowLine1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowLine1Left: { flex: 1, paddingRight: 14, flexShrink: 1 },
  quoteNoText: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    fontWeight: '500',
    color: PRIMARY,
  },
  companyText: {
    fontSize: 13,
    fontFamily: Typography.body,
    fontWeight: '400',
    color: PRIMARY,
  },
  rowLine2: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLine2Left: { flexDirection: 'row', alignItems: 'center', columnGap: 8, paddingRight: 10 },
  tagBadge: { backgroundColor: TAG_BG, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    fontWeight: '500',
    color: TAG_TEXT,
    includeFontPadding: false,
  },
  layerText: {
    fontSize: 11,
    fontFamily: Typography.body,
    fontWeight: '400',
    color: SECONDARY,
    includeFontPadding: false,
  },
  dateText: {
    fontSize: 12,
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
