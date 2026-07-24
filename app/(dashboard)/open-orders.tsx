import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { router, usePathname } from 'expo-router';

const Header = () => {
  const colors = useThemeColors();

  return (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <TouchableOpacity 
        style={styles.headerButton} 
        onPress={() => router.back()}
      >
        <Ionicons
          name="arrow-back"
          size={24}
          color={colors.textPrimary}
        />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Open orders
        </Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons
            name="notifications-outline"
            size={24}
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

const SummaryCard = () => {
  const colors = useThemeColors();
  return (
    <View style={[styles.summaryCard, { backgroundColor: '#3A4151' }]}>
      <Text style={styles.summaryLabel}>Open orders</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryCount}>303</Text>
        <Text style={styles.summaryValue}>$6,895,857</Text>
      </View>
    </View>
  );
};

const OrderSectionCard = ({
  title,
  data,
}: {
  title: string;
  data: { label: string; value: string }[];
}) => {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-forward'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.sectionContent}>
          {data.map((item, index) => (
            <View key={index} style={[styles.sectionRow, index < data.length - 1 && styles.sectionRowBorder]}>
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                {item.label}
              </Text>
              <Text style={[styles.rowValue, { color: colors.textPrimary }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
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

export default function OpenOrdersScreen() {
  const colors = useThemeColors();

  const pendingData = [
    { label: 'Orders', value: '241 · $3,817,184' },
    { label: 'No vendor', value: '72' },
    { label: 'Partial vendor', value: '42' },
    { label: 'Fully sourced', value: '127' },
    { label: 'Unrealized revenue', value: '$1,192,645' },
  ];

  const partialData = [
    { label: 'Orders', value: '62 · $3,078,674' },
    { label: 'No vendor', value: '1' },
    { label: 'Partial vendor', value: '6' },
    { label: 'Fully sourced', value: '55' },
    { label: 'Unrealized revenue', value: '$741,029' },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          <SummaryCard />
          <OrderSectionCard title="Pending orders" data={pendingData} />
          <OrderSectionCard title="Partial orders" data={partialData} />
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
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
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
    color: 'white',
    fontSize: 10,
    fontFamily: Typography.headingSemiBold,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: 'rgba(255,255,255,0.8)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 36,
    fontFamily: Typography.numberHeavy,
    color: 'white',
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: Typography.numberHeavy,
    color: 'white',
  },
  sectionCard: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
  },
  sectionContent: {
    paddingTop: 0,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  sectionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
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
