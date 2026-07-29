import React from 'react';
import { Drawer } from 'expo-router/drawer';
import {
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { Spacing } from '../../constants/Spacing';
import { Typography } from '../../constants/Typography';
import { useAuthContext } from '../../context/AuthContext';
import { useTheme, useThemeColors } from '../../context/ThemeContext';

const getLogo = (theme: string) => {
  return theme === 'red'
    ? require('../../assets/logo/irush_red_logo.png')
    : require('../../assets/logo/irush_grey_logo.png');
};

function CustomDrawerContent(props: any) {
  const { user, logout } = useAuthContext();
  const colors = useThemeColors();
  const { theme } = useTheme();
  const pathname = usePathname();

  const menuItems = [
    { icon: 'home', label: 'Dashboard', route: '/' },
    { icon: 'cube', label: 'Open orders', route: '/open-orders' },
    { icon: 'chatbox', label: 'Quotes', route: '/quotes' },
    { icon: 'people', label: 'New Customers', route: '/new-customers' },
    { icon: 'receipt', label: 'Invoices', route: '/invoices' },
    { icon: 'bar-chart', label: 'Reports', route: '/reports' },
    { icon: 'settings', label: 'Settings', route: '/settings' },
  ];

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
        {menuItems.map((item, index) => {
          const isActive = pathname === item.route;
          return (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItemContainer}
              onPress={() => router.push(item.route as any)}
            >
              <View
                style={[
                  styles.menuItem,
                  isActive && { backgroundColor: `${colors.primary}10` },
                ]}
              >
                <Ionicons
                  name={isActive ? `${item.icon}` : `${item.icon}-outline` as any}
                  size={24}
                  color={isActive ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.menuLabel,
                    {
                      color: isActive ? colors.primary : colors.textSecondary,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
              {isActive && (
                <View
                  style={[
                    styles.activeIndicator,
                    { backgroundColor: colors.primary },
                  ]}
                />
              )}
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
          icon={() => (
            <Ionicons
              name="log-out-outline"
              size={24}
              color={colors.textSecondary}
            />
          )}
          onPress={() => {
            logout();
            router.replace('/(auth)/login');
          }}
        />
      </View>
    </DrawerContentScrollView>
  );
}

export default function DashboardLayout() {
  const { theme, toggleTheme } = useTheme();
  const colors = useThemeColors();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={() => ({
        headerShown: false,
        drawerActiveBackgroundColor: `${colors.primary}10`,
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerItemStyle: {
          paddingVertical: 12,
          paddingHorizontal: 20,
        },
        drawerLabelStyle: {
          fontFamily: Typography.bodyMedium,
          fontSize: 14,
        },
      })}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Dashboard',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="orders"
        options={{
          title: 'Orders',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="open-orders"
        options={{
          title: 'Open orders',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="quotes"
        options={{
          title: 'Quotes',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="chatbox-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="new-customers"
        options={{
          title: 'New Customers',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="pending-orders"
        options={{
          title: 'Pending orders',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="partial-orders"
        options={{
          title: 'Partial orders',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="duplicate-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="all-quotes"
        options={{
          title: 'All quotes',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="quotes-by-salesperson"
        options={{
          title: 'Quotes by salesperson',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="quotes-by-service-type"
        options={{
          title: 'Quotes by service type',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="quotes-to-orders"
        options={{
          title: 'Quotes → orders',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="reports"
        options={{
          title: 'Reports',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: 'Settings',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer>
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
  profileName: {
    fontFamily: Typography.headingSemiBold,
    fontSize: 18,
    marginBottom: 4,
  },
  profileRole: {
    fontFamily: Typography.body,
    fontSize: 13,
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
