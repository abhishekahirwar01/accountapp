import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { searchSACCodes } from '../../lib/sacService';

export function SACSearchInput({ onSelect, placeholder }) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (inputValue.length >= 2) {
        setIsLoading(true);
        try {
          const results = await searchSACCodes(inputValue);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error('SAC search error:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setShowSuggestions(false);
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleSelect = sac => {
    setInputValue(sac.code);
    setShowSuggestions(false);
    onSelect(sac);
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
        <Text style={styles.sacCode}>{item.code}</Text>
        <View style={styles.sacBadge}>
          <Text style={styles.sacBadgeText}>SAC</Text>
        </View>
      </View>
      <Text style={styles.sacDescription} numberOfLines={2}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          onFocus={() => {
            if (inputValue.length >= 2 && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
        />
        {isLoading && (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color="#6b7280" />
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
                showsVerticalScrollIndicator={false}
              />
            ) : inputValue.length >= 2 && !isLoading ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>
                  No matching SAC codes found.
                </Text>
                <Text style={styles.noResultsSubtext}>
                  Please check the code or enter manually.
                </Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = {
  container: {
    position: 'relative',
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    height: 36,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: 'white',
    color: '#374151',
  },
  loader: {
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
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 240,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  suggestionsList: {
    maxHeight: 240,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  sacCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  sacBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  sacBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6b7280',
  },
  sacDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  noResults: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
};
