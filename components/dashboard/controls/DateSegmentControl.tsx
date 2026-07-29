import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import type { DatePeriod } from '../../../types/dashboard';
import { Typography } from '@theme/typography';

interface DateSegmentControlProps {
  period: Extract<DatePeriod, 'today' | 'month'>;
  setPeriod: (period: Extract<DatePeriod, 'today' | 'month'>) => void;
  disabled?: boolean;
  activeTextColor?: string;
  inactiveTextColor?: string;
  trackColor?: string;
  activeBackgroundColor?: string;
  shadowColor?: string;
  useThemeTypography?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

const options: { label: string; value: Extract<DatePeriod, 'today' | 'month'> }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Month', value: 'month' },
];

export function DateSegmentControl({
  period,
  setPeriod,
  disabled = false,
  activeTextColor = '#2C2C2A',
  inactiveTextColor = '#9C9B95',
  trackColor = '#EDEDEC',
  activeBackgroundColor = '#FFFFFF',
  shadowColor = '#000000',
  useThemeTypography = false,
  containerStyle,
}: DateSegmentControlProps) {
  return (
    <View style={[styles.container, disabled && styles.disabled, containerStyle]}>
      <View style={[styles.wrapper, { backgroundColor: trackColor }]}>
        {options.map((option) => {
          const isActive = period === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.button,
                isActive && {
                  backgroundColor: activeBackgroundColor,
                  shadowColor,
                },
              ]}
              disabled={disabled}
              onPress={() => setPeriod(option.value)}
            >
              <Text
                style={[
                  styles.text,
                  {
                    color: isActive ? activeTextColor : inactiveTextColor,
                    fontFamily:
                      useThemeTypography && isActive
                        ? Typography.headingSemiBold
                        : useThemeTypography
                          ? Typography.bodyMedium
                          : Typography.headingSemiBold,
                  },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  wrapper: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 10,
    padding: 3,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  text: {
    fontSize: 15,
    includeFontPadding: false,
  },
});
