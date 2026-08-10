import React, { useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, RefreshControl, BackHandler } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router } from 'expo-router';
import {
  QuotesByServiceType,
  SAMPLE_QUOTES,
  cleanupName,
  formatNumber,
} from '../../services/api/quotes.service';

const PRIMARY = '#0F172A';
const SECONDARY = '#64748B';
const PAGE_BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#E2E8F0';

const Header = () => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerIconWrap}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/quotes'))}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>
      <Text style={styles.headerTitleLeft}>By service type</Text>
    </View>
  );
};

const SummaryBar = ({ totalTypes, totalQuotes }: { totalTypes: number; totalQuotes: number }) => {
  return (
    <View style={styles.summaryBar}>
      <Text style={styles.summaryText}>
        {totalTypes} {totalTypes === 1 ? 'service type' : 'service types'} · {formatNumber(totalQuotes)} quote{totalQuotes === 1 ? '' : 's'}
      </Text>
    </View>
  );
};

const TypeCard = React.memo(function TypeCard({
  item,
  totalQuotes,
}: {
  item: QuotesByServiceType;
  totalQuotes: number;
}) {
  const name = cleanupName(item.serviceType, 'Service');
  const count = item.quoteCount || 0;
  const converted = item.convertedCount || 0;

  // Share percentage of total quotes
  const sharePctNum = totalQuotes > 0 ? (count / totalQuotes) * 100 : 0;
  const sharePctStr = sharePctNum % 1 === 0 ? sharePctNum.toFixed(0) : sharePctNum.toFixed(1);

  // Conversion rate percentage
  const convPctNum = count > 0 ? (converted / count) * 100 : 0;
  const convPctStr = convPctNum % 1 === 0 ? convPctNum.toFixed(0) : convPctNum.toFixed(1);

  return (
    <View style={styles.typeCard}>
      {/* Top Line */}
      <View style={styles.cardTopRow}>
        <Text style={styles.nameText} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.shareText}>
          {formatNumber(count)} quotes · {sharePctStr}%
        </Text>
      </View>

      {/* Middle: Progress Bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(4, sharePctNum))}%` }]} />
      </View>

      {/* Bottom Line */}
      <View style={styles.cardBottomRow}>
        <Text style={styles.convertedText}>{formatNumber(converted)} converted</Text>
        <Text style={styles.convRateText}>{convPctStr}%</Text>
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

export default function QuotesByServiceTypeScreen() {
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/quotes');
      }
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const rawList = SAMPLE_QUOTES.quotesByServiceType ?? [];
  const totalQuotes = useMemo(
    () => rawList.reduce((sum, item) => sum + (item.quoteCount || 0), 0) || 31,
    [rawList]
  );

  const items = useMemo(() => {
    return [...rawList].sort((a, b) => (b.quoteCount || 0) - (a.quoteCount || 0));
  }, [rawList]);

  const keyExtractor = useCallback(
    (item: QuotesByServiceType, i: number) => `${item.serviceType}-${i}`,
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: QuotesByServiceType }) => <TypeCard item={item} totalQuotes={totalQuotes} />,
    [totalQuotes]
  );

  const ListHeader = useMemo(
    () => <SummaryBar totalTypes={items.length} totalQuotes={totalQuotes} />,
    [items.length, totalQuotes]
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      />
    </SafeAreaView>
  );
}

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  flatlistContent: { paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 },

  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: hairline,
    borderBottomColor: CARD_BORDER,
  },
  headerIconWrap: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitleLeft: {
    fontSize: 18,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
    color: PRIMARY,
    marginLeft: 4,
  },

  summaryBar: {
    paddingVertical: 14,
  },
  summaryText: {
    fontSize: 13,
    color: SECONDARY,
    fontFamily: Typography.bodyMedium,
  },

  // Service Type Card
  typeCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: PRIMARY,
    flex: 1,
    paddingRight: 10,
  },
  shareText: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },

  progressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3A4151',
    borderRadius: 3,
  },

  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convertedText: {
    fontSize: 12.5,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  convRateText: {
    fontSize: 12.5,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: PRIMARY,
  },

  emptyState: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: SECONDARY,
  },
});
