import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useNotifications } from '../../context/NotificationContext';
import { AppNotification } from '../../services/api/notification.service';
import { Typography } from '../../constants/Typography';

type FilterTab = 'all' | 'api_error' | 'unread';

const PRIMARY = '#0F172A';
const SECONDARY = '#64748B';
const PAGE_BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    runApiHealthCheck,
    isCheckingHealth,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(null);

  React.useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(dashboard)');
      }
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(dashboard)');
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'api_error') return item.type === 'api_error';
    if (activeTab === 'unread') return !item.isRead;
    return true;
  });

  const apiErrorCount = notifications.filter((n) => n.type === 'api_error').length;

  const handleItemPress = (notif: AppNotification) => {
    markAsRead(notif.id);
    Alert.alert(
      notif.title,
      `${notif.message}\n\nEndpoint: ${notif.endpoint || 'N/A'}\nStatus: ${
        notif.statusCode ? `HTTP ${notif.statusCode}` : 'Failed'
      }\nTime: ${notif.timestamp}`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(notif.id) },
      ]
    );
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      'Clear Notifications',
      'Are you sure you want to delete all notification records?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => clearAll() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <Ionicons name="arrow-back" size={20} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 ? (
            <View style={styles.headerBadgePill}>
              <Text style={styles.headerBadgeText}>{unreadCount} New</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.headerActions}>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllAsRead} style={styles.headerActionBtn}>
              <Ionicons name="checkmark-done-outline" size={18} color="#2563EB" />
            </TouchableOpacity>
          ) : null}
          {notifications.length > 0 ? (
            <TouchableOpacity onPress={handleClearAll} style={styles.headerActionBtn}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Health Check Quick Bar */}
        <View style={styles.healthCheckBanner}>
          <View style={styles.healthBannerLeft}>
            <View style={styles.healthBannerIconCircle}>
              <Ionicons name="pulse-outline" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.healthBannerTitle}>API Health Monitor</Text>
              <Text style={styles.healthBannerSubTitle}>
                Ping backend services to log active API status & errors.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.runHealthBtn}
            onPress={runApiHealthCheck}
            disabled={isCheckingHealth}
            activeOpacity={0.8}
          >
            {isCheckingHealth ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={14} color="#FFFFFF" />
                <Text style={styles.runHealthBtnText}>Check APIs</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab Filters */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'all' && styles.tabItemActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All ({notifications.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'api_error' && styles.tabItemActive]}
            onPress={() => setActiveTab('api_error')}
          >
            <Text style={[styles.tabText, activeTab === 'api_error' && styles.tabTextActive]}>
              API Errors ({apiErrorCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'unread' && styles.tabItemActive]}
            onPress={() => setActiveTab('unread')}
          >
            <Text style={[styles.tabText, activeTab === 'unread' && styles.tabTextActive]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="checkmark-circle-outline" size={36} color="#16A34A" />
            </View>
            <Text style={styles.emptyTitle}>All Systems Operational</Text>
            <Text style={styles.emptySubTitle}>
              {activeTab === 'api_error'
                ? 'No API failure alerts detected.'
                : activeTab === 'unread'
                ? 'You have read all notifications.'
                : 'No notification records found.'}
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredNotifications.map((notif) => {
              const isApiErr = notif.type === 'api_error';
              return (
                <TouchableOpacity
                  key={notif.id}
                  style={[
                    styles.notifCard,
                    !notif.isRead && styles.notifCardUnread,
                  ]}
                  onPress={() => handleItemPress(notif)}
                  activeOpacity={0.8}
                >
                  <View style={styles.notifCardHeader}>
                    <View style={styles.notifHeaderLeft}>
                      <View
                        style={[
                          styles.notifIconCircle,
                          isApiErr ? styles.iconCircleErr : styles.iconCircleInfo,
                        ]}
                      >
                        <Ionicons
                          name={isApiErr ? 'warning-outline' : 'information-circle-outline'}
                          size={18}
                          color={isApiErr ? '#DC2626' : '#2563EB'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notifTitle} numberOfLines={1}>
                          {notif.title}
                        </Text>
                        <Text style={styles.notifTime}>{notif.timestamp}</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {!notif.isRead ? <View style={styles.unreadDot} /> : null}
                      <TouchableOpacity
                        onPress={() => deleteNotification(notif.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-outline" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.notifMessage} numberOfLines={3}>
                    {notif.message}
                  </Text>

                  {notif.endpoint ? (
                    <View style={styles.notifFooterRow}>
                      <View style={styles.endpointBadge}>
                        <Ionicons name="server-outline" size={12} color="#64748B" />
                        <Text style={styles.endpointText} numberOfLines={1}>
                          {notif.endpoint}
                        </Text>
                      </View>
                      {notif.statusCode ? (
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusBadgeText}>HTTP {notif.statusCode}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.headingExtraBold,
    color: PRIMARY,
  },
  headerBadgePill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  headerBadgeText: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    color: '#DC2626',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // Health Check Banner
  healthCheckBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 14,
  },
  healthBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  healthBannerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthBannerTitle: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  healthBannerSubTitle: {
    fontSize: 11.5,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
    marginTop: 2,
  },
  runHealthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  runHealthBtnText: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: '#FFFFFF',
  },

  // Tab Filters
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabItemActive: {
    backgroundColor: CARD_BG,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  tabTextActive: {
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },

  // Empty State Card
  emptyStateCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Typography.headingExtraBold,
    color: PRIMARY,
    marginBottom: 4,
  },
  emptySubTitle: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
    textAlign: 'center',
  },

  // List Container & Cards
  listContainer: {
    gap: 10,
  },
  notifCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 14,
    gap: 8,
  },
  notifCardUnread: {
    borderColor: '#93C5FD',
    backgroundColor: '#F8FAFC',
  },
  notifCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  notifIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleErr: {
    backgroundColor: '#FEE2E2',
  },
  iconCircleInfo: {
    backgroundColor: '#EFF6FF',
  },
  notifTitle: {
    fontSize: 13.5,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  notifTime: {
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
    marginTop: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  notifMessage: {
    fontSize: 12.5,
    fontFamily: Typography.bodyMedium,
    color: '#334155',
    lineHeight: 18,
  },
  notifFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  endpointBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flex: 1,
    marginRight: 8,
  },
  endpointText: {
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
    color: '#475569',
  },
  statusBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    color: '#DC2626',
  },
});
