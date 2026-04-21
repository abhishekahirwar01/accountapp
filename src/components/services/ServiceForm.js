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
  StatusBar,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../../config';
import { searchSACCodes, getSACByCode } from '../../lib/sacService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const { height: SCREEN_H } = Dimensions.get('window');

// Form Schema with Zod
const formSchema = z.object({
  serviceName: z.string().min(2, 'Service name is required.'),
  amount: z.coerce
    .number()
    .min(0, 'Amount must be a positive number.')
    .default(0),
  sac: z.string().optional(),
  companies: z.array(z.string()).optional().default([]),
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
  hideHeader = false,
  route,
}) {
  // Extract service from route.params if being called via navigation
  const serviceParam = service || route?.params?.service;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Company Selection States
  const [allCompanies, setAllCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [tempSelectedCompanies, setTempSelectedCompanies] = useState([]);
  const [isGlobalService, setIsGlobalService] = useState(false);

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
      serviceName: serviceParam?.serviceName || initialName || '',
      amount: serviceParam?.amount || 0,
      sac: serviceParam?.sac || '',
      companies:
        serviceParam?.companies && Array.isArray(serviceParam.companies)
          ? serviceParam.companies
              .map(c => (typeof c === 'string' ? c : c?._id))
              .filter(Boolean)
          : [],
    },
  });

  const sacValue = watch('sac');
  const amountValue = watch('amount');

  // Fetch companies on component mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${BASE_URL}/api/companies/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setAllCompanies(Array.isArray(data) ? data : data?.data || []);
      } catch (e) {
        console.error('fetch companies', e);
      } finally {
        setIsLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  // Initialize global service state based on initial companies
  useEffect(() => {
    const initialCompanies = watch('companies') || [];
    setIsGlobalService(initialCompanies.length === 0);
  }, []);

  const handleOpenCompanyModal = () => {
    setTempSelectedCompanies([...(watch('companies') || [])]);
    setShowCompanyModal(true);
  };

  const handleToggleCompany = id =>
    setTempSelectedCompanies(p =>
      p.includes(id) ? p.filter(c => c !== id) : [...p, id],
    );

  const filteredCompanies = allCompanies.filter(c =>
    c.businessName.toLowerCase().includes(companySearch.toLowerCase()),
  );
  const allFilteredSelected =
    filteredCompanies.length > 0 &&
    filteredCompanies.every(c => tempSelectedCompanies.includes(c._id));

  const handleSelectAllCompanies = () => {
    const ids = filteredCompanies.map(c => c._id);
    const all = ids.every(id => tempSelectedCompanies.includes(id));
    setTempSelectedCompanies(p =>
      all ? p.filter(id => !ids.includes(id)) : [...new Set([...p, ...ids])],
    );
  };

  const handleDoneCompanySelection = () => {
    setValue('companies', [...tempSelectedCompanies]);
    setShowCompanyModal(false);
    setCompanySearch('');
  };

  const handleCancelCompanyModal = () => {
    setTempSelectedCompanies([...(watch('companies') || [])]);
    setShowCompanyModal(false);
    setCompanySearch('');
  };

  const handleGlobalServiceChange = checked => {
    setIsGlobalService(checked);
    if (checked) {
      setValue('companies', []);
    }
  };

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
      if (serviceParam?.sac && serviceParam.sac.length >= 2) {
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
  }, [sacValue, sacSelectedFromDropdown, serviceParam]);

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

    // Validate companies if not global service
    if (
      !isGlobalService &&
      (!values.companies || values.companies.length === 0)
    ) {
      setError('companies', {
        type: 'manual',
        message:
          'Please select at least one company or mark as available for all companies.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const url = serviceParam
        ? `${BASE_URL}/api/services/${serviceParam._id}`
        : `${BASE_URL}/api/services`;

      const method = serviceParam ? 'PUT' : 'POST';

      const payload = {
        serviceName: values.serviceName,
        amount: values.amount,
        sac: values.sac || '',
        companies: isGlobalService ? [] : values.companies || [],
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
          data.message ||
            `Failed to ${serviceParam ? 'update' : 'create'} service.`,
        );
      }

      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(data.service || data);
      }

      if (
        !serviceParam &&
        onServiceCreated &&
        typeof onServiceCreated === 'function'
      ) {
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
    if (!serviceParam?._id || !onDelete) return;

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
                `${BASE_URL}/api/services/${serviceParam._id}`,
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
                `${serviceParam?.serviceName || 'Service'} has been deleted.`,
              );
              if (onDelete && typeof onDelete === 'function') {
                try {
                  onDelete(serviceParam);
                } catch (e) {}
              }
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
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ── */}
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
          <Text style={styles.headerTitle}>
            {headerTitle || (serviceParam ? 'Edit Service' : 'Create Service')}
          </Text>
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
          style={styles.scrollView}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Companies Selection ── */}
          <View style={styles.field}>
            <View style={styles.companyLabelRow}>
              <Text style={styles.label}>
                Companies <Text style={styles.req}>*</Text>
              </Text>
              <View style={styles.globalServiceCheckbox}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    isGlobalService && styles.checkboxChecked,
                  ]}
                  onPress={() => handleGlobalServiceChange(!isGlobalService)}
                >
                  {isGlobalService && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <Text style={styles.globalServiceLabel}>
                  Available for all companies
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.input, isGlobalService && styles.inputDisabled]}
              onPress={handleOpenCompanyModal}
              disabled={isGlobalService}
              activeOpacity={0.7}
            >
              {isLoadingCompanies ? (
                <ActivityIndicator size="small" color="#9CA3AF" />
              ) : (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.inputText,
                    !(watch('companies') || []).length && styles.placeholder,
                  ]}
                >
                  {isGlobalService
                    ? 'All companies'
                    : (watch('companies') || []).length > 0
                    ? `${(watch('companies') || []).length} compan${
                        (watch('companies') || []).length > 1 ? 'ies' : 'y'
                      } selected`
                    : 'Select companies...'}
                </Text>
              )}
              <Text style={styles.chevron}>⌄</Text>
            </TouchableOpacity>

            {(watch('companies') || []).length > 0 && (
              <View style={styles.badges}>
                {(watch('companies') || []).map(id => {
                  const comp = allCompanies.find(c => c._id === id);
                  return comp ? (
                    <View key={id} style={styles.badge}>
                      <Text style={styles.badgeText} numberOfLines={1}>
                        {comp.businessName}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          const updated = (watch('companies') || []).filter(
                            c => c !== id,
                          );
                          setValue('companies', updated);
                        }}
                      >
                        <Icon
                          name="close-circle"
                          size={16}
                          color="#4F46E5"
                          style={{ marginLeft: 5 }}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : null;
                })}
              </View>
            )}
          </View>

          {/* ── Service Name ── */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Service Name <Text style={styles.req}>*</Text>
            </Text>
            <Controller
              control={control}
              name="serviceName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.textInput,
                    errors.serviceName && styles.inputError,
                  ]}
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

          {/* Amount Field */}
          <View style={styles.field}>
            <Text style={styles.label}>Amount</Text>
            <Controller
              control={control}
              name="amount"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.textInput, errors.amount && styles.inputError]}
                  placeholder="Enter amount"
                  keyboardType="decimal-pad"
                  value={
                    value === 0 || value === '0' ? '' : String(value ?? '')
                  }
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
            {errors.sac && (
              <Text style={styles.error}>{errors.sac.message}</Text>
            )}
            <Text style={styles.helperText}>
              Start typing 2+ characters to see SAC code suggestions
            </Text>
          </View>
        </ScrollView>

        {/* Fixed Button Footer */}
        <View style={styles.buttonFooter}>
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
                {serviceParam ? 'Save Changes' : 'Create Service'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Delete Button */}
          {serviceParam && onDelete && (
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
        </View>
      </KeyboardAvoidingView>

      {/* Companies Selection Modal */}
      <Modal visible={showCompanyModal} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={handleCancelCompanyModal}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Choose Companies</Text>
              <TouchableOpacity
                onPress={handleCancelCompanyModal}
                style={styles.closeBtn}
              >
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <TextInput
              style={styles.search}
              placeholder="Search..."
              placeholderTextColor="#9CA3AF"
              value={companySearch}
              onChangeText={setCompanySearch}
            />

            {/* Select All */}
            <TouchableOpacity
              style={styles.selectAll}
              onPress={handleSelectAllCompanies}
            >
              <Icon
                name={
                  allFilteredSelected
                    ? 'checkmark-done-circle'
                    : 'radio-button-off'
                }
                size={20}
                color={allFilteredSelected ? '#4F46E5' : '#6B7280'}
              />
              <Text
                style={[
                  styles.selectAllText,
                  allFilteredSelected && { color: '#4F46E5' },
                ]}
              >
                {allFilteredSelected ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>

            {/* Company List */}
            {isLoadingCompanies ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.centerText}>Loading...</Text>
              </View>
            ) : filteredCompanies.length === 0 ? (
              <View style={styles.centerBox}>
                <Text style={styles.centerText}>No companies found</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                {filteredCompanies.map(c => {
                  const sel = tempSelectedCompanies.includes(c._id);
                  return (
                    <TouchableOpacity
                      key={c._id}
                      style={[styles.listItem, sel && styles.listItemSel]}
                      onPress={() => handleToggleCompany(c._id)}
                    >
                      <Icon
                        name={sel ? 'checkmark-circle' : 'radio-button-off'}
                        size={22}
                        color={sel ? '#4F46E5' : '#D1D5DB'}
                      />
                      <Text
                        style={[
                          styles.listItemText,
                          sel && styles.listItemTextSel,
                        ]}
                      >
                        {c.businessName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Footer */}
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={handleDoneCompanySelection}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
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
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  formContent: {
    padding: 16,
    paddingBottom: 16,
  },
  buttonFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    gap: 12,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 7,
    letterSpacing: 0.1,
  },
  req: { color: '#EF4444' },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#E6EEF5',
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: 'white',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: '#8b77ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 0,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 0,
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
  // ── Company Selection Styles ──
  companyLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  globalServiceCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: '#4F46E5',
    backgroundColor: '#4F46E5',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  globalServiceLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  inputDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  inputText: {
    fontSize: 15,
    color: '#111827',
    flex: 1,
    flexShrink: 1,
  },
  placeholder: {
    color: '#9CA3AF',
  },
  chevron: {
    fontSize: 16,
    color: '#6B7280',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '600',
    maxWidth: 150,
  },
  // ── Modal Bottom Sheet Styles ──
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SCREEN_H * 0.75,
    overflow: 'hidden',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 10,
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
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  search: {
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
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  list: {
    height: SCREEN_H * 0.33,
  },
  centerBox: {
    height: SCREEN_H * 0.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  listItemSel: {
    backgroundColor: '#F5F3FF',
  },
  listItemText: {
    fontSize: 15,
    color: '#374151',
  },
  listItemTextSel: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  sheetFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  doneBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
