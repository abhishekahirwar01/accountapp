// CompanyForm.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  X,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Save,
  AlertCircle,
  Check,
  Upload,
  Trash2,
} from 'lucide-react-native';
import { Combobox } from '../ui/Combobox.js';
import ImagePicker from 'react-native-image-crop-picker';
import ImageCropper from '../ui/ImageCropper.js';
import { BASE_URL } from '../../config.js';
import {
  useCompanyFormValidation,
  CompanyFormValidations,
} from '../../lib/validationUtils.js';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';

// Define Zod schema
const formSchema = z.object({
  registrationNumber: z.string().min(1, 'Registration number is required'),
  businessName: z.string().min(2),
  businessType: z.string().min(2),
  address: z.string().min(5),
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
    .optional()
    .refine(val => {
      if (!val || val.trim() === '') return true;
      const validation = CompanyFormValidations.validateEmail(val);
      return validation.isValid;
    }, 'Please enter a valid email address'),

  Website: z.string().optional(),
  PANNumber: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val.trim() === '') return true;
      const validation = CompanyFormValidations.validatePANNumber(val);
      return validation.isValid;
    }, 'Please enter a valid PAN number (Format: AAAAA9999A)'),
  IncomeTaxLoginPassword: z.string().optional(),
  gstin: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val.trim() === '') return true;
      const validation = CompanyFormValidations.validateGSTIN(val);
      return validation.isValid;
    }, 'Please enter a valid GSTIN'),
  gstState: z.string().optional(),
  RegistrationType: z.string().optional(),
  PeriodicityofGSTReturns: z.string().optional(),
  GSTUsername: z.string().optional(),
  GSTPassword: z.string().optional(),
  ewayBillApplicable: z.enum(['true', 'false']),
  EWBBillUsername: z.string().optional(),
  EWBBillPassword: z.string().optional(),
  TANNumber: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val.trim() === '') return true;
      const validation = CompanyFormValidations.validateTANNumber(val);
      return validation.isValid;
    }, 'Please enter a valid TAN number (Format: ABCD12345E)'),
  TAXDeductionCollectionAcc: z.string().optional(),
  DeductorType: z.string().optional(),
  TDSLoginUsername: z.string().optional(),
  TDSLoginPassword: z.string().optional(),
  client: z.string().optional(),
});

const defaultBusinessTypes = [
  'Sole Proprietorship',
  'Partnership',
  'Private Limited Company',
  'Limited Company',
  'Others',
];

const gstRegistrationTypes = [
  'Sole Proprietorship',
  'Partnership',
  'LLP',
  'Private Limited Company',
  'Public Limited Company',
  'Section 8 Company',
  'Others',
];

