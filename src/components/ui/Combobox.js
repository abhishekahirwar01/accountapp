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
  // To handle notches and status bar area
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Check,
  ChevronsUpDown,
  PlusCircle,
  ArrowLeft,
  X,
  Search, // Added Search icon import
} from 'lucide-react-native';

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Enter Name',
  searchPlaceholder = 'Search names...',
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

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      // Set the search value to the current selection label, or empty string
      setSearchValue(selectedOption?.label || '');
      // Focus input after a short delay
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Reset search value on close to ensure the trigger text is correct
      setSearchValue('');
    }
  }, [open, selectedOption]);

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

  // Clear search value
  const handleClearSearch = () => {
    setSearchValue('');
    inputRef.current?.focus();
  };

  // Close the modal
  const handleClose = () => {
    setOpen(false);
    Keyboard.dismiss();
  };

  // Check if we should show create option - FIXED LOGIC
  const showCreateOption =
    creatable &&
    searchValue.trim() &&
    !options.some(opt => 
      opt.label.toLowerCase().includes(searchValue.trim().toLowerCase())
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

      {/* Dropdown Modal (Full Screen) */}
      <Modal
        visible={open}
        transparent={false}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.modalContent}>
          {/* Dropdown Container (Full Screen) */}
          <View style={styles.dropdownContainer}>
            {/* Search Header/Input */}
            <View style={styles.searchHeader}>
              {/* Back Button */}
              <TouchableOpacity onPress={handleClose} style={styles.backButton}>
                <ArrowLeft size={24} color="#111827" />
              </TouchableOpacity>

              {/* Search Input Container */}
              <View style={styles.searchInputWrapper}>
                {/* Search Icon */}
                <Search size={20} color="#6B7280" style={styles.searchIcon} />

                <TextInput
                  ref={inputRef}
                  style={styles.fullScreenSearchInput}
                  placeholder={searchPlaceholder}
                  placeholderTextColor="#999"
                  value={searchValue}
                  onChangeText={handleInputChange}
                />

                {/* Clear Button */}
                {searchValue.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearSearch}
                    style={styles.clearButton}
                  >
                    <X size={20} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Options List */}
            <ScrollView
              style={styles.optionsListFullScreen}
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
          </View>
        </SafeAreaView>
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
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#6B7280',
  },
  // --- Modal Changes for Full Screen ---
  modalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background for the full screen
  },
  dropdownContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEFEF', 
    borderRadius: 20, 
    height: 40,
  },
  searchIcon: {
    marginLeft: 10, 
  },
  fullScreenSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
    
    paddingHorizontal: 8,
    color: '#111827',
  },
  clearButton: {
    padding: 8,
    marginLeft: 4,
    marginRight: 4,
  },
  optionsListFullScreen: {
    flex: 1, 
  },
  // --- Option List Styles ---
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
});