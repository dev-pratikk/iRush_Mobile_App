import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';

interface AnimatedSplashProps {
  onFinish: () => void;
}

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onFinish }) => {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const textOpacity = useSharedValue(0);

  const handleAnimationFinish = () => {
    setTimeout(() => {
      onFinish();
    }, 350);
  };

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.exp) });
    logoScale.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.back(1.4)) });

    textOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.exp) }, (finished) => {
        if (finished) {
          runOnJS(handleAnimationFinish)();
        }
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
