import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';

const CustomDropdown = ({
  items,
  value,
  onChange,
  placeholder = 'Select...',
  style,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedItem = items.find(item => item.value === value);

  // Custom render for modal content to match ProductForm style
  const renderModalContent = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select</Text>
          <TouchableOpacity onPress={() => setIsOpen(false)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView>
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.value || index}
              style={[
                styles.option,
                value === item.value && styles.selectedOption,
              ]}
              onPress={() => {
                onChange(item.value);
                setIsOpen(false);
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  value === item.value && styles.selectedOptionText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          disabled && styles.disabled,
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
      >
        <Text
          style={[
            styles.dropdownButtonText,
            !selectedItem && styles.placeholderText,
          ]}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        {renderModalContent()}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
  },
  disabled: {
    backgroundColor: '#f5f5f5',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    color: '#666',
    fontSize: 14,
    marginLeft: 8,
  },
  
  // Modal styles matching ProductForm
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  option: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedOption: {
    backgroundColor: '#f0f8ff',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default CustomDropdown;