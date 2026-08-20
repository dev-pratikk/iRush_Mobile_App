import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeColors } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { router, usePathname } from 'expo-router';
import { NotificationHeaderButton } from '../../components/navigation/NotificationHeaderButton';
import { BottomNavBar as BottomNav } from '../../components/navigation/BottomNavBar';

const Header = () => {
  const colors = useThemeColors();
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
          Reports
        </Text>
      </View>
      <View style={styles.headerRight}>
        <NotificationHeaderButton iconColor={colors.textPrimary} size={22} />
      </View>
    </View>
  );
};



export default function ReportsScreen() {
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header />
      <View style={styles.contentContainer}>
        <Ionicons name="construct-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Work in Progress
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We're building this page! Check back soon.
        </Text>
      </View>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 16,
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
  userName: {
    fontFamily: Typography.headingSemiBold,
    fontSize: 18,
  },
  headerButton: {
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
    height: 40,
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
  title: {
    fontFamily: Typography.headingSemiBold,
    fontSize: 24,
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: 16,
    textAlign: 'center',
  },
});

