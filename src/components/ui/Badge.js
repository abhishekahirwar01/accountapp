import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// Style mappings for different variants
const badgeStyles = {
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999, // Full rounded
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  variants: {
    default: {
      borderColor: 'transparent',
      backgroundColor: '#007AFF', // primary color
    },
    secondary: {
      borderColor: 'transparent',
      backgroundColor: '#6B7280', // secondary color
    },
    destructive: {
      borderColor: 'transparent',
      backgroundColor: '#DC2626', // destructive color
    },
    outline: {
      borderColor: '#D1D5DB', // outline color
      backgroundColor: 'transparent',
    }
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    variants: {
      default: {
        color: '#FFFFFF', // primary-foreground
      },
      secondary: {
        color: '#FFFFFF', // secondary-foreground
      },
      destructive: {
        color: '#FFFFFF', // destructive-foreground
      },
      outline: {
        color: '#111827', // foreground
      }
    }
  }
};

const Badge = ({ 
  children, 
  variant = 'default', 
  style, 
  textStyle, 
  onPress,
  ...props 
}) => {
  // Get styles based on variant
  const variantStyle = badgeStyles.variants[variant] || badgeStyles.variants.default;
  const textVariantStyle = badgeStyles.text.variants[variant] || badgeStyles.text.variants.default;
  
  const Container = onPress ? TouchableOpacity : View;
  
  return (
    <Container
      style={[
        badgeStyles.base,
        variantStyle,
        style,
      ]}
      onPress={onPress}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text style={[
          badgeStyles.text,
          textVariantStyle,
          textStyle
        ]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Container>
  );
};

export { Badge };