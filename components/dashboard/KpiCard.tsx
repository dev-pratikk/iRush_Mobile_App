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
        <Text style={[styles.label, { color: colors.textSecondary }]}>{kpi.label}</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{displayValue}</Text>
      </View>

      {onPress ? (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[styles.arrowButton, { backgroundColor: `${colors.primary}12` }]}
          accessibilityLabel={`Navigate to ${kpi.label}`}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={[styles.arrowButton, { backgroundColor: colors.background, opacity: 0.5 }]}>
          <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    gap: 6,
    flex: 1,
  },
  label: {
    fontFamily: Typography.bodyMedium,
    fontSize: 13,
  },
  value: {
    fontFamily: Typography.numberHeavy,
    fontSize: 22,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

