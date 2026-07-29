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
  const [pressed, setPressed] = React.useState(false);

  const displayValue = value !== undefined ? value : kpi.values[period];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={1}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{kpi.label}</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{displayValue}</Text>
      </View>
      <Ionicons name="arrow-forward-outline" size={20} color={colors.textSecondary} style={styles.arrow} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  content: {
    gap: 8,
  },
  label: {
    fontFamily: Typography.bodyMedium,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  value: {
    fontFamily: Typography.numberHeavy,
    fontSize: 21,
  },
  arrow: {
    alignSelf: 'flex-end',
  },
});
