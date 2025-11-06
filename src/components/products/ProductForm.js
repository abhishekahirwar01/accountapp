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
import { searchHSNCodes, getHSNByCode } from '../../lib/hsnProduct';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Form Schema with Zod
const formSchema = z
  .object({
    name: z.string().min(2, 'Product name is required.'),
    stocks: z.coerce.number().min(0, 'Stock cannot be negative.').optional(),
    unit: z.string().min(1, 'Unit is required.').optional(),
    customUnit: z.string().optional(),
    hsn: z.string().optional(),
    sellingPrice: z.coerce
      .number()
      .min(0, 'Selling price cannot be negative.')
      .optional(),
  })
  .refine(
    data => {
      // If HSN is provided, it must be a valid HSN code
      if (data.hsn && data.hsn.trim()) {
        const validHSN = getHSNByCode(data.hsn.trim());
        return validHSN !== undefined;
      }
      return true;
    },
    {
      message: 'Please select a valid HSN code from the suggestions.',
      path: ['hsn'],
    },
  );

const STANDARD_UNITS = [
  'Piece',
  'Kg',
  'Litre',
  'Box',
  'Meter',
  'Dozen',
  'Pack',
];

export default function ProductForm({ navigation, route }) {
  const product = route?.params?.product || null;
  const onSuccess = route?.params?.onSuccess || (() => {});

  const [existingUnits, setExistingUnits] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // HSN Search States
  const [hsnSuggestions, setHsnSuggestions] = useState([]);
  const [showHsnSuggestions, setShowHsnSuggestions] = useState(false);
  const [showHsnModal, setShowHsnModal] = useState(false);
  const [hsnSearchQuery, setHsnSearchQuery] = useState('');
  const [isLoadingHsnSuggestions, setIsLoadingHsnSuggestions] = useState(false);
  const [focusedHsnIndex, setFocusedHsnIndex] = useState(-1);
  const [hsnSelectedFromDropdown, setHsnSelectedFromDropdown] = useState(false);

  // Unit Dropdown States
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState('');

  const hsnInputRef = useRef(null);
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
      name: product?.name || '',
      stocks: product?.stocks ?? 0,
      unit: getDefaultUnit(product?.unit),
      customUnit: getDefaultCustomUnit(product?.unit),
      hsn: product?.hsn || '',
      sellingPrice: product?.sellingPrice ?? 0,
    },
  });

  const hsnValue = watch('hsn');
  const unitValue = watch('unit');

  // Helper functions for unit defaults
  function getDefaultUnit(productUnit) {
    const existingUnitNames = existingUnits.map(u => u.name);
    if (
      !productUnit ||
      STANDARD_UNITS.includes(productUnit) ||
      existingUnitNames.includes(productUnit)
    ) {
      return productUnit || 'Piece';
    }
    return 'Other';
  }

  function getDefaultCustomUnit(productUnit) {
    const existingUnitNames = existingUnits.map(u => u.name);
    if (
      !productUnit ||
      STANDARD_UNITS.includes(productUnit) ||
      existingUnitNames.includes(productUnit)
    ) {
      return '';
    }
    return productUnit;
  }

  // Fetch existing units
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        const res = await fetch(`${BASE_URL}/api/units`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const units = await res.json();
          setExistingUnits(units);
        }
      } catch (error) {
        console.error('Failed to fetch units:', error);
      }
    };

    fetchUnits();
  }, []);

  // Debounced HSN search
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      if (product?.hsn && product.hsn.length >= 2) {
        return;
      }
    }

    if (hsnSelectedFromDropdown) {
      setShowHsnSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      if (hsnValue && hsnValue.length >= 2) {
        setIsLoadingHsnSuggestions(true);
        const results = searchHSNCodes(hsnValue);
        setHsnSuggestions(results);
        setShowHsnSuggestions(true);
        setIsLoadingHsnSuggestions(false);
      } else {
        setShowHsnSuggestions(false);
        setHsnSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [hsnValue, hsnSelectedFromDropdown, product]);

  const handleHSNSelect = hsn => {
    setValue('hsn', hsn.code);
    setShowHsnSuggestions(false);
    setHsnSelectedFromDropdown(true);
    Keyboard.dismiss();
  };

  const handleHSNInputFocus = () => {
    if (hsnValue && hsnValue.length >= 2) {
      setIsLoadingHsnSuggestions(true);
      const results = searchHSNCodes(hsnValue);
      setHsnSuggestions(results);
      setShowHsnSuggestions(true);
      setIsLoadingHsnSuggestions(false);
    } else {
      setShowHsnSuggestions(true);
    }
  };

  const handleHSNInputBlur = () => {
    setTimeout(() => {
      setShowHsnSuggestions(false);
    }, 200);
  };

  const handleUnitSelect = unit => {
    setValue('unit', unit);
    setShowUnitDropdown(false);
    setUnitSearchQuery('');
  };

  const handleDeleteUnit = async unitId => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this unit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) throw new Error('Authentication token not found.');

              const res = await fetch(`${BASE_URL}/api/units/${unitId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to delete unit');
              }

              // Refresh units
              const unitsRes = await fetch(`${BASE_URL}/api/units`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              if (unitsRes.ok) {
                const units = await unitsRes.json();
                setExistingUnits(units);
              }

              Alert.alert('Success', 'Unit deleted successfully');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ],
    );
  };

  const onSubmit = async values => {
    // Validate HSN code before submission
    if (values.hsn && values.hsn.trim() && !hsnSelectedFromDropdown) {
      const validHSN = getHSNByCode(values.hsn.trim());
      if (!validHSN) {
        setError('hsn', {
          type: 'manual',
          message:
            'Please select a valid HSN code from the dropdown suggestions.',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const url = product
        ? `${BASE_URL}/api/products/${product._id}`
        : `${BASE_URL}/api/products`;

      const method = product ? 'PUT' : 'POST';

      const payload = {
        ...values,
        unit: values.unit === 'Other' ? values.customUnit : values.unit,
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.message || `Failed to ${product ? 'update' : 'create'} product.`,
        );
      }

      onSuccess(data.product);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              const token = await AsyncStorage.getItem('token');
              const res = await fetch(
                `${BASE_URL}/api/products/${product._id}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                },
              );

              const data = await res.json();
              if (!res.ok)
                throw new Error(data.message || 'Failed to delete product.');

              onSuccess();
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  // Filter units based on search
  const filteredUnits = [
    ...STANDARD_UNITS.map(unit => ({ type: 'standard', name: unit })),
    ...existingUnits.map(unit => ({ type: 'custom', ...unit })),
  ].filter(unit =>
    unit.name.toLowerCase().includes(unitSearchQuery.toLowerCase()),
  );

  // Render HSN Suggestions
  const renderHsnSuggestions = () => {
    return hsnSuggestions.map((item, index) => (
      <TouchableOpacity
        key={item.code}
        style={[
          styles.hsnItem,
          index === focusedHsnIndex && styles.hsnItemFocused,
        ]}
        onPress={() => handleHSNSelect(item)}
      >
        <View style={styles.hsnCodeContainer}>
          <Text style={styles.hsnCode}>{item.code}</Text>
          <View style={styles.hsnBadge}>
            <Text style={styles.hsnBadgeText}>HSN</Text>
          </View>
        </View>
        <Text style={styles.hsnDescription}>{item.description}</Text>
      </TouchableOpacity>
    ));
  };

  // Render Unit List
  const renderUnitList = () => {
    return filteredUnits.map(item => (
      <TouchableOpacity
        key={`${item.type}-${item.name}`}
        style={[
          styles.unitItem,
          unitValue === item.name && styles.unitItemSelected,
        ]}
        onPress={() => handleUnitSelect(item.name)}
      >
        <Text style={styles.unitText}>{item.name}</Text>
        {item.type === 'custom' && (
          <TouchableOpacity
            onPress={() => handleDeleteUnit(item._id)}
            style={styles.deleteUnitButton}
          >
            <Text style={styles.deleteUnitText}>✕</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    ));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Product Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Product Name</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="e.g. Website Development"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          {errors.name && (
            <Text style={styles.error}>{errors.name.message}</Text>
          )}
        </View>

        {/* Stocks */}
        <View style={styles.field}>
          <Text style={styles.label}>Opening Stock</Text>
          <Controller
            control={control}
            name="stocks"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.stocks && styles.inputError]}
                placeholder="0"
                keyboardType="decimal-pad"
                value={String(value)}
                onChangeText={text => {
                  const cleaned = text.replace(/[^\d.]/g, '');
                  const parts = cleaned.split('.');
                  if (parts.length > 2) return;
                  onChange(cleaned);
                }}
                onBlur={onBlur}
              />
            )}
          />
          {errors.stocks && (
            <Text style={styles.error}>{errors.stocks.message}</Text>
          )}
        </View>

        {/* Selling Price */}
        <View style={styles.field}>
          <Text style={styles.label}>Selling Price</Text>
          <Controller
            control={control}
            name="sellingPrice"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.sellingPrice && styles.inputError]}
                placeholder="₹ 0"
                keyboardType="decimal-pad"
                value={String(value)}
                onChangeText={text => {
                  const cleaned = text.replace(/[^\d.]/g, '');
                  const parts = cleaned.split('.');
                  if (parts.length > 2) return;
                  onChange(cleaned);
                }}
                onBlur={onBlur}
              />
            )}
          />
          {errors.sellingPrice && (
            <Text style={styles.error}>{errors.sellingPrice.message}</Text>
          )}
        </View>

        {/* Unit Selection */}
        <View style={styles.field}>
          <Text style={styles.label}>Unit</Text>
          <Controller
            control={control}
            name="unit"
            render={({ field: { value } }) => (
              <>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    errors.unit && styles.inputError,
                  ]}
                  onPress={() => setShowUnitDropdown(true)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {value === 'Other'
                      ? 'Other (Custom)'
                      : value || 'Select unit...'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                {/* Unit Selection Modal */}
                <Modal
                  visible={showUnitDropdown}
                  animationType="slide"
                  transparent={true}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Unit</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setShowUnitDropdown(false);
                            setUnitSearchQuery('');
                          }}
                        >
                          <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Search Input */}
                      <View style={styles.searchContainer}>
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Search units..."
                          value={unitSearchQuery}
                          onChangeText={setUnitSearchQuery}
                        />
                      </View>

                      {/* Units List - Using ScrollView instead of FlatList */}
                      <ScrollView style={styles.unitsScrollView}>
                        {filteredUnits.length > 0 ? (
                          renderUnitList()
                        ) : (
                          <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No units found</Text>
                          </View>
                        )}
                      </ScrollView>

                      {/* Other Option */}
                      <TouchableOpacity
                        style={[
                          styles.unitItem,
                          value === 'Other' && styles.unitItemSelected,
                          styles.otherUnitItem,
                        ]}
                        onPress={() => handleUnitSelect('Other')}
                      >
                        <Text style={styles.unitText}>Other</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              </>
            )}
          />
          {errors.unit && (
            <Text style={styles.error}>{errors.unit.message}</Text>
          )}
        </View>

        {/* Custom Unit Input */}
        {unitValue === 'Other' && (
          <View style={styles.field}>
            <Text style={styles.label}>Custom Unit</Text>
            <Controller
              control={control}
              name="customUnit"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.customUnit && styles.inputError]}
                  placeholder="Enter custom unit"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />
            {errors.customUnit && (
              <Text style={styles.error}>{errors.customUnit.message}</Text>
            )}
          </View>
        )}

        {/* HSN Code Input */}
        <View style={styles.field}>
          <Text style={styles.label}>HSN Code</Text>
          <Controller
            control={control}
            name="hsn"
            render={({ field: { onChange, onBlur, value } }) => (
              <>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    errors.hsn && styles.inputError,
                  ]}
                  onPress={() => setShowHsnModal(true)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {value || 'Select HSN code...'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                {/* HSN Selection Modal */}
                <Modal
                  visible={showHsnModal}
                  animationType="slide"
                  transparent={true}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select HSN Code</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setShowHsnModal(false);
                            setHsnSearchQuery('');
                          }}
                        >
                          <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.searchContainer}>
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Search HSN codes..."
                          value={value}
                          onChangeText={text => {
                            onChange(text);
                            if (text.length >= 2) {
                              setIsLoadingHsnSuggestions(true);
                              const results = searchHSNCodes(text);
                              setHsnSuggestions(results);
                              setIsLoadingHsnSuggestions(false);
                            } else {
                              setHsnSuggestions([]);
                            }
                          }}
                        />
                      </View>

                      {isLoadingHsnSuggestions && (
                        <ActivityIndicator
                          style={styles.hsnLoading}
                          size="small"
                        />
                      )}

                      <FlatList
                        data={hsnSuggestions}
                        keyExtractor={item => item.code}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.hsnItem}
                            onPress={() => {
                              handleHSNSelect(item);
                              setShowHsnModal(false);
                            }}
                          >
                            <View style={styles.hsnCodeContainer}>
                              <Text style={styles.hsnCode}>{item.code}</Text>
                              <View style={styles.hsnBadge}>
                                <Text style={styles.hsnBadgeText}>HSN</Text>
                              </View>
                            </View>
                            <Text style={styles.hsnDescription}>
                              {item.description}
                            </Text>
                          </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                          value.length >= 2 ? (
                            <View style={styles.emptyState}>
                              <Text style={styles.emptyText}>
                                No matching HSN codes found
                              </Text>
                              <Text style={styles.emptySubtext}>
                                Try a different search term
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
                        style={styles.hsnList}
                        keyboardShouldPersistTaps="handled"
                      />
                    </View>
                  </View>
                </Modal>
              </>
            )}
          />
          {errors.hsn && <Text style={styles.error}>{errors.hsn.message}</Text>}
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
              {product ? 'Save Changes' : 'Create Product'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Delete Button */}
        {product && (
          <TouchableOpacity
            style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Delete Product</Text>
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  error: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
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
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownArrow: {
    color: '#666',
    fontSize: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  // modalContent: {
  //   backgroundColor: 'white',
  //   borderRadius: 12,
  //   maxHeight: '80%',
  // },
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
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  unitsScrollView: {
    maxHeight: 300,
  },
  unitItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  otherUnitItem: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
  },
  unitText: {
    fontSize: 16,
    color: '#333',
  },
  deleteUnitButton: {
    padding: 4,
  },
  deleteUnitText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },

  hsnList: {
    maxHeight: 400,
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  // Update modal styles
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '80%',
    width: '100%',
  },
  hsnItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  hsnCodeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hsnCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  hsnBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hsnBadgeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  hsnDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
});
