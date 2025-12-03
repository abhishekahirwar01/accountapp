// components/ui/DropdownMenu.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

// DropdownMenu Root - FIXED: Self-contained state management
export const DropdownMenu = ({ children, open: propOpen, onOpenChange: propOnOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use props if provided, otherwise use internal state
  const open = propOpen !== undefined ? propOpen : internalOpen;
  const onOpenChange = propOnOpenChange !== undefined ? propOnOpenChange : setInternalOpen;

  return (
    <View style={styles.dropdownContainer}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { 
            open, 
            onOpenChange 
          });
        }
        return child;
      })}
    </View>
  );
};

// DropdownMenu Trigger - FIXED: Added proper event handling
export const DropdownMenuTrigger = ({ children, open, onOpenChange, style }) => {
  return (
    <TouchableOpacity 
      style={[styles.trigger, style]}
      onPress={() => {
        console.log('Trigger pressed, toggling dropdown');
        onOpenChange(!open);
      }}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
};

// DropdownMenu Content - COMPLETELY REWRITTEN for proper positioning
export const DropdownMenuContent = ({ 
  children, 
  open, 
  onOpenChange, 
  style 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (open) {
      console.log('Opening dropdown');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [open, fadeAnim]);

  if (!open) return null;

  return (
    <Modal
      transparent
      visible={open}
      animationType="none"
      onRequestClose={() => onOpenChange(false)}
    >
      <TouchableWithoutFeedback onPress={() => onOpenChange(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.content,
                style,
                {
                  opacity: fadeAnim,
                  position: 'absolute',
                  right: 20,
                  top: 100, // Adjust this based on your header height
                },
              ]}
            >
              <View style={styles.contentInner}>
                {children}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// DropdownMenuItem - SIMPLIFIED
export const DropdownMenuItem = ({ 
  children, 
  onPress, 
  disabled = false,
  style,
  textStyle 
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        disabled && styles.menuItemDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.menuItemText, disabled && styles.menuItemTextDisabled, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

// DropdownMenuCheckboxItem
export const DropdownMenuCheckboxItem = ({ 
  children, 
  checked = false,
  onPress,
  disabled = false,
  style 
}) => {
  return (
    <TouchableOpacity
      style={[styles.checkboxItem, disabled && styles.menuItemDisabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
    >
      <View style={styles.checkboxContainer}>
        {checked && (
          <Icon name="check" size={16} color="#3b82f6" style={styles.checkIcon} />
        )}
      </View>
      <Text style={[styles.menuItemText, disabled && styles.menuItemTextDisabled]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

// DropdownMenuRadioItem
export const DropdownMenuRadioItem = ({ 
  children, 
  checked = false,
  onPress,
  disabled = false,
  style 
}) => {
  return (
    <TouchableOpacity
      style={[styles.radioItem, disabled && styles.menuItemDisabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
    >
      <View style={styles.radioContainer}>
        {checked && (
          <View style={styles.radioDot} />
        )}
      </View>
      <Text style={[styles.menuItemText, disabled && styles.menuItemTextDisabled]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

// DropdownMenuLabel
export const DropdownMenuLabel = ({ children, style }) => {
  return (
    <View style={[styles.label, style]}>
      <Text style={styles.labelText}>{children}</Text>
    </View>
  );
};

// DropdownMenuSeparator
export const DropdownMenuSeparator = ({ style }) => {
  return <View style={[styles.separator, style]} />;
};

// DropdownMenuShortcut
export const DropdownMenuShortcut = ({ children, style }) => {
  return (
    <Text style={[styles.shortcut, style]}>
      {children}
    </Text>
  );
};

// DropdownMenuGroup
export const DropdownMenuGroup = ({ children, style }) => {
  return <View style={[styles.group, style]}>{children}</View>;
};

// DropdownMenuPortal
export const DropdownMenuPortal = ({ children }) => {
  return <>{children}</>;
};

// DropdownMenuSub
export const DropdownMenuSub = ({ children, open, onOpenChange }) => {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      {children}
    </DropdownMenu>
  );
};

// DropdownMenuSubTrigger
export const DropdownMenuSubTrigger = ({ children, onPress, style }) => {
  return (
    <TouchableOpacity
      style={[styles.subTrigger, style]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text style={styles.subTriggerText}>{children}</Text>
      <Icon name="chevron-right" size={16} color="#6b7280" />
    </TouchableOpacity>
  );
};

// DropdownMenuSubContent
export const DropdownMenuSubContent = ({ children, style }) => {
  return (
    <View style={[styles.subContent, style]}>
      {children}
    </View>
  );
};

// DropdownMenuRadioGroup
export const DropdownMenuRadioGroup = ({ children, value, onValueChange, style }) => {
  const handlePress = (newValue) => {
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <View style={[styles.radioGroup, style]}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            checked: child.props.value === value,
            onPress: () => handlePress(child.props.value),
          });
        }
        return child;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  dropdownContainer: {
    position: 'relative',
  },
  trigger: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 160,
    zIndex: 9999,
  },
  contentInner: {
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 40,
    backgroundColor: 'transparent',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  menuItemTextDisabled: {
    color: '#9ca3af',
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 40,
  },
  checkboxContainer: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkIcon: {
    margin: 0,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 40,
  },
  radioContainer: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  label: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
    marginHorizontal: 8,
  },
  shortcut: {
    marginLeft: 'auto',
    fontSize: 12,
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  group: {
    marginVertical: 4,
  },
  subTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 40,
    backgroundColor: 'transparent',
  },
  subTriggerText: {
    fontSize: 14,
    color: '#374151',
  },
  subContent: {
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  radioGroup: {
    marginVertical: 4,
  },
});

// Simple example that works
export const ExampleDropdownMenu = () => {
  return (
    <View style={{ padding: 20 }}>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <View style={{ 
            padding: 12, 
            backgroundColor: '#3b82f6', 
            borderRadius: 6,
            alignItems: 'center',
          }}>
            <Text style={{ color: '#fff', fontWeight: '500' }}>
              Open Menu
            </Text>
          </View>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent>
          <DropdownMenuItem onPress={() => console.log('Edit pressed')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="edit" size={16} color="#374151" style={{ marginRight: 8 }} />
              <Text>Edit</Text>
            </View>
          </DropdownMenuItem>
          
          <DropdownMenuItem onPress={() => console.log('Delete pressed')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="trash-2" size={16} color="#dc2626" style={{ marginRight: 8 }} />
              <Text style={{ color: '#dc2626' }}>Delete</Text>
            </View>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </View>
  );
};