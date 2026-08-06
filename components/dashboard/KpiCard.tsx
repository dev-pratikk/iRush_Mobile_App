import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Kpi, DatePeriod } from '../../types/dashboard';
import { useThemeColors } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';

interface KpiCardProps {
  kpi: Kpi;
  period: DatePeriod;
  value?: string | number;
  onPress?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({ kpi, period, value, onPress }) => {
  const colors = useThemeColors();
  const displayValue = value !== undefined ? value : kpi.values[period];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
        },
      ]}
    >
      <View style={styles.content}>
        <Text
          style={[styles.label, { color: colors.textSecondary }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {kpi.label}
        </Text>
        <Text
          style={[styles.value, { color: colors.textPrimary }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {displayValue}
        </Text>
      </View>

      {onPress ? (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.arrowButton, { backgroundColor: `${colors.primary}12` }]}
          accessibilityLabel={`Navigate to ${kpi.label}`}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-forward" size={15} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={[styles.arrowButton, { backgroundColor: colors.background, opacity: 0.5 }]}>
          <Ionicons name="arrow-forward" size={15} color={colors.textSecondary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 74,
  },
  content: {
    gap: 4,
    flex: 1,
    paddingRight: 4,
    minWidth: 0,
  },
  label: {
    fontFamily: Typography.bodyMedium,
    fontSize: 12.5,
  },
  value: {
    fontFamily: Typography.numberHeavy,
    fontSize: 21,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    flexShrink: 0,
  },
});
