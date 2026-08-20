import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';

const tabs = [
  { key: 'home', icon: 'home', label: 'Dashboard', route: '/' },
  { key: 'orders', icon: 'document-text', label: 'Orders', route: '/orders' },
  { key: 'quotes', icon: 'chatbox', label: 'Quotes', route: '/all-quotes' },
  { key: 'ar', icon: 'receipt', label: 'AR', route: '/ar' },
] as const;

const checkIsActive = (key: string, pathname: string): boolean => {
  if (!pathname) return key === 'home';
  const cleanPath = pathname.toLowerCase();

  switch (key) {
    case 'home':
      return cleanPath === '/' || cleanPath === '/index' || cleanPath.endsWith('/(drawer)') || cleanPath.endsWith('/(drawer)/index');
    case 'orders':
      return (
        cleanPath.includes('/order') ||
        cleanPath.includes('/open-orders') ||
        cleanPath.includes('/pending-orders') ||
        cleanPath.includes('/partial-orders')
      );
    case 'quotes':
      return cleanPath.includes('/quote');
    case 'ar':
      return cleanPath.includes('/ar');
    default:
      return false;
  }
};

interface BottomNavBarProps {
  activeColor?: string;
  inactiveColor?: string;
  backgroundColor?: string;
  borderTopColor?: string;
}

export function BottomNavBar({
  activeColor,
  inactiveColor,
  backgroundColor,
  borderTopColor,
}: BottomNavBarProps) {
  const pathname = usePathname();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const selectedColor = activeColor ?? colors.primary;
  const mutedColor = inactiveColor ?? colors.textSecondary ?? '#64748B';

  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor: backgroundColor ?? colors.card,
          borderTopColor: borderTopColor ?? colors.border ?? '#E2E8F0',
          paddingBottom: bottomPadding,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = checkIsActive(tab.key, pathname);

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.navTab}
            activeOpacity={0.7}
            onPress={() => {
              if (pathname !== tab.route) {
                router.push(tab.route as any);
              }
            }}
          >
            <View style={[styles.iconContainer, isActive && { backgroundColor: `${selectedColor}14` }]}>
              <Ionicons
                name={isActive ? (tab.icon as any) : (`${tab.icon}-outline` as any)}
                size={22}
                color={isActive ? selectedColor : mutedColor}
              />
            </View>
            <Text
              style={[
                styles.navLabel,
                {
                  color: isActive ? selectedColor : mutedColor,
                  fontFamily: isActive ? Typography.bodySemiBold : Typography.bodyMedium,
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
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    flex: 1,
  },
  iconContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
