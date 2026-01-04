// CustomerForm.js
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { State, City } from 'country-state-city';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL as baseURL } from '../../config';
import CustomDropdown from '../../components/ui/CustomDropdown';
import { grey300 } from 'react-native-paper/lib/typescript/styles/themes/v2/colors';

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
          const mobileRegex = /^[6-9]\d{9}$/;
          return mobileRegex.test(val.replace(/\D/g, ''));
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

// Searchable Picker Component (for state and city)
export const SearchablePicker = ({
  visible,
  onClose,
  options,
  onSelect,
  title,
  searchPlaceholder = 'Search...',
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
        </View>

        <ScrollView style={styles.optionsContainer}>
          {filteredOptions.length === 0 ? (
            <Text style={styles.noResultsText}>No results found</Text>
          ) : (
            filteredOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
                style={styles.optionItem}
                disabled={disabled}
              >
                <Text style={styles.optionText}>{option.label}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

export function CustomerForm({
  customer,
  initialName,
  onSuccess,
  onCancel,
  hideHeader = false,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stateCode, setStateCode] = useState(null);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const indiaStates = useMemo(() => State.getStatesOfCountry('IN'), []);
  const stateOptions = indiaStates
    .map(s => ({ value: s.isoCode, label: s.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const cityOptions = useMemo(() => {
    if (!stateCode) return [];
    const list = City.getCitiesOfState('IN', stateCode);
    return list
      .map(c => ({ value: c.name, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [stateCode]);

  const gstTypeOptions = useMemo(
    () =>
      gstRegistrationTypes.map(type => ({
        value: type,
        label: type,
      })),
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
    },
  });

  const regType = form.watch('gstRegistrationType');
  const isTDSApplicable = form.watch('isTDSApplicable');

  useEffect(() => {
    if (regType === 'Unregistered') form.setValue('gstin', '');
  }, [regType]);

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
  }, []);

  const handleSubmit = async values => {
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Token not found');

      const url = customer
        ? `${baseURL}/api/parties/${customer._id}`
        : `${baseURL}/api/parties`;

      const method = customer ? 'PUT' : 'POST';

      const cleanedValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
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

      onSuccess(data.party);
    } catch (err) {
      alert(err.message || 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        bounces={true}
      >
        {/* Header Section */}
        {/* {!hideHeader && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>
                {customer ? 'Edit Customer' : 'Create New Customer'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {customer
                  ? 'Update customer details'
                  : 'Add new customer to your records'}
              </Text>
            </View>
            {onCancel && (
              <TouchableOpacity
                onPress={onCancel}
                style={styles.headerCloseButton}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} 
              >
                <Text style={styles.headerCloseButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )} */}

        {/* Form Section */}
        <View style={styles.formContainer}>
          {/* Name Field */}
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Customer Name *</Text>
                <TextInput
                  style={[styles.input, fieldState.error && styles.inputError]}
                  placeholder="e.g. John Doe"
                  value={field.value}
                  onChangeText={field.onChange}
                />
                {fieldState.error && (
                  <Text style={styles.error}>{fieldState.error.message}</Text>
                )}
              </View>
            )}
          />

          {/* Contact Number */}
          <Controller
            control={form.control}
            name="contactNumber"
            render={({ field, fieldState }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Mobile Number</Text>
                <TextInput
                  style={[styles.input, fieldState.error && styles.inputError]}
                  placeholder="9876543210"
                  keyboardType="phone-pad"
                  value={field.value}
                  maxLength={10}
                  onChangeText={text => field.onChange(text.replace(/\D/g, ''))}
                />
                {fieldState.error && (
                  <Text style={styles.error}>{fieldState.error.message}</Text>
                )}
              </View>
            )}
          />

          {/* Email */}
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, fieldState.error && styles.inputError]}
                  placeholder="john.doe@example.com"
                  value={field.value}
                  onChangeText={field.onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {fieldState.error && (
                  <Text style={styles.error}>{fieldState.error.message}</Text>
                )}
              </View>
            )}
          />

          {/* Address */}
          <Controller
            control={form.control}
            name="address"
            render={({ field }) => (
              <View style={styles.field}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="456 Park Avenue"
                  value={field.value}
                  onChangeText={field.onChange}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}
          />

          {/* STATE Picker with Search */}
          <Controller
            control={form.control}
            name="state"
            render={({ field }) => (
              <View style={styles.field}>
                <Text style={styles.label}>State</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowStatePicker(true)}
                >
                  <Text
                    style={
                      field.value
                        ? styles.dropdownTextSelected
                        : styles.dropdownText
                    }
                  >
                    {field.value || 'Select state'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                <SearchablePicker
                  visible={showStatePicker}
                  onClose={() => setShowStatePicker(false)}
                  options={stateOptions}
                  onSelect={selectedState => {
                    setStateCode(selectedState.value);
                    field.onChange(selectedState.label);
                    form.setValue('city', '');
                  }}
                  title="Select State"
                  searchPlaceholder="Search state..."
                />
              </View>
            )}
          />

          {/* CITY Picker with Search */}
          <Controller
            control={form.control}
            name="city"
            render={({ field }) => (
              <View style={styles.field}>
                <Text style={styles.label}>City</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdown,
                    !stateCode && styles.dropdownDisabled,
                  ]}
                  onPress={() => stateCode && setShowCityPicker(true)}
                  disabled={!stateCode}
                >
                  <Text
                    style={
                      field.value
                        ? styles.dropdownTextSelected
                        : styles.dropdownText
                    }
                  >
                    {field.value ||
                      (stateCode ? 'Select city' : 'Select state first')}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                <SearchablePicker
                  visible={showCityPicker}
                  onClose={() => setShowCityPicker(false)}
                  options={cityOptions}
                  onSelect={selectedCity => {
                    field.onChange(selectedCity.label);
                  }}
                  title="Select City"
                  searchPlaceholder="Search city..."
                  disabled={!stateCode}
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
                  keyboardType="numeric"
                  value={field.value}
                  onChangeText={field.onChange}
                  maxLength={6}
                />
              </View>
            )}
          />

          {/* GST Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>GST Details</Text>

            {/* GST Registration Type Dropdown */}
            <Controller
              control={form.control}
              name="gstRegistrationType"
              render={({ field }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>GST Registration Type *</Text>
                  <CustomDropdown
                    items={gstTypeOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select GST Registration Type"
                    style={styles.customDropdown}
                  />
                </View>
              )}
            />

            {/* PAN */}
            <Controller
              control={form.control}
              name="pan"
              render={({ field, fieldState }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>PAN</Text>
                  <TextInput
                    style={[
                      styles.input,
                      fieldState.error && styles.inputError,
                    ]}
                    placeholder="10-digit PAN"
                    value={field.value}
                    onChangeText={text => field.onChange(text.toUpperCase())}
                    maxLength={10}
                    autoCapitalize="characters"
                  />
                  {fieldState.error && (
                    <Text style={styles.error}>{fieldState.error.message}</Text>
                  )}
                </View>
              )}
            />

            {/* GSTIN (Conditional) */}
            {regType !== 'Unregistered' && (
              <Controller
                control={form.control}
                name="gstin"
                render={({ field, fieldState }) => (
                  <View style={styles.field}>
                    <Text style={styles.label}>GSTIN</Text>
                    <TextInput
                      style={[
                        styles.input,
                        fieldState.error && styles.inputError,
                      ]}
                      placeholder="15-digit GSTIN"
                      value={field.value}
                      onChangeText={text => field.onChange(text.toUpperCase())}
                      maxLength={15}
                      autoCapitalize="characters"
                    />
                    {fieldState.error && (
                      <Text style={styles.error}>
                        {fieldState.error.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            )}
          </View>

          {/* TDS Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TDS Details</Text>

            {/* TDS Applicable */}
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

            {/* TDS Details (Conditional) */}
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
                        keyboardType="numeric"
                        value={String(field.value || '')}
                        onChangeText={val =>
                          field.onChange(val ? Number(val) : '')
                        }
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
                        value={field.value}
                        onChangeText={field.onChange}
                      />
                    </View>
                  )}
                />
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting}
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {customer ? 'Save Changes' : 'Create Customer'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Extra space for better scrolling */}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    // paddingBottom: 30,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerCloseButton: {
    padding: 4, // Extra box background hata diya
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCloseButtonText: {
    fontSize: 22, // Thoda bada aur clean size
    color: '#374151', // Dark grey standard color
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    // padding: 20,
  },
  section: {
    marginBottom: 25,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  field: {
    marginBottom: 20,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#eee',
  },
  dropdownText: {
    fontSize: 16,
    color: '#999',
    flex: 1,
  },
  dropdownTextSelected: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownArrow: {
    color: '#666',
    fontSize: 12,
    marginLeft: 8,
  },
  customDropdown: {
    marginBottom: 0,
  },
  error: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 5,
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
  switchActive: {
    backgroundColor: '#007AFF',
  },
  switchInactive: {
    backgroundColor: '#dc2626',
  },
  switchButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  switchActiveText: {
    color: '#fff',
  },
  switchInactiveText: {
    color: '#fff',
  },
  tdsContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: Platform.OS === 'ios' ? 40 : 0,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
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
  optionsContainer: {
    flex: 1,
  },
  optionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  noResultsText: {
    textAlign: 'center',
    padding: 20,
    color: '#999',
    fontSize: 16,
  },
});
