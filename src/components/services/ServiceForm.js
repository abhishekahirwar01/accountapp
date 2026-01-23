import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { BASE_URL } from '../../config';
import { searchSACCodes, getSACByCode } from '../../lib/sacService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Form Schema with Zod
const formSchema = z.object({
  serviceName: z.string().min(2, 'Service name is required.'),
  amount: z.coerce
    .number()
    .min(0, 'Amount must be a positive number.')
    .default(0),
  sac: z.string().optional(),
});

export default function ServiceForm({
  service,
  onSuccess,
  onDelete,
  onServiceCreated,
  initialName,
  navigation,
  onClose,
  headerTitle,
  headerSubtitle,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // SAC Search States
  const [sacSuggestions, setSacSuggestions] = useState([]);
  const [showSacSuggestions, setShowSacSuggestions] = useState(false);
  const [showSacModal, setShowSacModal] = useState(false);
  const [isLoadingSacSuggestions, setIsLoadingSacSuggestions] = useState(false);
  const [sacSelectedFromDropdown, setSacSelectedFromDropdown] = useState(false);

  const sacInputRef = useRef(null);
  const isInitialLoad = useRef(true);

  // React Hook Form
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceName: service?.serviceName || initialName || '',
      amount: service?.amount || 0,
      sac: service?.sac || '',
    },
  });

  const sacValue = watch('sac');
  const amountValue = watch('amount');

  // Format currency for display
  const formatCurrency = value => {
    if (value === '' || value === null || value === undefined || value === 0)
      return '';

    // Handle both string and number inputs
    const numValue =
      typeof value === 'string'
        ? parseFloat(value.replace(/[^\d.]/g, ''))
        : value;

    if (isNaN(numValue) || numValue === 0) return '';

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  };

  // Parse currency back to number
  const parseCurrency = value => {
    if (!value) return 0;
    const raw = value.replace(/[^\d.]/g, '');
    return raw === '' ? 0 : parseFloat(raw);
  };

  // We'll use a simple numeric input pattern (stringified form value)

  // Debounced SAC search
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      if (service?.sac && service.sac.length >= 2) {
        return;
      }
    }

    if (sacSelectedFromDropdown) {
      setShowSacSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      if (sacValue && sacValue.length >= 2) {
        setIsLoadingSacSuggestions(true);
        const results = searchSACCodes(sacValue);
        setSacSuggestions(results);
        setShowSacSuggestions(true);
        setIsLoadingSacSuggestions(false);
      } else {
        setShowSacSuggestions(false);
        setSacSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [sacValue, sacSelectedFromDropdown, service]);

  const handleSACSelect = sac => {
    setValue('sac', sac.code);
    setShowSacSuggestions(false);
    setSacSelectedFromDropdown(true);
    setShowSacModal(false);
    Keyboard.dismiss();
  };

  // No separate display state: bind TextInput value to the form-controlled value

  const onSubmit = async values => {
    // Validate SAC code before submission
    if (values.sac && values.sac.trim() && !sacSelectedFromDropdown) {
      const validSAC = getSACByCode(values.sac.trim());
      if (!validSAC) {
        setError('sac', {
          type: 'manual',
          message:
            'Please select a valid SAC code from the dropdown suggestions.',
        });
        return;
      }
    }

    // Ensure amount is properly set
    if (!values.amount || values.amount === 0) {
      setError('amount', {
        type: 'manual',
        message: 'Please enter a valid amount.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const url = service
        ? `${BASE_URL}/api/services/${service._id}`
        : `${BASE_URL}/api/services`;

      const method = service ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.message || `Failed to ${service ? 'update' : 'create'} service.`,
        );
      }

      onSuccess(data.service || data);
      if (!service && onServiceCreated) {
        onServiceCreated();
      }

      if (navigation && typeof navigation.goBack === 'function') {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!service?._id || !onDelete) return;

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              const token = await AsyncStorage.getItem('token');
              if (!token) throw new Error('Authentication token not found.');

              const res = await fetch(
                `${BASE_URL}/api/services/${service._id}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              );

              if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to delete service.');
              }

              Alert.alert(
                'Success',
                `${service.serviceName} has been deleted.`,
              );
              try {
                onDelete(service);
              } catch (e) {}
              if (navigation && typeof navigation.goBack === 'function') {
                navigation.goBack();
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Something went wrong.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Service Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Service Name</Text>
          <Controller
            control={control}
            name="serviceName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.serviceName && styles.inputError]}
                placeholder="e.g. Annual Maintenance Contract"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          {errors.serviceName && (
            <Text style={styles.error}>{errors.serviceName.message}</Text>
          )}
        </View>

        {/* Amount Field - Fixed */}
        <View style={styles.field}>
          <Text style={styles.label}>Amount</Text>
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.amount && styles.inputError]}
                placeholder="Enter amount"
                keyboardType="decimal-pad"
                value={value === 0 || value === '0' ? '' : String(value ?? '')}
                onChangeText={text => {
                  const cleaned = text.replace(/[^\d.]/g, '');
                  const parts = cleaned.split('.');
                  if (parts.length > 2) return;
                  if (parts[1] && parts[1].length > 2) return;
                  onChange(cleaned === '' ? '' : cleaned);
                }}
                onBlur={onBlur}
              />
            )}
          />
          {errors.amount && (
            <Text style={styles.error}>{errors.amount.message}</Text>
          )}
        </View>

        {/* SAC Code Input */}
        <View style={styles.field}>
          <Text style={styles.label}>SAC Code</Text>
          <Controller
            control={control}
            name="sac"
            render={({ field: { onChange, onBlur, value } }) => (
              <>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    errors.sac && styles.inputError,
                  ]}
                  onPress={() => setShowSacModal(true)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {value || 'Select SAC code...'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                {/* SAC Selection Modal */}
                <Modal
                  visible={showSacModal}
                  animationType="slide"
                  transparent={true}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select SAC Code</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setShowSacModal(false);
                          }}
                        >
                          <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.searchContainer}>
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Search SAC codes (e.g., 9954)"
                          value={value}
                          onChangeText={text => {
                            onChange(text);
                            setSacSelectedFromDropdown(false);
                            if (text.length >= 2) {
                              setIsLoadingSacSuggestions(true);
                              const results = searchSACCodes(text);
                              setSacSuggestions(results);
                              setIsLoadingSacSuggestions(false);
                            } else {
                              setSacSuggestions([]);
                            }
                          }}
                          autoFocus={true}
                        />
                      </View>

                      {isLoadingSacSuggestions && (
                        <ActivityIndicator
                          style={styles.sacLoading}
                          size="small"
                        />
                      )}

                      <FlatList
                        data={sacSuggestions}
                        keyExtractor={item => item.code}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.sacItem}
                            onPress={() => handleSACSelect(item)}
                          >
                            <View style={styles.sacCodeContainer}>
                              <Text style={styles.sacCode}>{item.code}</Text>
                              <View style={styles.sacBadge}>
                                <Text style={styles.sacBadgeText}>SAC</Text>
                              </View>
                            </View>
                            <Text style={styles.sacDescription}>
                              {item.description}
                            </Text>
                          </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                          value && value.length >= 2 ? (
                            <View style={styles.emptyState}>
                              <Text style={styles.emptyText}>
                                No matching SAC codes found
                              </Text>
                              <Text style={styles.emptySubtext}>
                                Please check the code or enter manually
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.emptyState}>
                              <Text style={styles.emptyText}>
                                Type minimum 2 characters to search
                              </Text>
                            </View>
                          )
                        }
                        style={styles.sacList}
                        keyboardShouldPersistTaps="handled"
                      />
                    </View>
                  </View>
                </Modal>
              </>
            )}
          />
          {errors.sac && <Text style={styles.error}>{errors.sac.message}</Text>}
          <Text style={styles.helperText}>
            Start typing 2+ characters to see SAC code suggestions
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {service ? 'Save Changes' : 'Create Service'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Delete Button */}
        {service && onDelete && (
          <TouchableOpacity
            style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Delete Service</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    maxHeight: 600,
  },
  scrollContent: {
    // padding: 20,
    paddingBottom: 40,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 5,
  },
  helperText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  // Dropdown Styles
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#374151',
  },
  dropdownArrow: {
    color: '#6B7280',
    fontSize: 12,
  },
  // Modal Styles
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
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  // SAC List Styles
  sacList: {
    maxHeight: 400,
  },
  sacItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sacCodeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sacCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sacBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sacBadgeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  sacDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  sacLoading: {
    padding: 16,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});
