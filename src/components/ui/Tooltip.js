import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';

// Lightweight Tooltip primitives for React Native. API mirrors the web utility used in columns:
// - TooltipProvider: simple wrapper (keeps parity with web API)
// - TooltipTrigger: simple touchable wrapper (you can also use your own Touchable)
// - TooltipContent: Modal-based content with a scrollable area and backdrop handling

export const TooltipProvider = ({ children }) => {
  return <>{children}</>;
};

export const TooltipTrigger = ({ children, onPress, disabled }) => {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
};

export const TooltipContent = ({ visible, onClose, children, title }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.centered} pointerEvents="box-none">
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{title || 'Details'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollInner}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  centered: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 80 : 80,
    left: 16,
    right: 16,
    bottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxHeight: '86%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  closeBtn: { padding: 6 },
  closeText: { fontSize: 16, color: '#374151' },
  scroll: { paddingHorizontal: 12, paddingVertical: 8 },
  scrollInner: { paddingBottom: 28 },
});

export default {
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
};
