import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Image, ActivityIndicator, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { DASHBOARD_KPIS, DatePeriod } from '../../constants/mockDashboardData';
import { useAuthContext } from '../../context/AuthContext';
import { useThemeColors, useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { router, usePathname } from 'expo-router';
import {
  getDashboardStats,
  DashboardStatsResponse,
  formatCurrency,
  formatNumber,
  SAMPLE_STATS,
} from '../../services/api/dashboard';

const getLogo = (theme: string) => {
  return theme === 'red'
    ? require('../../assets/logo/irush_red_logo.png')
    : require('../../assets/logo/irush_grey_logo.png');
};

const Header = () => {
  const colors = useThemeColors();
  const { theme } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={[styles.header, { backgroundColor: colors.card }]}>
      <TouchableOpacity 
        style={styles.headerButton} 
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
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
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons
            name="notifications-outline"
            size={22}
            color={colors.textPrimary}
          />
          <View
            style={[styles.badge, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const DateSegmentControl = ({
  period,
  setPeriod,
}: {
  period: DatePeriod;
  setPeriod: (p: DatePeriod) => void;
}) => {
  const colors = useThemeColors();

  const options: { label: string; value: DatePeriod }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Month', value: 'month' },
  ];

  return (
    <View style={styles.segmentContainer}>
      <View style={[styles.segmentWrapper, { backgroundColor: colors.border }]}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => setPeriod(option.value)}
            style={[
              styles.segmentButton,
              period === option.value && {
                backgroundColor: colors.card,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    period === option.value ? colors.primary : colors.textSecondary,
                  fontFamily:
                    period === option.value
                      ? Typography.headingSemiBold
                      : Typography.bodyMedium,
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const RevenueOverview = ({
  period,
  stats,
  loading,
  usingSample,
}: {
  period: DatePeriod;
  stats: DashboardStatsResponse | null;
  loading: boolean;
  usingSample: boolean;
}) => {
  const colors = useThemeColors();

  const revenueValue = useMemo(() => {
    const activeStats = stats ?? SAMPLE_STATS;
    const periodKey = period === 'year' ? 'month' : period;
    return formatCurrency(activeStats[periodKey].revenue);
  }, [stats, period]);

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
};

const getKpiValueFromStats = (
  label: string,
  stats: DashboardStatsResponse | null,
  period: DatePeriod
): string | number => {
  const activeStats = stats ?? SAMPLE_STATS;
  const periodKey = period === 'year' ? 'month' : period;
  const periodData = activeStats[periodKey];

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

const getKpiOnPress = (label: string): (() => void) | undefined => {
  switch (label) {
    case 'Orders':
      return () => router.push('/orders' as any);
    case 'Quotes':
      return () => router.push('/quotes' as any);
    case 'Invoices':
      return () => router.push('/reports' as any);
    default:
      return undefined;
  }
};

const BottomNav = () => {
  const colors = useThemeColors();
  const pathname = usePathname();
  const tabs = [
    { icon: 'home', label: 'Dashboard', route: '/' },
    { icon: 'cube', label: 'Open orders', route: '/open-orders' },
    { icon: 'chatbox', label: 'Quotes', route: '/quotes' },
    { icon: 'bar-chart', label: 'Reports', route: '/reports' },
  ];

  return (
    <View style={[styles.bottomNav, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {tabs.map((tab, index) => {
        const isActive = pathname === tab.route;
        return (
          <TouchableOpacity key={index} style={styles.navTab} onPress={() => router.push(tab.route as any)}>
            <Ionicons
              name={isActive ? `${tab.icon}` : `${tab.icon}-outline` as any}
              size={24}
              color={isActive ? colors.primary : colors.inactive}
            />
            <Text
              style={[
                styles.navLabel,
                {
                  color: isActive ? colors.primary : colors.inactive,
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default function DashboardScreen() {
  const colors = useThemeColors();
  const { user } = useAuthContext();
  const [period, setPeriod] = useState<DatePeriod>('today');
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

  useEffect(() => {
    let cancelled = false;
    fetchStats().then(() => {});
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        setLoading((prev) => {
          if (prev) {
            setError('Loading is taking longer than expected — pull down to retry');
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
  }, [fetchStats]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header />
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
              {attempts > 0 && usingSample && (
                <Text style={[styles.sampleHint, { color: colors.textMuted }]}>
                  ✨ Showing demo data from your example response while you retry
                </Text>
              )}
            </TouchableOpacity>
          ) : null}

          <DateSegmentControl period={period} setPeriod={setPeriod} />
          <RevenueOverview period={period} stats={stats} loading={loading} usingSample={usingSample} />
          <View style={styles.kpiGrid}>
            {DASHBOARD_KPIS.map((kpi, index) => (
              <View key={index} style={styles.kpiCardContainer}>
                <KpiCard
                  kpi={kpi}
                  period={period}
                  value={getKpiValueFromStats(kpi.label, stats, period)}
                  onPress={getKpiOnPress(kpi.label)}
                />
              </View>
            ))}
          </View>
          {loading && !refreshing ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading dashboard…
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
  },
  userGreeting: {
    gap: 2,
  },
  greetingText: {
    fontSize: 12,
    fontFamily: Typography.body,
  },
  userName: {
    fontSize: 24,
    fontFamily: Typography.titleSerif,
  },
  overviewText: {
    fontSize: 12,
    fontFamily: Typography.body,
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
    color: 'white',
    fontSize: 10,
    fontFamily: Typography.headingSemiBold,
  },
  avatarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  segmentContainer: {
    width: '100%',
  },
  segmentWrapper: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 14,
  },
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
  errorBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  errorBannerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorBannerTitle: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
  },
  errorBannerDetail: {
    fontSize: 12.5,
    fontFamily: Typography.bodyMedium,
    lineHeight: 18,
  },
  retryChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 2,
  },
  retryChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
  },
  sampleHint: {
    fontSize: 11.5,
    fontFamily: Typography.body,
    marginTop: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCardContainer: {
    width: '48%',
  },
  bottomNav: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  navTab: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
    marginTop: 4,
  },
});
