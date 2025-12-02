import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

const { width } = Dimensions.get('window');

// Enhanced Animated Placeholder Component
const AnimatedPlaceholder = ({
  style,
  delay = 0,
  duration = 1500,
  animatedStyle = {},
  colorRange = ['#e5e7eb', '#f3f4f6'],
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [fadeAnim, delay, duration]);

  const backgroundColor = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: colorRange,
  });

  return (
    <Animated.View
      style={[
        styles.basePlaceholder,
        { backgroundColor },
        style,
        animatedStyle,
      ]}
    />
  );
};

// Table Skeleton Component
export function TableSkeleton({ rowCount = 5, columnCount = 6 }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        {/* Header skeleton */}
        <View style={styles.headerContainer}>
          <AnimatedPlaceholder
            style={styles.headerTitle}
            colorRange={['#e5e7eb', '#d1d5db']}
          />
          <AnimatedPlaceholder
            style={styles.headerButton}
            colorRange={['#e5e7eb', '#d1d5db']}
          />
        </View>

        {/* Table skeleton */}
        <View style={styles.tableContainer}>
          {/* Table header */}
          <View style={styles.tableHeaderRow}>
            {[...Array(columnCount)].map((_, i) => (
              <AnimatedPlaceholder
                key={`header-${i}`}
                style={styles.tableHeaderCell}
                colorRange={['#e5e7eb', '#d1d5db']}
              />
            ))}
          </View>

          {/* Table rows */}
          {[...Array(rowCount)].map((_, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.tableRow}>
              {[...Array(columnCount)].map((_, colIndex) => (
                <AnimatedPlaceholder
                  key={`cell-${rowIndex}-${colIndex}`}
                  style={[
                    styles.tableCell,
                    colIndex === 0 && styles.firstColumnWidth,
                  ]}
                  delay={rowIndex * 100}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// Mobile Skeleton Component
export function MobileTableSkeleton({ itemCount = 5 }) {
  return (
    <View style={styles.card}>
      <View style={styles.mobileCardContent}>
        {[...Array(itemCount)].map((_, i) => (
          <View key={`mobile-item-${i}`} style={styles.mobileItemCard}>
            <View style={styles.mobileHeader}>
              <AnimatedPlaceholder
                style={styles.mobileHeaderLeft}
                colorRange={['#e5e7eb', '#d1d5db']}
              />
              <AnimatedPlaceholder
                style={styles.mobileHeaderRight}
                colorRange={['#e5e7eb', '#d1d5db']}
              />
            </View>
            <View style={styles.mobileBody}>
              <AnimatedPlaceholder
                style={styles.mobileBodyLine1}
                delay={i * 50}
              />
              <AnimatedPlaceholder
                style={styles.mobileBodyLine2}
                delay={i * 50 + 20}
              />
              <AnimatedPlaceholder
                style={styles.mobileBodyLine3}
                delay={i * 50 + 40}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// Compact version for tighter spaces
export function CompactTableSkeleton() {
  return (
    <View style={[styles.card, styles.compactCard]}>
      <View style={styles.compactCardContent}>
        {[...Array(3)].map((_, i) => (
          <View key={`compact-${i}`} style={styles.compactRow}>
            <AnimatedPlaceholder style={styles.compactCell} />
            <AnimatedPlaceholder style={styles.compactCell} />
            <AnimatedPlaceholder style={styles.compactCell} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // General Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    margin: 10,
    width: width - 20,
  },
  basePlaceholder: {
    borderRadius: 4,
  },

  // Table Skeleton Styles
  cardContent: {
    padding: 24,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    height: 32,
    width: '25%',
  },
  headerButton: {
    height: 40,
    width: 120,
  },
  tableContainer: {
    // space-y-3 equivalent
  },
  tableHeaderRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tableHeaderCell: {
    height: 24,
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  tableCell: {
    height: 20,
    flex: 1,
  },
  firstColumnWidth: {
    width: '75%',
    flex: 0,
  },

  // Mobile Skeleton Styles
  mobileCardContent: {
    padding: 16,
    gap: 16,
  },
  mobileItemCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mobileHeaderLeft: {
    height: 20,
    width: '33.33%',
  },
  mobileHeaderRight: {
    height: 20,
    width: '25%',
  },
  mobileBody: {
    gap: 8,
  },
  mobileBodyLine1: {
    height: 16,
    width: '66.66%',
  },
  mobileBodyLine2: {
    height: 16,
    width: '50%',
  },
  mobileBodyLine3: {
    height: 16,
    width: '75%',
  },

  // Compact Styles
  compactCard: {
    margin: 8,
  },
  compactCardContent: {
    padding: 12,
    gap: 12,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 8,
  },
  compactCell: {
    height: 16,
    flex: 1,
  },
});
