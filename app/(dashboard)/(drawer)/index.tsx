import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KpiCard } from '../../../components/dashboard/KpiCard';
import { SkeletonSummaryCard, SkeletonKpiCard } from '../../../components/ui/SkeletonLoader';
import { DASHBOARD_KPIS } from '@mocks/dashboard';
import type { DatePeriod } from '../../../types/dashboard';
import { useAuthContext } from '../../../context/AuthContext';
import { useThemeColors } from '../../../context/ThemeContext';
import { Typography } from '../../../constants/Typography';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { router, useFocusEffect } from 'expo-router';
import { NotificationHeaderButton } from '../../../components/navigation/NotificationHeaderButton';
import { BottomNavBar } from '../../../components/navigation/BottomNavBar';
import {
  getDashboardStats,
  DashboardStatsResponse,
  formatCurrency,
  formatNumber,
  SAMPLE_STATS,
} from '../../../services/api/dashboard.service';

const Header = () => {
  const colors = useThemeColors();
  const navigation = useNavigation();

  return (
    <View style={[styles.header, { backgroundColor: colors.card }]}>
      <TouchableOpacity 
        style={styles.headerButton} 
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="menu"
          size={22}
          color={colors.textPrimary}
        />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={[styles.userName, { color: colors.textPrimary }]}>
          Dashboard
        </Text>
      </View>
      <View style={styles.headerRight}>
        <NotificationHeaderButton iconColor={colors.textPrimary} size={22} />
      </View>
    </View>
  );
};

const RevenueOverview = ({
  period,
  stats,
  loading,
}: {
  period: DatePeriod;
  stats: DashboardStatsResponse | null;
  loading: boolean;
}) => {
  const title = period === 'today' ? "Today's Revenue Overview" : "This Month's Revenue Overview";
  const revenueValue = useMemo(() => {
    const periodKey = period === 'year' ? 'month' : period;
    const rev = stats ? stats[periodKey]?.revenue ?? 0 : 0;
    return formatCurrency(rev);
  }, [stats, period]);

  if (loading && !stats) {
    return <SkeletonSummaryCard />;
  }

  return (
    <View style={styles.revenueCard}>
      <View style={styles.revenueContent}>
        <View style={styles.revenueTitleRow}>
          <Text style={styles.revenueTitle}>{title}</Text>
        </View>
        <Text style={styles.revenueValue}>{revenueValue}</Text>
      </View>
    </View>
  );
};

const getKpiValueFromStats = (
  label: string,
  stats: DashboardStatsResponse | null,
  period: DatePeriod
): string | number => {
  if (!stats) return '0';
  const periodKey = period === 'year' ? 'month' : period;
  const periodData = stats[periodKey];
  if (!periodData) return '0';

  switch (label) {
    case 'Orders':
      return formatNumber(periodData.orders);
    case 'Quotes':
      return formatNumber(periodData.quotes);
    case 'New Customers':
      return formatNumber(periodData.newCustomers);
    case 'Invoices':
      return formatNumber(periodData.invoices);
    default:
      return 0;
  }
};

const getKpiOnPress = (label: string, period: DatePeriod): (() => void) | undefined => {
  switch (label) {
    case 'Orders':
      return () => router.push({ pathname: '/all-orders' as any, params: { period } });
    case 'Quotes':
      return () => router.push('/quotes' as any);
    case 'New Customers':
      return () => router.push('/new-customers' as any);
    case 'Invoices':
      return () => router.push('/invoices' as any);
    default:
      return undefined;
  }
};



