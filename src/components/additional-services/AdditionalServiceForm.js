import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Dimensions,
  Alert,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../../config';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatIndianNumber = val => {
  if (val === '' || val === null || val === undefined) return '';
  const num = String(val).replace(/,/g, '');
  if (isNaN(num) || num === '') return '';
  const [integer, decimal] = num.split('.');
  const formatted = new Intl.NumberFormat('en-IN').format(
    parseInt(integer, 10),
  );
  return decimal !== undefined ? `${formatted}.${decimal}` : formatted;
};

const parseNumber = val => {
  if (!val) return '';
  return String(val).replace(/,/g, '');
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AdditionalServiceForm(props) {
  const service = props.route?.params?.service || props.service;
  const { onSuccess, onClose, navigation, initialName, initialCompanyId } =
    props;

  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  // Form state
  const [serviceName, setServiceName] = useState('');
  const [serviceCost, setServiceCost] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [isGlobalService, setIsGlobalService] = useState(false);

  // Modal dropdown state
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [errors, setErrors] = useState({});

  // 1. Initial State Load (Edit vs Create)
  useEffect(() => {
    if (service) {
      setServiceName(service.serviceName || '');
      setServiceCost(
        service.serviceCost ? formatIndianNumber(service.serviceCost) : '',
      );
      setDescription(service.description || '');
      setSelectedCompanies(
        service.companies?.map(c => (typeof c === 'string' ? c : c._id)) || [],
      );
      setIsGlobalService(!service.companies || service.companies.length === 0);
    } else {
      setServiceName(initialName || '');
    }
  }, [service]);

  // 2. Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${BASE_URL}/api/companies/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.companies || [];
        const filtered = list.filter(c => {
          const type = (c.industryType || '').toLowerCase().trim();
          return type === 'travels' || type === 'courier';
        });
        setCompanies(filtered);

        // Auto-select for NEW entries only
        if (!service) {
          if (initialCompanyId && initialCompanyId !== 'all') {
            setSelectedCompanies([initialCompanyId]);
          } else if (filtered.length > 0 && selectedCompanies.length === 0) {
            setSelectedCompanies([filtered[0]._id]);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const filteredCompanies = companies.filter(c =>
    c.businessName.toLowerCase().includes(companySearch.toLowerCase()),
  );

  const allSelected =
    filteredCompanies.length > 0 &&
    filteredCompanies.every(c => selectedCompanies.includes(c._id));

  const toggleCompany = id => {
    setSelectedCompanies(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    );
    setErrors(e => ({ ...e, companies: undefined }));
  };

  const toggleSelectAll = () => {
    const ids = filteredCompanies.map(c => c._id);
    if (allSelected) {
      setSelectedCompanies(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedCompanies(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const handleGlobalToggle = () => {
    const next = !isGlobalService;
    setIsGlobalService(next);
    if (next) setSelectedCompanies([]);
    setErrors(e => ({ ...e, companies: undefined }));
  };

  const removeCompany = id => {
    setSelectedCompanies(prev => prev.filter(c => c !== id));
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};
    if (!serviceName.trim()) newErrors.serviceName = 'Service name is required';
    if (!isGlobalService && selectedCompanies.length === 0) {
      newErrors.companies = 'Select at least one company or mark as global';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const url = service
        ? `${BASE_URL}/api/additional-services/${service._id}`
        : `${BASE_URL}/api/additional-services`;
      const method = service ? 'PUT' : 'POST';

      const payload = {
        serviceName: serviceName.trim(),
        serviceCost: parseFloat(parseNumber(serviceCost)) || 0,
        serviceDate: new Date().toISOString(),
        description: description.trim(),
        companies: isGlobalService ? [] : selectedCompanies,
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData || 'Failed to save');
      }
      const data = await res.json();

      if (onSuccess) onSuccess(data.additionalService || data);

      Alert.alert(
        'Success',
        `Service ${service ? 'updated' : 'created'} successfully`,
      );

      if (onClose) onClose();
      else if (navigation) navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Get selected company names for display
  const getSelectedCompanyNames = () => {
    return selectedCompanies
      .map(id => {
        const company = companies.find(c => c._id === id);
        return company?.businessName || '';
      })
      .filter(Boolean);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header with Ionicons back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (onClose ? onClose() : navigation?.goBack())}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="arrow-back" size={22} color="#4F46E5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {service ? 'Edit Additional Service' : 'Create Additional Service'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Company Selector Section */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>
              Company <Text style={styles.req}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.globalRow}
              onPress={handleGlobalToggle}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  isGlobalService && styles.checkboxChecked,
                ]}
              >
                {isGlobalService && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.globalLabel}>All Companies</Text>
            </TouchableOpacity>
          </View>

          {/* Selector Button */}
          <TouchableOpacity
            style={[
              styles.selectorBox,
              errors.companies && styles.inputError,
              isGlobalService && styles.selectorDisabled,
            ]}
            onPress={() => !isGlobalService && setDropdownVisible(true)}
            activeOpacity={0.8}
            disabled={isGlobalService}
          >
            {loadingCompanies ? (
              <ActivityIndicator size="small" color="#8b77ff" />
            ) : isGlobalService ? (
              <Text style={styles.selectorPlaceholder}>All Companies</Text>
            ) : selectedCompanies.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgeContainer}
              >
                {getSelectedCompanyNames().map((name, index) => (
                  <View key={index} style={styles.badge}>
                    <Text style={styles.badgeText} numberOfLines={1}>
                      {name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeCompany(selectedCompanies[index])}
                      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                    >
                      <Text style={styles.badgeX}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.selectorPlaceholder}>
                Select companies...
              </Text>
            )}
            <Text style={styles.chevron}>⌄</Text>
          </TouchableOpacity>

          {errors.companies && (
            <Text style={styles.errorText}>{errors.companies}</Text>
          )}
        </View>

        {/* Service Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Service Name</Text>
          <TextInput
            style={[styles.input, errors.serviceName && styles.inputError]}
            placeholder="e.g., Guide Charges, Hotel Booking, etc."
            placeholderTextColor="#9CA3AF"
            value={serviceName}
            onChangeText={t => {
              setServiceName(t);
              setErrors(prev => ({ ...prev, serviceName: undefined }));
            }}
          />
          {errors.serviceName && (
            <Text style={styles.errorText}>{errors.serviceName}</Text>
          )}
        </View>

        {/* Service Cost */}
        <View style={styles.field}>
          <Text style={styles.label}>Service Cost (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            value={serviceCost}
            onChangeText={text => {
              const raw = text.replace(/,/g, '');
              if (raw === '' || /^\d*\.?\d{0,2}$/.test(raw)) {
                setServiceCost(formatIndianNumber(raw));
              }
            }}
            onBlur={() => {
              const raw = parseNumber(serviceCost);
              setServiceCost(raw ? formatIndianNumber(parseFloat(raw)) : '');
            }}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Optional details about this service..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitText}>
              {service ? 'Update Service' : 'Create Service'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Company Selection Modal */}
      <Modal
        visible={dropdownVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDropdownVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Companies</Text>
              <TouchableOpacity
                onPress={() => setDropdownVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search company..."
                placeholderTextColor="#9CA3AF"
                value={companySearch}
                onChangeText={setCompanySearch}
                autoFocus
              />
            </View>

            {/* Select All Button */}
            <TouchableOpacity
              style={styles.selectAllContainer}
              onPress={toggleSelectAll}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.modalCheckbox,
                  allSelected && styles.modalCheckboxChecked,
                ]}
              >
                {allSelected && <Text style={styles.modalCheckmark}>✓</Text>}
              </View>
              <Text
                style={[
                  styles.selectAllText,
                  allSelected && styles.selectAllTextActive,
                ]}
              >
                Select All Companies
              </Text>
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            {/* Company List */}
            <FlatList
              data={filteredCompanies}
              keyExtractor={item => item._id}
              renderItem={({ item }) => {
                const isSelected = selectedCompanies.includes(item._id);
                return (
                  <TouchableOpacity
                    style={styles.modalCompanyItem}
                    onPress={() => toggleCompany(item._id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.modalCheckbox,
                        isSelected && styles.modalCheckboxChecked,
                      ]}
                    >
                      {isSelected && (
                        <Text style={styles.modalCheckmark}>✓</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.modalCompanyName,
                        isSelected && styles.modalCompanyNameSelected,
                      ]}
                    >
                      {item.businessName}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No companies found</Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                filteredCompanies.length === 0 && styles.emptyList
              }
            />

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={() => setDropdownVisible(false)}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
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

  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 30 },

  // Fields
  field: { marginBottom: 22 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  req: { color: '#EF4444' },

  // Global toggle
  globalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: { borderColor: '#4F46E5', backgroundColor: '#4F46E5' },
  checkmark: { color: '#fff', fontSize: 11, fontWeight: '700' },
  globalLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  // Selector box
  selectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  selectorDisabled: { backgroundColor: '#F9FAFB', opacity: 0.7 },
  selectorPlaceholder: { color: '#9CA3AF', fontSize: 15, flex: 1 },
  chevron: { fontSize: 20, color: '#9CA3AF', marginLeft: 8 },

  // Badges
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
    maxWidth: 150,
  },
  badgeX: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '700',
    paddingHorizontal: 4,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalClose: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#9CA3AF',
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: '#374151',
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#F8F7FF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectAllTextActive: {
    color: '#4F46E5',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  modalCompanyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  modalCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  modalCheckboxChecked: {
    borderColor: '#4F46E5',
    backgroundColor: '#4F46E5',
  },
  modalCheckmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalCompanyName: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  modalCompanyNameSelected: {
    color: '#4F46E5',
    fontWeight: '500',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalDoneButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Inputs
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#fff',
  },
  textarea: {
    height: 110,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 6 },

  // Footer
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  submitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
