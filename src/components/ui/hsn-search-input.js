import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { searchHSNCodes } from '../../lib/hsnProduct';

const { width } = Dimensions.get('window');

export const HSNSearchInput = ({ onSelect, placeholder }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);

  useEffect(() => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer for debounced search
    const timer = setTimeout(async () => {
      if (inputValue.length >= 2) {
        setIsLoading(true);
        try {
          const results = await searchHSNCodes(inputValue);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error('HSN search error:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setShowSuggestions(false);
        setSuggestions([]);
      }
    }, 300);

    setDebounceTimer(timer);

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [inputValue]);

  const handleSelect = hsn => {
    setInputValue(hsn.code);
    setShowSuggestions(false);
    onSelect(hsn);
  };

  const handleInputFocus = () => {
    if (inputValue.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const renderSuggestionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelect(item)}
    >
      <View style={styles.suggestionHeader}>
        <Text style={styles.hsnCode}>{item.code}</Text>
        <View style={styles.hsnBadge}>
          <Text style={styles.hsnBadgeText}>HSN</Text>
        </View>
      </View>
      <Text style={styles.hsnDescription} numberOfLines={2}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptySuggestions = () => (
    <View style={styles.emptySuggestions}>
      <Text style={styles.emptyText}>No matching HSN codes found.</Text>
      <Text style={styles.emptySubText}>
        Please check the code or enter manually.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          onFocus={handleInputFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
        />
        {isLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color="#6B7280" />
          </View>
        )}
      </View>

      <Modal
        visible={showSuggestions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuggestions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSuggestions(false)}
        >
          <View style={styles.suggestionsContainer}>
            {suggestions.length > 0 ? (
              <FlatList
                data={suggestions}
                renderItem={renderSuggestionItem}
                keyExtractor={item => item.code}
                style={styles.suggestionsList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              />
            ) : inputValue.length >= 2 && !isLoading ? (
              renderEmptySuggestions()
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 50,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    height: 36,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: 'white',
    color: '#111827',
  },
  loaderContainer: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -8 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  suggestionsContainer: {
    width: width - 40,
    maxHeight: 240,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'white',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  hsnCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  hsnBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hsnBadgeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  hsnDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  emptySuggestions: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

// Dark mode support can be added by using context or props for theme
export default HSNSearchInput;
