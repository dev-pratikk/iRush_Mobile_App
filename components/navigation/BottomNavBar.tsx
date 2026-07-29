import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';

import { useThemeColors } from '@context/ThemeContext';
import { Typography } from '@theme/typography';

const tabs = [
  { icon: 'home', label: 'Dashboard', route: '/' },
  { icon: 'cube', label: 'Open orders', route: '/open-orders' },
  { icon: 'chatbox', label: 'Quotes', route: '/quotes' },
  { icon: 'bar-chart', label: 'Reports', route: '/reports' },
] as const;

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

  const selectedColor = activeColor ?? colors.primary;
  const mutedColor = inactiveColor ?? colors.inactive;

  return (
    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor: backgroundColor ?? colors.card,
          borderTopColor: borderTopColor ?? colors.border,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.route;

        return (
          <TouchableOpacity key={tab.route} style={styles.navTab} onPress={() => router.push(tab.route as any)}>
            <Ionicons
              name={isActive ? `${tab.icon}` : `${tab.icon}-outline` as any}
              size={24}
              color={isActive ? selectedColor : mutedColor}
            />
            <Text style={[styles.navLabel, { color: isActive ? selectedColor : mutedColor }]}>{tab.label}</Text>
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
    paddingBottom: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5,
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
