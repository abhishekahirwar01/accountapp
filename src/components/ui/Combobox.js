import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Keyboard,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react-native';

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Enter Name',
  searchPlaceholder = 'Enter Name',
  noResultsText = 'No results found.',
  creatable = false,
  onCreate,
  disabled = false,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [isCreating, setIsCreating] = useState(false);

  const inputRef = useRef(null);

  // Get selected option
  const selectedOption = options.find(o => o.value === value);

  // Filter options based on search
  useEffect(() => {
    if (searchValue.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(o =>
        o.label.toLowerCase().includes(searchValue.toLowerCase()),
      );
      setFilteredOptions(filtered);
    }
  }, [searchValue, options]);

  // Reset search when modal opens/closes
  useEffect(() => {
    if (open) {
      setSearchValue('');
      // Focus input after a short delay to ensure modal is open
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Reset to selected value when closing
      setSearchValue(selectedOption?.label || '');
    }
  }, [open]);

  // Create new option
  const handleCreate = async () => {
    if (onCreate && searchValue.trim()) {
      setIsCreating(true);
      try {
        await onCreate(searchValue.trim());
        setSearchValue('');
        setOpen(false);
      } catch (error) {
        console.error('Error creating option:', error);
      } finally {
        setIsCreating(false);
      }
    }
  };

  // Select option
  const handleSelect = selectedValue => {
    onChange(selectedValue);
    setOpen(false);
    Keyboard.dismiss();
  };

  // Handle input change
  const handleInputChange = text => {
    setSearchValue(text);
  };

  // Check if we should show create option
  const showCreateOption =
    creatable &&
    searchValue.trim() &&
    !options.some(
      opt => opt.label.toLowerCase() === searchValue.trim().toLowerCase(),
    );

  const handleTriggerPress = () => {
    if (!disabled) {
      setOpen(true);
    }
  };

  return (
    <View style={[styles.container, className]}>
      {/* Trigger Button */}
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.disabled]}
        onPress={handleTriggerPress}
        disabled={disabled}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedOption && styles.placeholderText,
          ]}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <ChevronsUpDown size={16} color="#666" />
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownContainer}>
                {/* Search Input */}
                <View style={styles.searchContainer}>
                  <TextInput
                    ref={inputRef}
                    style={styles.searchInput}
                    placeholder={searchPlaceholder}
                    placeholderTextColor="#999"
                    value={searchValue}
                    onChangeText={handleInputChange}
                  />
                </View>

                {/* Options List */}
                <ScrollView
                  style={styles.optionsList}
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredOptions.map(item => (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.optionItem,
                        value === item.value && styles.selectedOption,
                      ]}
                      onPress={() => handleSelect(item.value)}
                    >
                      <Check
                        size={16}
                        color={value === item.value ? '#007AFF' : 'transparent'}
                        style={styles.checkIcon}
                      />
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

                  {/* No Results */}
                  {filteredOptions.length === 0 && !showCreateOption && (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>{noResultsText}</Text>
                    </View>
                  )}

                  {/* Create Option */}
                  {showCreateOption && (
                    <TouchableOpacity
                      style={styles.createOption}
                      onPress={handleCreate}
                      disabled={isCreating}
                    >
                      <PlusCircle size={16} color="#007AFF" />
                      <Text style={styles.createText}>
                        {isCreating ? 'Creating...' : `Create "${searchValue}"`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setOpen(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    minHeight: 44,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: '#F3F4F6',
  },
  triggerText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    fontSize: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedOption: {
    backgroundColor: '#F0F9FF',
  },
  checkIcon: {
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  selectedOptionText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  createOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
  },
  createText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 12,
    fontWeight: '500',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  closeButton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});
