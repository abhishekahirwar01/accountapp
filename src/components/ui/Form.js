// components/ui/Form.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const FormLabel = ({ children, style }) => (
  <Text style={[styles.label, style]}>{children}</Text>
);

export const FormMessage = ({ children, style }) => (
  <Text style={[styles.message, style]}>{children}</Text>
);

export const FormField = ({ children, style }) => (
  <View style={[styles.field, style]}>{children}</View>
);

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  message: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
  field: {
    marginBottom: 16,
  },
});