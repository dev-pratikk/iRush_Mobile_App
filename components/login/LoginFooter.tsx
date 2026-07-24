import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { Typography } from '../../constants/Typography';

export const LoginFooter: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>© 2026 iRUSH Engine | v 1.0 | Need help?</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Typography.body,
  },
});
