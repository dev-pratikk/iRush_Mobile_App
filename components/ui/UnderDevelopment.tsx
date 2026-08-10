import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useThemeColors } from '../../context/ThemeContext';
import { Spacing } from '../../constants/Spacing';
import { Typography } from '../../constants/Typography';

type UnderDevelopmentProps = {
  featureName?: string;
  title?: string;
  message?: string;
  showBackButton?: boolean;
  backRoute?: string;
};

export const UnderDevelopment: React.FC<UnderDevelopmentProps> = ({
  featureName,
  title,
  message,
  showBackButton = true,
  backRoute = '/',
}) => {
  const colors = useThemeColors();

  const resolvedTitle =
    title ?? `${featureName ?? 'This feature'} is coming soon`;
  const resolvedMessage =
    message ??
    "We're working on it and it'll be available soon.";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={styles.container}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: `${colors.primary}12` },
            ]}
          >
            <Ionicons
              name="construct-outline"
              size={36}
              color={colors.primary}
            />
          </View>

          {featureName ? (
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
              {featureName}
            </Text>
          ) : null}

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {resolvedTitle}
          </Text>

          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {resolvedMessage}
          </Text>

          {showBackButton ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => (router.canGoBack() ? router.back() : router.replace(backRoute as any))}
              style={[
                styles.button,
                { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons name="arrow-back-outline" size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Back to Dashboard</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 36,
    alignItems: 'center',
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  eyebrow: {
    fontFamily: Typography.bodyMedium,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontFamily: Typography.headingSemiBold,
    fontSize: 24,
    textAlign: 'center',
  },
  message: {
    fontFamily: Typography.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: Spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: 999,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: Typography.headingSemiBold,
    fontSize: 14,
  },
});
