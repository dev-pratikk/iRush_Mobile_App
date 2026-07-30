import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, usePathname } from 'expo-router';
import {
  QuotesByServiceType,
  SAMPLE_QUOTES,
  cleanupName,
  formatNumber,
} from '../../services/api/quotes.service';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const SUMMARY_TEXT = '#9C9B95';
const DIVIDER = '#E7E6E2';
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
        <Text style={styles.headerTitle}>By service type</Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );
};

const SummaryLine = () => {
  const types = SAMPLE_QUOTES.quotesByServiceType.length;
  const quotes = SAMPLE_QUOTES.quoteCount;
  return (
    <View style={styles.summaryBar}>
      <Text style={styles.summaryText}>
        {types} {types === 1 ? 'type' : 'types'} · {formatNumber(quotes)} quote{quotes === 1 ? '' : 's'}
      </Text>
    </View>
  );
};

const TypeRow = React.memo(function TypeRow({ item }: { item: QuotesByServiceType }) {
  const name = cleanupName(item.serviceType, 'Service');
  return (
    <View style={styles.row}>
      <View style={styles.rowLine1}>
        <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
        <Text style={styles.quotesText}>
          {formatNumber(item.quoteCount)} quote{item.quoteCount === 1 ? '' : 's'}
        </Text>
      </View>
      <View style={styles.rowLine2}>
        <Text style={styles.convertedText}>
          {formatNumber(item.convertedCount)} converted
        </Text>
        <Text style={styles.pctText}>
          {typeof item.convertedPct === 'number'
            ? `${Number.isInteger(item.convertedPct) ? item.convertedPct.toFixed(0) : item.convertedPct.toFixed(1)}%`
            : '0%'}
        </Text>
      </View>
    </View>
  );
});

const EmptyState = () => {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="layers-outline" size={36} color={SECONDARY} />
      <Text style={styles.emptyTitle}>No service type data</Text>
      <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
    </View>
  );
};

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
  pctText: {
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
