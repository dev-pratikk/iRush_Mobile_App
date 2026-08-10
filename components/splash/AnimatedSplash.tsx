import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Buttery-smooth custom easing curves
const EASE_OUT_CUBIC = Easing.bezier(0.215, 0.61, 0.355, 1);
const EASE_OUT_QUINT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT_CUBIC = Easing.bezier(0.645, 0.045, 0.355, 1);

interface AnimatedSplashProps {
  onFinish: () => void;
}

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onFinish }) => {
  // Screen-level fade-out
  const screenOpacity = useSharedValue(1);

  // Logo animations
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.72);
  const logoTranslateY = useSharedValue(16);

  // Soft glow ring behind logo
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.5);

  // Word mark: "iRUSH"
  const wordOpacity = useSharedValue(0);
  const wordTranslateY = useSharedValue(22);

  // Subtitle line
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(14);

  // Tagline dot separator
  const dotOpacity = useSharedValue(0);

  // Subtle breathe / pulse on logo after it settles
  const breatheScale = useSharedValue(1);

  const dismissSplash = () => {
    // Smooth full-screen fade-out before handing off
    screenOpacity.value = withTiming(0, {
      duration: 480,
      easing: EASE_IN_OUT_CUBIC,
    }, (done) => {
      if (done) runOnJS(onFinish)();
    });
  };

  useEffect(() => {
    // ── Phase 1: Glow ring blooms (0ms) ────────────────────────────────────
    glowOpacity.value = withTiming(0.35, { duration: 900, easing: EASE_OUT_QUINT });
    glowScale.value = withTiming(1, { duration: 900, easing: EASE_OUT_QUINT });

    // ── Phase 2: Logo springs in (80ms delay for slight stagger after glow) ─
    logoOpacity.value = withDelay(80, withTiming(1, { duration: 600, easing: EASE_OUT_QUINT }));
    logoScale.value = withDelay(
      80,
      withSpring(1, { damping: 14, stiffness: 160, mass: 0.9 })
    );
    logoTranslateY.value = withDelay(80, withTiming(0, { duration: 600, easing: EASE_OUT_QUINT }));

    // ── Phase 3: Word mark slides up (480ms) ─────────────────────────────────
    wordOpacity.value = withDelay(480, withTiming(1, { duration: 520, easing: EASE_OUT_CUBIC }));
    wordTranslateY.value = withDelay(480, withTiming(0, { duration: 520, easing: EASE_OUT_QUINT }));

    // ── Phase 4: Subtitle slides up (640ms) ─────────────────────────────────
    subtitleOpacity.value = withDelay(640, withTiming(1, { duration: 460, easing: EASE_OUT_CUBIC }));
    subtitleTranslateY.value = withDelay(640, withTiming(0, { duration: 460, easing: EASE_OUT_QUINT }));

    // ── Phase 5: Dot separator fades in (800ms) ──────────────────────────────
    dotOpacity.value = withDelay(800, withTiming(1, { duration: 380, easing: EASE_OUT_CUBIC }));

    // ── Phase 6: Gentle breathe pulse starts after logo settles (900ms) ─────
    breatheScale.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(1.045, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
          withTiming(1,     { duration: 1600, easing: Easing.inOut(Easing.sin) })
        ),
        -1,   // repeat forever (splash will be dismissed via timeout)
        true  // reverse
      )
    );

    // ── Phase 7: Hold → fade out (animations complete ≈ 1100ms, hold 1800ms) ──
    const holdTimer = setTimeout(dismissSplash, 2900); // 1100ms anim + 1800ms hold

    return () => clearTimeout(holdTimer);
  }, []);

  // ── Animated style definitions ─────────────────────────────────────────────
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value * breatheScale.value },
      { translateY: logoTranslateY.value },
    ],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateY: wordTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      {/* Soft ambient glow ring */}
      <Animated.View style={[styles.glowRing, glowStyle]} />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Image
          source={require('../../assets/logo/irush_grey_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Word mark + subtitle */}
      <View style={styles.textBlock}>
        <Animated.Text style={[styles.wordmark, wordStyle]}>
          iRUSH
        </Animated.Text>

        <Animated.View style={[styles.subtitleRow, dotStyle]}>
          <View style={styles.accentDot} />
        </Animated.View>

        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          PCB Manufacturing & Quoting
        </Animated.Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Soft glow halo behind the logo
  glowRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',  // indigo tint
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 60,
    elevation: 0,
  },

  logoWrap: {
    marginBottom: 28,
  },
  logo: {
    width: 148,
    height: 148,
  },

  textBlock: {
    alignItems: 'center',
    gap: 6,
  },
  wordmark: {
    fontSize: 44,
    fontFamily: 'Sora_800ExtraBold',
    color: Colors.textPrimary,
    letterSpacing: -1.5,
  },

  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#6366F1',   // indigo accent
    opacity: 0.8,
  },

  subtitle: {
    fontSize: 13.5,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
});
