import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Cross-platform key-value storage wrapper.
 * On Native (iOS/Android): Uses expo-secure-store (Keychain / Keystore).
 * On Web: Uses localStorage with fallback in-memory storage.
 */

const memoryStorage = new Map<string, string>();

export const getItemAsync = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fallback
    }
    return memoryStorage.get(key) ?? null;
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    if (__DEV__) console.log('[Storage] Native getItemAsync fallback:', err);
    return null;
  }
};

export const setItemAsync = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fallback
    }
    memoryStorage.set(key, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    if (__DEV__) console.log('[Storage] Native setItemAsync fallback:', err);
  }
};

export const deleteItemAsync = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      // Fallback
    }
    memoryStorage.delete(key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    if (__DEV__) console.log('[Storage] Native deleteItemAsync fallback:', err);
  }
};
