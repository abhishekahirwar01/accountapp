import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { State, City } from 'country-state-city';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL as baseURL } from '../../config';
import CustomDropdown from '../../components/ui/CustomDropdown';
import { Check, X, ChevronsUpDown } from 'lucide-react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';

const gstRegistrationTypes = [
  'Regular',
  'Composition',
  'Unregistered',
  'Consumer',
  'Overseas',
  'Special Economic Zone',
  'Unknown',
];

const formSchema = z
  .object({
    name: z.string().min(2, 'Customer name is required.'),
    contactNumber: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        val => {
          if (!val || val.trim() === '') return true;
          return /^[6-9]\d{9}$/.test(val.replace(/\D/g, ''));
        },
        { message: 'Enter valid 10-digit Indian mobile number' },
      ),
    email: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        val => {
          if (!val || val.trim() === '') return true;
          try {
            z.string().email().parse(val);
            return true;
          } catch {
            return false;
          }
        },
        { message: 'Enter a valid email' },
      ),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    gstin: z.string().optional().or(z.literal('')),
    gstRegistrationType: z.enum(gstRegistrationTypes).default('Unregistered'),
    pan: z
      .string()
      .length(10, 'PAN must be 10 chars')
      .optional()
      .or(z.literal('')),
    isTDSApplicable: z.boolean().default(false),
    tdsRate: z.coerce.number().optional(),
    tdsSection: z.string().optional(),
    company: z.array(z.string()).min(1, 'Select at least one company'),
  })
  .superRefine((data, ctx) => {
    if (data.gstRegistrationType !== 'Unregistered') {
      const gst = (data.gstin || '').trim();
      if (gst.length !== 15) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['gstin'],
          message: 'GSTIN must be 15 characters',
        });
      }
    }
  });

// ─── Searchable Picker ────────────────────────────────────────────────────────
export const SearchablePicker = ({
  visible,
  onClose,
  options,
  onSelect,
  title,
  searchPlaceholder = 'Search...',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: '#fff' }}
        edges={['top']}
      >
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <TouchableOpacity
            onPress={() => {
              onClose();
              setSearchQuery('');
            }}
            style={styles.pickerClose}
          >
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
                onPress={() => {
                  onSelect(option);
                  onClose();
                  setSearchQuery('');
                }}
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

