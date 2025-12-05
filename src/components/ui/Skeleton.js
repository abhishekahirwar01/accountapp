import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

// Helper function for class names (simplified version of cn)
const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

export function Skeleton({ style, ...props }) {
  // Create animated value for pulse effect
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // Create the pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        style,
        {
          opacity: pulseAnim,
        },
      ]}
      {...props}
    />
  );
}

// Alternative simple version without animation
export function SimpleSkeleton({ style, animated = true, ...props }) {
  if (!animated) {
    return <View style={[styles.skeleton, style]} {...props} />;
  }

  return (
    <Animated.View style={[styles.animatedSkeleton, style]} {...props}>
      <Animated.View style={styles.shimmer} />
    </Animated.View>
  );
}

// Shimmer effect skeleton
export function ShimmerSkeleton({ style, ...props }) {
  const shimmerAnim = React.useRef(new Animated.Value(-1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-100, 400],
  });

  return (
    <View style={[styles.shimmerContainer, style]} {...props}>
      <Animated.View
        style={[
          styles.shimmerOverlay,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

// Pre-built skeleton components for common use cases
export function TextSkeleton({ width = '80%', height = 16, style }) {
  return <Skeleton style={[{ width, height, borderRadius: 4 }, style]} />;
}

export function CircleSkeleton({ size = 40, style }) {
  return <Skeleton style={[{ width: size, height: size, borderRadius: size / 2 }, style]} />;
}

export function CardSkeleton({ style }) {
  return (
    <View style={[styles.cardSkeleton, style]}>
      <Skeleton style={styles.cardHeader} />
      <View style={styles.cardContent}>
        <Skeleton style={{ width: '60%', height: 16, marginBottom: 8 }} />
        <Skeleton style={{ width: '40%', height: 14 }} />
      </View>
    </View>
  );
}

export function ListSkeleton({ count = 3, style }) {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.listItem}>
          <CircleSkeleton size={32} />
          <View style={styles.listContent}>
            <TextSkeleton width="70%" />
            <TextSkeleton width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function GridSkeleton({ columns = 2, count = 4, style }) {
  return (
    <View style={[styles.grid, { flexDirection: 'row', flexWrap: 'wrap' }, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.gridItem, { width: `${100 / columns}%` }]}>
          <Skeleton style={styles.gridCard} />
          <Skeleton style={{ width: '60%', height: 14, marginTop: 8 }} />
          <Skeleton style={{ width: '40%', height: 12, marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e5e7eb', // gray-200
    borderRadius: 6,
    overflow: 'hidden',
  },
  animatedSkeleton: {
    backgroundColor: '#f3f4f6', // gray-100
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#e5e7eb', // gray-200
  },
  shimmerContainer: {
    backgroundColor: '#f3f4f6', // gray-100
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  cardSkeleton: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  cardHeader: {
    height: 48,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cardContent: {
    padding: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  listContent: {
    flex: 1,
    marginLeft: 12,
  },
  grid: {
    gap: 12,
  },
  gridItem: {
    padding: 8,
  },
  gridCard: {
    height: 100,
    borderRadius: 8,
  },
});

// For dark mode support
export function DarkModeSkeleton({ style, darkMode = false, ...props }) {
  const skeletonStyle = darkMode 
    ? { backgroundColor: '#374151' } // gray-700
    : { backgroundColor: '#e5e7eb' }; // gray-200

  return <Skeleton style={[skeletonStyle, style]} {...props} />;
}

// Hook for using skeleton states
export function useSkeleton(isLoading, content, skeletonComponent) {
  if (isLoading) {
    return skeletonComponent || <Skeleton />;
  }
  return content;
}

// Example of how to use the cn function in React Native
const SkeletonWithClasses = ({ className, style, ...props }) => {
  // Convert className string to StyleSheet objects
  const parseClassName = (className) => {
    const styles = {};
    const classes = className.split(' ');
    
    classes.forEach(cls => {
      switch (cls) {
        case 'rounded-md':
          styles.borderRadius = 6;
          break;
        case 'rounded-lg':
          styles.borderRadius = 8;
          break;
        case 'rounded-xl':
          styles.borderRadius = 12;
          break;
        case 'rounded-full':
          styles.borderRadius = 9999;
          break;
        case 'w-full':
          styles.width = '100%';
          break;
        case 'h-full':
          styles.height = '100%';
          break;
        case 'w-4':
          styles.width = 16;
          break;
        case 'w-8':
          styles.width = 32;
          break;
        case 'w-12':
          styles.width = 48;
          break;
        case 'h-4':
          styles.height = 16;
          break;
        case 'h-8':
          styles.height = 32;
          break;
        case 'h-12':
          styles.height = 48;
          break;
        // Add more class mappings as needed
      }
    });
    
    return styles;
  };

  const classNameStyles = className ? parseClassName(className) : {};

  return <Skeleton style={[classNameStyles, style]} {...props} />;
};

export default Skeleton;