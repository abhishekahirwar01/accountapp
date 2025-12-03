// components/profit-loss/LoadingState.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";

export const LoadingState = () => {
  // Animation for skeleton loader
  const pulseAnim = new Animated.Value(1);

  React.useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Spinner */}
        <ActivityIndicator size="large" color="#3b82f6" />
        
        {/* Loading text */}
        <Text style={styles.loadingText}>Loading Profit & Loss Statement...</Text>
        <Text style={styles.subText}>
          Please wait while we fetch your financial data
        </Text>

        {/* Skeleton loader for better UX */}
        <View style={styles.skeletonContainer}>
          <Animated.View
            style={[
              styles.skeletonLine,
              { opacity: pulseAnim }
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonLine,
              styles.skeletonLineMedium,
              { opacity: pulseAnim }
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonLine,
              styles.skeletonLineShort,
              { opacity: pulseAnim }
            ]}
          />
          
          {/* Additional skeleton cards */}
          <View style={styles.skeletonCardsContainer}>
            <Animated.View
              style={[
                styles.skeletonCard,
                { opacity: pulseAnim }
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonCard,
                { opacity: pulseAnim }
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 400,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
  subText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 32,
  },
  skeletonContainer: {
    width: "100%",
    marginTop: 24,
    gap: 12,
  },
  skeletonLine: {
    width: "100%",
    height: 16,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
  },
  skeletonLineMedium: {
    width: "75%",
    alignSelf: "center",
  },
  skeletonLineShort: {
    width: "50%",
    alignSelf: "center",
  },
  skeletonCardsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  skeletonCard: {
    flex: 1,
    height: 80,
    backgroundColor: "#e5e7eb",
    borderRadius: 12,
  },
});