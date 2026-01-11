import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet, Dimensions } from 'react-native';

const AutoHideAlert = ({ title, description, variant = 'success', onHide }) => {
  const opacity = useRef(new Animated.Value(0)).current; // Shuruat mein transparent
  const translateY = useRef(new Animated.Value(-20)).current; // Shuruat mein thoda upar

  useEffect(() => {
    // 1. Alert ko dikhana (Fade In + Slide Down)
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. 3 Second baad hide karna
    const timer = setTimeout(() => {
      hideAlert();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const hideAlert = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide(); // Parent component ko batana ki ab ye hide ho chuka hai
    });
  };

  const config = {
    success: { bg: '#ECFDF5', border: '#10B981', text: '#065F46', icon: '✅' },
    error: { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', icon: '❌' },
    warning: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', icon: '⚠️' },
    info: { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', icon: 'ℹ️' },
  }[variant] || {
    bg: '#F3F4F6',
    border: '#D1D5DB',
    text: '#1F2937',
    icon: '🔔',
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacity,
          transform: [{ translateY: translateY }],
          backgroundColor: config.bg,
          borderColor: config.border,
        },
      ]}
    >
      <Text style={styles.iconText}>{config.icon}</Text>
      <View style={styles.content}>
        <Text style={[styles.title, { color: config.text }]}>{title}</Text>
        {description && (
          <Text style={[styles.description, { color: config.text }]}>
            {description}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50, // Screen ke upar dikhega
    left: 20,
    right: 20,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 999, // Sabse upar dikhega
    elevation: 10, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iconText: {
    fontSize: 20,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    marginTop: 2,
    opacity: 0.8,
  },
});

export default AutoHideAlert;
