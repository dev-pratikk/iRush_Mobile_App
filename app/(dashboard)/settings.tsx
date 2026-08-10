import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  RefreshControl,
  BackHandler,
  Switch,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { useAuthContext } from '../../context/AuthContext';
import { router, usePathname } from 'expo-router';
import { useThemeColors } from '../../context/ThemeContext';
import { NotificationHeaderButton } from '../../components/navigation/NotificationHeaderButton';

import { pingPongService, PingPongEndpointReport, PINGPONG_MONITORED_APIS } from '../../services/api/pingpong.service';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const PAGE_BG = '#FFFFFF';
const SUMMARY_CARD_BG = '#3A4151';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#E7E6E2';
const GREEN_BG = '#DCFCE7';
const GREEN_TEXT = '#15803D';
const RED_BG = '#FEE2E2';
const RED_TEXT = '#B91C1C';

// ─── Header ──────────────────────────────────────────────────────────────────

const Header = () => (
  <View style={styles.header}>
    <TouchableOpacity
      style={styles.headerIconWrap}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
    >
      <Ionicons name="arrow-back" size={20} color={PRIMARY} />
    </TouchableOpacity>
    <View style={styles.headerCenter}>
      <Text style={styles.headerTitle}>Settings & API Ping-Pong</Text>
    </View>
    <View style={styles.headerIconWrap}>
      <NotificationHeaderButton iconColor={PRIMARY} size={20} />
    </View>
  </View>
);

// ─── Bottom Nav Bar ──────────────────────────────────────────────────────────

