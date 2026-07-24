import React, { useState } from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  View,
  StyleSheet,
  useWindowDimensions,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { LoginForm } from '../../components/login/LoginForm';
import { useAuth } from '../../hooks/useAuth';
import { useAuthContext } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { Typography } from '../../constants/Typography';

export default function EmailLoginScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 600;
  const { loginWithPassword, isLoading, error, clearError } = useAuth();
  const { login } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const validate = () => {
    let valid = true;

    if (!email) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email');
      valid = false;
    } else {
      setEmailError(undefined);
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else {
      setPasswordError(undefined);
    }

    return valid;
  };

  const handleLoginWithPassword = async () => {
    if (!validate()) return;
    clearError();

    try {
      const user = await loginWithPassword(email, password);
      login(user);
      router.replace('/(dashboard)');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={28} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>Email & Password</Text>
          </View>

          <View style={[styles.container, isTablet && styles.tabletContainer]}>
            <LoginForm
              email={email}
              password={password}
              isLoading={isLoading}
              emailError={emailError}
              passwordError={passwordError}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onLoginPress={handleLoginWithPassword}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.screenPadding,
  },
  header: {
    marginBottom: 24,
  },
  titleContainer: {
    marginBottom: 32,
  },
  titleText: {
    fontFamily: Typography.heading,
    fontSize: 28,
    color: Colors.textPrimary,
  },
  container: {
    width: '100%',
  },
  tabletContainer: {
    maxWidth: 420,
    alignSelf: 'center',
  },
});
