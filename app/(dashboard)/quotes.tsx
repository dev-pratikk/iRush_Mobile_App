import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { QUOTES_KPIS, DatePeriod } from '../../constants/mockDashboardData';
import { useAuthContext } from '../../context/AuthContext';
import { useThemeColors, useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { router, usePathname } from 'expo-router';

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
          Quotes
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

const BottomNav = () => {
  const colors = useThemeColors();
  const pathname = usePathname();
  const tabs = [
    { icon: 'home', label: 'Dashboard', route: '/' },
    { icon: 'cube', label: 'Orders', route: '/open-orders' },
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

export default function QuotesScreen() {
  const colors = useThemeColors();
  const [period, setPeriod] = useState<DatePeriod>('today');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          <DateSegmentControl period={period} setPeriod={setPeriod} />
          <View style={styles.kpiGrid}>
            {QUOTES_KPIS.map((kpi, index) => (
              <View key={index} style={styles.kpiCardContainer}>
                <KpiCard kpi={kpi} period={period} />
              </View>
            ))}
          </View>
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
