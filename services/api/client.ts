import Constants from 'expo-constants';

const baseURL = Constants.expoConfig?.extra?.apiBaseUrl || process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com';

export const apiClient = {
  baseURL,
  // TODO: Add fetch/axios wrapper implementation
};
