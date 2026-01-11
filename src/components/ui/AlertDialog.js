import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';

const AlertDialog = ({ visible, onClose, open, onOpenChange, children }) => {
  // Support both visible/onClose and open/onOpenChange APIs
  const isOpen = typeof open !== 'undefined' ? open : visible;
  const handleClose = onOpenChange ? () => onOpenChange(false) : onClose;

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop: Clicking outside closes the modal */}
        <Pressable style={styles.backdrop} onPress={handleClose} />

        {/* Dialog Box (Material 3 Surface) */}
        <View style={styles.content}>{children}</View>
      </View>
    </Modal>
  );
};

const AlertDialogHeader = ({ children }) => (
  <View style={styles.header}>{children}</View>
);

const AlertDialogTitle = ({ children }) => (
  <Text style={styles.title}>{children}</Text>
);

const AlertDialogDescription = ({ children }) => (
  <Text style={styles.description}>{children}</Text>
);

const AlertDialogFooter = ({ children }) => (
  <View style={styles.footer}>{children}</View>
);

// Blue/Grey Text-only Action Button (No border, no background)
const AlertDialogAction = ({ onPress, children, style }) => (
  <TouchableOpacity
    activeOpacity={0.6}
    style={[styles.textButton, style]}
    onPress={onPress}
  >
    <Text style={styles.actionText}>{children}</Text>
  </TouchableOpacity>
);

// Blue/Grey Text-only Cancel Button
const AlertDialogCancel = ({ onPress, children, style }) => (
  <TouchableOpacity
    activeOpacity={0.6}
    style={[styles.textButton, style]}
    onPress={onPress}
  >
    <Text style={styles.cancelText}>{children}</Text>
  </TouchableOpacity>
);

const AlertDialogContent = ({ children }) => <View>{children}</View>;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)', // Subtle dimming as per screenshot
  },
  content: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#EEF0F6', // Google's Material 3 surface color
    borderRadius: 28, // Extra rounded corners
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  header: {
    marginBottom: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '400', // Modern Android titles are less bold
    color: '#1B1B1F',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 16,
    color: '#44474E',
    lineHeight: 24,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Right aligned
    marginTop: 12,
    gap: 16, // Space between text buttons
  },
  textButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#3F51B5', // Indigo/Blue color from screenshots
    fontWeight: '600',
    fontSize: 15,
  },
  cancelText: {
    color: '#3F51B5', // Same blue color
    fontWeight: '600',
    fontSize: 15,
  },
});

export {
  AlertDialog,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
};