const BottomNav = () => {
  const colors = useThemeColors();
  const pathname = usePathname();
  const tabs = [
    { icon: 'home', label: 'Dashboard', route: '/' },
    { icon: 'document-text', label: 'Orders', route: '/orders' },
    { icon: 'cube', label: 'Open orders', route: '/open-orders' },
    { icon: 'chatbox', label: 'Quotes', route: '/quotes' },
  ];
  return (
    <View style={[styles.bottomNav, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {tabs.map((tab, index) => {
        const isActive = pathname === tab.route;
        return (
          <TouchableOpacity key={index} style={styles.navTab} onPress={() => router.push(tab.route as any)}>
            <Ionicons
              name={isActive ? `${tab.icon}` : (`${tab.icon}-outline` as any)}
              size={24}
              color={isActive ? colors.primary : colors.inactive}
            />
            <Text
              style={[
                styles.navLabel,
                { color: isActive ? colors.primary : colors.inactive },
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

// ─── Main Settings & API Status Screen ─────────────────────────────────────────

export default function SettingsScreen() {
  const { user, logout } = useAuthContext();
  const token = (user as any)?.token ?? null;

  // Hardware Back button handling (Android)
  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const [reports, setReports] = useState<PingPongEndpointReport[]>(() => pingPongService.getReports());
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoPingEnabled, setAutoPingEnabled] = useState(true);

  // Subscribe to live Ping-Pong updates
  useEffect(() => {
    const unsubscribe = pingPongService.subscribe((liveData) => {
      setReports(liveData);
    });
    return () => unsubscribe();
  }, []);

  // Start auto ping-pong heartbeat
  useEffect(() => {
    if (autoPingEnabled) {
      pingPongService.startAutoPingPong(token, 15000);
    } else {
      pingPongService.stopAutoPingPong();
    }

    return () => {
      pingPongService.stopAutoPingPong();
    };
  }, [token, autoPingEnabled]);

  // Run ping-pong test on all endpoints
  const runHealthCheck = useCallback(async () => {
    setIsTestingAll(true);
    await pingPongService.pingAll(token);
    setIsTestingAll(false);
    setRefreshing(false);
  }, [token]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    runHealthCheck();
  }, [runHealthCheck]);

  // Derived Summary Metrics
  const totalCount = reports.length;
  const okCount = reports.filter((r) => r.status === 'ok').length;
  const errorCount = reports.filter((r) => r.status === 'error').length;
  const isHealthy = errorCount === 0 && !isTestingAll;

  const avgLatency = useMemo(() => {
    const valid = reports.filter((r) => typeof r.latencyMs === 'number' && r.latencyMs > 0);
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, curr) => acc + (curr.latencyMs || 0), 0);
    return Math.round(sum / valid.length);
  }, [reports]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />
        }
      >
        <View style={styles.contentContainer}>
          {/* Top Diagnostics Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryTitleCol}>
                <Text style={styles.summaryCardTitle}>API Ping-Pong Monitor</Text>
                <Text style={styles.summaryCardSubtitle}>
                  {totalCount} Endpoints · Avg Latency: {avgLatency} ms
                </Text>
              </View>

              <View
                style={[
                  styles.overallStatusPill,
                  { backgroundColor: isTestingAll ? '#4A5568' : isHealthy ? GREEN_BG : RED_BG },
                ]}
              >
                <Ionicons
                  name={isTestingAll ? 'sync-outline' : isHealthy ? 'checkmark-circle' : 'warning'}
                  size={14}
                  color={isTestingAll ? '#FFFFFF' : isHealthy ? GREEN_TEXT : RED_TEXT}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.overallStatusText,
                    { color: isTestingAll ? '#FFFFFF' : isHealthy ? GREEN_TEXT : RED_TEXT },
                  ]}
                >
                  {isTestingAll ? 'Pinging...' : isHealthy ? 'PING-PONG OK' : `${errorCount} PING FAILS`}
                </Text>
              </View>
            </View>

            {/* Auto-Ping Heartbeat Controls */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: hairline, borderTopColor: 'rgba(255,255,255,0.15)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="pulse" size={16} color={autoPingEnabled ? '#4ADE80' : SECONDARY} />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: Typography.bodyMedium }}>
                  Auto Heartbeat (15s): <Text style={{ color: autoPingEnabled ? '#4ADE80' : SECONDARY, fontWeight: '600' }}>{autoPingEnabled ? 'ACTIVE' : 'PAUSED'}</Text>
                </Text>
              </View>
              <Switch
                value={autoPingEnabled}
                onValueChange={setAutoPingEnabled}
                trackColor={{ false: '#475569', true: '#16A34A' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.summaryBottomRow}>
              <Text style={styles.summaryMetricsText}>
                {okCount}/{totalCount} Responding
              </Text>
              <TouchableOpacity
                style={styles.retestBtn}
                onPress={runHealthCheck}
                disabled={isTestingAll}
                activeOpacity={0.8}
              >
                {isTestingAll ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 4 }} />
                ) : (
                  <Ionicons name="refresh-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                )}
                <Text style={styles.retestBtnText}>Ping All APIs Now</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* API Status Reports List */}
          <Text style={styles.sectionHeaderTitle}>Live API Reports</Text>

          <View style={styles.reportsList}>
            {reports.map((item) => {
              const isOk = item.status === 'ok';
              const isTesting = item.status === 'testing';

              return (
                <View key={item.id} style={styles.reportCard}>
                  <View style={styles.reportHeaderRow}>
                    <View style={styles.reportTitleCol}>
                      <Text style={styles.reportNameText}>{item.name}</Text>
                      <Text style={styles.reportPathText} numberOfLines={1} ellipsizeMode="middle">
                        {item.path}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: isTesting ? '#F1F5F9' : isOk ? GREEN_BG : RED_BG },
                      ]}
                    >
                      {isTesting ? (
                        <ActivityIndicator size="small" color={SECONDARY} style={{ marginRight: 4 }} />
                      ) : null}
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: isTesting ? SECONDARY : isOk ? GREEN_TEXT : RED_TEXT },
                        ]}
                      >
                        {isTesting
                          ? 'Testing...'
                          : isOk
                          ? `${item.statusCode} OK`
                          : item.errorMessage || `HTTP ${item.statusCode || 500}`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.reportFooterRow}>
                    <Text style={styles.reportLatencyText}>
                      Latency: <Text style={styles.boldText}>{item.latencyMs !== null ? `${item.latencyMs} ms` : '—'}</Text>
                    </Text>
                    {item.lastChecked ? (
                      <Text style={styles.reportTimeText}>Checked: {item.lastChecked} PST</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Account Profile & App Version Footer */}
          <View style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <Ionicons name="person-circle-outline" size={28} color={PRIMARY} />
              <View style={styles.accountInfoCol}>
                <Text style={styles.accountNameText}>
                  {(user as any)?.firstName ? `${(user as any)?.firstName} ${(user as any)?.lastName}` : 'Signed-in Account'}
                </Text>

                <Text style={styles.accountEmailText}>{(user as any)?.email || 'iRush Authorized User'}</Text>
              </View>
            </View>

            <View style={styles.accountDivider} />

            <View style={styles.versionRow}>
              <Text style={styles.versionText}>iRush Mobile App v1.0.0</Text>
              <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={14} color={RED_TEXT} style={{ marginRight: 4 }} />
                <Text style={styles.logoutBtnText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  contentContainer: { padding: 16, gap: 16 },

  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: PAGE_BG,
    borderBottomWidth: hairline,
    borderBottomColor: CARD_BORDER,
  },
  headerIconWrap: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerIconInner: { position: 'relative', width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 18,
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

  // Summary Card
  summaryCard: {
    backgroundColor: SUMMARY_CARD_BG,
    borderRadius: 16,
    padding: 18,
    gap: 16,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryTitleCol: { gap: 4, flex: 1, paddingRight: 8 },
  summaryCardTitle: {
    fontSize: 18,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryCardSubtitle: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  overallStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  overallStatusText: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
  },
  summaryBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: hairline,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  summaryMetricsText: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: '#FFFFFF',
  },
  retestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retestBtnText: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: '#FFFFFF',
  },

  sectionHeaderTitle: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
    marginTop: 4,
  },

  // Reports List
  reportsList: { gap: 10 },
  reportCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  reportHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reportTitleCol: { flex: 1, paddingRight: 10, gap: 2 },
  reportNameText: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  reportPathText: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: SECONDARY,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
  },
  reportFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: hairline,
    borderTopColor: CARD_BORDER,
  },
  reportLatencyText: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: SECONDARY,
  },
  boldText: {
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  reportTimeText: {
    fontSize: 11,
    fontFamily: Typography.body,
    color: SECONDARY,
  },

  // Account Card
  accountCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountInfoCol: { gap: 2, flex: 1 },
  accountNameText: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  accountEmailText: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: SECONDARY,
  },
  accountDivider: {
    height: hairline,
    backgroundColor: CARD_BORDER,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: SECONDARY,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: RED_BG,
  },
  logoutBtnText: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: RED_TEXT,
  },

  bottomNav: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  navTab: { alignItems: 'center', paddingVertical: 4 },
  navLabel: { fontSize: 11, fontFamily: Typography.bodyMedium, marginTop: 4 },
});
