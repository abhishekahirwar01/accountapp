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

// Form Schema with Zod - UPDATED with costPrice and company
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
    costPrice: z.coerce
      .number()
      .min(0.01, 'Cost price must be greater than 0.'),
    company: z.string().min(1, 'Company is required.'),
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
  'piece',
  'kg',
  'litre',
  'box',
  'meter',
  'dozen',
  'pack',
];

export default function ProductForm({
  navigation,
  route,
  onSuccess: onSuccessProp,
  product: propProduct,
  initialName,
  onClose,
}) {
  const product = propProduct || route?.params?.product || null;
  const onSuccess = onSuccessProp || route?.params?.onSuccess || (() => {});

  const [existingUnits, setExistingUnits] = useState([]);
  const [companies, setCompanies] = useState([]);
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

  // Company Dropdown States
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');

  const hsnInputRef = useRef(null);
  const isInitialLoad = useRef(true);

  // Helper functions for unit defaults
  function getDefaultUnit(productUnit) {
    const standardUnits = STANDARD_UNITS.map(u => u.toLowerCase());
    const existingUnitNames = existingUnits.map(u => u.name?.toLowerCase());
    const lowerProductUnit = productUnit?.toLowerCase();

    if (
      !lowerProductUnit ||
      standardUnits.includes(lowerProductUnit) ||
      existingUnitNames.includes(lowerProductUnit)
    ) {
      return lowerProductUnit || 'piece';
    }
    return 'other';
  }

  function getDefaultCustomUnit(productUnit) {
    const standardUnits = STANDARD_UNITS.map(u => u.toLowerCase());
    const existingUnitNames = existingUnits.map(u => u.name?.toLowerCase());
    const lowerProductUnit = productUnit?.toLowerCase();

    if (
      !lowerProductUnit ||
      standardUnits.includes(lowerProductUnit) ||
      existingUnitNames.includes(lowerProductUnit)
    ) {
      return '';
    }
    return productUnit;
  }

  // Get selected company from AsyncStorage
  const getSelectedCompanyId = async () => {
    try {
      const selectedCompany = await AsyncStorage.getItem('selectedCompany');
      return selectedCompany || '';
    } catch (error) {
      console.error('Error getting selected company:', error);
      return '';
    }
  };

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
      name: product?.name || initialName || '',
      stocks: product?.stocks ?? 0,
      unit: getDefaultUnit(product?.unit),
      customUnit: getDefaultCustomUnit(product?.unit),
      hsn: product?.hsn || '',
      sellingPrice: product?.sellingPrice ?? 0,
      costPrice: product?.costPrice ?? 0,
      company: product
        ? typeof product.company === 'object' && product.company
          ? product.company._id
          : product.company
        : '',
    },
  });

  const hsnValue = watch('hsn');
  const unitValue = watch('unit');
  const companyValue = watch('company');

  // Fetch existing units and companies
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        // Fetch units
        const unitsRes = await fetch(`${BASE_URL}/api/units`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (unitsRes.ok) {
          const units = await unitsRes.json();
          setExistingUnits(units);
        }

        // Fetch companies - NEW: Added companies fetch
        const companiesRes = await fetch(`${BASE_URL}/api/companies/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (companiesRes.ok) {
          const companiesData = await companiesRes.json();
          setCompanies(companiesData);

          // Set default company for new products if not already set
          if (!product && !companyValue) {
            const selectedCompanyId = await getSelectedCompanyId();
            if (selectedCompanyId) {
              setValue('company', selectedCompanyId);
            } else if (companiesData.length === 1) {
              setValue('company', companiesData[0]._id);
            } else if (companiesData.length > 1) {
              setValue('company', companiesData[0]._id);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
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
    setShowHsnModal(false);
    setHsnSelectedFromDropdown(true);
    Keyboard.dismiss();
  };

  const handleUnitSelect = unit => {
    setValue('unit', unit);
    setShowUnitDropdown(false);
    setUnitSearchQuery('');
  };

  const handleCompanySelect = company => {
    setValue('company', company._id);
    setShowCompanyDropdown(false);
    setCompanySearchQuery('');
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

  // NEW: Currency formatting functions
  const formatCurrency = value => {
    if (value === '') return '';
    const num = Number(value);
    if (isNaN(num)) return value;

    const parts = value.split('.');
    const formatted = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(Number(parts[0]));

    return parts.length > 1 ? `₹${formatted}.${parts[1]}` : `₹${formatted}`;
  };

  const parseCurrency = value => {
    return value.replace(/[^\d.]/g, '');
  };

  const handleCurrencyInput = (fieldName, value, onChange) => {
    const raw = parseCurrency(value);
    const formatted = formatCurrency(raw);
    onChange(raw); // Store raw value for form submission
    return formatted; // Return formatted value for display
  };

  const handleCurrencyBlur = (fieldName, value, onChange) => {
    if (value) {
      const num = parseFloat(parseCurrency(value));
      if (!isNaN(num)) {
        const formatted = new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(num);
        onChange(num);
        return formatted;
      }
    }
    return value;
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
        unit: values.unit === 'other' ? values.customUnit : values.unit,
      };

      // Use secureFetch if available, otherwise use regular fetch
      const fetchFunction =
        typeof secureFetch === 'function' ? secureFetch : fetch;

      const res = await fetchFunction(url, {
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

      try {
        onSuccess(data.product || data);
      } catch (e) {
        console.log('onSuccess callback error:', e);
      }

      if (navigation && typeof navigation.goBack === 'function') {
        navigation.goBack();
      }

      if (onClose && typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;

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

              try {
                onSuccess();
              } catch (e) {}
              if (navigation && typeof navigation.goBack === 'function') {
                navigation.goBack();
              }
              if (onClose && typeof onClose === 'function') {
                onClose();
              }
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

  // Filter companies based on search
  const filteredCompanies = companies.filter(company =>
    company.businessName
      .toLowerCase()
      .includes(companySearchQuery.toLowerCase()),
  );

  // Get display name for selected company
  const getSelectedCompanyName = () => {
    if (!companyValue) return 'Select company...';
    const selectedCompany = companies.find(c => c._id === companyValue);
    return selectedCompany ? selectedCompany.businessName : 'Select company...';
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
        <Text style={styles.unitText}>
          {item.name === 'other'
            ? 'Other (Custom)'
            : item.name.charAt(0).toUpperCase() + item.name.slice(1)}
        </Text>
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

  // Render Company List
  const renderCompanyList = () => {
    return filteredCompanies.map(company => (
      <TouchableOpacity
        key={company._id}
        style={[
          styles.unitItem,
          companyValue === company._id && styles.unitItemSelected,
        ]}
        onPress={() => handleCompanySelect(company)}
      >
        <Text style={styles.unitText}>{company.businessName}</Text>
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
        {/* Company Selection - NEW */}
        <View style={styles.field}>
          <Text style={styles.label}>Company</Text>
          <Controller
            control={control}
            name="company"
            render={({ field: { value } }) => (
              <>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    errors.company && styles.inputError,
                  ]}
                  onPress={() => setShowCompanyDropdown(true)}
                >
                  <Text style={styles.dropdownButtonText}>
                    {getSelectedCompanyName()}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                {/* Company Selection Modal */}
                <Modal
                  visible={showCompanyDropdown}
                  animationType="slide"
                  transparent={true}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Company</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setShowCompanyDropdown(false);
                            setCompanySearchQuery('');
                          }}
                        >
                          <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Search Input */}
                      <View style={styles.searchContainer}>
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Search companies..."
                          value={companySearchQuery}
                          onChangeText={setCompanySearchQuery}
                        />
                      </View>

                      {/* Companies List */}
                      <ScrollView style={styles.unitsScrollView}>
                        {filteredCompanies.length > 0 ? (
                          renderCompanyList()
                        ) : (
                          <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                              No companies found
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  </View>
                </Modal>
              </>
            )}
          />
          {errors.company && (
            <Text style={styles.error}>{errors.company.message}</Text>
          )}
        </View>

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
          <Text style={styles.label}>Opening Stock (Qty)</Text>
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

        {/* Selling Price with Currency Formatting - UPDATED */}
        <View style={styles.field}>
          <Text style={styles.label}>Selling Price/Unit</Text>
          <Controller
            control={control}
            name="sellingPrice"
            render={({ field: { onChange, onBlur, value } }) => {
              const [displayValue, setDisplayValue] = useState(
                value ? formatCurrency(String(value)) : '',
              );

              return (
                <TextInput
                  style={[
                    styles.input,
                    errors.sellingPrice && styles.inputError,
                  ]}
                  placeholder="₹0"
                  value={displayValue}
                  onChangeText={text => {
                    const formatted = handleCurrencyInput(
                      'sellingPrice',
                      text,
                      onChange,
                    );
                    setDisplayValue(formatted);
                  }}
                  onBlur={() => {
                    const formatted = handleCurrencyBlur(
                      'sellingPrice',
                      displayValue,
                      onChange,
                    );
                    setDisplayValue(formatted || '');
                    onBlur();
                  }}
                  keyboardType="decimal-pad"
                />
              );
            }}
          />
          {errors.sellingPrice && (
            <Text style={styles.error}>{errors.sellingPrice.message}</Text>
          )}
        </View>

        {/* Cost Price with Currency Formatting - NEW */}
        <View style={styles.field}>
          <Text style={styles.label}>Cost Price/Unit</Text>
          <Controller
            control={control}
            name="costPrice"
            render={({ field: { onChange, onBlur, value } }) => {
              const [displayValue, setDisplayValue] = useState(
                value ? formatCurrency(String(value)) : '',
              );

              return (
                <TextInput
                  style={[styles.input, errors.costPrice && styles.inputError]}
                  placeholder="₹0"
                  value={displayValue}
                  onChangeText={text => {
                    const formatted = handleCurrencyInput(
                      'costPrice',
                      text,
                      onChange,
                    );
                    setDisplayValue(formatted);
                  }}
                  onBlur={() => {
                    const formatted = handleCurrencyBlur(
                      'costPrice',
                      displayValue,
                      onChange,
                    );
                    setDisplayValue(formatted || '');
                    onBlur();
                  }}
                  keyboardType="decimal-pad"
                />
              );
            }}
          />
          {errors.costPrice && (
            <Text style={styles.error}>{errors.costPrice.message}</Text>
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
                    {value === 'other'
                      ? 'Other (Custom)'
                      : value
                      ? value.charAt(0).toUpperCase() + value.slice(1)
                      : 'Select unit...'}
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

                      {/* Units List */}
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
                          value === 'other' && styles.unitItemSelected,
                          styles.otherUnitItem,
                        ]}
                        onPress={() => handleUnitSelect('other')}
                      >
                        <Text style={styles.unitText}>Other (Custom)</Text>
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
        {unitValue === 'other' && (
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
                          placeholder="Search HSN codes (e.g., 85)"
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
                          value && value.length >= 2 ? (
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
          <Text style={styles.helperText}>
            Start typing 2+ characters to see HSN code suggestions
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
    backgroundColor: '#f5f5f5',
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
  helperText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
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
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  hsnList: {
    maxHeight: 400,
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
  hsnLoading: {
    padding: 16,
  },
});
