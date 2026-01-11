import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View, StyleSheet, Dimensions } from 'react-native';

const Snackbar = ({ title, actionLabel, onAction, visible, onHide, variant = 'info' }) => {
  const translateY = useRef(new Animated.Value(100)).current; // Screen ke niche chhupa hua

  useEffect(() => {
    if (visible) {
      // Niche se upar aana
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 5,
      }).start();

      // 4 second baad khud gayab hona (agar action click na ho)
      const timer = setTimeout(() => {
        hideSnackbar();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      hideSnackbar();
    }
  }, [visible]);

  const hideSnackbar = () => {
    Animated.timing(translateY, {
      toValue: 100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (onHide) onHide();
    });
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'error': return { bg: '#B00020', text: '#FFFFFF' }; // Material Red
      case 'success': return { bg: '#2E7D32', text: '#FFFFFF' }; // Material Green
      default: return { bg: '#323232', text: '#FFFFFF' }; // Standard Dark Grey
    }
  };

  const colors = getVariantStyle();

  if (!visible && translateY._value === 100) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          transform: [{ translateY: translateY }],
        },
      ]}
    >
      <Text style={[styles.text, { color: colors.text }]}>{title}</Text>
      
      {actionLabel && (
        <TouchableOpacity onPress={onAction} style={styles.actionButton}>
          <Text style={styles.actionText}>{actionLabel.toUpperCase()}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20, // Bottom se thoda upar
    left: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  text: {
    fontSize: 14,
    flex: 1,
    fontWeight: '400',
  },
  actionButton: {
    marginLeft: 16,
  },
  actionText: {
    color: '#BB86FC', // Material Purple color for action
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default Snackbar;