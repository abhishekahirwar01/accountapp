import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch as RNSwitch,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../hooks/useToast';
import ClientValidityCard from '../admin/settings/ClientValidityCard';
import { BASE_URL } from '../../config';
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react-native';

// Field validation functions
const fieldValidations = {
  validateContactName: value => {
    if (!value || value.trim().length < 2) {
      return {
        isValid: false,
        message: 'Contact name must be at least 2 characters',
      };
    }
    if (value.trim().length > 50) {
      return {
        isValid: false,
        message: 'Contact name must not exceed 50 characters',
      };
    }
    return { isValid: true, message: '' };
  },

  validateUsername: (value, isEditMode) => {
    if (isEditMode) return { isValid: true, message: '' };

    if (!value || value.trim().length < 4) {
      return {
        isValid: false,
        message: 'Username must be at least 4 characters',
      };
    }
    if (value.length > 24) {
      return {
        isValid: false,
        message: 'Username must not exceed 24 characters',
      };
    }
    if (!/^[a-z0-9_.]{4,24}$/.test(value)) {
      return {
        isValid: false,
        message:
          'Username can only contain lowercase letters, numbers, dots, and underscores',
      };
    }
    return { isValid: true, message: '' };
  },

  validateEmail: value => {
    if (!value || value.trim().length === 0) {
      return { isValid: false, message: 'Email is required' };
    }
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value.trim())) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }
    return { isValid: true, message: '' };
  },

  validatePhone: value => {
    if (!value || value.trim().length < 6) {
      return {
        isValid: false,
        message: 'Phone number must be at least 6 characters',
      };
    }
    // Check if it contains at least some digits
    if (!/\d/.test(value)) {
      return { isValid: false, message: 'Phone number must contain digits' };
    }
    return { isValid: true, message: '' };
  },

  validatePassword: (value, isEditMode) => {
    if (isEditMode) return { isValid: true, message: '' };

    if (!value || value.length < 6) {
      return {
        isValid: false,
        message: 'Password must be at least 6 characters',
      };
    }
    if (value.length > 50) {
      return {
        isValid: false,
        message: 'Password must not exceed 50 characters',
      };
    }
    return { isValid: true, message: '' };
  },

  validateNewPassword: value => {
    if (!value || value.trim().length === 0) {
      return { isValid: false, message: 'New password is required' };
    }
    if (value.length < 6) {
      return {
        isValid: false,
        message: 'Password must be at least 6 characters',
      };
    }
    if (value.length > 50) {
      return {
        isValid: false,
        message: 'Password must not exceed 50 characters',
      };
    }
    return { isValid: true, message: '' };
  },

  validateValidityAmount: value => {
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      return {
        isValid: false,
        message: 'Validity amount must be greater than 0',
      };
    }
    if (num > 999) {
      return { isValid: false, message: 'Validity amount seems too large' };
    }
    return { isValid: true, message: '' };
  },

  validateValidityUnit: value => {
    const validUnits = ['days', 'months', 'years'];
    if (!validUnits.includes(value.toLowerCase())) {
      return {
        isValid: false,
        message: 'Validity unit must be days, months, or years',
      };
    }
    return { isValid: true, message: '' };
  },

  validateMaxValue: (value, fieldName, max = 1000) => {
    const num = Number(value);
    if (isNaN(num) || num < 0) {
      return { isValid: false, message: `${fieldName} must be 0 or greater` };
    }
    if (num > max) {
      return { isValid: false, message: `${fieldName} must not exceed ${max}` };
    }
    return { isValid: true, message: '' };
  },
};

function slugifyUsername(s = '') {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_.]+/g, '')
    .slice(0, 24);
}

function localSuggestions(base = '', tried) {
  const core = slugifyUsername(base) || 'user';
  const y = new Date().getFullYear().toString();
  const seeds = [
    core,
    `${core}1`,
    `${core}123`,
    `${core}${y.slice(-2)}`,
    `${core}${y}`,
    `${core}_official`,
    `${core}_hq`,
    `real${core}`,
    `${core}_co`,
    `${core}_app`,
  ];
  return Array.from(new Set(seeds))
    .filter(s => s && s !== tried)
    .slice(0, 6);
}

