import React from 'react';
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
import { MpinForm } from '../../components/login/MpinForm';
import { useAuth } from '../../hooks/useAuth';
import { useAuthContext } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { Typography } from '../../constants/Typography';

export default function MpinLoginScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width > 600;
  const { loginWithMpin, isLoading, error, clearError } = useAuth();
  const { login } = useAuthContext();

  const handleLoginWithMpin = async (mpin: string) => {
    clearError();

    try {
      const user = await loginWithMpin(mpin);
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
            <Text style={styles.titleText}>Login with MPIN</Text>
          </View>

          <View style={[styles.container, isTablet && styles.tabletContainer]}>
            <MpinForm
              isLoading={isLoading}
              error={error || undefined}
              onLogin={handleLoginWithMpin}
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
