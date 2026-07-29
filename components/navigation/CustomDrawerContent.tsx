import React from 'react';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';

import { useAuthContext } from '@context/AuthContext';
import { useTheme, useThemeColors } from '@context/ThemeContext';
import { Spacing } from '@theme/spacing';
import { Typography } from '@theme/typography';

const getLogo = (theme: string) => {
  return theme === 'red'
    ? require('../../assets/logo/irush_red_logo.png')
    : require('../../assets/logo/irush_grey_logo.png');
};

const menuItems = [
  { icon: 'home', label: 'Dashboard', route: '/' },
  { icon: 'cube', label: 'Open orders', route: '/open-orders' },
  { icon: 'chatbox', label: 'Quotes', route: '/quotes' },
  { icon: 'people', label: 'New Customers', route: '/new-customers' },
  { icon: 'receipt', label: 'Invoices', route: '/invoices' },
  { icon: 'bar-chart', label: 'Reports', route: '/reports' },
  { icon: 'settings', label: 'Settings', route: '/settings' },
] as const;

export function CustomDrawerContent(props: any) {
  const { logout } = useAuthContext();
  const colors = useThemeColors();
  const { theme } = useTheme();
  const pathname = usePathname();

  return (
    <DrawerContentScrollView
      {...props}
      style={[styles.drawerContent, { backgroundColor: colors.card }]}
      contentContainerStyle={{ flex: 1 }}
    >
      <View style={styles.drawerHeader}>
        <Image source={getLogo(theme)} style={styles.drawerLogo} resizeMode="contain" />
        <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>iRush</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.drawerItemsContainer}>
        {menuItems.map((item) => {
          const isActive = pathname === item.route;

          return (
            <TouchableOpacity
              key={item.route}
              style={styles.menuItemContainer}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.menuItem, isActive && { backgroundColor: `${colors.primary}10` }]}>
                <Ionicons
                  name={isActive ? `${item.icon}` : `${item.icon}-outline` as any}
                  size={24}
                  color={isActive ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.menuLabel, { color: isActive ? colors.primary : colors.textSecondary }]}>
                  {item.label}
                </Text>
              </View>
              {isActive ? <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.spacer} />
      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>iRush v 1.0</Text>
      </View>
      <View style={styles.logoutContainer}>
        <View style={styles.divider} />
        <DrawerItem
          label="Logout"
          labelStyle={[styles.logoutLabel, { color: colors.textSecondary }]}
          icon={() => <Ionicons name="log-out-outline" size={24} color={colors.textSecondary} />}
          onPress={() => {
            logout();
            router.replace('/(auth)/login');
          }}
        />
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drawerLogo: {
    width: 40,
    height: 40,
  },
  drawerTitle: {
    fontFamily: Typography.headingSemiBold,
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: Spacing.lg,
  },
  drawerItemsContainer: {
    marginTop: Spacing.lg,
    paddingHorizontal: 8,
  },
  menuItemContainer: {
    position: 'relative',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  menuLabel: {
    fontFamily: Typography.bodyMedium,
    fontSize: 15,
    marginLeft: 14,
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -12 }],
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  spacer: {
    flex: 1,
  },
  versionContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  versionText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 13,
  },
  logoutContainer: {
    marginTop: Spacing.md,
  },
  logoutLabel: {
    fontFamily: Typography.bodyMedium,
  },
});
