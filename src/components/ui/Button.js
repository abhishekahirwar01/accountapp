// components/ui/Button.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export const Button = ({
  children,
  onPress,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  className,
  style,
  icon,
  iconPosition = 'left',
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
      case 'secondary':
        return styles.textSecondary;
      default:
        return styles.textDefault;
    }
  };

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="small" color={getTextStyle().color} />;
    }

    return (
      <View style={[
        styles.buttonContent,
        iconPosition === 'right' && styles.buttonContentReverse
      ]}>
        {icon && iconPosition === 'left' && (
          <Icon 
            name={icon} 
            size={16} 
            color={getTextStyle().color} 
            style={[styles.icon, iconPosition === 'left' && styles.iconLeft]}
          />
        )}
        
        {typeof children === 'string' ? (
          <Text style={[styles.text, getTextStyle()]} numberOfLines={1}>
            {children}
          </Text>
        ) : (
          children
        )}
        
        {icon && iconPosition === 'right' && (
          <Icon 
            name={icon} 
            size={16} 
            color={getTextStyle().color} 
            style={[styles.icon, iconPosition === 'right' && styles.iconRight]}
          />
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyle(),
        getSizeStyle(),
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {renderContent()}
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
  buttonContentReverse: {
    flexDirection: 'row-reverse',
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
  disabled: {
    opacity: 0.5,
  },
  defaultSize: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    textAlign: 'center',
  },
  textDefault: {
    color: '#1f2937',
  },
  textPrimary: {
    color: '#ffffff',
  },
  textSecondary: {
    color: '#ffffff',
  },
  textOutline: {
    color: '#374151',
  },
  textGhost: {
    color: '#6b7280',
  },
  icon: {
    marginHorizontal: 4,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

// Export both named and default
export default Button;