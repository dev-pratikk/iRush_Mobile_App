import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { Typography } from '../../constants/Typography';

export const LoginHeader: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Large Logo Mark */}
      <View style={styles.logoMarkContainer}>
        <Image
          source={require('../../assets/logo/irush_grey_logo.png')}
          style={styles.logoMark}
          resizeMode="contain"
        />
      </View>
      {/* Wordmark */}
      <Text style={styles.logoWordmark}>iRUSH</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoMarkContainer: {
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 12,
  },
  logoMark: {
    width: 160,
    height: 160,
  },
  logoWordmark: {
    fontSize: 56,
    fontFamily: Typography.headingExtraBold,
    color: Colors.textPrimary,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
});
