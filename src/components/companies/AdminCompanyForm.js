import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Country, State, City } from 'country-state-city';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BASE_URL } from '../../config';
import ImagePicker from 'react-native-image-crop-picker';
import ImageCropper from '../ui/ImageCropper.js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Form Schema
const formSchema = z.object({
  registrationNumber: z.string().min(1, 'Registration number is required'),
  businessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters'),
  businessType: z.string().min(2, 'Business type is required'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  City: z.string().optional(),
  addressState: z.string().optional(),
  Country: z.string().optional(),
  Pincode: z.string().optional(),
  Telephone: z.string().optional(),
  mobileNumber: z
    .string({ required_error: 'Mobile number is required' })
    .trim()
    .min(10, 'Enter a valid 10-digit mobile number')
    .max(10, 'Enter a valid 10-digit mobile number'),
  emailId: z
    .string()
    .email('Please enter a valid email')
    .optional()
    .or(z.literal('')),
  Website: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  PANNumber: z.string().optional(),
  IncomeTaxLoginPassword: z.string().optional(),
  gstin: z.string().optional(),
  gstState: z.string().optional(),
  RegistrationType: z.string().optional(),
  PeriodicityofGSTReturns: z.string().optional(),
  GSTUsername: z.string().optional(),
  GSTPassword: z.string().optional(),
  ewayBillApplicable: z.enum(['true', 'false']),
  EWBBillUsername: z.string().optional(),
  EWBBillPassword: z.string().optional(),
  TANNumber: z.string().optional(),
  TAXDeductionCollectionAcc: z.string().optional(),
  DeductorType: z.string().optional(),
  TDSLoginUsername: z.string().optional(),
  TDSLoginPassword: z.string().optional(),
  client: z.string().min(1, 'Please select a client'),
});

const defaultBusinessTypes = [
  'Sole Proprietorship',
  'Partnership',
  'Private Limited Company',
  'Limited Company',
  'Others',
];

// Steps configuration
const steps = [
  { number: 1, label: 'Company Basic Details' },
  { number: 2, label: 'GST Registration Details' },
  { number: 3, label: 'Company TDS Details' },
];

const stepFields = {
  1: [
    'client',
    'businessType',
    'businessName',
    'registrationNumber',
    'address',
    'Country',
    'addressState',
    'City',
    'Pincode',
    'Telephone',
    'mobileNumber',
    'emailId',
    'Website',
    'PANNumber',
  ],
  2: [
    'gstin',
    'gstState',
    'RegistrationType',
    'PeriodicityofGSTReturns',
    'GSTUsername',
    'GSTPassword',
    'ewayBillApplicable',
    'EWBBillUsername',
    'EWBBillPassword',
  ],
  3: [
    'TANNumber',
    'TAXDeductionCollectionAcc',
    'DeductorType',
    'TDSLoginUsername',
    'TDSLoginPassword',
  ],
};

const FIELD_LABELS = {
  client: 'Assign to Client',
  businessType: 'Business Type',
  businessName: 'Business Name',
  registrationNumber: 'Registration Number',
  address: 'Address',
  City: 'City',
  addressState: 'State',
  Country: 'Country',
  Pincode: 'Pincode',
  Telephone: 'Telephone',
  mobileNumber: 'Mobile Number',
  emailId: 'Email ID',
  Website: 'Website',
  PANNumber: 'PAN Number',
  IncomeTaxLoginPassword: 'Income Tax Login Password',
  gstin: 'GSTIN',
  gstState: 'GST State',
  RegistrationType: 'Registration Type',
  PeriodicityofGSTReturns: 'Periodicity of GST Returns',
  GSTUsername: 'GST Username',
  GSTPassword: 'GST Password',
  ewayBillApplicable: 'E-Way Bill Applicable',
  EWBBillUsername: 'EWB Username',
  EWBBillPassword: 'EWB Password',
  TANNumber: 'TAN Number',
  TAXDeductionCollectionAcc: 'Tax Deduction/Collection A/c',
  DeductorType: 'Deductor Type',
  TDSLoginUsername: 'TDS Login Username',
  TDSLoginPassword: 'TDS Login Password',
};

const getLabel = name => FIELD_LABELS[name] || name;

// Custom Dropdown Component
const CustomDropdown = ({
  value,
  onValueChange,
  items,
  placeholder,
  style,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedItem = items.find(item => item.value === value);

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.dropdownTrigger,
          style,
          disabled && styles.dropdownDisabled,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text
          style={[
            selectedItem ? styles.dropdownText : styles.placeholderText,
            disabled && styles.dropdownTextDisabled,
          ]}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Icon name="chevron-down" size={20} color="#6b7280" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#4f46e5" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={items}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    value === item.value && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      value === item.value && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {value === item.value && (
                    <Icon name="check" size={20} color="#4f46e5" />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

// Searchable Dropdown Component
const SearchableDropdown = ({
  value,
  onValueChange,
  items,
  placeholder,
  style,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState(items);
  const insets = useSafeAreaInsets();

  const selectedItem = items.find(item => item.value === value);

  useEffect(() => {
    if (searchQuery) {
      const filtered = items.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
  }, [searchQuery, items]);

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.dropdownTrigger,
          style,
          disabled && styles.dropdownDisabled,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text
          style={[
            selectedItem ? styles.dropdownText : styles.placeholderText,
            disabled && styles.dropdownTextDisabled,
          ]}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Icon name="chevron-down" size={20} color="#6b7280" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalOverlay, { paddingTop: insets.top }]}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#4f46e5" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Icon name="magnify" size={20} color="#6b7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <FlatList
              data={filteredItems}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    value === item.value && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    setModalVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      value === item.value && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {value === item.value && (
                    <Icon name="check" size={20} color="#4f46e5" />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No results found</Text>
                </View>
              }
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default function AdminCompanyForm({ company, clients, onFormSubmit }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [logoFile, setLogoFile] = useState(null);
  const initialLogo = company?.logo
    ? company.logo.startsWith('http')
      ? company.logo
      : `${BASE_URL}${company.logo}`
    : null;
  const [logoPreview, setLogoPreview] = useState(initialLogo);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState('');
  const insets = useSafeAreaInsets();

  // Responsive screen detection
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width,
  );
  const isMobile = screenWidth < 768;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // Location states
  const [countryCode, setCountryCode] = useState('IN');
  const [stateCode, setStateCode] = useState('');
  const [stateOptions, setStateOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
    reset,
  } = useForm({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      registrationNumber: company?.registrationNumber || '',
      businessName: company?.businessName || '',
      businessType: company?.businessType || '',
      address: company?.address || '',
      City: company?.City || '',
      addressState: company?.addressState || '',
      Country: company?.Country || 'India',
      Pincode: company?.Pincode || '',
      Telephone: company?.Telephone || '',
      mobileNumber: company?.mobileNumber || '',
      emailId: company?.emailId || '',
      Website: company?.Website || '',
      PANNumber: company?.PANNumber || '',
      IncomeTaxLoginPassword: company?.IncomeTaxLoginPassword || '',
      gstin: company?.gstin || '',
      gstState: company?.gstState || '',
      RegistrationType: company?.RegistrationType || '',
      PeriodicityofGSTReturns: company?.PeriodicityofGSTReturns || '',
      GSTUsername: company?.GSTUsername || '',
      GSTPassword: company?.GSTPassword || '',
      ewayBillApplicable: company?.ewayBillApplicable ? 'true' : 'false',
      EWBBillUsername: company?.EWBBillUsername || '',
      EWBBillPassword: company?.EWBBillPassword || '',
      TANNumber: company?.TANNumber || '',
      TAXDeductionCollectionAcc: company?.TAXDeductionCollectionAcc || '',
      DeductorType: company?.DeductorType || '',
      TDSLoginUsername: company?.TDSLoginUsername || '',
      TDSLoginPassword: company?.TDSLoginPassword || '',
      client: company?.client?._id || '',
    },
  });

  // Initialize countries and set default to India
  useEffect(() => {
    const countries = Country.getAllCountries().map(country => ({
      label: country.name,
      value: country.isoCode,
    }));
    setCountryOptions(countries);

    // Set default country to India
    const india = countries.find(c => c.value === 'IN');
    if (india && !company?.Country) {
      setValue('Country', india.label);
    }
  }, []);

  // Update states when country changes
  useEffect(() => {
    const states = State.getStatesOfCountry(countryCode).map(state => ({
      label: state.name,
      value: state.isoCode,
    }));
    setStateOptions(states);
    setStateCode('');
    setValue('addressState', '');
    setValue('City', '');
  }, [countryCode, setValue]);

  // Update cities when state changes
  useEffect(() => {
    if (countryCode && stateCode) {
      const cities = City.getCitiesOfState(countryCode, stateCode).map(
        city => ({
          label: city.name,
          value: city.name,
        }),
      );
      setCityOptions(cities);
    } else {
      setCityOptions([]);
    }
  }, [countryCode, stateCode]);

  // Reset form when company changes
  useEffect(() => {
    if (company) {
      reset({
        registrationNumber: company.registrationNumber || '',
        businessName: company.businessName || '',
        businessType: company.businessType || '',
        address: company.address || '',
        City: company.City || '',
        addressState: company.addressState || '',
        Country: company.Country || 'India',
        Pincode: company.Pincode || '',
        Telephone: company.Telephone || '',
        mobileNumber: company.mobileNumber || '',
        emailId: company.emailId || '',
        Website: company.Website || '',
        PANNumber: company.PANNumber || '',
        IncomeTaxLoginPassword: company.IncomeTaxLoginPassword || '',
        gstin: company.gstin || '',
        gstState: company.gstState || '',
        RegistrationType: company.RegistrationType || '',
        PeriodicityofGSTReturns: company.PeriodicityofGSTReturns || '',
        GSTUsername: company.GSTUsername || '',
        GSTPassword: company.GSTPassword || '',
        ewayBillApplicable: company.ewayBillApplicable ? 'true' : 'false',
        EWBBillUsername: company.EWBBillUsername || '',
        EWBBillPassword: company.EWBBillPassword || '',
        TANNumber: company.TANNumber || '',
        TAXDeductionCollectionAcc: company.TAXDeductionCollectionAcc || '',
        DeductorType: company.DeductorType || '',
        TDSLoginUsername: company.TDSLoginUsername || '',
        TDSLoginPassword: company.TDSLoginPassword || '',
        client: company.client?._id || '',
      });

      // Set state code if editing existing company
      if (company.addressState) {
        const state = State.getStatesOfCountry(countryCode).find(
          s => s.name.toLowerCase() === company.addressState.toLowerCase(),
        );
        if (state) setStateCode(state.isoCode);
      }
    }
  }, [company, reset, countryCode]);

  // Handle logo upload (use image-crop-picker like CompanyForm)
  const handleLogoUpload = async () => {
    try {
      const image = await ImagePicker.openPicker({
        mediaType: 'photo',
      });

      if (!image || !image.path) return;

      // Pass picked image to cropper (match CompanyForm flow)
      setTempImageSrc(image.path);
      setShowCropper(true);
    } catch (error) {
      if (error && error.code === 'E_PICKER_CANCELLED') return;
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const onSubmit = async data => {
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const url = company
        ? `${BASE_URL}/api/companies/${company._id}`
        : `${BASE_URL}/api/companies`;
      const method = company ? 'PUT' : 'POST';

      // Map form values → body fields expected by backend
      const { client, ...rest } = data;
      const payload = { ...rest, selectedClient: client };

      let headers = {
        Authorization: `Bearer ${token}`,
      };
      let body;

      if (logoFile || method === 'POST') {
        // Use FormData for create or when logo is being uploaded
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            formData.append(k, String(v));
          }
        });
        if (logoFile) {
          formData.append('logo', logoFile);
        }
        body = formData;
      } else {
        // Use JSON for update without logo
        const jsonPayload = {
          ...payload,
          ewayBillApplicable: payload.ewayBillApplicable === 'true',
        };
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(jsonPayload);
      }

      const response = await fetch(url, {
        method,
        headers,
        body,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Operation failed.');
      }

      // If server returned updated company/logo URL, update preview immediately
      const returnedLogo =
        result?.company?.logo ||
        result?.logo ||
        result?.logoUrl ||
        result?.data?.logo;
      if (returnedLogo) {
        const finalLogo = returnedLogo.startsWith('http')
          ? returnedLogo
          : `${BASE_URL}${returnedLogo}`;
        setLogoPreview(finalLogo);
        // Clear the temporary file reference since server now holds the image
        setLogoFile(null);
      }

      Alert.alert(
        company ? 'Company Updated!' : 'Company Created!',
        `${data.businessName} has been successfully saved.`,
        [{ text: 'OK', onPress: () => onFormSubmit && onFormSubmit(result) }],
      );
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert(
        'Operation Failed',
        error.message || 'An error occurred while saving the company.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!company?._id) return;
    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${BASE_URL}/api/companies/${company._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ logo: null }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || 'Failed to remove logo');

      setLogoFile(null);
      setLogoPreview(null);
      Alert.alert('Success', 'Logo removed successfully');
      onFormSubmit();
    } catch (error) {
      Alert.alert('Failed', error.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    const fields = stepFields[step];
    const isValid = await trigger(fields);

    if (isValid) {
      setStep(step + 1);
    } else {
      Alert.alert(
        'Validation Error',
        'Please fill all required fields before proceeding to the next step.',
        [{ text: 'OK' }],
      );
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  // Mobile Step Indicator with ScrollView
  // Mobile Step Indicator
  const renderMobileStepIndicator = () => (
    <View style={styles.mobileStepContainer}>
      <View style={styles.mobileStepWrapper}>
        {steps.map((stepItem, index) => (
          <React.Fragment key={stepItem.number}>
            <TouchableOpacity
              style={styles.mobileStepItem}
              onPress={() => stepItem.number < step && setStep(stepItem.number)}
              disabled={stepItem.number > step}
            >
              <View
                style={[
                  styles.mobileStepCircle,
                  step === stepItem.number && styles.mobileStepCircleActive,
                  step > stepItem.number && styles.mobileStepCircleCompleted,
                ]}
              >
                {step > stepItem.number ? (
                  <Icon name="check" size={14} color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.mobileStepNumber,
                      step === stepItem.number && styles.mobileStepNumberActive,
                    ]}
                  >
                    {stepItem.number}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.mobileStepLabel,
                  step === stepItem.number && styles.mobileStepLabelActive,
                  step > stepItem.number && styles.mobileStepLabelCompleted,
                ]}
              >
                {stepItem.label}
              </Text>
              {step === stepItem.number && (
                <View style={styles.activeUnderline} />
              )}
            </TouchableOpacity>

            {index < steps.length - 1 && (
              <View
                style={[
                  styles.connector,
                  step > stepItem.number && styles.connectorActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );

  // Desktop Step Indicator (Updated for same UI)
  const renderDesktopStepIndicator = () => (
    <View style={styles.desktopStepContainer}>
      <View style={styles.desktopStepWrapper}>
        {steps.map((stepItem, index) => (
          <React.Fragment key={stepItem.number}>
            <TouchableOpacity
              style={styles.desktopStepItem}
              onPress={() => stepItem.number < step && setStep(stepItem.number)}
              disabled={stepItem.number > step}
            >
              <View
                style={[
                  styles.desktopStepCircle,
                  step === stepItem.number && styles.desktopStepCircleActive,
                  step > stepItem.number && styles.desktopStepCircleCompleted,
                ]}
              >
                {step > stepItem.number ? (
                  <Icon name="check" size={18} color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.desktopStepNumber,
                      step === stepItem.number &&
                        styles.desktopStepNumberActive,
                    ]}
                  >
                    {stepItem.number}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.desktopStepLabel,
                  step === stepItem.number && styles.desktopStepLabelActive,
                  step > stepItem.number && styles.desktopStepLabelCompleted,
                ]}
              >
                {stepItem.label}
              </Text>
              {step === stepItem.number && (
                <View style={styles.activeUnderlineDesktop} />
              )}
            </TouchableOpacity>

            {index < steps.length - 1 && (
              <View
                style={[
                  styles.connectorDesktop,
                  step > stepItem.number && styles.connectorActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
  const renderStepIndicator = () => {
    return isMobile
      ? renderMobileStepIndicator()
      : renderDesktopStepIndicator();
  };

  const renderFormField = (name, props = {}) => (
    <Controller
      key={name}
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{getLabel(name)}</Text>
          <TextInput
            style={[
              styles.input,
              errors[name] && styles.inputError,
              props.multiline && styles.textArea,
            ]}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder={`Enter ${getLabel(name).toLowerCase()}`}
            placeholderTextColor="#9ca3af"
            {...props}
          />
          {errors[name] && (
            <Text style={styles.errorText}>{errors[name]?.message}</Text>
          )}
        </View>
      )}
    />
  );

  const renderSelectField = (name, items, placeholder, searchable = false) => (
    <Controller
      key={name}
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{getLabel(name)}</Text>
          {searchable ? (
            <SearchableDropdown
              value={value}
              onValueChange={onChange}
              items={items}
              placeholder={placeholder}
              style={errors[name] && styles.inputError}
            />
          ) : (
            <CustomDropdown
              value={value}
              onValueChange={onChange}
              items={items}
              placeholder={placeholder}
              style={errors[name] && styles.inputError}
            />
          )}
          {errors[name] && (
            <Text style={styles.errorText}>{errors[name]?.message}</Text>
          )}
        </View>
      )}
    />
  );

  // Mobile Navigation Buttons
  const renderMobileNavigation = () => (
    <View
      style={[
        styles.mobileNavigationContainer,
        { paddingBottom: insets.bottom || 16 },
      ]}
    >
      <View style={styles.mobileButtonRow}>
        {step > 1 ? (
          <TouchableOpacity
            style={[styles.mobileButton, styles.secondaryButton]}
            onPress={handlePrevious}
            disabled={isSubmitting}
          >
            <Icon name="chevron-left" size={20} color="#374151" />
            <Text style={styles.secondaryButtonText}>Previous</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.flex1} />
        )}

        {step < 3 ? (
          <TouchableOpacity
            style={[styles.mobileButton, styles.primaryButton]}
            onPress={handleNext}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
            <Icon name="chevron-right" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.mobileButton, styles.primaryButton]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon
                  name={company ? 'content-save' : 'plus-circle'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.primaryButtonText}>
                  {company ? 'Save' : 'Create'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Desktop Navigation Buttons
  const renderDesktopNavigation = () => (
    <View style={styles.navigationContainer}>
      <View style={styles.buttonRow}>
        {step > 1 && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handlePrevious}
            disabled={isSubmitting}
          >
            <Icon name="chevron-left" size={20} color="#374151" />
            <Text style={styles.secondaryButtonText}>Previous</Text>
          </TouchableOpacity>
        )}

        {step < 3 ? (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, styles.nextButton]}
            onPress={handleNext}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
            <Icon name="chevron-right" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, styles.submitButton]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon
                  name={company ? 'content-save' : 'plus-circle'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.primaryButtonText}>
                  {company ? 'Save Changes' : 'Create Company'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderNavigationButtons = () => {
    return isMobile ? renderMobileNavigation() : renderDesktopNavigation();
  };

  return (
    <View style={styles.container}>
      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Form Content */}
      <View style={styles.formContent}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            isMobile && styles.mobileScrollContent,
          ]}
          showsVerticalScrollIndicator={true}
        >
          {/* Step 1: Company Basic Details */}
          {step === 1 && (
            <View style={styles.stepContent}>
              {renderSelectField(
                'client',
                clients.map(client => ({
                  label: `${client.contactName} - (${client.email})`,
                  value: client._id,
                })),
                'Select a client',
                true,
              )}

              {/* Logo Upload Section */}
              <View style={styles.logoContainer}>
                <Text style={styles.label}>Company Logo</Text>
                <TouchableOpacity
                  style={styles.logoUploadButton}
                  onPress={handleLogoUpload}
                >
                  <Icon name="camera" size={24} color="#6b7280" />
                  <Text style={styles.logoUploadText}>Upload Logo</Text>
                </TouchableOpacity>
                {logoPreview && (
                  <View style={styles.logoPreviewContainer}>
                    <Image
                      source={{ uri: logoPreview }}
                      style={styles.logoPreview}
                    />
                    <TouchableOpacity
                      style={styles.removeLogoButton}
                      onPress={handleRemoveLogo}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.removeLogoText}>Remove logo</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Business Type */}
              {renderSelectField(
                'businessType',
                defaultBusinessTypes.map(type => ({
                  label: type,
                  value: type,
                })),
                'Select business type',
              )}

              {/* Responsive Layout */}
              <View
                style={
                  isMobile ? styles.singleColumnLayout : styles.twoColumnLayout
                }
              >
                {renderFormField('businessName')}
                {!isMobile && renderFormField('registrationNumber')}
              </View>

              {isMobile && (
                <View style={styles.singleColumnLayout}>
                  {renderFormField('registrationNumber')}
                </View>
              )}

              <View
                style={
                  isMobile ? styles.singleColumnLayout : styles.twoColumnLayout
                }
              >
                {renderFormField('Pincode', {
                  keyboardType: 'numeric',
                  maxLength: 6,
                })}
                {renderFormField('Telephone', {
                  keyboardType: 'phone-pad',
                  maxLength: 15,
                })}
              </View>

              <View
                style={
                  isMobile ? styles.singleColumnLayout : styles.twoColumnLayout
                }
              >
                {renderFormField('mobileNumber', {
                  keyboardType: 'phone-pad',
                  maxLength: 10,
                })}
                {renderFormField('emailId', {
                  keyboardType: 'email-address',
                  autoCapitalize: 'none',
                  autoCorrect: false,
                })}
              </View>

              <View
                style={
                  isMobile ? styles.singleColumnLayout : styles.twoColumnLayout
                }
              >
                {renderFormField('Website', {
                  autoCapitalize: 'none',
                  autoCorrect: false,
                })}
                {renderFormField('PANNumber', {
                  autoCapitalize: 'characters',
                  maxLength: 10,
                })}
              </View>

              {renderFormField('IncomeTaxLoginPassword', {
                secureTextEntry: true,
                autoCapitalize: 'none',
              })}

              {renderFormField('address', {
                multiline: true,
                // style: styles.textArea,
                numberOfLines: 4,
                textAlignVertical: 'top',
              })}

              {/* Location Fields */}
              <View
                style={
                  isMobile ? styles.singleColumnLayout : styles.twoColumnLayout
                }
              >
                <Controller
                  control={control}
                  name="Country"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Country</Text>
                      <SearchableDropdown
                        value={countryCode}
                        onValueChange={code => {
                          setCountryCode(code);
                          const country = countryOptions.find(
                            c => c.value === code,
                          );
                          onChange(country?.label || '');
                        }}
                        items={countryOptions}
                        placeholder="Select country"
                      />
                    </View>
                  )}
                />

                <Controller
                  control={control}
                  name="addressState"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>State</Text>
                      <SearchableDropdown
                        value={stateCode}
                        onValueChange={code => {
                          setStateCode(code);
                          const state = stateOptions.find(
                            s => s.value === code,
                          );
                          onChange(state?.label || '');
                          setValue('City', '');
                        }}
                        items={stateOptions}
                        placeholder="Select state"
                        disabled={!countryCode}
                      />
                    </View>
                  )}
                />
              </View>

              <Controller
                control={control}
                name="City"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>City</Text>
                    <SearchableDropdown
                      value={value}
                      onValueChange={onChange}
                      items={cityOptions}
                      placeholder={
                        stateCode ? 'Select city' : 'Select state first'
                      }
                      disabled={!stateCode}
                    />
                  </View>
                )}
              />
            </View>
          )}

          {/* Step 2: GST Registration Details */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <View
                style={
                  isMobile ? styles.singleColumnLayout : styles.twoColumnLayout
                }
              >
                {renderFormField('gstin', {
                  autoCapitalize: 'characters',
                  maxLength: 15,
                })}
                {renderFormField('gstState')}
              </View>

              <View
                style={
                  isMobile ? styles.singleColumnLayout : styles.twoColumnLayout
                }
              >
                {renderFormField('RegistrationType')}
                {renderFormField('PeriodicityofGSTReturns')}
              </View>

              <View
                style={
                  isMobile ? styles.singleColumnLayout : styles.twoColumnLayout
                }
              >
                {renderFormField('GSTUsername', {
                  autoCapitalize: 'none',
                })}
                {renderFormField('GSTPassword', {
                  secureTextEntry: true,
                  autoCapitalize: 'none',
                })}
              </View>

              {renderSelectField(
                'ewayBillApplicable',
                [
                  { label: 'Yes', value: 'true' },
                  { label: 'No', value: 'false' },
                ],
                'Select Yes or No',
              )}

              <View
                style={
                  isMobile ? styles.singleColumnLayout : styles.twoColumnLayout
                }
              >
                {renderFormField('EWBBillUsername', {
                  autoCapitalize: 'none',
                })}
                {renderFormField('EWBBillPassword', {
                  secureTextEntry: true,
                  autoCapitalize: 'none',
                })}
              </View>
            </View>
          )}

          {/* Step 3: Company TDS Details */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <View
                style={
                  isMobile ? styles.singleColumnLayout : styles.twoColumnLayout
                }
              >
                {renderFormField('TANNumber', {
                  autoCapitalize: 'characters',
                })}
                {renderFormField('TAXDeductionCollectionAcc')}
              </View>

              {renderFormField('DeductorType')}

              <View
                style={
                  isMobile ? styles.singleColumnLayout : styles.twoColumnLayout
                }
              >
                {renderFormField('TDSLoginUsername', {
                  autoCapitalize: 'none',
                })}
                {renderFormField('TDSLoginPassword', {
                  secureTextEntry: true,
                  autoCapitalize: 'none',
                })}
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      <ImageCropper
        visible={showCropper}
        onCancel={() => setShowCropper(false)}
        image={tempImageSrc}
        onCropComplete={croppedImage => {
          const fileObj = {
            uri: croppedImage.path,
            type: croppedImage.mime || 'image/jpeg',
            name: `logo_${Date.now()}.jpg`,
          };
          setLogoFile(fileObj);
          setLogoPreview(croppedImage.path);
          setShowCropper(false);
        }}
      />

      {/* Navigation Buttons */}
      {renderNavigationButtons()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  connector: {
    height: 2,
    width: 40, // Mobile connector length
    backgroundColor: '#e5e7eb',
    marginTop: -25, // Circle center alignment
  },
  connectorDesktop: {
    height: 2,
    width: 100, // Desktop connector length (Longer)
    backgroundColor: '#e5e7eb',
    marginTop: -35,
  },
  connectorActive: {
    backgroundColor: '#818cf8', // Image jaisa active color
  },

  // --- Mobile Styles ---
  mobileStepContainer: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  mobileStepWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileStepItem: {
    alignItems: 'center',
    width: 80, // Fixed width for mobile to keep it tight
  },
  mobileStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  mobileStepCircleActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#4f46e5',
  },
  mobileStepCircleCompleted: {
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  mobileStepNumber: { fontSize: 12, fontWeight: 'bold', color: '#6b7280' },
  mobileStepNumberActive: { color: '#fff' },
  mobileStepLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9ca3af',
    textAlign: 'center',
  },
  mobileStepLabelActive: { color: '#4f46e5' },
  mobileStepLabelCompleted: { color: '#10b981' },
  activeUnderline: {
    height: 3,
    width: 20,
    backgroundColor: '#4f46e5',
    borderRadius: 2,
    marginTop: 4,
  },

  // --- Desktop Styles ---
  desktopStepContainer: {
    backgroundColor: '#fff',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  desktopStepWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopStepItem: {
    alignItems: 'center',
    width: 150, // More space for desktop
  },
  desktopStepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  desktopStepCircleActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#4f46e5',
  },
  desktopStepCircleCompleted: {
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  desktopStepNumber: { fontSize: 16, fontWeight: 'bold', color: '#6b7280' },
  desktopStepNumberActive: { color: '#fff' },
  desktopStepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    textAlign: 'center',
  },
  desktopStepLabelActive: { color: '#4f46e5' },
  desktopStepLabelCompleted: { color: '#10b981' },
  activeUnderlineDesktop: {
    height: 4,
    width: 30,
    backgroundColor: '#4f46e5',
    borderRadius: 2,
    marginTop: 6,
  },
  // Form Content
  formContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100,
  },
  mobileScrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  stepContent: {
    gap: 16,
  },

  // Responsive Layouts
  singleColumnLayout: {
    flexDirection: 'column',
    gap: 16,
  },
  twoColumnLayout: {
    flexDirection: 'row',
    gap: 16,
  },

  // Form Elements
  inputContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#374151',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },

  // Dropdown Styles
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dropdownDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  dropdownText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  dropdownTextDisabled: {
    color: '#9ca3af',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9ca3af',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemSelected: {
    backgroundColor: '#f8faff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 16,
  },

  // Logo Styles
  logoContainer: {
    marginVertical: 8,
  },
  logoUploadButton: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoUploadText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 16,
  },
  logoPreviewContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  logoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  removeLogoButton: {
    marginTop: 8,
    padding: 8,
  },
  removeLogoText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },

  // Navigation Buttons
  // Mobile Navigation
  mobileNavigationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  mobileButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  mobileButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 50,
  },

  // Desktop Navigation
  navigationContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
    flexDirection: 'row',
    gap: 8,
  },

  // Button Styles
  primaryButton: {
    backgroundColor: '#4f46e5',
    ...Platform.select({
      ios: {
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
  },
  nextButton: {
    marginLeft: 'auto',
  },
  submitButton: {
    marginLeft: 'auto',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },

  // Utility
  flex1: {
    flex: 1,
  },
});
