import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { DashboardStatsResponse } from '../../../types/api/dashboard';
import type { DatePeriod } from '../../../types/dashboard';
import { SAMPLE_STATS } from '@mocks/api/dashboard';
import { formatCurrencyWithCents } from '@lib/formatters';
import { Typography } from '@theme/typography';

interface RevenueOverviewCardProps {
  period: Extract<DatePeriod, 'today' | 'month'>;
  stats: DashboardStatsResponse | null;
  loading: boolean;
  usingSample: boolean;
}

export function RevenueOverviewCard({ period, stats, loading, usingSample }: RevenueOverviewCardProps) {
  const activeStats = stats ?? SAMPLE_STATS;
  const revenueValue = formatCurrencyWithCents(activeStats[period].revenue);

  return (
    <View style={styles.revenueCard}>
      <View style={styles.revenueContent}>
        <View style={styles.revenueTitleRow}>
          <Text style={styles.revenueTitle}>Revenue Overview</Text>
          {usingSample && !loading ? (
            <View style={styles.sampleBadge}>
              <Ionicons name="cloud-offline-outline" size={12} color="#FFD43B" />
              <Text style={styles.sampleBadgeText}>Demo data</Text>
            </View>
          ) : null}
        </View>
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" style={styles.revenueLoader} />
        ) : (
          <Text style={styles.revenueValue}>{revenueValue}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  revenueCard: {
    backgroundColor: '#3A4151',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  revenueContent: {
    gap: 8,
  },
  revenueTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueTitle: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: 'rgba(255,255,255,0.85)',
  },
  sampleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,212,59,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sampleBadgeText: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    color: '#FFD43B',
  },
  revenueValue: {
    fontSize: 28,
    fontFamily: Typography.numberHeavy,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 34,
  },
  revenueLoader: {
    marginTop: 8,
  },
});
