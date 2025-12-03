// components/ui/AlertDialog.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

export const AlertDialog = ({ open, onOpenChange, children }) => {
  return (
    <Modal
      visible={open}
      transparent={true}
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </Modal>
  );
};

export const AlertDialogContent = ({ children, style }) => {
  return (
    <View style={[styles.alertDialogContent, style]}>
      {children}
    </View>
  );
};

export const AlertDialogHeader = ({ children, style }) => {
  return (
    <View style={[styles.alertDialogHeader, style]}>
      {children}
    </View>
  );
};

export const AlertDialogTitle = ({ children, style }) => {
  return (
    <Text style={[styles.alertDialogTitle, style]}>
      {children}
    </Text>
  );
};

export const AlertDialogDescription = ({ children, style }) => {
  return (
    <Text style={[styles.alertDialogDescription, style]}>
      {children}
    </Text>
  );
};

export const AlertDialogFooter = ({ children, style }) => {
  return (
    <View style={[styles.alertDialogFooter, style]}>
      {children}
    </View>
  );
};

export const AlertDialogCancel = ({ children, onPress, style }) => {
  return (
    <TouchableOpacity style={[styles.alertDialogCancel, style]} onPress={onPress}>
      <Text style={styles.alertDialogCancelText}>{children}</Text>
    </TouchableOpacity>
  );
};

export const AlertDialogAction = ({ children, onPress, style }) => {
  return (
    <TouchableOpacity style={[styles.alertDialogAction, style]} onPress={onPress}>
      <Text style={styles.alertDialogActionText}>{children}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 8,
    maxWidth: 400,
    width: '100%',
  },
  alertDialogContent: {
    padding: 24,
  },
  alertDialogHeader: {
    marginBottom: 16,
  },
  alertDialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  alertDialogDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  alertDialogFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  alertDialogCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  alertDialogCancelText: {
    color: '#374151',
    fontWeight: '500',
  },
  alertDialogAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#dc2626',
  },
  alertDialogActionText: {
    color: '#fff',
    fontWeight: '500',
  },
});