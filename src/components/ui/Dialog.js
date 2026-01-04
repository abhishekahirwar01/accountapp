// components/ui/Dialog.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export const Dialog = ({ open, onOpenChange, children }) => {
  return (
    <Modal
      visible={open}
      transparent={true}
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          
          <ScrollView style={styles.scrollView}>
            <TouchableOpacity
            style={styles.closeButton}
            onPress={() => onOpenChange(false)}
          >
            <Icon name="x" size={20} color="#6b7280" />
          </TouchableOpacity>
          {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export const DialogContent = ({ children, style, className }) => {
  return <View style={[styles.dialogContent, style]}>{children}</View>;
};

export const DialogHeader = ({ children, style }) => {
  return <View style={[styles.dialogHeader, style]}>{children}</View>;
};

export const DialogTitle = ({ children, style }) => {
  return <Text style={[styles.dialogTitle, style]}>{children}</Text>;
};

export const DialogDescription = ({ children, style }) => {
  return <Text style={[styles.dialogDescription, style]}>{children}</Text>;
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
    maxWidth: 640,
    width: '100%',
    maxHeight: '100%',
    // minHeight: '90%',
    position: 'relative',
  },
  scrollView: {
    maxHeight: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  dialogContent: {
    padding: 24,
  },
  dialogHeader: {
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  dialogDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
});
