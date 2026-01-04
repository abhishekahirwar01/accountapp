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
  registrationNumber: z
    .string()
    .min(1, 'Registration number is required')
    .trim(),
  
  businessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name must not exceed 100 characters')
    .trim(),
  
  businessType: z
    .string()
    .min(1, 'Business type is required'),
  
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must not exceed 200 characters')
    .trim(),
  
  City: z.string().optional(),
  
  addressState: z.string().optional(),
  
  Country: z.string().optional(),
  
  Pincode: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val.trim() === '') return true;
      // Indian pincode validation (6 digits)
      return /^\d{6}$/.test(val);
    }, 'Pincode must be 6 digits'),
  
  Telephone: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val.trim() === '') return true;
      // Telephone number validation (10-15 digits, optional country code)
      return /^[+]?[\d\s-]{10,15}$/.test(val);
    }, 'Please enter a valid telephone number'),
  
  mobileNumber: z
    .string({ required_error: 'Mobile number is required' })
    .trim()
    .regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits')
    .refine(val => {
      // Check if it starts with 6, 7, 8, or 9 (valid Indian mobile numbers)
      return /^[6-9]\d{9}$/.test(val);
    }, 'Mobile number must start with 6, 7, 8, or 9'),

  emailId: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val.trim() === '') return true;
      // Email validation
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return emailRegex.test(val);
    }, 'Please enter a valid email address'),

  Website: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val.trim() === '') return true;
      // URL validation
      const urlRegex = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
      return urlRegex.test(val);
    }, 'Please enter a valid website URL'),

  PANNumber: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val.trim() === '') return true;
      // PAN format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
      return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val.toUpperCase());
    }, 'PAN must be in format: AAAAA9999A (e.g., ABCDE1234F)'),

  IncomeTaxLoginPassword: z.string().optional(),

  gstin: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val.trim() === '') return true;
      // GSTIN format: 15 characters (2 state code + 10 PAN + 3 alphanumeric)
      return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val.toUpperCase());
    }, 'GSTIN must be 15 characters (e.g., 22AAAAA0000A1Z5)'),

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
      // TAN format: 4 letters, 5 digits, 1 letter (e.g., ABCD12345E)
      return /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/.test(val.toUpperCase());
    }, 'TAN must be in format: AAAA99999A (e.g., ABCD12345E)'),

  TAXDeductionCollectionAcc: z.string().optional(),
  
  DeductorType: z.string().optional(),
  
  TDSLoginUsername: z.string().optional(),
  
  TDSLoginPassword: z.string().optional(),
  
  client: z.string().optional(),
});


