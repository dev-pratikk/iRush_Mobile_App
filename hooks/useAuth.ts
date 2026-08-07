import { useState } from 'react';
import { loginWithPassword, loginWithMpin } from '../services/api/auth.service';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Storage from '../lib/storage';
import { MOCK_USERS } from '@mocks/users';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginWithPassword = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await loginWithPassword(email, password);
      // Persist user id for biometric login
      await Storage.setItemAsync('lastAuthenticatedUserId', user.id);
      setIsLoading(false);
      return user;
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const handleLoginWithMpin = async (mpin: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await loginWithMpin(mpin);
      // Persist user id for biometric login
      await Storage.setItemAsync('lastAuthenticatedUserId', user.id);
      setIsLoading(false);
      return user;
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const handleLoginWithBiometrics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Check if hardware support and enrolled biometrics exist
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      const isFaceID = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      const isFingerprint = supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

      const promptTitle = isFaceID
        ? 'Log in with Face ID'
        : isFingerprint
        ? 'Log in with Fingerprint'
        : 'Log in to iRUSH';

      if (!hasHardware || !isEnrolled) {
        // Fallback to system passcode or MPIN prompt if biometrics not configured
        const fallbackResult = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate with System Passcode',
          fallbackLabel: 'Use MPIN instead',
          disableDeviceFallback: false,
        });

        if (!fallbackResult.success) {
          setIsLoading(false);
          return { success: false, reason: fallbackResult.error === 'user_cancel' ? 'user_cancel' : 'unavailable' };
        }
      } else {
        // 2. Primary Biometric Prompt (Face ID / Fingerprint)
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: promptTitle,
          cancelLabel: 'Cancel',
          fallbackLabel: 'Use MPIN or Passcode',
          disableDeviceFallback: false, // Allows system passcode fallback if biometrics fail
        });

        if (!result.success) {
          setIsLoading(false);
          if (result.error === 'user_cancel') {
            return { success: false, reason: 'user_cancel' };
          }
          return { success: false, reason: 'authentication_failed' };
        }
      }

      // Get last authenticated user, or default to primary active user
      let lastUserId = await Storage.getItemAsync('lastAuthenticatedUserId');
      if (!lastUserId) {
        lastUserId = MOCK_USERS[0].id;
        await Storage.setItemAsync('lastAuthenticatedUserId', lastUserId);
      }

      const user = MOCK_USERS.find(u => u.id === lastUserId) || MOCK_USERS[0];
      setIsLoading(false);
      return { success: true, user };
    } catch (err) {
      setIsLoading(false);
      return { success: false, reason: 'unknown_error' };
    }
  };

  const clearError = () => setError(null);

  return {
    loginWithPassword: handleLoginWithPassword,
    loginWithMpin: handleLoginWithMpin,
    loginWithBiometrics: handleLoginWithBiometrics,
    isLoading,
    error,
    clearError,
  };
};
