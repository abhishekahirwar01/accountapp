// components/profit-loss/HeaderSection.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage keys
const STORAGE_KEYS = {
  LAST_FROM_DATE: 'profit_loss_last_from_date',
  LAST_TO_DATE: 'profit_loss_last_to_date',
};

export const HeaderSection = ({
  from,
  to,
  minDate,
  maxDate,
  onFromChange,
  onToChange,
  onSetDefault,
  onApplyFilter,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Load saved dates from AsyncStorage on component mount
  useEffect(() => {
    const loadSavedDates = async () => {
      try {
        const [savedFromDate, savedToDate] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.LAST_FROM_DATE),
          AsyncStorage.getItem(STORAGE_KEYS.LAST_TO_DATE),
        ]);

        if (savedFromDate && savedToDate) {
          // Only set the dates if they're valid and within min/max range
          const fromDateValid = !minDate || savedFromDate >= minDate;
          const toDateValid = !maxDate || savedToDate <= maxDate;

          if (fromDateValid && toDateValid) {
            setLocalFrom(savedFromDate);
            setLocalTo(savedToDate);
            // Apply the saved dates immediately on load
            onApplyFilter(savedFromDate, savedToDate);
          }
        }
      } catch (error) {
        console.error('Error loading saved dates:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadSavedDates();
  }, []); // Only run on mount

  // Sync local state with props when they change externally
  useEffect(() => {
    setLocalFrom(from);
    setLocalTo(to);
    setHasUnsavedChanges(false);
  }, [from, to]);

  const handleFromChange = date => {
    setLocalFrom(date);
    setHasUnsavedChanges(true);
  };

  const handleToChange = date => {
    setLocalTo(date);
    setHasUnsavedChanges(true);
  };

  const handleApplyFilter = async () => {
    onFromChange(localFrom);
    onToChange(localTo);
    onApplyFilter(localFrom, localTo);

    // Save to AsyncStorage
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.LAST_FROM_DATE, localFrom],
        [STORAGE_KEYS.LAST_TO_DATE, localTo],
      ]);
    } catch (error) {
      console.error('Error saving dates:', error);
    }

    setHasUnsavedChanges(false);
  };

  const handleSetDefault = async () => {
    onSetDefault();

    // Reset local state to match the default dates
    const defaultFromDate = new Date();
    defaultFromDate.setDate(defaultFromDate.getDate() - 30);
    const defaultFrom = defaultFromDate.toISOString().split('T')[0];
    const defaultTo = new Date().toISOString().split('T')[0];

    setLocalFrom(defaultFrom);
    setLocalTo(defaultTo);
    setHasUnsavedChanges(false);

    // Save default dates to AsyncStorage
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.LAST_FROM_DATE, defaultFrom],
        [STORAGE_KEYS.LAST_TO_DATE, defaultTo],
      ]);
    } catch (error) {
      console.error('Error saving default dates:', error);
    }
  };

  const handleReset = () => {
    // Reset to current applied values
    setLocalFrom(from);
    setLocalTo(to);
    setHasUnsavedChanges(false);
  };

  const handleFromDatePickerChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowFromPicker(false);
    }
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setLocalFrom(dateString);
      setHasUnsavedChanges(true);
    }
  };

  const handleToDatePickerChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowToPicker(false);
    }
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setLocalTo(dateString);
      setHasUnsavedChanges(true);
    }
  };

  const isApplyDisabled = !localFrom || !localTo || !hasUnsavedChanges;

  // Format date for display (DD MMM, YYYY)
  const formatDisplayDate = dateString => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Profit & Loss Statement</Text>
          <Text style={styles.subtitle}>
            Overview of your business financial performance
          </Text>
        </View>

        {/* Date Controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.dateInputsRow}>
            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>From Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowFromPicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {localFrom || 'Select Date'}
                </Text>
                <MaterialCommunityIcons
                  name="calendar"
                  size={20}
                  color="#3B82F6"
                />
              </TouchableOpacity>
              {showFromPicker && (
                <DateTimePicker
                  value={localFrom ? new Date(localFrom) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleFromDatePickerChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>To Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowToPicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {localTo || 'Select Date'}
                </Text>
                <MaterialCommunityIcons
                  name="calendar"
                  size={20}
                  color="#3B82F6"
                />
              </TouchableOpacity>
              {showToPicker && (
                <DateTimePicker
                  value={localTo ? new Date(localTo) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleToDatePickerChange}
                  maximumDate={new Date()}
                />
              )}
            </View>
          </View>

          <View style={styles.buttonsRow}>
            {/* Apply Button */}
            <TouchableOpacity
              onPress={handleApplyFilter}
              disabled={isApplyDisabled}
              style={[
                styles.applyButton,
                isApplyDisabled && styles.disabledButton,
              ]}
            >
              <Text
                style={[
                  styles.applyButtonText,
                  isApplyDisabled && styles.disabledButtonText,
                ]}
              >
                Apply Filter
              </Text>
            </TouchableOpacity>

            {/* Reset Button (only show when there are unsaved changes) */}
            {hasUnsavedChanges && (
              <TouchableOpacity
                onPress={handleReset}
                style={styles.resetButton}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            )}

            {/* Last 30 Days Button */}
            <TouchableOpacity
              onPress={handleSetDefault}
              style={styles.defaultButton}
            >
              <Text style={styles.defaultButtonText}>Last 30 Days</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Selected Period & Unsaved Changes Indicator */}
      <View
        style={[
          styles.periodIndicator,
          hasUnsavedChanges ? styles.unsavedIndicator : styles.savedIndicator,
        ]}
      >
        <Text
          style={[
            styles.periodText,
            hasUnsavedChanges ? styles.unsavedText : styles.savedText,
          ]}
        >
          {hasUnsavedChanges ? (
            <>
              <Text style={styles.boldText}>Unsaved changes:</Text> {localFrom}{' '}
              to {localTo}
              {'\n'}
              <Text>Click "Apply Filter" to update</Text>
            </>
          ) : (
            <>
              Period:{' '}
              <Text style={styles.boldText}>{formatDisplayDate(from)}</Text> to{' '}
              <Text style={styles.boldText}>{formatDisplayDate(to)}</Text>
            </>
          )}
        </Text>
      </View>
    </View>
  );
};

