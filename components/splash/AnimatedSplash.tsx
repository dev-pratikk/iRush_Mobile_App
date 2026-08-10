import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';

// Buttery-smooth bezier curves — matching iOS motion spec
const EASE_OUT_QUINT = Easing.bezier(0.23, 1, 0.32, 1);

interface AnimatedSplashProps {
  onFinish: () => void;
}

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onFinish }) => {
  // Same shared values as before — just logo + text
  const logoOpacity = useSharedValue(0);
  const logoScale  = useSharedValue(0.85);
  const textOpacity = useSharedValue(0);

  const handleAnimationFinish = () => {
    // Hold the splash visible for 1800ms after animations complete
    setTimeout(() => {
      onFinish();
    }, 1800);
  };

  useEffect(() => {
    // Logo: spring physics for a natural, weighted feel (no overshoot snapping)
    logoOpacity.value = withTiming(1, { duration: 700, easing: EASE_OUT_QUINT });
    logoScale.value   = withSpring(1, { damping: 14, stiffness: 160, mass: 0.9 });

    // Text: smooth fade-in after logo settles
    textOpacity.value = withDelay(
      460,
      withTiming(1, { duration: 640, easing: EASE_OUT_QUINT }, (finished) => {
        if (finished) runOnJS(handleAnimationFinish)();
      })
    );
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  // ── Exact same layout / styles as before ──────────────────────────────────
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
        <Image
          source={require('../../assets/logo/irush_grey_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.View style={[styles.textContainer, animatedTextStyle]}>
        <Text style={styles.wordmark}>iRUSH</Text>
        <Text style={styles.subtitle}>PCB Manufacturing &amp; Quoting</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.screenPadding,
  },
  logoContainer: {
    marginBottom: Spacing.md,
  },
  logo: {
    width: 150,
    height: 150,
  },
  textContainer: {
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 42,
    fontFamily: 'Sora_800ExtraBold',
    color: Colors.textPrimary,
    letterSpacing: -1,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
});
