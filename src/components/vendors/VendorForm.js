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
} from 'react-native';
import { X, ChevronsUpDown, Check } from 'lucide-react-native';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { State, City } from 'country-state-city';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';

// --- Toast Modal Component ---
const ToastModal = ({ visible, type, title, message, onClose }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  const backgroundColor = type === 'destructive' ? '#dc2626' : '#16a34a';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
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

// --- Custom Hook ---
const useToast = () => {
  const [toastConfig, setToastConfig] = useState({
    visible: false,
    type: 'default',
    title: '',
    message: '',
  });

  const showToast = ({ variant, title, description }) => {
    setToastConfig({
      visible: true,
      type: variant || 'default',
      title,
      message: description,
    });
  };

  const hideToast = () => setToastConfig(prev => ({ ...prev, visible: false }));

  return { toast: showToast, toastConfig, hideToast };
};

// --- Company Selection Dialog Component ---
const CompanySelectionDialog = ({
  visible,
  onClose,
  companies,
  selectedCompanies,
  onSelectionChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCompanies = companies.filter(company =>
    company.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCompany = (companyId) => {
    const isSelected = selectedCompanies.includes(companyId);
    const newSelection = isSelected
      ? selectedCompanies.filter(id => id !== companyId)
      : [...selectedCompanies, companyId];
    onSelectionChange(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedCompanies.length === companies.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(companies.map(c => c._id));
    }
  };

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Companies</DialogTitle>
        </DialogHeader>

        <View style={styles.dialogBody}>
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search companies..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
          </View>

          {/* Select All Button */}
          <View style={styles.selectAllContainer}>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={toggleSelectAll}
            >
              <Text style={styles.selectAllText}>
                {selectedCompanies.length === companies.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Company List */}
          <ScrollView style={styles.companyList}>
            {filteredCompanies.length === 0 ? (
              <Text style={styles.noResultsText}>No companies found</Text>
            ) : (
              filteredCompanies.map(company => {
                const isSelected = selectedCompanies.includes(company._id);
                return (
                  <TouchableOpacity
                    key={company._id}
                    style={[
                      styles.companyItem,
                      isSelected && styles.companyItemSelected,
                    ]}
                    onPress={() => toggleCompany(company._id)}
                  >
                    <View style={styles.checkboxContainer}>
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxSelected,
                        ]}
                      >
                        {isSelected && <Check size={12} color="white" />}
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.companyName,
                        isSelected && styles.companyNameSelected,
                      ]}
                    >
                      {company.businessName}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Done Button */}
          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </DialogContent>
    </Dialog>
  );
};

// --- Searchable Picker Component ---
const SearchablePicker = ({
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
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
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

// --- Company Badge Component ---
const CompanyBadge = ({ company, companies, onRemove }) => {
  const companyName =
    companies.find(c => c._id === company)?.businessName || company;

  return (
    <View style={styles.badgeContainer}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{companyName}</Text>
        <TouchableOpacity
          onPress={() => onRemove(company)}
          style={styles.badgeRemoveButton}
        >
          <X size={12} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- Form Schema ---
const gstRegistrationTypes = [
  'Regular',
  'Composition',
  'Unregistered',
  'Consumer',
  'Overseas',
  'Special Economic Zone',
  'Unknown',
];

const formSchema = z.object({
  vendorName: z.string().min(2, 'Vendor name is required.'),
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
      { message: 'Enter valid 10-digit Indian mobile number' }
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
      { message: 'Enter a valid email' }
    ),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  gstin: z
    .string()
    .length(15, 'GSTIN must be 15 characters.')
    .optional()
    .or(z.literal('')),
  gstRegistrationType: z.enum(gstRegistrationTypes).default('Unregistered'),
  pan: z
    .string()
    .length(10, 'PAN must be 10 characters.')
    .optional()
    .or(z.literal('')),
  isTDSApplicable: z.boolean().default(false),
  tdsRate: z.coerce.number().optional(),
  tdsSection: z.string().optional(),
  company: z.array(z.string()).min(1, 'Select at least one company'),
});

// --- Vendor Form ---
export function VendorForm({
  vendor,
  initialName,
  onSuccess,
  hideHeader = false,
  headerTitle,
  headerSubtitle,
  onClose,
}) {
  const { toast, toastConfig, hideToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stateCode, setStateCode] = useState(null);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [showGSTTypePicker, setShowGSTTypePicker] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendorName: vendor?.vendorName || initialName || '',
      contactNumber: vendor?.contactNumber || '',
      email: vendor?.email || '',
      address: vendor?.address || '',
      city: vendor?.city || '',
      state: vendor?.state || '',
      gstin: vendor?.gstin || '',
      gstRegistrationType: vendor?.gstRegistrationType || 'Unregistered',
      pan: vendor?.pan || '',
      isTDSApplicable: vendor?.isTDSApplicable || false,
      tdsRate: vendor?.tdsRate || 0,
      tdsSection: vendor?.tdsSection || '',
      company: [],
    },
  });

  const isTDSApplicable = watch('isTDSApplicable');
  const gstRegistrationType = watch('gstRegistrationType');
  const selectedCompanies = watch('company');

  const indiaStates = useMemo(() => State.getStatesOfCountry('IN'), []);

  const stateOptions = useMemo(
    () =>
      indiaStates
        .map(s => ({ value: s.isoCode, label: s.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [indiaStates]
  );

  const cityOptions = useMemo(() => {
    if (!stateCode) return [];
    const list = City.getCitiesOfState('IN', stateCode);
    return list
      .map(c => ({ value: c.name, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [stateCode]);

  const gstTypeOptions = useMemo(
    () => gstRegistrationTypes.map(type => ({ value: type, label: type })),
    []
  );

  // Fetch companies on component mount
  useEffect(() => {
    const loadCompanies = async () => {
      setIsLoadingCompanies(true);
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/api/companies/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load companies');
        }

        const data = await response.json();
        setCompanies(data);

        // Auto-select if only one company exists
        if (data.length === 1) {
          const currentSelected = getValues('company') || [];
          if (!currentSelected.includes(data[0]._id)) {
            setValue('company', [data[0]._id]);
          }
        }
      } catch (error) {
        console.error('Failed to load companies:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load companies.',
        });
      } finally {
        setIsLoadingCompanies(false);
      }
    };

    loadCompanies();
  }, []);

  // Initialize state code from existing vendor data
  useEffect(() => {
    const currentStateName = getValues('state')?.trim();
    if (!currentStateName) {
      setStateCode(null);
      return;
    }
    const found = indiaStates.find(
      s => s.name.toLowerCase() === currentStateName.toLowerCase()
    );
    setStateCode(found?.isoCode || null);
  }, [indiaStates]);

  // Initialize company field from existing vendor data
  useEffect(() => {
    if (vendor && vendor.company) {
      let formattedCompanies = [];

      if (Array.isArray(vendor.company)) {
        formattedCompanies = vendor.company.map(c =>
          typeof c === 'object' && c !== null ? c._id : c
        );
      } else if (typeof vendor.company === 'string') {
        formattedCompanies = [vendor.company];
      } else if (typeof vendor.company === 'object' && vendor.company !== null) {
        formattedCompanies = [vendor.company._id];
      }

      if (formattedCompanies.length > 0) {
        setValue('company', formattedCompanies);
      }
    }
  }, [vendor]);

  const onSubmit = async values => {
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const url = vendor
        ? `${BASE_URL}/api/vendors/${vendor._id}`
        : `${BASE_URL}/api/vendors`;
      const method = vendor ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok)
        throw new Error(
          data.message || `Failed to ${vendor ? 'update' : 'create'} vendor.`
        );

      onSuccess(data.vendor);

      toast({
        variant: 'default',
        title: 'Success',
        description: `Vendor ${vendor ? 'updated' : 'created'} successfully.`,
      });
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dismissKeyboard = () => Keyboard.dismiss();

  const handleCompanySelection = newSelected => {
    setValue('company', newSelected);
  };

  const removeCompany = companyId => {
    const current = getValues('company') || [];
    setValue(
      'company',
      current.filter(id => id !== companyId)
    );
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <ToastModal {...toastConfig} onClose={hideToast} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          {!hideHeader && headerTitle && (
            <View style={styles.headerWrapper}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>{headerTitle}</Text>
                {headerSubtitle && (
                  <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
                )}
              </View>
              {onClose && (
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={24} color="black" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Company Field */}
            <Controller
              control={control}
              name="company"
              render={({ field, fieldState }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>
                    Company <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.companyDropdown,
                      fieldState.error && styles.inputError,
                    ]}
                    onPress={() => setShowCompanyDialog(true)}
                  >
                    {selectedCompanies && selectedCompanies.length > 0 ? (
                      <View style={styles.selectedCompaniesContainer}>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          <View style={styles.badgesContainer}>
                            {selectedCompanies.map(companyId => (
                              <CompanyBadge
                                key={companyId}
                                company={companyId}
                                companies={companies}
                                onRemove={removeCompany}
                              />
                            ))}
                          </View>
                        </ScrollView>
                        <ChevronsUpDown
                          size={16}
                          color="#666"
                          style={styles.dropdownIcon}
                        />
                      </View>
                    ) : (
                      <View style={styles.companyDropdownPlaceholder}>
                        <Text style={styles.placeholderText}>
                          {isLoadingCompanies
                            ? 'Loading companies...'
                            : 'Select companies'}
                        </Text>
                        <ChevronsUpDown
                          size={16}
                          color="#999"
                          style={styles.dropdownIcon}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                  {fieldState.error && (
                    <Text style={styles.error}>{fieldState.error.message}</Text>
                  )}

                  <CompanySelectionDialog
                    visible={showCompanyDialog}
                    onClose={() => setShowCompanyDialog(false)}
                    companies={companies}
                    selectedCompanies={selectedCompanies || []}
                    onSelectionChange={handleCompanySelection}
                  />
                </View>
              )}
            />

            {/* Vendor Name */}
            <Controller
              control={control}
              name="vendorName"
              render={({ field, fieldState }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>
                    Vendor Name <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, fieldState.error && styles.inputError]}
                    placeholder="e.g. Acme Supplies"
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
              control={control}
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
              control={control}
              name="email"
              render={({ field, fieldState }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[styles.input, fieldState.error && styles.inputError]}
                    placeholder="contact@acme.com"
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
              control={control}
              name="address"
              render={({ field }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>
                    Address Line (Street/Building)
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="123 Industrial Area"
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
              control={control}
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
                      setValue('city', '');
                    }}
                    title="Select State"
                    searchPlaceholder="Search state..."
                  />
                </View>
              )}
            />

            {/* CITY Picker with Search */}
            <Controller
              control={control}
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
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => setShowGSTTypePicker(true)}
                    >
                      <Text
                        style={
                          field.value
                            ? styles.dropdownTextSelected
                            : styles.dropdownText
                        }
                      >
                        {field.value || 'Select registration type'}
                      </Text>
                      <Text style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>

                    <SearchablePicker
                      visible={showGSTTypePicker}
                      onClose={() => setShowGSTTypePicker(false)}
                      options={gstTypeOptions}
                      onSelect={selected => field.onChange(selected.value)}
                      title="Select GST Registration Type"
                      searchPlaceholder="Search type..."
                    />

                    {fieldState.error && (
                      <Text style={styles.error}>
                        {fieldState.error.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              {/* GSTIN & PAN */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
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
                </View>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={control}
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
                          <Text style={styles.error}>
                            {fieldState.error.message}
                          </Text>
                        )}
                      </View>
                    )}
                  />
                </View>
              </View>
            </View>

            {/* TDS Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TDS Details</Text>

              {/* TDS Applicable */}
              <View style={styles.field}>
                <Text style={styles.label}>TDS Applicable?</Text>
                <View style={styles.tdsOptionsContainer}>
                  <Controller
                    control={control}
                    name="isTDSApplicable"
                    render={({ field }) => (
                      <>
                        <TouchableOpacity
                          onPress={() => field.onChange(true)}
                          style={[
                            styles.tdsOption,
                            field.value === true && styles.tdsOptionSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.tdsOptionText,
                              field.value === true &&
                                styles.tdsOptionTextSelected,
                            ]}
                          >
                            Yes
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => field.onChange(false)}
                          style={[
                            styles.tdsOption,
                            field.value === false && styles.tdsOptionSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.tdsOptionText,
                              field.value === false &&
                                styles.tdsOptionTextSelected,
                            ]}
                          >
                            No
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  />
                </View>
              </View>

              {/* TDS Details (Conditional) */}
              {isTDSApplicable && (
                <View style={styles.tdsDetailsContainer}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Controller
                        control={control}
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
                    </View>
                    <View style={{ flex: 1 }}>
                      <Controller
                        control={control}
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
                  </View>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
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
                  {vendor ? 'Save Changes' : 'Create Vendor'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  headerWrapper: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  header: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  closeButton: {
    padding: 4,
    marginLeft: 16,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  // formContainer: {
  //   padding: 20,
  // },
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
  label: {
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 16,
    color: '#333',
  },
  requiredStar: {
    color: '#ff3b30',
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
  },
  dropdownTextSelected: {
    fontSize: 16,
    color: '#333',
  },
  dropdownArrow: {
    color: '#666',
    fontSize: 12,
  },
  error: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Company Field Styles
  companyDropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    minHeight: 50,
    justifyContent: 'center',
  },
  selectedCompaniesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  badgeContainer: {
    marginRight: 6,
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 14,
    color: '#333',
    marginRight: 4,
  },
  badgeRemoveButton: {
    padding: 2,
  },
  companyDropdownPlaceholder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  dropdownIcon: {
    marginLeft: 8,
  },

  // Dialog-specific styles
  dialogBody: {
    paddingTop: 16,
  },
  selectAllContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectAllButton: {
    padding: 8,
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  companyList: {
    maxHeight: 400,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  companyItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  companyName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  companyNameSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  doneButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // TDS Styles
  tdsOptionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  tdsOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tdsOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tdsOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  tdsOptionTextSelected: {
    color: '#fff',
  },
  tdsDetailsContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 10,
  },

  // Toast Styles
  toastOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 50,
  },
  toastContainer: {
    margin: 20,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  toastMessage: {
    color: 'white',
    fontSize: 14,
  },

  // Searchable Picker Styles
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