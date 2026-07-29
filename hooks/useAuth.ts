import { useState } from 'react';
import { loginWithPassword, loginWithMpin } from '../services/api/auth.service';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
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
      await SecureStore.setItemAsync('lastAuthenticatedUserId', user.id);
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
      await SecureStore.setItemAsync('lastAuthenticatedUserId', user.id);
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
      // Check if biometrics are available
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setIsLoading(false);
        return { success: false, reason: 'unavailable' };
      }

      // Check if we have a last authenticated user id
      const lastUserId = await SecureStore.getItemAsync('lastAuthenticatedUserId');
      if (!lastUserId) {
        setIsLoading(false);
        return { success: false, reason: 'no_prior_login' };
      }

      // Attempt biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Log in to iRUSH',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use MPIN instead',
      });

      if (!result.success) {
        setIsLoading(false);
        if (result.error === 'user_cancel') {
          return { success: false, reason: 'user_cancel' };
        }
        return { success: false, reason: 'authentication_failed' };
      }

      // Look up the user in MOCK_USERS
      const user = MOCK_USERS.find(u => u.id === lastUserId);
      if (!user) {
        setIsLoading(false);
        return { success: false, reason: 'user_not_found' };
      }

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
