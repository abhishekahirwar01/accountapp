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
  Platform,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import { BASE_URL } from '../../config';
import { searchHSNCodes, getHSNByCode } from '../../lib/hsnProduct';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCompany } from '../../contexts/company-context';
import { z } from 'zod';

// ── Form Schema (unchanged) ────────────────────────────────────────────────
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
  const { selectedCompanyId } = useCompany();

  // HSN Search States
  const [hsnSuggestions, setHsnSuggestions] = useState([]);
  const [showHsnModal, setShowHsnModal] = useState(false);
  const [hsnSelectedFromDropdown, setHsnSelectedFromDropdown] = useState(false);

  // Unit Dropdown States
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState('');

  // Company Dropdown States
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');

  const isInitialLoad = useRef(true);

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
        : selectedCompanyId || '',
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

  // Currency Utils (unchanged)
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
      if (onClose) {
        onClose();
      } else {
        navigation.goBack();
      }
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

  const isEdit = !!product;
  const heading = title || (isEdit ? 'Edit Product' : 'Create New Product');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header: back arrow + title only (no subtitle, no X) ── */}
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (onClose) onClose();
              else if (navigation) navigation.goBack();
            }}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="arrow-back" size={22} color="#4F46E5" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{heading}</Text>
          <View style={styles.backBtn} />
        </View>
      )}

      {/* ── Scrollable Form ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Company */}
          <View style={styles.field}>
            <Text style={styles.label}>Company <Text style={styles.req}>*</Text></Text>
            <Controller
              control={control}
              name="company"
              render={() => (
                <TouchableOpacity
                  style={[styles.inputBox, errors.company && styles.inputError]}
                  onPress={() => setShowCompanyDropdown(true)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.inputText,
                      !companies.find(c => c._id === companyValue) &&
                        styles.placeholderText,
                    ]}
                  >
                    {companies.find(c => c._id === companyValue)
                      ?.businessName || 'Select company...'}
                  </Text>
                  <SimpleLineIcons name="arrow-down" color="#000" size={10} />
                </TouchableOpacity>
              )}
            />
            {errors.company && (
              <Text style={styles.error}>{errors.company.message}</Text>
            )}
          </View>

          {/* Product Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Product Name <Text style={styles.req}>*</Text></Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.inputBox, errors.name && styles.inputError]}
                  placeholder="e.g. Website Development"
                  placeholderTextColor="#9CA3AF"
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

          {/* Opening Stock + Unit — side by side */}
          <View style={styles.row}>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.label}>Opening Stock</Text>
              <Controller
                control={control}
                name="stocks"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.inputBox, product && styles.inputDisabled]}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={String(value)}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    editable={!product}
                  />
                )}
              />
            </View>

            <View style={[styles.field, styles.half]}>
              <Text style={styles.label}>Unit <Text style={styles.req}>*</Text></Text>
              <Controller
                control={control}
                name="unit"
                render={({ field: { value } }) => (
                  <TouchableOpacity
                    style={styles.inputBox}
                    onPress={() => setShowUnitDropdown(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.inputText}>
                      {value === 'other'
                        ? 'Other'
                        : value
                        ? value.charAt(0).toUpperCase() + value.slice(1)
                        : 'Select...'}
                    </Text>
                    <SimpleLineIcons name="arrow-down" color="#000" size={10} />
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>

          {/* Custom Unit */}
          {unitValue === 'other' && (
            <View style={styles.field}>
              <Text style={styles.label}>Custom Unit Name</Text>
              <Controller
                control={control}
                name="customUnit"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={styles.inputBox}
                    placeholder="e.g., hour, session, gigabyte"
                    placeholderTextColor="#9CA3AF"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoFocus
                  />
                )}
              />
            </View>
          )}

          {/* Selling Price + Cost Price — side by side */}
          <View style={styles.row}>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.label}>Selling Price/Unit</Text>
              <Controller
                control={control}
                name="sellingPrice"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[
                      styles.inputBox,
                      errors.sellingPrice && styles.inputError,
                    ]}
                    placeholder="₹0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    value={formatCurrency(value)}
                    onChangeText={text => handleCurrencyInput(onChange, text)}
                  />
                )}
              />
              {errors.sellingPrice && (
                <Text style={styles.error}>{errors.sellingPrice.message}</Text>
              )}
            </View>

            <View style={[styles.field, styles.half]}>
              <Text style={styles.label}>Cost Price/Unit <Text style={styles.req}>*</Text></Text>
              <Controller
                control={control}
                name="costPrice"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[
                      styles.inputBox,
                      errors.costPrice && styles.inputError,
                    ]}
                    placeholder="₹0.00"
                    placeholderTextColor="#9CA3AF"
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
          </View>

          {/* HSN Code */}
          <View style={styles.field}>
            <Text style={styles.label}>HSN Code</Text>
            <Controller
              control={control}
              name="hsn"
              render={({ field: { value } }) => (
                <TouchableOpacity
                  style={[styles.inputBox, errors.hsn && styles.inputError]}
                  onPress={() => setShowHsnModal(true)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.inputText, !value && styles.placeholderText]}
                  >
                    {value || 'Select HSN code...'}
                  </Text>
                  <SimpleLineIcons name="arrow-down" color="#000" size={10} />
                </TouchableOpacity>
              )}
            />
            {errors.hsn && (
              <Text style={styles.error}>{errors.hsn.message}</Text>
            )}
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* ── Sticky Footer: full-width Create Product button ── */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              isSubmitting && styles.primaryBtnDisabled,
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isEdit ? 'Save Changes' : 'Create Product'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Company Modal ── */}
      <Modal visible={showCompanyDropdown} animationType="slide" transparent>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowCompanyDropdown(false)}
        >
          <Pressable style={styles.bottomSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Company</Text>
              <TouchableOpacity
                onPress={() => setShowCompanyDropdown(false)}
                style={styles.sheetCloseBtn}
              >
                <Text style={styles.sheetCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.sheetSearch}
              placeholder="Search..."
              placeholderTextColor="#9CA3AF"
              onChangeText={setCompanySearchQuery}
              autoFocus
            />
            <ScrollView style={styles.sheetList}>
              {filteredCompanies.map(c => (
                <TouchableOpacity
                  key={c._id}
                  style={styles.sheetItem}
                  onPress={() => handleCompanySelect(c)}
                >
                  <Text style={styles.sheetItemText}>{c.businessName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Unit Modal ── */}
      <Modal visible={showUnitDropdown} animationType="slide" transparent>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setShowUnitDropdown(false);
            setUnitSearchQuery('');
          }}
        >
          <Pressable style={styles.bottomSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Unit</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowUnitDropdown(false);
                  setUnitSearchQuery('');
                }}
                style={styles.sheetCloseBtn}
              >
                <Text style={styles.sheetCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.sheetSearch}
              placeholder="Search units..."
              placeholderTextColor="#9CA3AF"
              value={unitSearchQuery}
              onChangeText={setUnitSearchQuery}
              autoFocus
            />
            <ScrollView style={styles.sheetList}>
              {filteredUnits.map((unit, index) => (
                <TouchableOpacity
                  key={unit.id || `${unit.type}-${unit.name}-${index}`}
                  style={styles.sheetItem}
                  onPress={() => handleUnitSelect(unit.name)}
                >
                  <Text style={styles.sheetItemText}>
                    {unit.name.charAt(0).toUpperCase() + unit.name.slice(1)}
                    {unit.type === 'custom' && (
                      <Text style={{ color: '#9CA3AF', fontSize: 13 }}>
                        {' '}
                        (Custom)
                      </Text>
                    )}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => {
                  setValue('unit', 'other');
                  setShowUnitDropdown(false);
                  setUnitSearchQuery('');
                }}
              >
                <Text
                  style={[
                    styles.sheetItemText,
                    { color: '#4F46E5', fontWeight: '600' },
                  ]}
                >
                  + Other (Custom Unit)
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── HSN Modal ── */}
      <Modal visible={showHsnModal} animationType="slide" transparent>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowHsnModal(false)}
        >
          <Pressable style={styles.bottomSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Search HSN Code</Text>
              <TouchableOpacity
                onPress={() => setShowHsnModal(false)}
                style={styles.sheetCloseBtn}
              >
                <Text style={styles.sheetCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.sheetSearch}
              placeholder="Type HSN Code..."
              placeholderTextColor="#9CA3AF"
              onChangeText={text => {
                if (text.length >= 2) setHsnSuggestions(searchHSNCodes(text));
                else setHsnSuggestions([]);
              }}
              autoFocus
              keyboardType="numeric"
            />
            <FlatList
              data={hsnSuggestions}
              keyExtractor={item => item.code}
              style={styles.sheetList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => handleHSNSelect(item)}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: '#4F46E5',
                    }}
                  >
                    {item.code}
                  </Text>
                  <Text
                    style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text
                  style={{
                    textAlign: 'center',
                    color: '#9CA3AF',
                    padding: 24,
                    fontSize: 14,
                  }}
                >
                  Type at least 2 characters to search
                </Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },

  // ── Scroll
  scroll: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },

  // ── Fields
  field: { marginBottom: 20 },
  half: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },

  // label style like Vyapar — small, grey, medium weight
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 7,
    letterSpacing: 0.1,
  },
  req: { color: '#EF4444' },

  // ── Input box like Vyapar — tall, clean border, no shadow
  inputBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    fontSize: 15,
    color: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputError: { borderColor: '#EF4444' },
  inputDisabled: { backgroundColor: '#F9FAFB', color: '#9CA3AF' },
  inputText: { fontSize: 15, color: '#111827', flex: 1 },
  placeholderText: { color: '#9CA3AF' },
  chevron: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 4,
  },
  error: { color: '#EF4444', fontSize: 12, marginTop: 5 },

  // ── Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 10 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  primaryBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Bottom-sheet modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  sheetCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseTxt: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  sheetSearch: {
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  sheetList: { maxHeight: 320 },
  sheetItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetItemText: { fontSize: 15, color: '#111827' },
});
