import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Spacing } from '../../constants/Spacing';
import { Typography } from '../../constants/Typography';
import { useThemeColors } from '../../context/ThemeContext';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
}) => {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.container, { backgroundColor: colors.primary, opacity: disabled ? 0.5 : 1 }]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.title}>{title.toUpperCase()}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    height: 65,
    paddingVertical: 15,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontFamily: Typography.headingExtraBold,
    letterSpacing: 0.5,
  },
});
