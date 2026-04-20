import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ChevronsUpDown, Check } from 'lucide-react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { State, City } from 'country-state-city';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';
import { useCompany } from '../../contexts/company-context';

// ─── Toast Modal ─────────────────────────────────────────────────────────────
const ToastModal = ({ visible, type, title, message, onClose }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  const backgroundColor = type === 'destructive' ? '#dc2626' : '#16a34a';
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.toastOverlay}>
          <View style={[styles.toastContainer, { backgroundColor }]}>
            <Text style={styles.toastTitle}>{title}</Text>
            <Text style={styles.toastMessage}>{message}</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const useToast = () => {
  const [toastConfig, setToastConfig] = useState({ visible: false, type: 'default', title: '', message: '' });
  const showToast = ({ variant, title, description }) =>
    setToastConfig({ visible: true, type: variant || 'default', title, message: description });
  const hideToast = () => setToastConfig(prev => ({ ...prev, visible: false }));
  return { toast: showToast, toastConfig, hideToast };
};

// ─── Company Selection Bottom Sheet ──────────────────────────────────────────
const CompanyBottomSheet = ({ visible, onClose, companies, selectedCompanies, onSelectionChange, isLoading }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCompanies = companies.filter(c =>
    c.businessName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const allFilteredSelected =
    filteredCompanies.length > 0 && filteredCompanies.every(c => selectedCompanies.includes(c._id));

  const toggleCompany = id => {
    const isSelected = selectedCompanies.includes(id);
    onSelectionChange(
      isSelected ? selectedCompanies.filter(x => x !== id) : [...selectedCompanies, id],
    );
  };

  const handleSelectAll = () => {
    const ids = filteredCompanies.map(c => c._id);
    const allSelected = ids.every(id => selectedCompanies.includes(id));
    onSelectionChange(
      allSelected
        ? selectedCompanies.filter(id => !ids.includes(id))
        : [...new Set([...selectedCompanies, ...ids])],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Choose Companies</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Text style={styles.closeX}>✕</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.sheetSearch}
                placeholder="Search..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <TouchableOpacity style={styles.selectAll} onPress={handleSelectAll}>
                <Text style={[styles.selectAllText, allFilteredSelected && { color: '#4F46E5' }]}>
                  {allFilteredSelected ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
              {isLoading ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator size="large" color="#4F46E5" />
                </View>
              ) : filteredCompanies.length === 0 ? (
                <View style={styles.centerBox}>
                  <Text style={styles.centerText}>No companies found</Text>
                </View>
              ) : (
                <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {filteredCompanies.map(c => {
                    const sel = selectedCompanies.includes(c._id);
                    return (
                      <TouchableOpacity
                        key={c._id}
                        style={[styles.listItem, sel && styles.listItemSel]}
                        onPress={() => toggleCompany(c._id)}
                      >
                        <View style={[styles.checkbox, sel && styles.checkboxSel]}>
                          {sel && <Check size={12} color="white" />}
                        </View>
                        <Text style={[styles.listItemText, sel && styles.listItemTextSel]}>
                          {c.businessName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
              <View style={styles.sheetFooter}>
                <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Searchable Picker ────────────────────────────────────────────────────────
const SearchablePicker = ({ visible, onClose, options, onSelect, title, searchPlaceholder = 'Search...' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.pickerClose}>
            <Text style={styles.pickerCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.pickerSearch}>
          <TextInput
            style={styles.pickerSearchInput}
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
        <ScrollView style={{ flex: 1 }}>
          {filteredOptions.length === 0 ? (
            <Text style={styles.noResultsText}>No results found</Text>
          ) : (
            filteredOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                onPress={() => { onSelect(option); onClose(); setSearchQuery(''); }}
                style={styles.pickerOption}
              >
                <Text style={styles.pickerOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Schema ───────────────────────────────────────────────────────────────────
const gstRegistrationTypes = ['Regular', 'Composition', 'Unregistered', 'Consumer', 'Overseas', 'Special Economic Zone', 'Unknown'];

const formSchema = z.object({
  vendorName: z.string().min(2, 'Vendor name is required.'),
  contactNumber: z.string().optional().or(z.literal(''))
    .refine(val => { if (!val || val.trim() === '') return true; return /^[6-9]\d{9}$/.test(val.replace(/\D/g, '')); }, { message: 'Enter valid 10-digit Indian mobile number' }),
  email: z.string().optional().or(z.literal(''))
    .refine(val => { if (!val || val.trim() === '') return true; try { z.string().email().parse(val); return true; } catch { return false; } }, { message: 'Enter a valid email' }),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  gstin: z.string().length(15, 'GSTIN must be 15 characters.').optional().or(z.literal('')),
  gstRegistrationType: z.enum(gstRegistrationTypes).default('Unregistered'),
  pan: z.string().length(10, 'PAN must be 10 characters.').optional().or(z.literal('')),
  isTDSApplicable: z.boolean().default(false),
  company: z.array(z.string()).min(1, 'Select at least one company'),
});


const VendorForm = ({ navigation, route, vendor: vendorProp, onSuccess: onSuccessProp, companies: companiesProp }) => {

  const vendor = route?.params?.vendor ?? vendorProp ?? null;
  const routeCompanies = route?.params?.companies ?? companiesProp ?? null;

  const isNavigationMode = !!navigation; 

  const { triggerCompaniesRefresh } = useCompany();
  const { toast, toastConfig, hideToast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stateCode, setStateCode] = useState(null);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showCompanySheet, setShowCompanySheet] = useState(false);
  const [showGSTTypePicker, setShowGSTTypePicker] = useState(false);
  const [allCompanies, setAllCompanies] = useState(routeCompanies || []);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(!routeCompanies?.length);

  const {
    control, handleSubmit, watch, setValue, getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendorName: vendor?.vendorName || '',
      contactNumber: vendor?.contactNumber || '',
      email: vendor?.email || '',
      address: vendor?.address || '',
      city: vendor?.city || '',
      state: vendor?.state || '',
      gstin: vendor?.gstin || '',
      gstRegistrationType: vendor?.gstRegistrationType || 'Unregistered',
      pan: vendor?.pan || '',
      isTDSApplicable: vendor?.isTDSApplicable || false,
      company: [],
    },
  });

  const selectedCompanies = watch('company');

  const indiaStates = useMemo(() => State.getStatesOfCountry('IN'), []);
  const stateOptions = useMemo(
    () => indiaStates.map(s => ({ value: s.isoCode, label: s.name })).sort((a, b) => a.label.localeCompare(b.label)),
    [indiaStates],
  );
  const cityOptions = useMemo(() => {
    if (!stateCode) return [];
    return City.getCitiesOfState('IN', stateCode)
      .map(c => ({ value: c.name, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [stateCode]);
  const gstTypeOptions = useMemo(() => gstRegistrationTypes.map(t => ({ value: t, label: t })), []);

  
  useEffect(() => {
    if (routeCompanies?.length) {
      setAllCompanies(routeCompanies);
      setIsLoadingCompanies(false);
     
      if (routeCompanies.length === 1 && !vendor) {
        setValue('company', [routeCompanies[0]._id]);
      }
      return;
    }
    const load = async () => {
      setIsLoadingCompanies(true);
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${BASE_URL}/api/companies/my`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load companies');
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.data || [];
        setAllCompanies(list);
        if (list.length === 1 && !vendor) setValue('company', [list[0]._id]);
      } catch (e) {
        console.error('fetch companies', e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load companies.' });
      } finally {
        setIsLoadingCompanies(false);
      }
    };
    load();
  }, []);

  // Init stateCode from vendor
  useEffect(() => {
    const currentStateName = getValues('state')?.trim();
    if (!currentStateName) { setStateCode(null); return; }
    const found = indiaStates.find(s => s.name.toLowerCase() === currentStateName.toLowerCase());
    setStateCode(found?.isoCode || null);
  }, [indiaStates]);

  // Init company selection from vendor
  useEffect(() => {
    if (vendor?.company) {
      let formatted = [];
      if (Array.isArray(vendor.company)) {
        formatted = vendor.company.map(c => (typeof c === 'object' && c !== null ? c._id : c));
      } else if (typeof vendor.company === 'string') {
        formatted = [vendor.company];
      } else if (typeof vendor.company === 'object' && vendor.company !== null) {
        formatted = [vendor.company._id];
      }
      if (formatted.length > 0) setValue('company', formatted);
    }
  }, [vendor]);

  const onSubmit = async values => {
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');
      const url = vendor ? `${BASE_URL}/api/vendors/${vendor._id}` : `${BASE_URL}/api/vendors`;
      const method = vendor ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${vendor ? 'update' : 'create'} vendor.`);

      if (values.company?.length) triggerCompaniesRefresh?.();

      // Navigation mode: show alert then go back
      if (isNavigationMode) {
        Alert.alert('Success', `Vendor ${vendor ? 'updated' : 'created'} successfully`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        // Props mode: call onSuccess callback
        toast({ variant: 'default', title: 'Success', description: `Vendor ${vendor ? 'updated' : 'created'} successfully.` });
        onSuccessProp?.(data.vendor);
      }
    } catch (error) {
      if (isNavigationMode) {
        Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong');
      } else {
        toast({ variant: 'destructive', title: 'Operation Failed', description: error instanceof Error ? error.message : 'Unknown error occurred' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const ErrText = ({ msg }) => msg ? <Text style={styles.error}>{msg}</Text> : null;

  const formContent = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Company Field */}
      <Controller
        control={control}
        name="company"
        render={({ field, fieldState }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Company <Text style={styles.req}>*</Text></Text>
            <TouchableOpacity
              style={[styles.input, styles.inputRow, fieldState.error && styles.inputErr]}
              onPress={() => setShowCompanySheet(true)}
              activeOpacity={0.7}
            >
              {isLoadingCompanies ? (
                <ActivityIndicator size="small" color="#9CA3AF" />
              ) : selectedCompanies?.length > 0 ? (
                <Text style={styles.inputText}>
                  {selectedCompanies.length} compan{selectedCompanies.length > 1 ? 'ies' : 'y'} selected
                </Text>
              ) : (
                <Text style={styles.placeholder}>Select companies...</Text>
              )}
              <ChevronsUpDown size={16} color="#6B7280" />
            </TouchableOpacity>
            {selectedCompanies?.length > 0 && (
              <View style={styles.badges}>
                {selectedCompanies.map(id => {
                  const comp = allCompanies.find(c => c._id === id);
                  return comp ? (
                    <View key={id} style={styles.badge}>
                      <Text style={styles.badgeText} numberOfLines={1}>{comp.businessName}</Text>
                      <TouchableOpacity onPress={() => setValue('company', selectedCompanies.filter(c => c !== id))}>
                        <X size={12} color="#4F46E5" style={{ marginLeft: 5 }} />
                      </TouchableOpacity>
                    </View>
                  ) : null;
                })}
              </View>
            )}
            <ErrText msg={fieldState.error?.message} />
          </View>
        )}
      />

      {/* Vendor Name */}
      <Controller
        control={control}
        name="vendorName"
        render={({ field, fieldState }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Vendor Name <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, fieldState.error && styles.inputErr]}
              placeholder="e.g. Acme Supplies"
              placeholderTextColor="#9CA3AF"
              value={field.value}
              onChangeText={field.onChange}
            />
            <ErrText msg={fieldState.error?.message} />
          </View>
        )}
      />

      {/* Contact & Email row */}
      <View style={styles.row}>
        <Controller
          control={control}
          name="contactNumber"
          render={({ field, fieldState }) => (
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput
                style={[styles.input, fieldState.error && styles.inputErr]}
                placeholder="9876543210"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={10}
                value={field.value}
                onChangeText={t => field.onChange(t.replace(/\D/g, ''))}
              />
              <ErrText msg={fieldState.error?.message} />
            </View>
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, fieldState.error && styles.inputErr]}
                placeholder="contact@acme.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={field.value}
                onChangeText={field.onChange}
              />
              <ErrText msg={fieldState.error?.message} />
            </View>
          )}
        />
      </View>

      {/* Address */}
      <Controller
        control={control}
        name="address"
        render={({ field }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Address Line (Street/Building)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="123 Industrial Area"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={field.value}
              onChangeText={field.onChange}
            />
          </View>
        )}
      />

      {/* State */}
      <Controller
        control={control}
        name="state"
        render={({ field }) => (
          <View style={styles.field}>
            <Text style={styles.label}>State</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowStatePicker(true)}>
              <Text style={field.value ? styles.inputText : styles.placeholder}>{field.value || 'Select state'}</Text>
               <SimpleLineIcons name="arrow-down" color="#000" size={10} />
            </TouchableOpacity>
            <SearchablePicker
              visible={showStatePicker}
              onClose={() => setShowStatePicker(false)}
              options={stateOptions}
              onSelect={s => { setStateCode(s.value); field.onChange(s.label); setValue('city', ''); }}
              title="Select State"
              searchPlaceholder="Search state..."
            />
          </View>
        )}
      />

      {/* City */}
      <Controller
        control={control}
        name="city"
        render={({ field }) => (
          <View style={styles.field}>
            <Text style={styles.label}>City</Text>
            <TouchableOpacity
              style={[styles.input, !stateCode && styles.inputDisabled]}
              onPress={() => stateCode && setShowCityPicker(true)}
              disabled={!stateCode}
            >
              <Text style={field.value ? styles.inputText : styles.placeholder}>
                {field.value || (stateCode ? 'Select city' : 'Select state first')}
              </Text>
              <SimpleLineIcons name="arrow-down" color="#000" size={10} />
            </TouchableOpacity>
            <SearchablePicker
              visible={showCityPicker}
              onClose={() => setShowCityPicker(false)}
              options={cityOptions}
              onSelect={c => field.onChange(c.label)}
              title="Select City"
              searchPlaceholder="Search city..."
            />
          </View>
        )}
      />

      {/* GST Details Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GST Details</Text>

        {/* GST Registration Type */}
        <Controller
          control={control}
          name="gstRegistrationType"
          render={({ field, fieldState }) => (
            <View style={styles.field}>
              <Text style={styles.label}>GST Registration Type</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowGSTTypePicker(true)}>
                <Text style={field.value ? styles.inputText : styles.placeholder}>{field.value || 'Select type'}</Text>
                <SimpleLineIcons name="arrow-down" color="#000" size={10} />
              </TouchableOpacity>
              <SearchablePicker
                visible={showGSTTypePicker}
                onClose={() => setShowGSTTypePicker(false)}
                options={gstTypeOptions}
                onSelect={s => field.onChange(s.value)}
                title="Select GST Registration Type"
                searchPlaceholder="Search type..."
              />
              <ErrText msg={fieldState.error?.message} />
            </View>
          )}
        />

        {/* GSTIN & PAN row */}
        <View style={styles.row}>
          <Controller
            control={control}
            name="gstin"
            render={({ field, fieldState }) => (
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>GSTIN</Text>
                <TextInput
                  style={[styles.input, fieldState.error && styles.inputErr]}
                  placeholder="15-digit GSTIN"
                  placeholderTextColor="#9CA3AF"
                  maxLength={15}
                  autoCapitalize="characters"
                  value={field.value}
                  onChangeText={t => field.onChange(t.toUpperCase())}
                />
                <ErrText msg={fieldState.error?.message} />
              </View>
            )}
          />
          <Controller
            control={control}
            name="pan"
            render={({ field, fieldState }) => (
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>PAN</Text>
                <TextInput
                  style={[styles.input, fieldState.error && styles.inputErr]}
                  placeholder="10-digit PAN"
                  placeholderTextColor="#9CA3AF"
                  maxLength={10}
                  autoCapitalize="characters"
                  value={field.value}
                  onChangeText={t => field.onChange(t.toUpperCase())}
                />
                <ErrText msg={fieldState.error?.message} />
              </View>
            )}
          />
        </View>
      </View>

      {/* TDS Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TDS Details</Text>
        <View style={styles.field}>
          <Text style={styles.label}>TDS Applicable?</Text>
          <View style={styles.tdsRow}>
            <Controller
              control={control}
              name="isTDSApplicable"
              render={({ field }) => (
                <>
                  <TouchableOpacity
                    onPress={() => field.onChange(true)}
                    style={[styles.tdsOption, field.value === true && styles.tdsOptionSelected]}
                  >
                    <Text style={[styles.tdsOptionText, field.value === true && styles.tdsOptionTextSel]}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => field.onChange(false)}
                    style={[styles.tdsOption, field.value === false && styles.tdsOptionSelected]}
                  >
                    <Text style={[styles.tdsOptionText, field.value === false && styles.tdsOptionTextSel]}>No</Text>
                  </TouchableOpacity>
                </>
              )}
            />
          </View>
        </View>
      </View>

      <View style={{ height: 16 }} />
    </ScrollView>
  );

  // ── Navigation Mode (full-screen with header) ──
  if (isNavigationMode) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ToastModal {...toastConfig} onClose={hideToast} />

        {/* Header */}
        <View style={styles.navHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <IonIcon name="arrow-back" size={22} color="#4F46E5" />
          </TouchableOpacity>
          <Text style={styles.navHeaderTitle}>{vendor ? 'Edit Vendor' : 'Create New Vendor'}</Text>
          <View style={styles.backBtn} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {formContent}

          {/* Footer Submit */}
          <View style={styles.navFooter}>
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>{vendor ? 'Update Vendor' : 'Create Vendor'}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Company Bottom Sheet */}
        <CompanyBottomSheet
          visible={showCompanySheet}
          onClose={() => setShowCompanySheet(false)}
          companies={allCompanies}
          selectedCompanies={selectedCompanies || []}
          onSelectionChange={val => setValue('company', val)}
          isLoading={isLoadingCompanies}
        />
      </SafeAreaView>
    );
  }

  // ── Props Mode (embedded, no header — caller controls the wrapper) ──
  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <ToastModal {...toastConfig} onClose={hideToast} />
        {formContent}

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          style={[styles.submitBtnProps, isSubmitting && styles.submitBtnDisabled]}
        >
          {isSubmitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>{vendor ? 'Save Changes' : 'Create Vendor'}</Text>}
        </TouchableOpacity>

        {/* Company Bottom Sheet */}
        <CompanyBottomSheet
          visible={showCompanySheet}
          onClose={() => setShowCompanySheet(false)}
          companies={allCompanies}
          selectedCompanies={selectedCompanies || []}
          onSelectionChange={val => setValue('company', val)}
          isLoading={isLoadingCompanies}
        />
    </View>
  );
};

export { VendorForm };
export default VendorForm;

// ─── Styles ───────────────────────────────────────────────────────────────────
const SCREEN_H = require('react-native').Dimensions.get('window').height;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  // Navigation header
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
    height: 52,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navHeaderTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1F2937', textAlign: 'center' },

  // Footer
  navFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 10 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  submitBtn: { backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  submitBtnProps: { backgroundColor: '#007AFF', padding: 16, borderRadius: 8, alignItems: 'center', margin: 16 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Form
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  field: { marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12 },
  section: { marginBottom: 25, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 7 },
  req: { color: '#EF4444' },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, backgroundColor: '#fff',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputErr: { borderColor: '#EF4444' },
  inputDisabled: { backgroundColor: '#F9FAFB' },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  inputText: { fontSize: 15, color: '#111827', flex: 1 },
  placeholder: { fontSize: 15, color: '#9CA3AF', flex: 1 },
  chevron: { fontSize: 12, color: '#6B7280' },
  error: { fontSize: 12, color: '#EF4444', marginTop: 5, fontWeight: '500' },

  // Badges
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  badgeText: { fontSize: 12, color: '#4F46E5', fontWeight: '600', maxWidth: 150 },

  // TDS
  tdsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  tdsOption: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
  tdsOptionSelected: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  tdsOptionText: { fontSize: 16, color: '#333', fontWeight: '500' },
  tdsOptionTextSel: { color: '#fff' },

  // Company bottom sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: SCREEN_H * 0.75, overflow: 'hidden' },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginTop: 10 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  closeX: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  sheetSearch: { margin: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB' },
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  selectAllText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  sheetList: { height: SCREEN_H * 0.33 },
  centerBox: { height: SCREEN_H * 0.2, alignItems: 'center', justifyContent: 'center' },
  centerText: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  listItemSel: { backgroundColor: '#F5F3FF' },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkboxSel: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  listItemText: { fontSize: 15, color: '#374151', flex: 1 },
  listItemTextSel: { color: '#4F46E5', fontWeight: '600' },
  sheetFooter: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 14, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  doneBtn: { backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Searchable picker modal
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  pickerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  pickerClose: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  pickerCloseText: { fontSize: 18, color: '#666' },
  pickerSearch: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  pickerSearchInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f9f9f9' },
  pickerOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerOptionText: { fontSize: 16, color: '#333' },
  noResultsText: { textAlign: 'center', padding: 20, color: '#999', fontSize: 16 },

  // Toast
  toastOverlay: { flex: 1, justifyContent: 'flex-start', paddingTop: 50 },
  toastContainer: { margin: 20, padding: 16, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  toastTitle: { color: 'white', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  toastMessage: { color: 'white', fontSize: 14 },
});