const FIELD_LABELS = {
  client: 'Assign to Client',
  businessType: 'Business Type',
  businessName: 'Business Name',
  registrationNumber: 'Registration Number',
  address: 'Address',
  City: 'City',
  addressState: 'Address State',
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

const getStepFields = isClient => ({
  1: [
    ...(isClient ? [] : ['client']),
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
});

export function CompanyForm({ company, clients, onFormSubmit, onCancel }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(
    company?.logo ? `${BASE_URL}${company.logo}` : null,
  );
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');
  const checkTimeoutRef = useRef(null);
  const { validateField } = useCompanyFormValidation();
  const [role, setRole] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState('');
  const [countryCode, setCountryCode] = useState('IN');
  const [stateCode, setStateCode] = useState('');
  const [stateOptions, setStateOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingGstStates, setIsLoadingGstStates] = useState(false);
  const [gstStateCode, setGstStateCode] = useState('');
  const [gstStateOptions, setGstStateOptions] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const scrollViewRef = useRef(null);

  const getClientId = client => {
    if (!client) return '';
    if (typeof client === 'string') return client;
    return client._id;
  };

  // Load user role on mount
  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const userRole = await AsyncStorage.getItem('role');
      setRole(userRole);
      setIsClient(userRole === 'customer');
    } catch (error) {
      console.error('Error loading role:', error);
    }
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    reset,
    trigger,
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
      Country: company?.Country || '',
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
      ewayBillApplicable:
        company?.ewayBillApplicable === true
          ? 'true'
          : company?.ewayBillApplicable === false
          ? 'false'
          : 'false',
      EWBBillUsername: company?.EWBBillUsername || '',
      EWBBillPassword: company?.EWBBillPassword || '',
      TANNumber: company?.TANNumber || '',
      TAXDeductionCollectionAcc: company?.TAXDeductionCollectionAcc || '',
      DeductorType: company?.DeductorType || '',
      TDSLoginUsername: company?.TDSLoginUsername || '',
      TDSLoginPassword: company?.TDSLoginPassword || '',
      client: getClientId(company?.client),
    },
  });

  const scrollToFirstError = () => {
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  const checkDuplicateRegistration = useCallback(
    async regNumber => {
      if (!regNumber || regNumber.trim() === '') {
        setDuplicateError('');
        return;
      }

      if (company?.registrationNumber === regNumber) {
        setDuplicateError('');
        return;
      }

      setIsCheckingDuplicate(true);
      setDuplicateError('');

      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          setIsCheckingDuplicate(false);
          return;
        }

        const apiUrl = `${BASE_URL}/api/companies/check-duplicate?registrationNumber=${encodeURIComponent(
          regNumber,
        )}`;

        const res = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (res.ok) {
          if (data.exists) {
            setDuplicateError('This registration number is already in use');
          } else {
            setDuplicateError('');
          }
        }
      } catch (error) {
        console.error('Error checking duplicate:', error);
      } finally {
        setIsCheckingDuplicate(false);
      }
    },
    [BASE_URL, company],
  );

  const handleRegistrationChange = value => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(() => {
      checkDuplicateRegistration(value);
    }, 500);
  };

  const handleFieldValidation = (fieldName, value) => {
    const validation = validateField(fieldName, value);
    setFieldErrors(prev => {
      if (validation.isValid) {
        const { [fieldName]: removed, ...rest } = prev;
        return rest;
      } else {
        return { ...prev, [fieldName]: validation.message };
      }
    });
  };

  // Load states for address
  useEffect(() => {
    const loadStates = async () => {
      setIsLoadingStates(true);
      try {
        // Using country-state-city library
        const { State } = require('country-state-city');
        const states = State.getStatesOfCountry(countryCode);
        setStateOptions(states.map(s => ({ label: s.name, value: s.isoCode })));

        const currentStateName = getValues('addressState')?.trim();
        if (currentStateName) {
          const found = states.find(
            s => s.name.toLowerCase() === currentStateName.toLowerCase(),
          );
          setStateCode(found?.isoCode || '');
        }
      } catch (error) {
        console.error('Failed to load states:', error);
        Toast.show({
          type: 'error',
          text1: 'Failed to load location data',
          text2: 'Please try refreshing the page.',
        });
      } finally {
        setIsLoadingStates(false);
      }
    };

    loadStates();
  }, [countryCode, getValues]);

  // Load cities for address
  useEffect(() => {
    const loadCities = async () => {
      if (!countryCode || !stateCode) {
        setCityOptions([]);
        return;
      }

      setIsLoadingCities(true);
      try {
        const { City } = require('country-state-city');
        const cities = City.getCitiesOfState(countryCode, stateCode);
        const options = cities
          .map(c => ({ label: c.name, value: c.name }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setCityOptions(options);
      } catch (error) {
        console.error('Failed to load cities:', error);
        Toast.show({
          type: 'error',
          text1: 'Failed to load cities',
          text2: 'Please try selecting the state again.',
        });
      } finally {
        setIsLoadingCities(false);
      }
    };

    loadCities();
  }, [countryCode, stateCode]);

  // Load GST states
  useEffect(() => {
    const loadGstStates = async () => {
      setIsLoadingGstStates(true);
      try {
        const { State } = require('country-state-city');
        const states = State.getStatesOfCountry('IN');
        setGstStateOptions(
          states.map(s => ({ label: s.name, value: s.isoCode })),
        );

        const existingGstStateName = (getValues('gstState') || '').toString();
        if (existingGstStateName) {
          const found = states.find(
            s => s.name.toLowerCase() === existingGstStateName.toLowerCase(),
          );
          setGstStateCode(found?.isoCode || '');
        }
      } catch (error) {
        console.error('Failed to load GST states:', error);
      } finally {
        setIsLoadingGstStates(false);
      }
    };

    loadGstStates();
  }, [getValues]);

  // Initialize location data
  useEffect(() => {
    const initializeLocationData = async () => {
      try {
        if (!getValues('Country')) {
          setValue('Country', 'India', { shouldValidate: true });
        }
      } catch (error) {
        console.error('Failed to initialize location data:', error);
      }
    };

    initializeLocationData();
  }, [setValue, getValues]);

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
        Country: company.Country || '',
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
        ewayBillApplicable:
          company.ewayBillApplicable === true
            ? 'true'
            : company.ewayBillApplicable === false
            ? 'false'
            : 'false',
        EWBBillUsername: company.EWBBillUsername || '',
        EWBBillPassword: company.EWBBillPassword || '',
        TANNumber: company.TANNumber || '',
        TAXDeductionCollectionAcc: company.TAXDeductionCollectionAcc || '',
        DeductorType: company.DeductorType || '',
        TDSLoginUsername: company.TDSLoginUsername || '',
        TDSLoginPassword: company.TDSLoginPassword || '',
        client: getClientId(company.client),
      });
    } else {
      reset({
        registrationNumber: '',
        businessName: '',
        businessType: '',
        address: '',
        City: '',
        addressState: '',
        Country: '',
        Pincode: '',
        Telephone: '',
        mobileNumber: '',
        emailId: '',
        Website: '',
        PANNumber: '',
        IncomeTaxLoginPassword: '',
        gstin: '',
        gstState: '',
        RegistrationType: '',
        PeriodicityofGSTReturns: '',
        GSTUsername: '',
        GSTPassword: '',
        ewayBillApplicable: 'false',
        EWBBillUsername: '',
        EWBBillPassword: '',
        TANNumber: '',
        TAXDeductionCollectionAcc: '',
        DeductorType: '',
        TDSLoginUsername: '',
        TDSLoginPassword: '',
        client: '',
      });
    }
  }, [company, reset]);

  const pickImage = async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 300,
        height: 300,
        cropping: true,
        compressImageQuality: 0.95,
        mediaType: 'photo',
      });

      if (image.size > 200 * 1024) {
        Alert.alert('Error', 'File size must be less than 200 KB');
        return;
      }

      setLogoFile({
        uri: image.path,
        type: image.mime,
        name: 'logo.jpg',
      });
      setLogoPreview(image.path);
    } catch (error) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.error('Image picker error:', error);
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!company?._id) return;
    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/companies/${company._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ logo: null }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove logo');

      setLogoFile(null);
      setLogoPreview(null);
      Toast.show({
        type: 'success',
        text1: 'Logo removed successfully',
      });
      onFormSubmit();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to remove logo',
        text2: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async values => {
    if (duplicateError) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: duplicateError,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const url = company
        ? `${BASE_URL}/api/companies/${company._id}`
        : isClient
        ? `${BASE_URL}/api/companies/create`
        : `${BASE_URL}/api/companies`;
      const method = company ? 'PUT' : 'POST';

      const { client, ...rest } = values;
      const payload = isClient ? rest : { ...rest, selectedClient: client };

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, String(value));
        }
      });

      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Operation failed.');

      Toast.show({
        type: 'success',
        text1: company ? 'Company Updated!' : 'Company Created!',
        text2: `${values.businessName} has been successfully saved.`,
      });
      onFormSubmit();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Operation Failed',
        text2: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = async () => {
    if (step === 1 && duplicateError) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: duplicateError,
      });
      return;
    }

    const currentStepFields = getStepFields(isClient)[step];
    const isValid = await trigger(currentStepFields);

    if (isValid) {
      setStep(step + 1);
    } else {
      scrollToFirstError();
    }
  };

  const handleFormSubmit = async () => {
    const currentStepFields = getStepFields(isClient)[step];
    const isValid = await trigger(currentStepFields);

    if (!isValid) {
      scrollToFirstError();
      return;
    }

    if (step === 3) {
      handleSubmit(onSubmit)();
    }
  };

  const renderStepper = () => (
    <View style={styles.stepperContainer}>
      {[1, 2, 3].map((stepNumber, index, array) => (
        <View key={stepNumber} style={styles.stepContainer}>
          <TouchableOpacity
            style={[
              styles.stepCircle,
              step === stepNumber && styles.activeStepCircle,
              step > stepNumber && styles.completedStepCircle,
            ]}
            onPress={() => setStep(stepNumber)}
          >
            {step > stepNumber ? (
              <Check size={20} color="#fff" />
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  step === stepNumber && styles.activeStepNumber,
                  step > stepNumber && styles.completedStepNumber,
                ]}
              >
                {stepNumber}
              </Text>
            )}
          </TouchableOpacity>
          <Text
            style={[
              styles.stepLabel,
              step === stepNumber && styles.activeStepLabel,
              step > stepNumber && styles.completedStepLabel,
            ]}
          >
            {stepNumber === 1
              ? 'Company Basic Details'
              : stepNumber === 2
              ? 'GST Registration Details'
              : 'Company TDS Details'}
          </Text>
          {index < array.length - 1 && (
            <View
              style={[
                styles.stepLine,
                step > stepNumber && styles.completedStepLine,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderField = (name, options = {}) => (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <View style={styles.formField}>
          <Text style={styles.label}>{FIELD_LABELS[name] || name}</Text>
          <TextInput
            style={[
              styles.input,
              errors[name] && styles.inputError,
              options.multiline && styles.textArea,
            ]}
            onBlur={onBlur}
            onChangeText={text => {
              onChange(text);
              if (name === 'registrationNumber') {
                handleRegistrationChange(text);
              }
              if (
                ['emailId', 'PANNumber', 'gstin', 'TANNumber'].includes(name)
              ) {
                handleFieldValidation(name, text);
              }
            }}
            value={value}
            placeholder={`Enter ${FIELD_LABELS[name] || name}`}
            multiline={options.multiline}
            numberOfLines={options.multiline ? 4 : 1}
            secureTextEntry={name.toLowerCase().includes('password')}
          />
          {errors[name] && (
            <Text style={styles.errorText}>{errors[name]?.message}</Text>
          )}
          {fieldErrors[name] && (
            <View style={styles.fieldErrorContainer}>
              <AlertCircle size={16} color="#dc2626" />
              <Text style={styles.fieldErrorText}>{fieldErrors[name]}</Text>
            </View>
          )}
          {name === 'registrationNumber' && isCheckingDuplicate && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.loadingText}>Checking...</Text>
            </View>
          )}
          {name === 'registrationNumber' && duplicateError && (
            <View style={styles.duplicateErrorContainer}>
              <AlertCircle size={16} color="#dc2626" />
              <Text style={styles.duplicateErrorText}>{duplicateError}</Text>
            </View>
          )}
        </View>
      )}
    />
  );

  const renderSelectField = (name, items, placeholder) => (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <View style={styles.formField}>
          <Text style={styles.label}>{FIELD_LABELS[name] || name}</Text>
          <View
            style={[styles.pickerContainer, errors[name] && styles.inputError]}
          >
            <Picker
              selectedValue={value}
              onValueChange={onChange}
              style={styles.picker}
            >
              <Picker.Item
                label={placeholder || `Select ${FIELD_LABELS[name] || name}`}
                value=""
              />
              {items.map(item => (
                <Picker.Item
                  key={item.value || item}
                  label={item.label || item}
                  value={item.value || item}
                />
              ))}
            </Picker>
          </View>
          {errors[name] && (
            <Text style={styles.errorText}>{errors[name]?.message}</Text>
          )}
        </View>
      )}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Title and Cancel Button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            {company ? 'Edit Company' : 'Add New Company'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {company
              ? `Update the details for ${company.businessName}`
              : 'Fill in the form below to add a new company'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepper()}

          {step === 1 && (
            <View style={styles.stepContent}>
              {!isClient && (
                <View style={styles.formField}>
                  <Text style={styles.label}>Assign to Client</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={getValues('client')}
                      onValueChange={value => setValue('client', value)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select a client" value="" />
                      {clients.map(client => (
                        <Picker.Item
                          key={client._id}
                          label={`${client.contactName} - (${client.email})`}
                          value={client._id}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}

              {/* Logo Upload */}
              <View style={styles.logoSection}>
                <Text style={styles.label}>
                  Company Logo{' '}
                  <Text style={styles.subLabel}>(Upload under 200 KB)</Text>
                </Text>
                <TouchableOpacity style={styles.logoUpload} onPress={pickImage}>
                  <Upload size={24} color="#3b82f6" />
                  <Text style={styles.logoUploadText}>Upload Logo</Text>
                </TouchableOpacity>
                {logoPreview && (
                  <>
                    <Image
                      source={{ uri: logoPreview }}
                      style={styles.logoPreview}
                    />
                    <TouchableOpacity
                      style={styles.removeLogoButton}
                      onPress={handleRemoveLogo}
                    >
                      <Trash2 size={20} color="#dc2626" />
                      <Text style={styles.removeLogoText}>Remove Logo</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <View style={styles.grid}>
                {renderSelectField(
                  'businessType',
                  defaultBusinessTypes,
                  'Select business type',
                )}
                {renderField('businessName')}
                {renderField('registrationNumber')}
                {renderField('address', { multiline: true })}

                <View style={styles.formField}>
                  <Text style={styles.label}>Country</Text>
                  <Combobox
                    options={[{ label: 'India', value: 'IN' }]}
                    value={countryCode}
                    onChange={iso => {
                      setCountryCode(iso);
                      setStateCode('');
                      setValue('Country', 'India');
                      setValue('addressState', '');
                      setValue('City', '');
                    }}
                    placeholder="Select country"
                    searchPlaceholder="Type to search"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>State</Text>
                  <Combobox
                    options={stateOptions}
                    value={stateCode}
                    onChange={iso => {
                      setStateCode(iso);
                      const selected = stateOptions.find(s => s.value === iso);
                      const stateName = selected?.label || '';
                      setValue('addressState', stateName, {
                        shouldValidate: true,
                      });
                      setValue('City', '');
                    }}
                    placeholder={
                      isLoadingStates ? 'Loading states...' : 'Select state'
                    }
                    searchPlaceholder="Type state name"
                    disabled={isLoadingStates}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>City</Text>
                  <Combobox
                    options={cityOptions}
                    value={getValues('City') || ''}
                    onChange={value => {
                      setValue('City', value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                    placeholder={
                      isLoadingCities
                        ? 'Loading cities...'
                        : stateCode
                        ? 'Select city'
                        : 'Select a state first'
                    }
                    searchPlaceholder="Type city name"
                    disabled={
                      !stateCode || isLoadingCities || cityOptions.length === 0
                    }
                  />
                </View>

                {renderField('Pincode')}
                {renderField('Telephone')}
                {renderField('mobileNumber')}
                {renderField('emailId')}
                {renderField('Website')}
                {renderField('PANNumber')}
                {renderField('IncomeTaxLoginPassword')}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <View style={styles.grid}>
                {renderField('gstin')}

                <View style={styles.formField}>
                  <Text style={styles.label}>GST State</Text>
                  <Combobox
                    options={gstStateOptions}
                    value={gstStateCode}
                    onChange={iso => {
                      setGstStateCode(iso);
                      const selected = gstStateOptions.find(
                        s => s.value === iso,
                      );
                      setValue('gstState', selected?.label || '');
                    }}
                    placeholder={
                      isLoadingGstStates
                        ? 'Loading states...'
                        : 'Select GST state'
                    }
                    searchPlaceholder="Type state name"
                    disabled={isLoadingGstStates}
                  />
                </View>

                {renderSelectField(
                  'RegistrationType',
                  gstRegistrationTypes,
                  'Select registration type',
                )}
                {renderField('PeriodicityofGSTReturns')}
                {renderField('GSTUsername')}
                {renderField('GSTPassword')}

                {renderSelectField(
                  'ewayBillApplicable',
                  [
                    { label: 'Yes', value: 'true' },
                    { label: 'No', value: 'false' },
                  ],
                  'Select Yes or No',
                )}

                {renderField('EWBBillUsername')}
                {renderField('EWBBillPassword')}
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <View style={styles.grid}>
                {renderField('TANNumber')}
                {renderField('TAXDeductionCollectionAcc')}
                {renderField('DeductorType')}
                {renderField('TDSLoginUsername')}
                {renderField('TDSLoginPassword')}
              </View>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Bottom Action Buttons */}
        <View style={styles.bottomActions}>
          <View style={styles.actionButtons}>
            {step > 1 && (
              <TouchableOpacity
                style={[styles.button, styles.outlineButton]}
                onPress={() => setStep(step - 1)}
              >
                <ChevronLeft size={20} color="#3b82f6" />
                <Text style={[styles.buttonText, styles.outlineButtonText]}>
                  Previous
                </Text>
              </TouchableOpacity>
            )}

            {step < 3 ? (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleNextStep}
                disabled={
                  isCheckingDuplicate ||
                  Object.keys(fieldErrors).some(key =>
                    getStepFields(isClient)[step]?.includes(key),
                  )
                }
              >
                {isCheckingDuplicate ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.buttonText}>Checking...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.buttonText}>Next</Text>
                    <ChevronRight size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleFormSubmit}
                disabled={
                  isSubmitting ||
                  !!duplicateError ||
                  Object.keys(fieldErrors).length > 0
                }
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.buttonText}>
                      {company ? 'Saving...' : 'Creating...'}
                    </Text>
                  </>
                ) : (
                  <>
                    {company ? (
                      <>
                        <Save size={20} color="#fff" />
                        <Text style={styles.buttonText}>Save Changes</Text>
                      </>
                    ) : (
                      <>
                        <PlusCircle size={20} color="#fff" />
                        <Text style={styles.buttonText}>Create Company</Text>
                      </>
                    )}
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ImageCropper
          visible={showCropper}
          onCancel={() => setShowCropper(false)}
          image={tempImageSrc}
          onCropComplete={croppedImage => {
            setLogoFile({
              uri: croppedImage.path,
              type: croppedImage.mime,
              name: 'logo.jpg',
            });
            setLogoPreview(croppedImage.path);
            setShowCropper(false);
          }}
        />
      </KeyboardAvoidingView>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cancelButton: {
    padding: 4,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120, // Increased for bottom buttons
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeStepCircle: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  completedStepCircle: {
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeStepNumber: {
    color: '#fff',
  },
  completedStepNumber: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  activeStepLabel: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  completedStepLabel: {
    color: '#10b981',
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    top: 20,
    right: -20,
    width: 40,
    height: 2,
    backgroundColor: '#d1d5db',
  },
  completedStepLine: {
    backgroundColor: '#10b981',
  },
  stepContent: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  formField: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 'normal',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
  fieldErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#dc2626',
    marginLeft: 4,
  },
  duplicateErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  duplicateErrorText: {
    fontSize: 12,
    color: '#dc2626',
    marginLeft: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  loadingText: {
    fontSize: 12,
    color: '#3b82f6',
    marginLeft: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  logoSection: {
    marginBottom: 24,
  },
  logoUpload: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f0f9ff',
  },
  logoUploadText: {
    fontSize: 16,
    color: '#3b82f6',
    marginLeft: 8,
    fontWeight: '500',
  },
  logoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'center',
  },
  removeLogoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
  },
  removeLogoText: {
    fontSize: 14,
    color: '#dc2626',
    marginLeft: 4,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    marginLeft: 'auto',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#3b82f6',
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: 8,
  },
  outlineButtonText: {
    color: '#3b82f6',
  },
  bottomSpacer: {
    height: 80,
  },
});

export default CompanyForm;