// Utility functions to manage dates in AsyncStorage
export const ProfitLossStorage = {
  saveDates: async (fromDate, toDate) => {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.LAST_FROM_DATE, fromDate],
        [STORAGE_KEYS.LAST_TO_DATE, toDate],
      ]);
      return true;
    } catch (error) {
      console.error('Error saving dates:', error);
      return false;
    }
  },

  getDates: async () => {
    try {
      const [fromDate, toDate] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LAST_FROM_DATE),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_TO_DATE),
      ]);
      return { fromDate, toDate };
    } catch (error) {
      console.error('Error getting dates:', error);
      return { fromDate: null, toDate: null };
    }
  },

  clearDates: async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.LAST_FROM_DATE,
        STORAGE_KEYS.LAST_TO_DATE,
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing dates:', error);
      return false;
    }
  },
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginBottom: 16,
    minWidth: 200,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    // marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
  },
  controlsContainer: {
    flex: 1,
    minWidth: 300,
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    backgroundColor: '#ffffff',
    minHeight: 35,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  applyButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
    flex: 1,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
  disabledButtonText: {
    color: '#9ca3af',
  },
  resetButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    minHeight: 40,
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  defaultButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    minHeight: 40,
    justifyContent: 'center',
  },
  defaultButtonText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  periodIndicator: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  savedIndicator: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  unsavedIndicator: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  periodText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  savedText: {
    color: '#1e40af',
  },
  unsavedText: {
    color: '#92400e',
  },
  boldText: {
    fontWeight: '600',
  },
});
