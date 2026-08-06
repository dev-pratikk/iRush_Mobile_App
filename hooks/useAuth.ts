import { useState } from 'react';
import { Platform } from 'react-native';
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
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isFaceID = Platform.OS === 'ios' || supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);

      const promptTitle = isFaceID ? 'Log in with Face ID' : 'Log in to iRUSH';

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptTitle,
        cancelLabel: 'Cancel',
      });

      if (!result.success) {
        setIsLoading(false);
        return {
          success: false,
          reason: result.error === 'user_cancel' ? 'user_cancel' : 'authentication_failed',
        };
      }

      // Get last authenticated user, or default to primary active user
      let lastUserId = await SecureStore.getItemAsync('lastAuthenticatedUserId');
      if (!lastUserId) {
        lastUserId = MOCK_USERS[0].id;
        await SecureStore.setItemAsync('lastAuthenticatedUserId', lastUserId);
      }

      const user = MOCK_USERS.find((u) => u.id === lastUserId) || MOCK_USERS[0];
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
