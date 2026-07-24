import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { AppButton } from '../ui/AppButton';
import { TextField } from '../ui/TextField';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { Typography } from '../../constants/Typography';

interface LoginFormProps {
  email: string;
  password: string;
  isLoading: boolean;
  emailError?: string;
  passwordError?: string;
  onEmailChange: (text: string) => void;
  onPasswordChange: (text: string) => void;
  onLoginPress: () => void;
  onForgotPassword?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  email,
  password,
  isLoading,
  emailError,
  passwordError,
  onEmailChange,
  onPasswordChange,
  onLoginPress,
  onForgotPassword,
}) => {
  return (
    <View style={styles.container}>
      <TextField
        value={email}
        onChangeText={onEmailChange}
        placeholder="Username / Email"
        error={emailError}
        keyboardType="email-address"
        autoCapitalize="none"
        leftIcon="person-outline"
        style={{ marginBottom: 14 }}
        autoFocus
      />
      <TextField
        value={password}
        onChangeText={onPasswordChange}
        placeholder="Password"
        secureTextEntry
        error={passwordError}
        leftIcon="lock-closed-outline"
        style={{ marginBottom: Spacing.lg }}
      />
      <AppButton
        title="Login"
        onPress={onLoginPress}
        loading={isLoading}
      />
      {onForgotPassword && (
        <TouchableOpacity style={styles.forgotPasswordContainer} onPress={onForgotPassword}>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  forgotPasswordContainer: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
  },
});
