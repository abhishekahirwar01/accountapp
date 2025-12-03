// components/profit-loss/ErrorState.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";

export const ErrorState = ({ error, onRetry }) => {
  const handleRefresh = () => {
    // In React Native, we can't use window.location.reload()
    // Instead, we can show an alert or use a different approach
    Alert.alert(
      "Refresh App",
      "Please manually close and reopen the app, or navigate back to refresh.",
      [
        { text: "OK", style: "default" },
        { text: "Try Again", style: "default", onPress: onRetry }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Error Icon */}
        <View style={styles.errorIconContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
        </View>
        
        <Text style={styles.title}>Error Loading Data</Text>
        
        <Text style={styles.description}>
          We encountered an issue while fetching your profit & loss data.
        </Text>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            onPress={onRetry}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          If the problem persists, please check your internet connection or contact support.
        </Text>
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
  errorIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: "#fee2e2",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 36,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: "100%",
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    textAlign: "center",
    lineHeight: 20,
  },
  buttonsContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  refreshButton: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 16,
  },
});