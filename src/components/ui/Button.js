// components/ui/Button.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export const Button = ({
  children,
  onPress,
  variant = 'default',
  size = 'default',
  className,
  style,
  icon,
  ...props
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primary;
      case 'secondary':
        return styles.secondary;
      case 'outline':
        return styles.outline;
      case 'ghost':
        return styles.ghost;
      case 'destructive':
        return styles.destructive;
      default:
        return styles.default;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.sm;
      case 'lg':
        return styles.lg;
      default:
        return styles.defaultSize;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
      case 'destructive':
        return styles.textPrimary;
      case 'outline':
        return styles.textOutline;
      case 'ghost':
        return styles.textGhost;
      default:
        return styles.textDefault;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, getVariantStyle(), getSizeStyle(), style]}
      onPress={onPress}
      {...props}
    >
      <View style={styles.buttonContent}>
        {icon && <Icon name={icon} size={16} color={getTextStyle().color} style={styles.icon} />}
        <Text style={[styles.text, getTextStyle()]}>{children}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  default: {
    backgroundColor: '#f3f4f6',
  },
  primary: {
    backgroundColor: '#2563eb',
  },
  secondary: {
    backgroundColor: '#6b7280',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  destructive: {
    backgroundColor: '#dc2626',
  },
  defaultSize: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
  },
  sm: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
  },
  lg: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 48,
  },
  text: {
    fontWeight: '500',
    fontSize: 14,
  },
  textDefault: {
    color: '#1f2937',
  },
  textPrimary: {
    color: '#fff',
  },
  textOutline: {
    color: '#374151',
  },
  textGhost: {
    color: '#6b7280',
  },
  icon: {
    marginRight: 8,
  },
});

export default Button;