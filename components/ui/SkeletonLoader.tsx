import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export const SkeletonBox = ({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) => {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#E2E8F0',
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SkeletonKpiCard = ({ style }: { style?: any }) => (
  <View style={[styles.kpiSkeletonCard, style]}>
    <SkeletonBox width="50%" height={12} borderRadius={4} />
    <SkeletonBox width="80%" height={24} borderRadius={6} style={{ marginVertical: 6 }} />
    <SkeletonBox width="60%" height={10} borderRadius={4} />
  </View>
);

export const SkeletonSummaryCard = () => (
  <View style={styles.summarySkeletonCard}>
    <View style={styles.summaryRow}>
      <View style={{ gap: 6, flex: 1 }}>
        <SkeletonBox width="40%" height={12} borderRadius={4} style={{ backgroundColor: '#4A5568' }} />
        <SkeletonBox width="60%" height={26} borderRadius={6} style={{ backgroundColor: '#4A5568' }} />
      </View>
      <View style={{ gap: 6, alignItems: 'flex-end', flex: 1 }}>
        <SkeletonBox width="50%" height={26} borderRadius={6} style={{ backgroundColor: '#4A5568' }} />
        <SkeletonBox width="40%" height={12} borderRadius={4} style={{ backgroundColor: '#4A5568' }} />
      </View>
    </View>
  </View>
);

export const SkeletonRowItem = () => (
  <View style={styles.rowSkeleton}>
    <View style={{ flex: 1, gap: 6 }}>
      <SkeletonBox width="40%" height={14} borderRadius={4} />
      <SkeletonBox width="70%" height={12} borderRadius={4} />
      <SkeletonBox width="50%" height={10} borderRadius={4} />
    </View>
    <View style={{ alignItems: 'flex-end', gap: 6 }}>
      <SkeletonBox width={70} height={14} borderRadius={4} />
      <SkeletonBox width={50} height={12} borderRadius={4} />
    </View>
  </View>
);

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  kpiSkeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E6E2',
    padding: 16,
    gap: 6,
    flex: 1,
  },
  summarySkeletonCard: {
    backgroundColor: '#3A4151',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: hairline,
    borderBottomColor: '#E7E6E2',
  },
});
