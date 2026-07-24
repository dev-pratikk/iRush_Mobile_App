import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onCheck: (checked: boolean) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onCheck }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onCheck(!checked)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? Colors.primary : 'transparent',
            borderColor: checked ? Colors.primary : Colors.border,
          },
        ]}
      >
        {checked && (
          <Ionicons name="checkmark" size={16} color="white" />
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