export default function ClientForm({
  client,
  onSubmit: parentOnSubmit,
  onCancel,
  hideAdvanced = false,
  navigation: navProp,
  hideHeader = false,
}) {
  const { toast } = useToast();
  const navigation = useNavigation();

  // form state
  const [contactName, setContactName] = useState(client?.contactName || '');
  const [clientUsername, setClientUsername] = useState(
    client?.clientUsername || '',
  );
  const [email, setEmail] = useState(client?.email || '');
  const [phone, setPhone] = useState(client?.phone || '');
  const [password, setPassword] = useState('');
  const [maxCompanies, setMaxCompanies] = useState(client?.maxCompanies ?? 5);
  const [maxUsers, setMaxUsers] = useState(client?.maxUsers ?? 10);
  const [maxInventories, setMaxInventories] = useState(
    client?.maxInventories ?? 50,
  );
  const [canSendInvoiceEmail, setCanSendInvoiceEmail] = useState(
    client?.canSendInvoiceEmail ?? false,
  );
  const [canSendInvoiceWhatsapp, setCanSendInvoiceWhatsapp] = useState(
    client?.canSendInvoiceWhatsapp ?? false,
  );
  const [canCreateUsers, setCanCreateUsers] = useState(
    client?.canCreateUsers ?? true,
  );
  const [canCreateCustomers, setCanCreateCustomers] = useState(
    client?.canCreateCustomers ?? true,
  );
  const [canCreateVendors, setCanCreateVendors] = useState(
    client?.canCreateVendors ?? true,
  );
  const [canCreateProducts, setCanCreateProducts] = useState(
    client?.canCreateProducts ?? true,
  );
  const [canCreateCompanies, setCanCreateCompanies] = useState(
    client?.canCreateCompanies ?? false,
  );
  const [canUpdateCompanies, setCanUpdateCompanies] = useState(
    client?.canUpdateCompanies ?? false,
  );
  const [validityAmount, setValidityAmount] = useState(30);
  const [validityUnit, setValidityUnit] = useState('days');
  const [eyeOpen, setEyeOpen] = useState(false);
  const [showValidityUnitDropdown, setShowValidityUnitDropdown] =
    useState(false);

  // Validation errors state
  const [fieldErrors, setFieldErrors] = useState({});

  // Permissions management state
  const [currentPermissions, setCurrentPermissions] = useState({
    maxCompanies: client?.maxCompanies || 5,
    maxUsers: client?.maxUsers || 10,
    maxInventories: client?.maxInventories || 50,
    canSendInvoiceEmail: client?.canSendInvoiceEmail || false,
    canSendInvoiceWhatsapp: client?.canSendInvoiceWhatsapp || false,
    canCreateUsers: client?.canCreateUsers || true,
    canCreateCustomers: client?.canCreateCustomers || true,
    canCreateVendors: client?.canCreateVendors || true,
    canCreateProducts: client?.canCreateProducts || true,
    canCreateCompanies: client?.canCreateCompanies || false,
    canUpdateCompanies: client?.canUpdateCompanies || false,
  });

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [eyeOpenPassword, setEyeOpenPassword] = useState(false);

  // UX / async state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [authToken, setAuthToken] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Field validation handler
  const handleFieldValidation = (fieldName, value) => {
    let validation = { isValid: true, message: '' };

    switch (fieldName) {
      case 'contactName':
        validation = fieldValidations.validateContactName(value);
        break;
      case 'clientUsername':
        validation = fieldValidations.validateUsername(value, !!client);
        break;
      case 'email':
        validation = fieldValidations.validateEmail(value);
        break;
      case 'phone':
        validation = fieldValidations.validatePhone(value);
        break;
      case 'password':
        validation = fieldValidations.validatePassword(value, !!client);
        break;
      case 'newPassword':
        validation = fieldValidations.validateNewPassword(value);
        break;
      case 'validityAmount':
        validation = fieldValidations.validateValidityAmount(value);
        break;
      case 'validityUnit':
        validation = fieldValidations.validateValidityUnit(value);
        break;
      case 'maxCompanies':
        validation = fieldValidations.validateMaxValue(
          value,
          'Max Companies',
          1000,
        );
        break;
      case 'maxUsers':
        validation = fieldValidations.validateMaxValue(
          value,
          'Max Users',
          1000,
        );
        break;
      case 'maxInventories':
        validation = fieldValidations.validateMaxValue(
          value,
          'Max Inventories',
          10000,
        );
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

    return validation.isValid;
  };

  // load token
  useEffect(() => {
    AsyncStorage.getItem('token')
      .then(t => setAuthToken(t))
      .catch(() => setAuthToken(null));
  }, []);

  // expiry preview for create mode
  const expiryPreview = useMemo(() => {
    if (client) return null;
    const d = new Date();
    if (validityUnit === 'days')
      d.setDate(d.getDate() + Number(validityAmount));
    if (validityUnit === 'months')
      d.setMonth(d.getMonth() + Number(validityAmount));
    if (validityUnit === 'years')
      d.setFullYear(d.getFullYear() + Number(validityAmount));
    return d.toDateString();
  }, [validityAmount, validityUnit, client]);

  // username availability check (debounced)
  useEffect(() => {
    if (client) {
      setUsernameAvailable(true);
      setUsernameSuggestions([]);
      setCheckingUsername(false);
      return;
    }

    const raw = (clientUsername || '').trim().toLowerCase();
    if (!raw) {
      setUsernameAvailable(null);
      setUsernameSuggestions([]);
      setCheckingUsername(false);
      return;
    }

    if (!/^[a-z0-9_.]{4,24}$/.test(raw)) {
      setUsernameAvailable(false);
      setUsernameSuggestions(localSuggestions(contactName || raw, raw));
      setCheckingUsername(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setCheckingUsername(true);
    setUsernameAvailable(null);

    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          username: raw,
          base: contactName || raw,
        });
        const res = await fetch(
          `${BASE_URL}/api/clients/check-username?${params.toString()}`,
          {
            method: 'GET',
            signal: controller.signal,
          },
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || !data?.ok) {
          setUsernameAvailable(null);
          setUsernameSuggestions([]);
        } else if (data.available) {
          setUsernameAvailable(true);
          setUsernameSuggestions([]);
        } else {
          setUsernameAvailable(false);
          setUsernameSuggestions(
            (data.suggestions?.length
              ? data.suggestions
              : localSuggestions(contactName || raw, raw)
            ).slice(0, 6),
          );
        }
      } catch {
        if (!cancelled) {
          setUsernameAvailable(null);
          setUsernameSuggestions([]);
        }
      } finally {
        if (!cancelled) setCheckingUsername(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(t);
      setCheckingUsername(false);
    };
  }, [clientUsername, contactName, client]);

  useEffect(() => {
    if (client && activeTab === 'permissions' && !permissionsLoaded) {
      loadPermissions();
    }
  }, [client, activeTab, permissionsLoaded]);

  useEffect(() => {
    if (!client) return;
    setContactName(client.contactName || '');
    setClientUsername(client.clientUsername || '');
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setMaxCompanies(client.maxCompanies ?? 5);
    setMaxUsers(client.maxUsers ?? 10);
    setMaxInventories(client.maxInventories ?? 50);
    setCanSendInvoiceEmail(client.canSendInvoiceEmail ?? false);
    setCanSendInvoiceWhatsapp(client.canSendInvoiceWhatsapp ?? false);
    setCanCreateUsers(client.canCreateUsers ?? true);
    setCanCreateCustomers(client.canCreateCustomers ?? true);
    setCanCreateVendors(client.canCreateVendors ?? true);
    setCanCreateProducts(client.canCreateProducts ?? true);
    setCanCreateCompanies(client.canCreateCompanies ?? false);
    setCanUpdateCompanies(client.canUpdateCompanies ?? false);
  }, [client]);

  const validateClientForm = useCallback(() => {
    const errors = {};

    // Validate all required fields
    if (!handleFieldValidation('contactName', contactName)) {
      errors.contactName = fieldErrors.contactName;
    }

    if (!client && !handleFieldValidation('clientUsername', clientUsername)) {
      errors.clientUsername = fieldErrors.clientUsername;
    }

    if (!handleFieldValidation('email', email)) {
      errors.email = fieldErrors.email;
    }

    if (!handleFieldValidation('phone', phone)) {
      errors.phone = fieldErrors.phone;
    }

    if (!client && !handleFieldValidation('password', password)) {
      errors.password = fieldErrors.password;
    }

    if (!client) {
      if (!handleFieldValidation('validityAmount', validityAmount)) {
        errors.validityAmount = fieldErrors.validityAmount;
      }
      if (!handleFieldValidation('validityUnit', validityUnit)) {
        errors.validityUnit = fieldErrors.validityUnit;
      }
    }

    if (checkingUsername) {
      toast({
        variant: 'destructive',
        title: 'Please wait',
        description: 'Still checking username availability.',
      });
      return false;
    }

    if (!client && usernameAvailable === false) {
      toast({
        variant: 'destructive',
        title: 'Username taken',
        description: 'Choose a different username.',
      });
      return false;
    }

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: firstError,
      });
      return false;
    }

    return true;
  }, [
    contactName,
    clientUsername,
    email,
    phone,
    password,
    validityAmount,
    validityUnit,
    checkingUsername,
    usernameAvailable,
    client,
    fieldErrors,
    toast,
  ]);

  const applyServerErrorsToUI = message => {
    const lower = (message || '').toLowerCase();
    if (lower.includes('username')) {
      setUsernameAvailable(false);
      setUsernameSuggestions(
        localSuggestions(contactName || clientUsername, clientUsername).slice(
          0,
          6,
        ),
      );
      toast({
        variant: 'destructive',
        title: 'Username error',
        description: message,
      });
      return true;
    }
    if (lower.includes('email')) {
      toast({
        variant: 'destructive',
        title: 'Email error',
        description: message,
      });
      return true;
    }
    if (lower.includes('phone')) {
      toast({
        variant: 'destructive',
        title: 'Phone error',
        description: message,
      });
      return true;
    }
    return false;
  };

  const loadPermissions = async () => {
    if (!client) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(
        `${BASE_URL}/api/clients/${client._id}/permissions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data = await res.json();
        setCurrentPermissions({
          maxCompanies: data.maxCompanies,
          maxUsers: data.maxUsers,
          maxInventories: data.maxInventories,
          canSendInvoiceEmail: data.canSendInvoiceEmail,
          canSendInvoiceWhatsapp: data.canSendInvoiceWhatsapp,
          canCreateUsers: data.canCreateUsers,
          canCreateCustomers: data.canCreateCustomers,
          canCreateVendors: data.canCreateVendors,
          canCreateProducts: data.canCreateProducts,
          canCreateCompanies: data.canCreateCompanies,
          canUpdateCompanies: data.canUpdateCompanies,
        });
      } else {
        setCurrentPermissions({
          maxCompanies: client.maxCompanies || 5,
          maxUsers: client.maxUsers || 10,
          maxInventories: client.maxInventories || 50,
          canSendInvoiceEmail: client.canSendInvoiceEmail || false,
          canSendInvoiceWhatsapp: client.canSendInvoiceWhatsapp || false,
          canCreateUsers: client.canCreateUsers || true,
          canCreateCustomers: client.canCreateCustomers || true,
          canCreateVendors: client.canCreateVendors || true,
          canCreateProducts: client.canCreateProducts || true,
          canCreateCompanies: client.canCreateCompanies || false,
          canUpdateCompanies: client.canUpdateCompanies || false,
        });
      }
    } catch (error) {
      setCurrentPermissions({
        maxCompanies: client.maxCompanies || 5,
        maxUsers: client.maxUsers || 10,
        maxInventories: client.maxInventories || 50,
        canSendInvoiceEmail: client.canSendInvoiceEmail || false,
        canSendInvoiceWhatsapp: client.canSendInvoiceWhatsapp || false,
        canCreateUsers: client.canCreateUsers || true,
        canCreateCustomers: client.canCreateCustomers || true,
        canCreateVendors: client.canCreateVendors || true,
        canCreateProducts: client.canCreateProducts || true,
        canCreateCompanies: client.canCreateCompanies || false,
        canUpdateCompanies: client.canUpdateCompanies || false,
      });
    }
    setPermissionsLoaded(true);
  };

  const handlePermissionChange = (field, value) => {
    setCurrentPermissions(prev => ({ ...prev, [field]: value }));

    // Validate numeric fields
    if (['maxCompanies', 'maxUsers', 'maxInventories'].includes(field)) {
      handleFieldValidation(field, value);
    }
  };

  const validatePermissions = () => {
    const errors = {};

    if (
      !handleFieldValidation('maxCompanies', currentPermissions.maxCompanies)
    ) {
      errors.maxCompanies = true;
    }
    if (!handleFieldValidation('maxUsers', currentPermissions.maxUsers)) {
      errors.maxUsers = true;
    }
    if (
      !handleFieldValidation(
        'maxInventories',
        currentPermissions.maxInventories,
      )
    ) {
      errors.maxInventories = true;
    }

    if (Object.keys(errors).length > 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fix the errors in the form before saving.',
      });
      return false;
    }

    return true;
  };

  const handleSavePermissions = async () => {
    if (!client) return;

    if (!validatePermissions()) return;

    setIsSavingPermissions(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(
        `${BASE_URL}/api/clients/${client._id}/permissions`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(currentPermissions),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update permissions.');
      }

      // Show success alert
      Alert.alert(
        'Success',
        `Permissions for ${client.contactName} have been updated successfully!`,
        [{ text: 'OK' }],
      );

      // Also show toast if available
      toast({
        variant: 'default',
        title: 'Success',
        description: `Permissions for ${client.contactName} have been updated successfully.`,
      });
    } catch (error) {
      // Show error alert
      Alert.alert(
        'Update Failed',
        error instanceof Error
          ? error.message
          : 'Failed to update permissions.',
        [{ text: 'OK' }],
      );

      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description:
          error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleResetPassword = async () => {
    if (!client) return;

    if (!handleFieldValidation('newPassword', newPassword)) {
      Alert.alert(
        'Validation Error',
        fieldErrors.newPassword || 'New password is invalid.',
      );
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(
        `${BASE_URL}/api/clients/reset-password/${client._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newpassword: newPassword }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to reset password.');
      }

      Alert.alert(
        'Success',
        `Password for ${client.contactName} has been reset successfully!`,
        [{ text: 'OK' }],
      );

      setNewPassword('');
      setFieldErrors(prev => {
        const { newPassword: removed, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      Alert.alert(
        'Password Reset Failed',
        error instanceof Error ? error.message : 'Something went wrong.',
      );
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateClientForm()) return;
    setIsSubmitting(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        toast({
          variant: 'destructive',
          title: 'Auth required',
          description: 'You must be logged in.',
        });
        setIsSubmitting(false);
        return;
      }

      const url = client
        ? `${BASE_URL}/api/clients/${client._id}`
        : `${BASE_URL}/api/clients`;
      const method = client ? 'PATCH' : 'POST';

      const body = {
        contactName: contactName.trim(),
        clientUsername: clientUsername.trim(),
        email: email.trim(),
        phone: phone.trim(),
        maxCompanies,
        maxUsers,
        maxInventories,
        canSendInvoiceEmail,
        canSendInvoiceWhatsapp,
        canCreateUsers,
        canCreateCustomers,
        canCreateVendors,
        canCreateProducts,
        canCreateCompanies,
        canUpdateCompanies,
      };

      if (!client) {
        body.password = password;
        body.validity = { amount: Number(validityAmount), unit: validityUnit };
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || 'Failed to save client';
        applyServerErrorsToUI(msg);
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: msg,
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: `Client ${client ? 'updated' : 'created'}`,
        description: `${contactName} saved.`,
      });
      parentOnSubmit?.(data);

      // Navigate back to AdminClientManagement after successful creation
      if (navigation && !client) {
        navigation.navigate('AdminClientManagement');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      applyServerErrorsToUI(msg);
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTabButton = (tabName, label) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tabName && styles.activeTab]}
      onPress={() => setActiveTab(tabName)}
    >
      <Text
        style={[styles.tabText, activeTab === tabName && styles.activeTabText]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Render form field with validation
  const renderFormField = (label, value, onChange, fieldName, options = {}) => {
    const {
      placeholder = '',
      keyboardType = 'default',
      secureTextEntry = false,
      editable = true,
      multiline = false,
      showValidation = true,
      required = true,
    } = options;

    return (
      <View style={styles.section}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        <TextInput
          style={[
            styles.input,
            !editable && styles.inputDisabled,
            fieldErrors[fieldName] && styles.inputError,
          ]}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChange}
          onBlur={() => handleFieldValidation(fieldName, value)}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          editable={editable}
          multiline={multiline}
        />

        {fieldErrors[fieldName] && (
          <View style={styles.errorContainer}>
            <AlertCircle size={14} color="#dc2626" />
            <Text style={styles.errorText}>{fieldErrors[fieldName]}</Text>
          </View>
        )}

        {showValidation &&
          !fieldErrors[fieldName] &&
          value &&
          !secureTextEntry && (
            <View style={styles.successContainer}>
              <Check size={14} color="#10b981" />
              <Text style={styles.successText}>Valid</Text>
            </View>
          )}
      </View>
    );
  };

  const renderGeneralForm = () => (
    <ScrollView style={styles.tabContent}>
      {renderFormField(
        'Contact Name',
        contactName,
        text => {
          setContactName(text);
          handleFieldValidation('contactName', text);
        },
        'contactName',
        { placeholder: 'e.g. John Doe' },
      )}

      <View style={styles.section}>
        <Text style={styles.label}>
          Username
          {!client && <Text style={styles.required}> *</Text>}
        </Text>
        <View>
          <TextInput
            style={[
              styles.input,
              client && styles.inputDisabled,
              fieldErrors.clientUsername && styles.inputError,
            ]}
            placeholder="e.g. johndoe"
            placeholderTextColor="#9CA3AF"
            value={clientUsername}
            editable={!client}
            onChangeText={t => {
              const processed = t.toLowerCase().replace(/\s+/g, '');
              setClientUsername(processed);
              handleFieldValidation('clientUsername', processed);
            }}
            onBlur={() =>
              handleFieldValidation('clientUsername', clientUsername)
            }
          />
          {!client && (
            <View style={styles.validationRow}>
              {checkingUsername && <ActivityIndicator size="small" />}
              {usernameAvailable === true && !checkingUsername && (
                <View style={styles.successContainer}>
                  <Check size={14} color="#10b981" />
                  <Text style={styles.successText}>Available</Text>
                </View>
              )}
              {usernameAvailable === false && !checkingUsername && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={14} color="#dc2626" />
                  <Text style={styles.errorText}>Username taken</Text>
                </View>
              )}
            </View>
          )}
          {fieldErrors.clientUsername && (
            <View style={styles.errorContainer}>
              <AlertCircle size={14} color="#dc2626" />
              <Text style={styles.errorText}>{fieldErrors.clientUsername}</Text>
            </View>
          )}
          {!client && usernameSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {usernameSuggestions.map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setClientUsername(s)}
                  style={styles.suggestionChip}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {!client && (
        <View style={styles.section}>
          <Text style={styles.label}>
            Password<Text style={styles.required}> *</Text>
          </Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                fieldErrors.password && styles.inputError,
              ]}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!eyeOpen}
              value={password}
              onChangeText={text => {
                setPassword(text);
                handleFieldValidation('password', text);
              }}
              onBlur={() => handleFieldValidation('password', password)}
            />
            <TouchableOpacity
              onPress={() => setEyeOpen(v => !v)}
              style={styles.eyeIconButton}
            >
              {eyeOpen ? (
                <Eye size={20} color="#6b7280" />
              ) : (
                <EyeOff size={20} color="#6b7280" />
              )}
            </TouchableOpacity>
          </View>
          {fieldErrors.password && (
            <View style={styles.errorContainer}>
              <AlertCircle size={14} color="#dc2626" />
              <Text style={styles.errorText}>{fieldErrors.password}</Text>
            </View>
          )}
        </View>
      )}

      {renderFormField(
        'Email',
        email,
        text => {
          setEmail(text);
          handleFieldValidation('email', text);
        },
        'email',
        { placeholder: 'contact@company.com', keyboardType: 'email-address' },
      )}

      {renderFormField(
        'Phone',
        phone,
        text => {
          const cleaned = text.replace(/[^0-9+()-\s]/g, '');
          setPhone(cleaned);
          handleFieldValidation('phone', cleaned);
        },
        'phone',
        { placeholder: '+1 (555) 123-4567', keyboardType: 'phone-pad' },
      )}

      {!client && !hideAdvanced && (
        <>
          <View style={styles.section}>
            <Text style={styles.label}>Account Validity</Text>
            <View style={styles.validityRow}>
              <View style={styles.validityInputContainer}>
                <Text style={styles.gridLabel}>
                  Duration<Text style={styles.required}> *</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    fieldErrors.validityAmount && styles.inputError,
                  ]}
                  placeholder="30"
                  placeholderTextColor="#9CA3AF"
                  value={String(validityAmount)}
                  onChangeText={v => {
                    setValidityAmount(Number(v || 0));
                    handleFieldValidation('validityAmount', v);
                  }}
                  onBlur={() =>
                    handleFieldValidation('validityAmount', validityAmount)
                  }
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.validityInputContainer}>
                <Text style={styles.gridLabel}>
                  Unit<Text style={styles.required}> *</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.dropdownButton,
                    fieldErrors.validityUnit && styles.inputError,
                  ]}
                  onPress={() => setShowValidityUnitDropdown(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownButtonText}>
                    {validityUnit.charAt(0).toUpperCase() +
                      validityUnit.slice(1)}
                  </Text>
                  <SimpleLineIcons
                    name="arrow-down"
                    color="#6B7280"
                    size={14}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {(fieldErrors.validityAmount || fieldErrors.validityUnit) && (
              <View style={styles.errorContainer}>
                <AlertCircle size={14} color="#EF4444" />
                <Text style={styles.errorText}>
                  {fieldErrors.validityAmount || fieldErrors.validityUnit}
                </Text>
              </View>
            )}
            {expiryPreview &&
              !fieldErrors.validityAmount &&
              !fieldErrors.validityUnit && (
                <Text style={styles.helperText}>
                  This account will expire on {expiryPreview}.
                </Text>
              )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Limits</Text>
            <View style={styles.gridContainer}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>
                  Max Companies<Text style={styles.required}> *</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    fieldErrors.maxCompanies && styles.inputError,
                  ]}
                  placeholder="5"
                  placeholderTextColor="#9CA3AF"
                  value={String(maxCompanies || '')}
                  onChangeText={v => {
                    setMaxCompanies(Number(v || 0));
                    handleFieldValidation('maxCompanies', Number(v || 0));
                  }}
                  onBlur={() =>
                    handleFieldValidation('maxCompanies', maxCompanies)
                  }
                  keyboardType="numeric"
                />
                {fieldErrors.maxCompanies && (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={12} color="#dc2626" />
                    <Text style={[styles.errorText, { fontSize: 11 }]}>
                      {fieldErrors.maxCompanies}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>
                  Max Users<Text style={styles.required}> *</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    fieldErrors.maxUsers && styles.inputError,
                  ]}
                  placeholder="10"
                  placeholderTextColor="#9CA3AF"
                  value={String(maxUsers || '')}
                  onChangeText={v => {
                    setMaxUsers(Number(v || 0));
                    handleFieldValidation('maxUsers', Number(v || 0));
                  }}
                  onBlur={() => handleFieldValidation('maxUsers', maxUsers)}
                  keyboardType="numeric"
                />
                {fieldErrors.maxUsers && (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={12} color="#dc2626" />
                    <Text style={[styles.errorText, { fontSize: 11 }]}>
                      {fieldErrors.maxUsers}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Feature Access</Text>
            <View style={styles.permissionsGrid}>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionLabel}>
                  Send Invoice via Email
                </Text>
                <RNSwitch
                  value={canSendInvoiceEmail}
                  onValueChange={setCanSendInvoiceEmail}
                />
              </View>
              <View style={styles.permissionItem}>
                <Text style={styles.permissionLabel}>
                  Send Invoice via WhatsApp
                </Text>
                <RNSwitch
                  value={canSendInvoiceWhatsapp}
                  onValueChange={setCanSendInvoiceWhatsapp}
                />
              </View>
            </View>
          </View>
        </>
      )}

      {/* {!hideAdvanced && (
        <>
          <View style={styles.sectionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Send Invoice via Email</Text>
            </View>
            <RNSwitch
              value={canSendInvoiceEmail}
              onValueChange={setCanSendInvoiceEmail}
            />
          </View>

          <View style={styles.sectionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Send Invoice via WhatsApp</Text>
            </View>
            <RNSwitch
              value={canSendInvoiceWhatsapp}
              onValueChange={setCanSendInvoiceWhatsapp}
            />
          </View>
        </>
      )} */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderPermissionsForm = () => (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage Permissions</Text>
          <Text style={styles.sectionSubtitle}>
            Modify usage limits and feature access for this client.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Limits</Text>
          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>
                Max Companies<Text style={styles.required}> *</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.maxCompanies && styles.inputError,
                ]}
                value={String(currentPermissions.maxCompanies || '')}
                onChangeText={v => {
                  handlePermissionChange('maxCompanies', Number(v || 0));
                }}
                onBlur={() =>
                  handleFieldValidation(
                    'maxCompanies',
                    currentPermissions.maxCompanies,
                  )
                }
                keyboardType="numeric"
              />
              {fieldErrors.maxCompanies && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={12} color="#dc2626" />
                  <Text style={[styles.errorText, { fontSize: 11 }]}>
                    {fieldErrors.maxCompanies}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>
                Max Users<Text style={styles.required}> *</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.maxUsers && styles.inputError,
                ]}
                value={String(currentPermissions.maxUsers || '')}
                onChangeText={v => {
                  handlePermissionChange('maxUsers', Number(v || 0));
                }}
                onBlur={() =>
                  handleFieldValidation('maxUsers', currentPermissions.maxUsers)
                }
                keyboardType="numeric"
              />
              {fieldErrors.maxUsers && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={12} color="#dc2626" />
                  <Text style={[styles.errorText, { fontSize: 11 }]}>
                    {fieldErrors.maxUsers}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>
                Max Inventories<Text style={styles.required}> *</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  fieldErrors.maxInventories && styles.inputError,
                ]}
                value={String(currentPermissions.maxInventories || '')}
                onChangeText={v => {
                  handlePermissionChange('maxInventories', Number(v || 0));
                }}
                onBlur={() =>
                  handleFieldValidation(
                    'maxInventories',
                    currentPermissions.maxInventories,
                  )
                }
                keyboardType="numeric"
              />
              {fieldErrors.maxInventories && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={12} color="#dc2626" />
                  <Text style={[styles.errorText, { fontSize: 11 }]}>
                    {fieldErrors.maxInventories}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Feature Access</Text>
          <View style={styles.permissionsGrid}>
            <View style={styles.permissionItem}>
              <Text style={styles.permissionLabel}>Send Invoice via Email</Text>
              <RNSwitch
                value={currentPermissions.canSendInvoiceEmail}
                onValueChange={v =>
                  handlePermissionChange('canSendInvoiceEmail', v)
                }
              />
            </View>
            <View style={styles.permissionItem}>
              <Text style={styles.permissionLabel}>
                Send Invoice via WhatsApp
              </Text>
              <RNSwitch
                value={currentPermissions.canSendInvoiceWhatsapp}
                onValueChange={v =>
                  handlePermissionChange('canSendInvoiceWhatsapp', v)
                }
              />
            </View>
            <View style={styles.permissionItem}>
              <Text style={styles.permissionLabel}>Create Users</Text>
              <RNSwitch
                value={currentPermissions.canCreateUsers}
                onValueChange={v => handlePermissionChange('canCreateUsers', v)}
              />
            </View>
            <View style={styles.permissionItem}>
              <Text style={styles.permissionLabel}>Create Customers</Text>
              <RNSwitch
                value={currentPermissions.canCreateCustomers}
                onValueChange={v =>
                  handlePermissionChange('canCreateCustomers', v)
                }
              />
            </View>
            <View style={styles.permissionItem}>
              <Text style={styles.permissionLabel}>Create Vendors</Text>
              <RNSwitch
                value={currentPermissions.canCreateVendors}
                onValueChange={v =>
                  handlePermissionChange('canCreateVendors', v)
                }
              />
            </View>
            <View style={styles.permissionItem}>
              <Text style={styles.permissionLabel}>Create Products</Text>
              <RNSwitch
                value={currentPermissions.canCreateProducts}
                onValueChange={v =>
                  handlePermissionChange('canCreateProducts', v)
                }
              />
            </View>
            <View style={styles.permissionItem}>
              <Text style={styles.permissionLabel}>Create Companies</Text>
              <RNSwitch
                value={currentPermissions.canCreateCompanies}
                onValueChange={v =>
                  handlePermissionChange('canCreateCompanies', v)
                }
              />
            </View>
            <View style={styles.permissionItem}>
              <Text style={styles.permissionLabel}>Update Companies</Text>
              <RNSwitch
                value={currentPermissions.canUpdateCompanies}
                onValueChange={v =>
                  handlePermissionChange('canUpdateCompanies', v)
                }
              />
            </View>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );

  const renderValidityForm = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <ClientValidityCard clientId={client._id} onChanged={() => {}} />
      </View>
      <View style={{ height: 80 }} />
    </ScrollView>
  );

  const renderPasswordForm = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reset Password</Text>
        <Text style={styles.sectionSubtitle}>
          Set a new password for {client.contactName}. They will be notified of
          this change.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>
          New Password<Text style={styles.required}> *</Text>
        </Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              fieldErrors.newPassword && styles.inputError,
            ]}
            placeholder="Enter new password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!eyeOpenPassword}
            value={newPassword}
            onChangeText={text => {
              setNewPassword(text);
              handleFieldValidation('newPassword', text);
            }}
            onBlur={() => handleFieldValidation('newPassword', newPassword)}
          />
          <TouchableOpacity
            onPress={() => setEyeOpenPassword(v => !v)}
            style={styles.eyeIconButton}
          >
            {eyeOpenPassword ? (
              <Eye size={20} color="#6b7280" />
            ) : (
              <EyeOff size={20} color="#6b7280" />
            )}
          </TouchableOpacity>
        </View>
        {fieldErrors.newPassword && (
          <View style={styles.errorContainer}>
            <AlertCircle size={14} color="#dc2626" />
            <Text style={styles.errorText}>{fieldErrors.newPassword}</Text>
          </View>
        )}
      </View>
      <View style={{ height: 80 }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Optional Header for standalone usage */}
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (onCancel) onCancel();
              else if (navigation) navigation.goBack();
            }}
          >
            <ArrowLeft size={22} color="#4F46E5" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {client ? 'Edit Client' : 'Add New Client'}
          </Text>
          <View style={{ width: 22 }} />
        </View>
      )}

      {/* Tab Navigation for Edit Mode */}
      {client && (
        <View style={styles.tabContainer}>
          {renderTabButton('general', 'General')}
          {renderTabButton('permissions', 'Permissions')}
          {renderTabButton('validity', 'Validity')}
          {renderTabButton('password', 'Password')}
        </View>
      )}

      {/* Content Area with Keyboard Handling */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidContainer}
      >
        {client ? (
          <View style={styles.tabContentContainer}>
            {activeTab === 'general' && renderGeneralForm()}
            {activeTab === 'permissions' && renderPermissionsForm()}
            {activeTab === 'validity' && renderValidityForm()}
            {activeTab === 'password' && renderPasswordForm()}
          </View>
        ) : (
          renderGeneralForm()
        )}
      </KeyboardAvoidingView>

      {/* Fixed Footer with Context-Aware Buttons */}
      {renderFooter()}

      {/* Unit Dropdown Modal */}
      <Modal
        visible={showValidityUnitDropdown}
        animationType="slide"
        transparent
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowValidityUnitDropdown(false)}
        >
          <Pressable style={styles.bottomSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Duration Unit</Text>
              <TouchableOpacity
                onPress={() => setShowValidityUnitDropdown(false)}
                style={styles.sheetCloseBtn}
              >
                <Text style={styles.sheetCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetList}>
              {['days', 'months', 'years'].map(unit => (
                <TouchableOpacity
                  key={unit}
                  style={styles.sheetItem}
                  onPress={() => {
                    setValidityUnit(unit);
                    handleFieldValidation('validityUnit', unit);
                    setShowValidityUnitDropdown(false);
                  }}
                >
                  <Text style={styles.sheetItemText}>
                    {unit.charAt(0).toUpperCase() + unit.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );

  // Render footer with context-aware buttons
  function renderFooter() {
    if (client) {
      // Edit mode - show different buttons based on active tab
      if (activeTab === 'general') {
        return (
          <View style={styles.fixedFooter}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || Object.keys(fieldErrors).length > 0}
              style={[
                styles.submitButton,
                (isSubmitting || Object.keys(fieldErrors).length > 0) &&
                  styles.buttonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      }
      if (activeTab === 'permissions') {
        return (
          <View style={styles.fixedFooter}>
            <TouchableOpacity
              onPress={handleSavePermissions}
              disabled={
                isSavingPermissions ||
                Object.keys(fieldErrors).some(k =>
                  ['maxCompanies', 'maxUsers', 'maxInventories'].includes(k),
                )
              }
              style={[
                styles.submitButton,
                (isSavingPermissions ||
                  Object.keys(fieldErrors).some(k =>
                    ['maxCompanies', 'maxUsers', 'maxInventories'].includes(k),
                  )) &&
                  styles.buttonDisabled,
              ]}
            >
              {isSavingPermissions ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Save Permissions</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      }
      if (activeTab === 'password') {
        return (
          <View style={styles.fixedFooter}>
            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={
                isSubmittingPassword ||
                !newPassword.trim() ||
                Boolean(fieldErrors.newPassword)
              }
              style={[
                styles.submitButton,
                (isSubmittingPassword ||
                  !newPassword.trim() ||
                  fieldErrors.newPassword) &&
                  styles.buttonDisabled,
              ]}
            >
              {isSubmittingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      }
      // Validity tab - no action button needed
      return null;
    }

    // Create mode - dual buttons (Cancel + Create) side by side
    return (
      <View style={[styles.fixedFooter, styles.footerRow]}>
        <TouchableOpacity
          onPress={onCancel}
          style={[styles.cancelButton, styles.cancelButtonFlex]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting || Object.keys(fieldErrors).length > 0}
          style={[
            styles.submitButton,
            styles.submitButtonFlex,
            (isSubmitting || Object.keys(fieldErrors).length > 0) &&
              styles.buttonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Create Client</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  fixedFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 10 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  cancelButtonFlex: {
    flex: 0,
    minWidth: 100,
  },
  submitButtonFlex: {
    flex: 1,
    width: 'auto',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  tabContentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 7,
    letterSpacing: 0.1,
  },
  required: {
    color: '#EF4444',
    fontSize: 13,
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 7,
    letterSpacing: 0.1,
  },
  permissionLabel: {
    fontWeight: '500',
    fontSize: 15,
    color: '#111827',
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  inputText: {
    fontSize: 15,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  inputDisabled: {
    backgroundColor: '#F9FAFB',
    color: '#9CA3AF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIconButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
    zIndex: 1,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 4,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    color: '#10b981',
    marginLeft: 4,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6b7280',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  suggestionText: {
    fontSize: 13,
    color: '#374151',
  },
  validityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  validityInputContainer: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    flex: 1,
    minWidth: '30%',
  },
  permissionsGrid: {
    gap: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  buttonRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  cancelText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 12,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#111827',
    flex: 1,
  },
  // Modal styles
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
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  sheetCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseTxt: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
  },
  sheetList: {
    maxHeight: 350,
  },
  sheetItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetItemText: {
    fontSize: 15,
    color: '#111827',
  },
});