const additionalValidations = {
  validateMobileNumber: (value) => {
    if (!value) return { isValid: false, message: 'Mobile number is required' };
    if (!/^\d{10}$/.test(value)) {
      return { isValid: false, message: 'Mobile number must be exactly 10 digits' };
    }
    if (!/^[6-9]/.test(value)) {
      return { isValid: false, message: 'Mobile number must start with 6, 7, 8, or 9' };
    }
    return { isValid: true, message: '' };
  },

  validateEmail: (value) => {
    if (!value || value.trim() === '') return { isValid: true, message: '' };
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }
    return { isValid: true, message: '' };
  },

  validatePAN: (value) => {
    if (!value || value.trim() === '') return { isValid: true, message: '' };
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(value.toUpperCase())) {
      return { isValid: false, message: 'PAN format: AAAAA9999A (5 letters, 4 digits, 1 letter)' };
    }
    return { isValid: true, message: '' };
  },

  validateGSTIN: (value) => {
    if (!value || value.trim() === '') return { isValid: true, message: '' };
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(value.toUpperCase())) {
      return { isValid: false, message: 'GSTIN must be 15 characters (e.g., 22AAAAA0000A1Z5)' };
    }
    return { isValid: true, message: '' };
  },

  validateTAN: (value) => {
    if (!value || value.trim() === '') return { isValid: true, message: '' };
    const tanRegex = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;
    if (!tanRegex.test(value.toUpperCase())) {
      return { isValid: false, message: 'TAN format: AAAA99999A (4 letters, 5 digits, 1 letter)' };
    }
    return { isValid: true, message: '' };
  },

  validatePincode: (value) => {
    if (!value || value.trim() === '') return { isValid: true, message: '' };
    if (!/^\d{6}$/.test(value)) {
      return { isValid: false, message: 'Pincode must be 6 digits' };
    }
    return { isValid: true, message: '' };
  },

  validateWebsite: (value) => {
    if (!value || value.trim() === '') return { isValid: true, message: '' };
    const urlRegex = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/;
    if (!urlRegex.test(value)) {
      return { isValid: false, message: 'Please enter a valid website URL' };
    }
    return { isValid: true, message: '' };
  },

  validateTelephone: (value) => {
    if (!value || value.trim() === '') return { isValid: true, message: '' };
    if (!/^[+]?[\d\s-]{10,15}$/.test(value)) {
      return { isValid: false, message: 'Please enter a valid telephone number' };
    }
    return { isValid: true, message: '' };
  }
};

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
  let validation = { isValid: true, message: '' };
  
  switch (fieldName) {
    case 'mobileNumber':
      validation = additionalValidations.validateMobileNumber(value);
      break;
    case 'emailId':
      validation = additionalValidations.validateEmail(value);
      break;
    case 'PANNumber':
      validation = additionalValidations.validatePAN(value);
      break;
    case 'gstin':
      validation = additionalValidations.validateGSTIN(value);
      break;
    case 'TANNumber':
      validation = additionalValidations.validateTAN(value);
      break;
    case 'Pincode':
      validation = additionalValidations.validatePincode(value);
      break;
    case 'Website':
      validation = additionalValidations.validateWebsite(value);
      break;
    case 'Telephone':
      validation = additionalValidations.validateTelephone(value);
      break;
    default:
      break;
  }

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
        <Text style={styles.label}>
          {FIELD_LABELS[name] || name}
          {/* Show required indicator for mandatory fields */}
          {['registrationNumber', 'businessName', 'businessType', 'address', 'mobileNumber'].includes(name) && (
            <Text style={styles.required}> *</Text>
          )}
        </Text>
        <TextInput
          style={[
            styles.input,
            (errors[name] || fieldErrors[name]) && styles.inputError,
            options.multiline && styles.textArea,
          ]}
          onBlur={() => {
            onBlur();
            // Validate on blur
            if (['mobileNumber', 'emailId', 'PANNumber', 'gstin', 'TANNumber', 'Pincode', 'Website', 'Telephone'].includes(name)) {
              handleFieldValidation(name, value);
            }
          }}
          onChangeText={text => {
            // Auto-uppercase for PAN, GSTIN, TAN (fix: don't call onChange twice)
            let processedText = text;
            if (['PANNumber', 'gstin', 'TANNumber'].includes(name)) {
              processedText = text.toUpperCase();
            }
            
            // Only allow digits for mobile and pincode (not telephone)
            if (['mobileNumber', 'Pincode'].includes(name)) {
              processedText = text.replace(/[^0-9]/g, '');
              onChange(processedText);
              if (name === 'mobileNumber' && processedText.length === 10) {
                handleFieldValidation(name, processedText);
              }
              return; // Exit early to avoid calling onChange again
            }
            
            // Update the value
            onChange(processedText);
            
            // Additional handlers
            if (name === 'registrationNumber') {
              handleRegistrationChange(processedText);
            }
            
            // Real-time validation for certain fields
            if (['emailId', 'Website'].includes(name)) {
              handleFieldValidation(name, processedText);
            }
          }}
          value={value}
          placeholder={`Enter ${FIELD_LABELS[name] || name}`}
          multiline={options.multiline}
          numberOfLines={options.multiline ? 4 : 1}
          secureTextEntry={name.toLowerCase().includes('password')}
          keyboardType={
            ['mobileNumber', 'Pincode'].includes(name) 
              ? 'numeric' 
              : name === 'Telephone'
              ? 'phone-pad'
              : name === 'emailId' 
              ? 'email-address' 
              : name === 'Website'
              ? 'url'
              : 'default'
          }
          autoCapitalize={
            ['emailId', 'Website'].includes(name) 
              ? 'none' 
              : ['PANNumber', 'gstin', 'TANNumber'].includes(name)
              ? 'characters'
              : 'sentences'
          }
          maxLength={
            name === 'mobileNumber' ? 10 
            : name === 'Pincode' ? 6 
            : name === 'PANNumber' ? 10
            : name === 'gstin' ? 15
            : name === 'TANNumber' ? 10
            : undefined
          }
        />
        
        {/* Show Zod validation errors */}
        {errors[name] && (
          <View style={styles.errorContainer}>
            <AlertCircle size={14} color="#dc2626" />
            <Text style={[styles.errorText, { marginLeft: 4 }]}>{errors[name]?.message}</Text>
          </View>
        )}
        
        {/* Show custom field validation errors */}
        {!errors[name] && fieldErrors[name] && (
          <View style={styles.errorContainer}>
            <AlertCircle size={14} color="#dc2626" />
            <Text style={[styles.errorText, { marginLeft: 4 }]}>{fieldErrors[name]}</Text>
          </View>
        )}
        
        {/* Registration number specific validations */}
        {name === 'registrationNumber' && isCheckingDuplicate && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.loadingText}>Checking availability...</Text>
          </View>
        )}
        
        {name === 'registrationNumber' && !isCheckingDuplicate && duplicateError && (
          <View style={styles.errorContainer}>
            <AlertCircle size={14} color="#dc2626" />
            <Text style={[styles.errorText, { marginLeft: 4 }]}>{duplicateError}</Text>
          </View>
        )}
        
        {/* Success indicator for valid fields */}
        {!errors[name] && !fieldErrors[name] && value && 
         ['mobileNumber', 'emailId', 'PANNumber', 'gstin', 'TANNumber'].includes(name) && (
          <View style={styles.successContainer}>
            <Check size={14} color="#10b981" />
            <Text style={[styles.successText, { marginLeft: 4 }]}>Valid</Text>
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
   required: {
    color: '#dc2626',
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    color: '#10b981',
  },
});

export default CompanyForm;
