import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Trace {
  path: string;
  waypoints: { x: number; y: number }[];
}

const traces: Trace[] = [
  {
    path: 'M0,50 L150,50 L150,120 L300,120',
    waypoints: [
      { x: 0, y: 50 },
      { x: 150, y: 50 },
      { x: 150, y: 120 },
      { x: 300, y: 120 },
    ],
  },
  {
    path: 'M400,0 L400,100 L250,100 L250,200',
    waypoints: [
      { x: 400, y: 0 },
      { x: 400, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 200 },
    ],
  },
  {
    path: 'M50,300 L200,300 L200,450 L350,450',
    waypoints: [
      { x: 50, y: 300 },
      { x: 200, y: 300 },
      { x: 200, y: 450 },
      { x: 350, y: 450 },
    ],
  },
  {
    path: 'M350,250 L500,250 L500,380 L420,380 L420,500',
    waypoints: [
      { x: 350, y: 250 },
      { x: 500, y: 250 },
      { x: 500, y: 380 },
      { x: 420, y: 380 },
      { x: 420, y: 500 },
    ],
  },
  {
    path: 'M100,550 L100,650 L300,650 L300,750',
    waypoints: [
      { x: 100, y: 550 },
      { x: 100, y: 650 },
      { x: 300, y: 650 },
      { x: 300, y: 750 },
    ],
  },
  {
    path: 'M450,580 L450,700 L350,700',
    waypoints: [
      { x: 450, y: 580 },
      { x: 450, y: 700 },
      { x: 350, y: 700 },
    ],
  },
];

const interpolatePosition = (progress: number, waypoints: { x: number; y: number }[]) => {
  'worklet';
  const totalSegments = waypoints.length - 1;
  const segmentProgress = progress * totalSegments;
  const segmentIndex = Math.min(Math.floor(segmentProgress), totalSegments - 1);
  const t = segmentProgress - segmentIndex;

  const start = waypoints[segmentIndex];
  const end = waypoints[segmentIndex + 1];

  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
};

const TraceDot = ({
  waypoints,
  delay,
}: {
  waypoints: { x: number; y: number }[];
  delay: number;
}) => {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      progress.value = withRepeat(
        withTiming(1, {
          duration: 5000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [delay, progress]);

  const createAnimatedDot = (offset: number, radius: number, opacity: number) => {
    const animatedProps = useAnimatedProps(() => {
      const adjustedProgress = Math.max(0, progress.value - offset);
      const { x, y } = interpolatePosition(adjustedProgress, waypoints);
      return {
        cx: x,
        cy: y,
      };
    });

    return (
      <AnimatedCircle
        key={offset}
        r={radius}
        fill={Colors.primary}
        opacity={opacity}
        animatedProps={animatedProps}
      />
    );
  };

  return (
    <>
      {/* Glow layers */}
      {createAnimatedDot(0, 10, 0.1)}
      {createAnimatedDot(0, 7, 0.2)}
      {/* Main dot and trail */}
      {createAnimatedDot(0, 5, 1)}
      {createAnimatedDot(0.03, 4, 0.6)}
      {createAnimatedDot(0.06, 3, 0.4)}
      {createAnimatedDot(0.09, 2, 0.2)}
    </>
  );
};

export const CircuitDecoration = () => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" style={styles.svg}>
        {traces.map((trace, index) => (
          <React.Fragment key={index}>
            <Path
              d={trace.path}
              stroke={Colors.primary}
              strokeWidth="2"
              fill="none"
              opacity={0.18}
            />
            <TraceDot
              waypoints={trace.waypoints}
              delay={index * 500}
            />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
