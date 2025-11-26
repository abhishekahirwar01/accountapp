import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Card, useTheme } from 'react-native-paper';

// --- Animated Shimmering View Component ---
const ShimmeringView = ({ style, children }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Defines the pulse animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [animatedValue]);

  // Interpolate the animated value to range between 0.5 and 1.0 opacity
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1.0],
  });

  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
};

// --- Helper Component for Skeleton Block ---
const SkeletonBlock = ({ width, height, isCircle, style, theme }) => {
  return (
    <View style={style}>
      <ShimmeringView
        style={[
          styles.skeleton,
          {
            width: width,
            height: height,
            backgroundColor: theme.colors.surfaceVariant,
          },
          isCircle && styles.skeletonCircle,
        ]}
      />
    </View>
  );
};

// --- 1. KpiSkeleton (Key Performance Indicator Cards) ---
export function KpiSkeleton() {
  const theme = useTheme();

  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} style={styles.card}>
          <Card.Content>
            {/* CardHeader (Title and Icon placeholders) */}
            <View style={styles.cardHeader}>
              <SkeletonBlock width="66%" height={16} theme={theme} />
              <SkeletonBlock
                width={16}
                height={16}
                isCircle={true}
                theme={theme}
              />
            </View>

            {/* Value placeholder (h-8, w-1/2) */}
            <SkeletonBlock
              width="50%"
              height={32}
              theme={theme}
              style={{ marginBottom: 8 }}
            />

            {/* Subtitle placeholder (h-3, w-1/3) */}
            <SkeletonBlock width="33%" height={12} theme={theme} />
          </Card.Content>
        </Card>
      ))}
    </View>
  );
}

// --- 2. ProductStockSkeleton ---
export function ProductStockSkeleton() {
  const theme = useTheme();

  return (
    <Card style={styles.card}>
      <Card.Content>
        {/* Title placeholder (h-6, w-1/4) */}
        <SkeletonBlock
          width="25%"
          height={24}
          theme={theme}
          style={{ marginBottom: 16 }}
        />

        {/* Chart placeholder (h-40) */}
        <SkeletonBlock width="100%" height={160} theme={theme} />
      </Card.Content>
    </Card>
  );
}

// --- 3. RecentTransactionsSkeleton ---
export function RecentTransactionsSkeleton() {
  const theme = useTheme();

  return (
    <Card style={styles.card}>
      <Card.Content>
        {/* Title placeholder (h-6, w-1/3) */}
        <SkeletonBlock
          width="33%"
          height={24}
          theme={theme}
          style={{ marginBottom: 16 }}
        />

        {/* List items (space-y-3) */}
        <View style={styles.spaceY}>
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} width="100%" height={48} theme={theme} />
          ))}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  // Grid container mimics the gap-4 and flex-wrap layout
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  // Card styles for grid items
  card: {
    flex: 1,
    minWidth: '45%', // Ensures at least 2 cards per row on wider screens
    margin: 4, // Small margin for visual separation within the grid
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  // Base style for the actual skeleton placeholder color blocks
  skeleton: {
    borderRadius: 4,
  },
  skeletonCircle: {
    borderRadius: 8, // Half of 16px height/width
  },
  // Mimics space-y-3 (12 is 3 * 4)
  spaceY: {
    gap: 12,
  },
});