// ─── Company Bottom Sheet ─────────────────────────────────────────────────────
const CompanyBottomSheet = ({
  visible,
  onClose,
  companies,
  selectedCompanies,
  onSelectionChange,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredCompanies = companies.filter(c =>
    c.businessName.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const allFilteredSelected =
    filteredCompanies.length > 0 &&
    filteredCompanies.every(c => selectedCompanies.includes(c._id));

  const toggleCompany = id => {
    onSelectionChange(
      selectedCompanies.includes(id)
        ? selectedCompanies.filter(x => x !== id)
        : [...selectedCompanies, id],
    );
  };

  const handleSelectAll = () => {
    const ids = filteredCompanies.map(c => c._id);
    const allSel = ids.every(id => selectedCompanies.includes(id));
    onSelectionChange(
      allSel
        ? selectedCompanies.filter(id => !ids.includes(id))
        : [...new Set([...selectedCompanies, ...ids])],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
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
            <Text
              style={[
                styles.selectAllText,
                allFilteredSelected && { color: '#4F46E5' },
              ]}
            >
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
            <ScrollView
              style={styles.sheetList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
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
          <View style={styles.sheetFooter}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── CustomerForm ─────────────────────────────────────────────────────────────
/**
 * Dual-mode:
 *   1. Navigation mode → navigation.navigate('CustomerForm', { customer, companies })
 *   2. Props mode      → <CustomerForm customer={...} onSuccess={...} /> (legacy)
 */
const CustomerForm = ({
  navigation,
  route,
  customer: customerProp,
  initialName,
  onSuccess: onSuccessProp,
  onCancel,
}) => {
  const customer = route?.params?.customer ?? customerProp ?? null;
  const routeCompanies = route?.params?.companies ?? null;
  const isNavigationMode = !!navigation;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stateCode, setStateCode] = useState(null);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showCompanySheet, setShowCompanySheet] = useState(false);
  const [companies, setCompanies] = useState(routeCompanies || []);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(
    !routeCompanies?.length,
  );

  const indiaStates = useMemo(() => State.getStatesOfCountry('IN'), []);
  const stateOptions = useMemo(
    () =>
      indiaStates
        .map(s => ({ value: s.isoCode, label: s.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [indiaStates],
  );
  const cityOptions = useMemo(() => {
    if (!stateCode) return [];
    return City.getCitiesOfState('IN', stateCode)
      .map(c => ({ value: c.name, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [stateCode]);
  const gstTypeOptions = useMemo(
    () => gstRegistrationTypes.map(t => ({ value: t, label: t })),
    [],
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: customer?.name || initialName || '',
      contactNumber: customer?.contactNumber || '',
      email: customer?.email || '',
      address: customer?.address || '',
      city: customer?.city || '',
      state: customer?.state || '',
      pincode: customer?.pincode || '',
      gstin: customer?.gstin || '',
      gstRegistrationType: customer?.gstRegistrationType || 'Unregistered',
      pan: customer?.pan || '',
      isTDSApplicable: customer?.isTDSApplicable || false,
      tdsRate: customer?.tdsRate || 0,
      tdsSection: customer?.tdsSection || '',
      company: [],
    },
  });

  const regType = form.watch('gstRegistrationType');
  const isTDSApplicable = form.watch('isTDSApplicable');
  const selectedCompanies = form.watch('company');

  // Fetch companies if not passed via route
  useEffect(() => {
    if (routeCompanies?.length) {
      setCompanies(routeCompanies);
      setIsLoadingCompanies(false);
      if (routeCompanies.length === 1 && !customer)
        form.setValue('company', [routeCompanies[0]._id]);
      return;
    }
    const load = async () => {
      setIsLoadingCompanies(true);
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${baseURL}/api/companies/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load companies');
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.data || [];
        setCompanies(list);
        if (list.length === 1 && !customer)
          form.setValue('company', [list[0]._id]);
      } catch (e) {
        console.error('fetch companies', e);
      } finally {
        setIsLoadingCompanies(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (regType === 'Unregistered') form.setValue('gstin', '');
  }, [regType]);

  // Init stateCode
  useEffect(() => {
    const currentStateName = form.getValues('state')?.trim();
    if (!currentStateName) {
      setStateCode(null);
      return;
    }
    const found = indiaStates.find(
      s => s.name.toLowerCase() === currentStateName.toLowerCase(),
    );
    setStateCode(found?.isoCode || null);
  }, [indiaStates]);

  // Init company from existing customer
  useEffect(() => {
    if (customer?.company) {
      let formatted = [];
      if (Array.isArray(customer.company)) {
        formatted = customer.company.map(c =>
          typeof c === 'object' && c !== null ? c._id : c,
        );
      } else if (typeof customer.company === 'string') {
        formatted = [customer.company];
      } else if (
        typeof customer.company === 'object' &&
        customer.company !== null
      ) {
        formatted = [customer.company._id];
      }
      if (formatted.length > 0) form.setValue('company', formatted);
    }
  }, [customer]);

  const sanitizeInput = input => {
    if (!input) return '';
    return input.replace(/[<>]/g, '').trim();
  };

  const handleSubmit = async values => {
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Token not found');
      const url = customer
        ? `${baseURL}/api/parties/${customer._id}`
        : `${baseURL}/api/parties`;
      const method = customer ? 'PUT' : 'POST';
      const sanitizedValues = {
        ...values,
        name: sanitizeInput(values.name),
        email: sanitizeInput(values.email),
        address: sanitizeInput(values.address),
        city: sanitizeInput(values.city),
        state: sanitizeInput(values.state),
        pincode: sanitizeInput(values.pincode),
        gstin: sanitizeInput(values.gstin),
        pan: sanitizeInput(values.pan),
        tdsSection: sanitizeInput(values.tdsSection),
      };
      const cleanedValues = Object.fromEntries(
        Object.entries(sanitizedValues).map(([key, value]) => [
          key,
          key === 'contactNumber' && value
            ? value.replace(/\D/g, '')
            : value === ''
            ? undefined
            : value,
        ]),
      );
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cleanedValues),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed operation');

      if (isNavigationMode) {
        Alert.alert(
          'Success',
          `Customer ${customer ? 'updated' : 'created'} successfully`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } else {
        onSuccessProp?.(data.party);
      }
    } catch (err) {
      if (isNavigationMode) {
        Alert.alert('Error', err.message || 'Unknown error');
      } else {
        alert(err.message || 'Unknown error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const ErrText = ({ msg }) =>
    msg ? <Text style={styles.error}>{msg}</Text> : null;

  const formContent = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Company */}
      <Controller
        control={form.control}
        name="company"
        render={({ field, fieldState }) => (
          <View style={styles.field}>
            <Text style={styles.label}>
              Company <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.inputRow, fieldState.error && styles.inputError]}
              onPress={() => setShowCompanySheet(true)}
              activeOpacity={0.7}
            >
              {isLoadingCompanies ? (
                <ActivityIndicator size="small" color="#9CA3AF" />
              ) : selectedCompanies?.length > 0 ? (
                <Text style={styles.inputText}>
                  {selectedCompanies.length} compan
                  {selectedCompanies.length > 1 ? 'ies' : 'y'} selected
                </Text>
              ) : (
                <Text style={styles.placeholderText}>Select companies</Text>
              )}
              <ChevronsUpDown size={16} color="#6B7280" />
            </TouchableOpacity>
            {selectedCompanies?.length > 0 && (
              <View style={styles.badges}>
                {selectedCompanies.map(id => {
                  const comp = companies.find(c => c._id === id);
                  return comp ? (
                    <View key={id} style={styles.badge}>
                      <Text style={styles.badgeText} numberOfLines={1}>
                        {comp.businessName}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          form.setValue(
                            'company',
                            selectedCompanies.filter(c => c !== id),
                          )
                        }
                      >
                        <X
                          size={12}
                          color="#4F46E5"
                          style={{ marginLeft: 5 }}
                        />
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

      {/* Name */}
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <View style={styles.field}>
            <Text style={styles.label}>
              Customer Name <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, fieldState.error && styles.inputError]}
              placeholder="e.g. John Doe"
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
          control={form.control}
          name="contactNumber"
          render={({ field, fieldState }) => (
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput
                style={[styles.input, fieldState.error && styles.inputError]}
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
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, fieldState.error && styles.inputError]}
                placeholder="john.doe@example.com"
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
        control={form.control}
        name="address"
        render={({ field }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Address Line (Street/Building)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="456 Park Avenue"
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
        control={form.control}
        name="state"
        render={({ field }) => (
          <View style={styles.field}>
            <Text style={styles.label}>State</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => setShowStatePicker(true)}
            >
              <Text
                style={field.value ? styles.inputText : styles.placeholderText}
              >
                {field.value || 'Select state'}
              </Text>
              <SimpleLineIcons name="arrow-down" color="#000" size={10} />
            </TouchableOpacity>
            <SearchablePicker
              visible={showStatePicker}
              onClose={() => setShowStatePicker(false)}
              options={stateOptions}
              onSelect={s => {
                setStateCode(s.value);
                field.onChange(s.label);
                form.setValue('city', '');
              }}
              title="Select State"
              searchPlaceholder="Search state..."
            />
          </View>
        )}
      />

      {/* City */}
      <Controller
        control={form.control}
        name="city"
        render={({ field }) => (
          <View style={styles.field}>
            <Text style={styles.label}>City</Text>
            <TouchableOpacity
              style={[styles.inputRow, !stateCode && styles.inputDisabled]}
              onPress={() => stateCode && setShowCityPicker(true)}
              disabled={!stateCode}
            >
              <Text
                style={field.value ? styles.inputText : styles.placeholderText}
              >
                {field.value ||
                  (stateCode ? 'Select city' : 'Select state first')}
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

      {/* Pincode */}
      <Controller
        control={form.control}
        name="pincode"
        render={({ field }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Pincode</Text>
            <TextInput
              style={styles.input}
              placeholder="400001"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={6}
              value={field.value}
              onChangeText={field.onChange}
            />
          </View>
        )}
      />

      {/* GST Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GST Details</Text>

        <Controller
          control={form.control}
          name="gstRegistrationType"
          render={({ field }) => (
            <View style={styles.field}>
              <Text style={styles.label}>
                GST Registration Type <Text style={styles.requiredStar}>*</Text>
              </Text>
              <CustomDropdown
                items={gstTypeOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select GST Registration Type"
              />
            </View>
          )}
        />

        <Controller
          control={form.control}
          name="pan"
          render={({ field, fieldState }) => (
            <View style={styles.field}>
              <Text style={styles.label}>PAN</Text>
              <TextInput
                style={[styles.input, fieldState.error && styles.inputError]}
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

        {regType !== 'Unregistered' && (
          <Controller
            control={form.control}
            name="gstin"
            render={({ field, fieldState }) => (
              <View style={styles.field}>
                <Text style={styles.label}>GSTIN</Text>
                <TextInput
                  style={[styles.input, fieldState.error && styles.inputError]}
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
        )}
      </View>

      {/* TDS Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TDS Details</Text>
        <Controller
          control={form.control}
          name="isTDSApplicable"
          render={({ field }) => (
            <View style={styles.field}>
              <Text style={styles.label}>TDS Applicable?</Text>
              <View style={styles.switchContainer}>
                <TouchableOpacity
                  onPress={() => field.onChange(true)}
                  style={[
                    styles.switchButton,
                    field.value === true && styles.switchActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.switchButtonText,
                      field.value === true && styles.switchActiveText,
                    ]}
                  >
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => field.onChange(false)}
                  style={[
                    styles.switchButton,
                    field.value === false && styles.switchInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.switchButtonText,
                      field.value === false && styles.switchInactiveText,
                    ]}
                  >
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
        {isTDSApplicable && (
          <View style={styles.tdsContainer}>
            <Controller
              control={form.control}
              name="tdsRate"
              render={({ field }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>TDS Rate (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={String(field.value || '')}
                    onChangeText={val => field.onChange(val ? Number(val) : '')}
                  />
                </View>
              )}
            />
            <Controller
              control={form.control}
              name="tdsSection"
              render={({ field }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>TDS Section</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="194J"
                    placeholderTextColor="#9CA3AF"
                    value={field.value}
                    onChangeText={field.onChange}
                  />
                </View>
              )}
            />
          </View>
        )}
      </View>

      <View style={{ height: 16 }} />
    </ScrollView>
  );

  // ── Navigation Mode ───────────────────────────────────────────────────────
  if (isNavigationMode) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.navHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <IonIcon name="arrow-back" size={22} color="#4F46E5" />
          </TouchableOpacity>
          <Text style={styles.navHeaderTitle}>
            {customer ? 'Edit Customer' : 'Create New Customer'}
          </Text>
          <View style={styles.backBtn} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {formContent}
          <View style={styles.navFooter}>
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={form.handleSubmit(handleSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {customer ? 'Update Customer' : 'Create Customer'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <CompanyBottomSheet
          visible={showCompanySheet}
          onClose={() => setShowCompanySheet(false)}
          companies={companies}
          selectedCompanies={selectedCompanies || []}
          onSelectionChange={val => form.setValue('company', val)}
          isLoading={isLoadingCompanies}
        />
      </SafeAreaView>
    );
  }

  // ── Props Mode (legacy embedded) ─────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      {formContent}
      <TouchableOpacity
        onPress={form.handleSubmit(handleSubmit)}
        disabled={isSubmitting}
        style={[styles.submitBtnProps, isSubmitting && { opacity: 0.6 }]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>
            {customer ? 'Save Changes' : 'Create Customer'}
          </Text>
        )}
      </TouchableOpacity>
      <CompanyBottomSheet
        visible={showCompanySheet}
        onClose={() => setShowCompanySheet(false)}
        companies={companies}
        selectedCompanies={selectedCompanies || []}
        onSelectionChange={val => form.setValue('company', val)}
        isLoading={isLoadingCompanies}
      />
    </View>
  );
};

export { CustomerForm };
export default CustomerForm;

// ─── Styles ───────────────────────────────────────────────────────────────────
const SCREEN_H = require('react-native').Dimensions.get('window').height;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
    height: 52,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  navFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 10 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  submitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnProps: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  field: { marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12 },
  section: {
    marginBottom: 25,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  label: { fontWeight: '600', marginBottom: 8, fontSize: 14, color: '#333' },
  requiredStar: { color: '#ff3b30' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  inputRow: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputError: { borderColor: '#EF4444' },
  inputDisabled: { backgroundColor: '#F9FAFB' },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  inputText: { fontSize: 15, color: '#111827', flex: 1 },
  placeholderText: { fontSize: 15, color: '#9CA3AF', flex: 1 },
  chevron: { fontSize: 12, color: '#6B7280' },
  error: { fontSize: 12, color: '#EF4444', marginTop: 5, fontWeight: '500' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
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
  switchContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  switchButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  switchActive: { backgroundColor: '#007AFF' },
  switchInactive: { backgroundColor: '#dc2626' },
  switchButtonText: { fontSize: 14, fontWeight: '500', color: '#666' },
  switchActiveText: { color: '#fff' },
  switchInactiveText: { color: '#fff' },
  tdsContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 10,
  },

  // Company bottom sheet
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
  sheetTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
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
  selectAllText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  sheetList: { height: SCREEN_H * 0.33 },
  centerBox: {
    height: SCREEN_H * 0.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  listItemSel: { backgroundColor: '#F5F3FF' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSel: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  listItemText: { fontSize: 15, color: '#374151', flex: 1 },
  listItemTextSel: { color: '#4F46E5', fontWeight: '600' },
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
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Searchable picker
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  pickerClose: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCloseText: { fontSize: 18, color: '#666' },
  pickerSearch: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerSearchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  pickerOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionText: { fontSize: 16, color: '#333' },
  noResultsText: {
    textAlign: 'center',
    padding: 20,
    color: '#999',
    fontSize: 16,
  },
});
