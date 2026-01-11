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
    costPrice: z.coerce
      .number()
      .min(0.01, 'Cost price must be greater than 0.'),
    company: z.string().min(1, 'Company is required.'),
  })
  .refine(
    data => {
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
  hideHeader = false,
  title,
  subtitle,
}) {
  const product = propProduct || route?.params?.product || null;
  const onSuccess = onSuccessProp || route?.params?.onSuccess || (() => {});

  const [existingUnits, setExistingUnits] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // HSN Search States
  const [hsnSuggestions, setHsnSuggestions] = useState([]);
  const [showHsnModal, setShowHsnModal] = useState(false);
  const [isLoadingHsnSuggestions, setIsLoadingHsnSuggestions] = useState(false);
  const [hsnSelectedFromDropdown, setHsnSelectedFromDropdown] = useState(false);

  // Unit Dropdown States
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState('');

  // Company Dropdown States
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');

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

  const getSelectedCompanyId = async () => {
    try {
      const selectedCompany = await AsyncStorage.getItem('selectedCompany');
      return selectedCompany || '';
    } catch (error) {
      console.error('Error getting selected company:', error);
      return '';
    }
  };

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        const unitsRes = await fetch(`${BASE_URL}/api/units`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (unitsRes.ok) {
          const units = await unitsRes.json();
          setExistingUnits(units);
        }

        const companiesRes = await fetch(`${BASE_URL}/api/companies/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (companiesRes.ok) {
          const companiesData = await companiesRes.json();
          setCompanies(companiesData);

          if (!product && !companyValue) {
            const selectedCompanyId = await getSelectedCompanyId();
            if (selectedCompanyId) {
              setValue('company', selectedCompanyId);
            } else if (companiesData.length > 0) {
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

  const handleHSNSelect = hsn => {
    setValue('hsn', hsn.code);
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

  // Currency Utils
  const formatCurrency = value => {
    if (value === '' || value == null) return '';
    const num = Number(value);
    if (isNaN(num)) return value;
    const parts = String(value).split('.');
    const formatted = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(Number(parts[0]));
    return parts.length > 1 ? `₹${formatted}.${parts[1]}` : `₹${formatted}`;
  };

  const parseCurrency = value => value.replace(/[^\d.]/g, '');

  const handleCurrencyInput = (onChange, value) => {
    const raw = parseCurrency(value);
    onChange(raw);
    return formatCurrency(raw);
  };

  const onSubmit = async values => {
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const url = product
        ? `${BASE_URL}/api/products/${product._id}`
        : `${BASE_URL}/api/products`;
      const method = product ? 'PUT' : 'POST';

      const payload = {
        ...values,
        unit: values.unit === 'other' ? values.customUnit : values.unit,
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
      if (!res.ok) throw new Error(data.message || 'Failed to save product');

      onSuccess(data.product || data);
      if (onClose) onClose();
      else if (navigation) navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Confirm Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsDeleting(true);
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${BASE_URL}/api/products/${product._id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              onSuccess();
              if (onClose) onClose();
              else if (navigation) navigation.goBack();
            }
          } catch (error) {
            Alert.alert('Error', error.message);
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  const filteredUnits = [
    ...STANDARD_UNITS.map(unit => ({ type: 'standard', name: unit })),
    ...existingUnits.map(unit => ({ type: 'custom', ...unit })),
  ].filter(unit =>
    unit.name.toLowerCase().includes(unitSearchQuery.toLowerCase()),
  );

  const filteredCompanies = companies.filter(company =>
    company.businessName
      .toLowerCase()
      .includes(companySearchQuery.toLowerCase()),
  );

  return (
    <View
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >

      <ScrollView>
      {/* {!hideHeader && (
        <View style={styles.headerRow}>
          <View style={styles.headerContent}>
            {title && <Text style={styles.headerTitle}>{title}</Text>}
            {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
          </View>
          <TouchableOpacity
            onPress={() => {
              if (onClose) onClose();
              else if (navigation) navigation.goBack();
            }}
            style={styles.closeIconButton}
          >
            <Text style={styles.closeIconText}>✕</Text>
          </TouchableOpacity>
        </View>
      )} */}

      <View style={styles.formContent}>
        <View style={styles.field}>
          <Text style={styles.label}>Company</Text>
          <Controller
            control={control}
            name="company"
            render={() => (
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  errors.company && styles.inputError,
                ]}
                onPress={() => setShowCompanyDropdown(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {companies.find(c => c._id === companyValue)?.businessName ||
                    'Select company...'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
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

        {/* Stocks (Opening Stock) - Conditional Disabled */}
        <View style={styles.field}>
          <Text style={styles.label}>Opening Stock (Qty)</Text>
          <Controller
            control={control}
            name="stocks"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, product && styles.disabledInput]}
                placeholder="0"
                keyboardType="numeric"
                value={String(value)}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!product}
              />
            )}
          />
        </View>

        {/* Selling Price */}
        <View style={styles.field}>
          <Text style={styles.label}>Selling Price/Unit</Text>
          <Controller
            control={control}
            name="sellingPrice"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.sellingPrice && styles.inputError]}
                placeholder="₹0"
                keyboardType="decimal-pad"
                value={formatCurrency(value)}
                onChangeText={text => handleCurrencyInput(onChange, text)}
              />
            )}
          />
        </View>

        {/* Cost Price */}
        <View style={styles.field}>
          <Text style={styles.label}>Cost Price/Unit</Text>
          <Controller
            control={control}
            name="costPrice"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.costPrice && styles.inputError]}
                placeholder="₹0"
                keyboardType="decimal-pad"
                value={formatCurrency(value)}
                onChangeText={text => handleCurrencyInput(onChange, text)}
              />
            )}
          />
          {errors.costPrice && (
            <Text style={styles.error}>{errors.costPrice.message}</Text>
          )}
        </View>

        {/* Unit Selection */}
        {/* <View style={styles.field}>
          <Text style={styles.label}>Unit</Text>
          <Controller
            control={control}
            name="unit"
            render={({ field: { value } }) => (
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowUnitDropdown(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {value === 'other' ? 'Other' : value || 'Select unit...'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            )}
          />
        </View> */}

        <View style={styles.field}>
          <Text style={styles.label}>Unit</Text>
          <Controller
            control={control}
            name="unit"
            render={({ field: { value } }) => (
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowUnitDropdown(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {value === 'other' ? 'Other' : value || 'Select unit...'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Custom Unit Input (when "other" is selected) */}
        {unitValue === 'other' && (
          <View style={[styles.field, { marginTop: -10, marginBottom: 20 }]}>
            <Text style={styles.label}>Custom Unit Name</Text>
            <Controller
              control={control}
              name="customUnit"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="e.g., hour, session, gigabyte"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoFocus={true}
                />
              )}
            />
          </View>
        )}

        {/* HSN Selection */}
        <View style={styles.field}>
          <Text style={styles.label}>HSN Code</Text>
          <Controller
            control={control}
            name="hsn"
            render={({ field: { value } }) => (
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowHsnModal(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {value || 'Select HSN code...'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            justifyContent: 'flex-end',
            marginBottom: 40,
          }}
        >
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

          {/* {product && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Delete Product</Text>
              )}
            </TouchableOpacity>
          )} */}
        </View>

        {/* Company Modal */}
        <Modal visible={showCompanyDropdown} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Company</Text>
                <TouchableOpacity onPress={() => setShowCompanyDropdown(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                onChangeText={setCompanySearchQuery}
              />
              <ScrollView>
                {filteredCompanies.map(c => (
                  <TouchableOpacity
                    key={c._id}
                    style={styles.unitItem}
                    onPress={() => handleCompanySelect(c)}
                  >
                    <Text style={styles.unitText}>{c.businessName}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* HSN Modal */}
        <Modal visible={showHsnModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Search HSN</Text>
                <TouchableOpacity onPress={() => setShowHsnModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Type HSN Code..."
                onChangeText={text => {
                  if (text.length >= 2) setHsnSuggestions(searchHSNCodes(text));
                }}
              />
              <FlatList
                data={hsnSuggestions}
                keyExtractor={item => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.hsnItem}
                    onPress={() => handleHSNSelect(item)}
                  >
                    <Text style={styles.hsnCode}>
                      {item.code} - {item.description}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        <Modal visible={showUnitDropdown} animationType="slide" transparent>
          <View style={styles.modalOverlayUnit}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Unit</Text>
                <TouchableOpacity onPress={() => setShowUnitDropdown(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search units..."
                value={unitSearchQuery}
                onChangeText={setUnitSearchQuery}
                autoFocus={true}
              />
              <ScrollView>
                {filteredUnits.map((unit, index) => (
                  <TouchableOpacity
                    key={unit.id || `${unit.type}-${unit.name}-${index}`}
                    style={styles.unitItem}
                    onPress={() => handleUnitSelect(unit.name)}
                  >
                    <Text style={styles.unitText}>
                      {unit.name} {unit.type === 'custom' && '(Custom)'}
                    </Text>
                  </TouchableOpacity>
                ))}
                {/* "Other" option */}
                <TouchableOpacity
                  style={styles.unitItem}
                  onPress={() => {
                    setValue('unit', 'other');
                    setShowUnitDropdown(false);
                    setUnitSearchQuery('');
                  }}
                >
                  <Text style={[styles.unitText, { color: '#007AFF' }]}>
                    Other (Custom Unit)
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, },
  // formContent: { padding: 20, paddingTop: 0 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    margin: 4,
    marginTop: 10,
    marginBottom: 30,
    gap: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  closeIconButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIconText: { fontSize: 18, color: '#666', fontWeight: 'bold' },
  field: { marginBottom: 20 },
  label: { fontWeight: 'bold', color: '#333', marginBottom: 8, fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  disabledInput: { backgroundColor: '#eeeeee', color: '#777' },
  inputError: { borderColor: '#ff3b30' },
  error: { color: '#ff3b30', fontSize: 14, marginTop: 5 },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: { opacity: 0.6 },
  deleteButton: {
    backgroundColor: '#ff3b30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dropdownButtonText: { fontSize: 16, color: '#333' },
  dropdownArrow: { color: '#666' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },

  modalOverlayUnit: {
    flex: 1,
    // backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  closeButton: { fontSize: 20, color: '#666' },
  searchInput: {
    margin: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
  },
  unitItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  unitText: { fontSize: 16 },
  hsnItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  hsnCode: { fontSize: 14, color: '#333' },
});
