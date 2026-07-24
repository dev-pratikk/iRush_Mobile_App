import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAuthContext } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { Typography } from '../../constants/Typography';
import { MOCK_USERS } from '../../constants/mockUsers';

export default function LoginChooserScreen() {
  const { login } = useAuthContext();
  const [biometricError, setBiometricError] = useState<string | undefined>();
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (biometricError) {
      timer = setTimeout(() => {
        setBiometricError(undefined);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [biometricError]);

  const handleBiometricLogin = async () => {
    setIsBiometricLoading(true);
    setBiometricError(undefined);

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        setBiometricError("Biometric login isn't set up on this device.");
        setIsBiometricLoading(false);
        return;
      }

      // TODO: replace with real last authenticated user lookup from SecureStore
      const lastUserId = await SecureStore.getItemAsync('lastAuthenticatedUserId');
      let user = lastUserId ? MOCK_USERS.find(u => u.id === lastUserId) : MOCK_USERS[0];

      if (!user) {
        user = MOCK_USERS[0];
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Log in to iRUSH',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use MPIN instead',
      });

      if (result.success) {
        login(user);
        router.replace('/(dashboard)');
      } else {
        if (result.error !== 'user_cancel') {
          setBiometricError('Authentication failed, try again');
        }
      }
    } catch (err) {
      console.error('Biometric login failed:', err);
      setBiometricError('Authentication failed, try again');
    } finally {
      setIsBiometricLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo/irush_grey_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.subWelcomeText}>Login to continue to iRUSH</Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => router.push('/(auth)/email-login')}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="mail-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.optionLabel}>Email & Password</Text>
            <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => router.push('/(auth)/mpin-login')}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="grid-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.optionLabel}>Login with MPIN</Text>
            <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleBiometricLogin}
            disabled={isBiometricLoading}
          >
            <View style={styles.iconCircle}>
              {isBiometricLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="finger-print-outline" size={28} color={Colors.primary} />
              )}
            </View>
            <Text style={styles.optionLabel}>Biometric Login</Text>
            <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
          </TouchableOpacity>
          {biometricError && (
            <Text style={styles.biometricErrorText}>{biometricError}</Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 iRUSH Engine . V 1.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.screenPadding,
  },
  logoContainer: {
    marginTop: 80,
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
  },
  welcomeContainer: {
    marginBottom: 48,
    alignItems: 'center',
  },
  welcomeText: {
    fontFamily: Typography.heading,
    fontSize: 32,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subWelcomeText: {
    fontFamily: Typography.body,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  optionsContainer: {
    width: '100%',
    maxWidth: 380,
  },
  optionButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F0F4F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionLabel: {
    fontFamily: Typography.bodyMedium,
    fontSize: 17,
    color: Colors.textPrimary,
    flex: 1,
  },
  biometricErrorText: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: Typography.body,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: Spacing.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