export default function DashboardScreen() {
  const colors = useThemeColors();
  const { user } = useAuthContext();
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const usingSample = stats === null;

  const fetchStats = useCallback(async (isRefresh = false) => {
    const setSpin = isRefresh ? setRefreshing : setLoading;
    try {
      setSpin(true);
      setError(null);
      const token: string | null = (user as any)?.token ?? null;
      const data = await getDashboardStats({ token });
      setStats(data);
      setError(null);
    } catch (e: any) {
      const msg = e?.message || 'Failed to load dashboard data';
      setError(msg);
      setAttempts((n) => n + 1);
    } finally {
      setSpin(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchStats().then(() => {});
      const safetyTimer = setTimeout(() => {
        if (!cancelled) {
          setLoading((prev) => {
            if (prev) {
              setError('Loading is taking longer than expected â€” pull down to retry');
              return false;
            }
            return prev;
          });
        }
      }, 12000);
      return () => {
        cancelled = true;
        clearTimeout(safetyTimer);
      };
    }, [fetchStats])
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.card }]} edges={['top', 'left', 'right']}>
      <Header />
      <View style={[styles.mainBody, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchStats(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.contentContainer}>
            {error ? (
              <TouchableOpacity
                style={[styles.errorBanner, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}55` }]}
                onPress={() => fetchStats(false)}
                activeOpacity={0.8}
              >
                <View style={styles.errorBannerIconRow}>
                  <Ionicons name="alert-circle-outline" size={20} color={colors.primary} />
                  <Text style={[styles.errorBannerTitle, { color: colors.primary }]}>
                    Couldn't load live data
                  </Text>
                </View>
                <Text style={[styles.errorBannerDetail, { color: colors.textSecondary }]} numberOfLines={3}>
                  {error}
                </Text>
                <View style={[styles.retryChip, { backgroundColor: colors.primary }]}>
                  <Ionicons name="refresh-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.retryChipText}>Tap to retry</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Today Section */}
            <RevenueOverview period="today" stats={stats} loading={loading} />
            <View style={styles.kpiGrid}>
              {loading && !stats
                ? [1, 2, 3, 4].map((i) => (
                    <View key={`today-skel-${i}`} style={styles.kpiCardContainer}>
                      <SkeletonKpiCard />
                    </View>
                  ))
                : DASHBOARD_KPIS.map((kpi, index) => (
                    <View key={`today-${index}`} style={styles.kpiCardContainer}>
                      <KpiCard
                        kpi={kpi}
                        period="today"
                        value={getKpiValueFromStats(kpi.label, stats, 'today')}
                        onPress={getKpiOnPress(kpi.label, 'today')}
                      />
                    </View>
                  ))}
            </View>

            {/* This Month Section */}
            <View style={{ marginTop: 16 }}>
              <RevenueOverview period="month" stats={stats} loading={loading} />
            </View>
            <View style={styles.kpiGrid}>
              {loading && !stats
                ? [1, 2, 3, 4].map((i) => (
                    <View key={`month-skel-${i}`} style={styles.kpiCardContainer}>
                      <SkeletonKpiCard />
                    </View>
                  ))
                : DASHBOARD_KPIS.map((kpi, index) => (
                    <View key={`month-${index}`} style={styles.kpiCardContainer}>
                      <KpiCard
                        kpi={kpi}
                        period="month"
                        value={getKpiValueFromStats(kpi.label, stats, 'month')}
                        onPress={getKpiOnPress(kpi.label, 'month')}
                      />
                    </View>
                  ))}
            </View>
          </View>
        </ScrollView>
        <BottomNavBar />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mainBody: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    marginBottom: -4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontFamily: Typography.titleSerif,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Typography.headingSemiBold,
  },
  revenueCard: {
    backgroundColor: '#3A4151',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  revenueContent: {
    gap: 6,
  },
  revenueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  revenueTitle: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  revenueValue: {
    fontSize: 24,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  revenueLoader: {
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  sampleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 212, 59, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sampleBadgeText: {
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
    color: '#FFD43B',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  kpiCardContainer: {
    width: '48%',
  },
  errorBanner: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  errorBannerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorBannerTitle: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
  },
  errorBannerDetail: {
    fontSize: 12,
    fontFamily: Typography.body,
  },
  retryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 4,
  },
  retryChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
  },
  sampleHint: {
    fontSize: 11,
    fontFamily: Typography.body,
    marginTop: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
});


