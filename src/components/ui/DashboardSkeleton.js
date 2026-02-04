import React from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';

// Shimmer Animation Component
const ShimmerPlaceholder = ({ width, height, style }) => {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#e2e8f0',
          borderRadius: 8,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Main Dashboard Skeleton Component
export const DashboardSkeleton = () => {
  return (
    <View style={styles.skeletonWrapper}>
      {/* KPI Cards Row 1 */}
      <View style={styles.kpiSkeletonRow}>
        <View style={styles.kpiSkeletonCard}>
          <ShimmerPlaceholder width={40} height={40} style={{ borderRadius: 8 }} />
          <ShimmerPlaceholder width="60%" height={16} style={{ marginTop: 12 }} />
          <ShimmerPlaceholder width="80%" height={24} style={{ marginTop: 8 }} />
        </View>
        <View style={styles.kpiSkeletonCard}>
          <ShimmerPlaceholder width={40} height={40} style={{ borderRadius: 8 }} />
          <ShimmerPlaceholder width="60%" height={16} style={{ marginTop: 12 }} />
          <ShimmerPlaceholder width="80%" height={24} style={{ marginTop: 8 }} />
        </View>
      </View>

      {/* KPI Cards Row 2 */}
      <View style={styles.kpiSkeletonRow}>
        <View style={styles.kpiSkeletonCard}>
          <ShimmerPlaceholder width={40} height={40} style={{ borderRadius: 8 }} />
          <ShimmerPlaceholder width="60%" height={16} style={{ marginTop: 12 }} />
          <ShimmerPlaceholder width="80%" height={24} style={{ marginTop: 8 }} />
        </View>
        <View style={styles.kpiSkeletonCard}>
          <ShimmerPlaceholder width={40} height={40} style={{ borderRadius: 8 }} />
          <ShimmerPlaceholder width="60%" height={16} style={{ marginTop: 12 }} />
          <ShimmerPlaceholder width="80%" height={24} style={{ marginTop: 8 }} />
        </View>
      </View>

      {/* Product Stock Skeleton */}
      <View style={styles.skeletonSection}>
        <View style={styles.skeletonSectionHeader}>
          <ShimmerPlaceholder width={120} height={20} />
          <ShimmerPlaceholder width={60} height={16} />
        </View>
        <View style={styles.skeletonProductList}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.skeletonProductItem}>
              <ShimmerPlaceholder 
                width={48} 
                height={48} 
                style={{ borderRadius: 8 }} 
              />
              <View style={styles.skeletonProductDetails}>
                <ShimmerPlaceholder width="70%" height={16} />
                <ShimmerPlaceholder 
                  width="50%" 
                  height={14} 
                  style={{ marginTop: 6 }} 
                />
              </View>
              <ShimmerPlaceholder 
                width={60} 
                height={28} 
                style={{ borderRadius: 6 }} 
              />
            </View>
          ))}
        </View>
      </View>

      {/* Recent Transactions Skeleton */}
      <View style={styles.skeletonSection}>
        <View style={styles.skeletonSectionHeader}>
          <ShimmerPlaceholder width={160} height={20} />
          <ShimmerPlaceholder width={70} height={16} />
        </View>
        <View style={styles.skeletonTransactionList}>
          {[1, 2, 3, 4].map((item) => (
            <View key={item} style={styles.skeletonTransactionItem}>
              <View style={styles.skeletonTransactionLeft}>
                <ShimmerPlaceholder 
                  width={40} 
                  height={40} 
                  style={{ borderRadius: 20 }} 
                />
                <View style={styles.skeletonTransactionInfo}>
                  <ShimmerPlaceholder width={120} height={16} />
                  <ShimmerPlaceholder 
                    width={80} 
                    height={14} 
                    style={{ marginTop: 6 }} 
                  />
                </View>
              </View>
              <View style={styles.skeletonTransactionRight}>
                <ShimmerPlaceholder width={70} height={18} />
                <ShimmerPlaceholder 
                  width={50} 
                  height={14} 
                  style={{ marginTop: 4 }} 
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonWrapper: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  kpiSkeletonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  kpiSkeletonCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  skeletonSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  skeletonSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonProductList: {
    gap: 12,
  },
  skeletonProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  skeletonProductDetails: {
    flex: 1,
  },
  skeletonTransactionList: {
    gap: 12,
  },
  skeletonTransactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  skeletonTransactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  skeletonTransactionInfo: {
    flex: 1,
  },
  skeletonTransactionRight: {
    alignItems: 'flex-end',
  },
});

export default DashboardSkeleton;