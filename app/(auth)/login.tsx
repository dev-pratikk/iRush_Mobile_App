import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAuthContext } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { Typography } from '../../constants/Typography';
import { MOCK_USERS } from '@mocks/users';

export default function LoginChooserScreen() {
  const { login } = useAuthContext();
  const [biometricError, setBiometricError] = useState<string | undefined>();
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [biometricType, setBiometricType] = useState<'faceID' | 'fingerprint' | 'biometric'>('biometric');

  useEffect(() => {
    const detectBiometrics = async () => {
      try {
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (Platform.OS === 'ios' || supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('faceID');
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        }
      } catch (e) {
        if (Platform.OS === 'ios') setBiometricType('faceID');
      }
    };
    detectBiometrics();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (biometricError) {
      timer = setTimeout(() => {
        setBiometricError(undefined);
      }, 3500);
    }
    return () => clearTimeout(timer);
  }, [biometricError]);

  const handleBiometricLogin = async () => {
    setIsBiometricLoading(true);
    setBiometricError(undefined);

    try {
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isFaceID = Platform.OS === 'ios' || supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      const isFingerprint = supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

      const promptTitle = isFaceID
        ? 'Log in with Face ID'
        : isFingerprint
        ? 'Log in with Fingerprint'
        : 'Log in to iRUSH';

      const lastUserId = await SecureStore.getItemAsync('lastAuthenticatedUserId');
      let user = lastUserId ? MOCK_USERS.find((u) => u.id === lastUserId) : MOCK_USERS[0];
      if (!user) user = MOCK_USERS[0];

      // Invoke native iOS Face ID / Biometric prompt directly
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptTitle,
        cancelLabel: 'Cancel',
        fallbackLabel: '',
        disableDeviceFallback: true,
      });

      if (result.success) {
        login(user);
        router.replace('/(dashboard)');
      } else {
        if (result.error !== 'user_cancel') {
          const msg =
            result.error === 'not_enrolled'
              ? (isFaceID ? 'Face ID is not enrolled in device Settings' : 'Biometrics not set up on device')
              : result.error === 'lockout'
              ? 'Too many failed attempts. Try again later'
              : result.error === 'not_available'
              ? 'Biometric authentication unavailable'
              : 'Face ID authentication failed';
          setBiometricError(msg);
        }
      }
    } catch (err) {
      console.error('Biometric login failed:', err);
      setBiometricError('Face ID authentication failed');
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
                <Ionicons
                  name={
                    biometricType === 'faceID'
                      ? 'scan-outline'
                      : biometricType === 'fingerprint'
                      ? 'finger-print-outline'
                      : 'shield-checkmark-outline'
                  }
                  size={28}
                  color={Colors.primary}
                />
              )}
            </View>
            <Text style={styles.optionLabel}>
              {biometricType === 'faceID'
                ? 'Login with Face ID'
                : biometricType === 'fingerprint'
                ? 'Login with Fingerprint'
                : 'Biometric Login'}
            </Text>
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
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionLabel: {
    flex: 1,
    fontFamily: Typography.bodySemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  biometricErrorText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    marginTop: 'auto',
    marginBottom: 16,
  },
  footerText: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
