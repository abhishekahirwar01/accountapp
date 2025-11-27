import React, { useState, useRef, useEffect, useCallback } from 'react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Camera,
  ChevronDown,
} from 'lucide-react-native';

// --- Form Schema and Constants (Unchanged) ---
const formSchema = z.object({
  registrationNumber: z.string().min(1, 'Registration number is required'),
  businessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters'),
  businessType: z
    .string()
    .min(2, 'Business type must be at least 2 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  City: z.string().optional(),
  addressState: z.string().optional(),
  Country: z.string().optional(),
  Pincode: z.string().optional(),
  Telephone: z.string().optional(),
  mobileNumber: z
    .string()
    .min(10, 'Enter a valid 10-digit mobile number')
    .max(10, 'Enter a valid 10-digit mobile number')
    .optional(),
  emailId: z
    .string()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),
  Website: z.string().optional(),
  PANNumber: z.string().optional(),
  IncomeTaxLoginPassword: z.string().optional(),
  gstin: z.string().optional(),
  gstState: z.string().optional(),
  RegistrationType: z.string().optional(),
  PeriodicityofGSTReturns: z.string().optional(),
  GSTUsername: z.string().optional(),
  GSTPassword: z.string().optional(),
  ewayBillApplicable: z.enum(["true", "false"]),
  EWBBillUsername: z.string().optional(),
  EWBBillPassword: z.string().optional(),
  TANNumber: z.string().optional(),
  TAXDeductionCollectionAcc: z.string().optional(),
  DeductorType: z.string().optional(),
  TDSLoginUsername: z.string().optional(),
  TDSLoginPassword: z.string().optional(),
  client: z.string().optional(),
});

const defaultBusinessTypes = [
  "Sole Proprietorship",
  "Partnership",
  "Private Limited Company",
  "Limited Company",
  "Others",
];

const gstRegistrationTypes = [
  "Sole Proprietorship",
  "Partnership",
  "LLP",
  "Private Limited Company",
  "Public Limited Company",
  "Section 8 Company",
  "Others",
];

const FIELD_LABELS = {
  client: "Assign to Client",
  businessType: "Business Type",
  businessName: "Business Name",
  registrationNumber: "Registration Number",
  address: "Address",
  City: "City",
  addressState: "State",
  Country: "Country",
  Pincode: "Pincode",
  Telephone: "Telephone",
  mobileNumber: "Mobile Number",
  emailId: "Email ID",
  Website: "Website",
  PANNumber: "PAN Number",
  IncomeTaxLoginPassword: "Income Tax Login Password",
  gstin: "GSTIN",
  gstState: "GST State",
  RegistrationType: "Registration Type",
  PeriodicityofGSTReturns: "Periodicity of GST Returns",
  GSTUsername: "GST Username",
  GSTPassword: "GST Password",
  ewayBillApplicable: "E-Way Bill Applicable",
  EWBBillUsername: "EWB Username",
  EWBBillPassword: "EWB Password",
  TANNumber: "TAN Number",
  TAXDeductionCollectionAcc: "Tax Deduction/Collection A/c",
  DeductorType: "Deductor Type",
  TDSLoginUsername: "TDS Login Username",
  TDSLoginPassword: "TDS Login Password",
};

const getStepFields = (isClient) => ({
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
    "gstin",
    "gstState",
    "RegistrationType",
    "PeriodicityofGSTReturns",
    "GSTUsername",
    "GSTPassword",
    "ewayBillApplicable",
    "EWBBillUsername",
    "EWBBillPassword",
  ],
  3: [
    "TANNumber",
    "TAXDeductionCollectionAcc",
    "DeductorType",
    "TDSLoginUsername",
    "TDSLoginPassword",
  ],
});

// --- Select Modal Component ---
const SelectModal = ({
  visible,
  options,
  onSelect,
  onClose,
  fieldName,
  value,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.selectModalContent}>
          <View style={styles.selectModalHeader}>
            <Text style={styles.selectModalTitle}>
              Select {FIELD_LABELS[fieldName] || fieldName}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.selectOptionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.selectOption,
                  option.value === value && styles.selectOptionActive,
                ]}
                onPress={() => onSelect(option.value)}
              >
                <Text
                  style={[
                    styles.selectOptionText,
                    option.value === value && styles.selectOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {option.value === value && <Check size={20} color="#1e40af" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default function DetailedCompanyForm({
  company,
  clients,
  onFormSubmit,
  onCancel,
}) {
  const baseURL = 'https://accountapp-backend-shardaassociates.onrender.com';

  // --- ALL HOOKS CALLED IN CONSISTENT ORDER ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(
    company?.logo ? `${baseURL}${company.logo}` : null,
  );
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');
  const [role, setRole] = useState('customer');
  const [isSelectModalVisible, setIsSelectModalVisible] = useState(false);
  const [currentSelectField, setCurrentSelectField] = useState({
    name: '',
    options: [],
    placeholder: '',
  });

  // Refs must come after all useState hooks
  const checkTimeoutRef = useRef(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    trigger,
    watch,
  } = useForm({
    resolver: zodResolver(formSchema),
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
      ewayBillApplicable: company?.ewayBillApplicable ? 'true' : 'false',
      EWBBillUsername: company?.EWBBillUsername || '',
      EWBBillPassword: company?.EWBBillPassword || '',
      TANNumber: company?.TANNumber || '',
      TAXDeductionCollectionAcc: company?.TAXDeductionCollectionAcc || '',
      DeductorType: company?.DeductorType || '',
      TDSLoginUsername: company?.TDSLoginUsername || '',
      TDSLoginPassword: company?.TDSLoginPassword || '',
      client: company?.client
        ? typeof company.client === 'string'
          ? company.client
          : company.client._id
        : '',
    },
  });

  const isClient = role === 'customer';

  // Function to open the select modal
  const openSelectModal = useCallback((name, options, placeholder) => {
    setCurrentSelectField({ name, options, placeholder });
    setIsSelectModalVisible(true);
  }, []);

  // Function to handle selection from the modal
  const handleSelectOption = useCallback(
    (name, value) => {
      setValue(name, value, { shouldValidate: true });
      setIsSelectModalVisible(false);
    },
    [setValue],
  );

  // Duplicate check
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
          Alert.alert('Error', 'Authentication token not found');
          return;
        }

        const response = await fetch(
          `${baseURL}/api/companies/check-duplicate?registrationNumber=${encodeURIComponent(
            regNumber,
          )}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();
        if (response.ok) {
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
    [baseURL, company],
  );

  // Handle image selection
  const handleImageSelect = useCallback(() => {
    Alert.alert('Select Logo', 'Choose an option', [
      {
        text: 'Camera',
        onPress: () => console.log('Open camera'),
      },
      {
        text: 'Gallery',
        onPress: () => console.log('Open gallery'),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  }, []);

  // Form submission
  const onSubmit = useCallback(
    async values => {
      if (duplicateError) {
        Alert.alert('Validation Error', duplicateError);
        return;
      }

      setIsSubmitting(true);
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found');

        const url = company
          ? `${baseURL}/api/companies/${company._id}`
          : `${baseURL}/api/companies`;

        const method = company ? 'PUT' : 'POST';
        // --- START MODIFICATION ---
        const { client, ...rest } = values;

        // Construct the payload based on whether the user is a client (which might be handled
        // automatically by the backend) OR if the company is being created by an admin/manager,
        // requiring explicit client selection. Assuming backend expects the key 'client'
        // for new creations by non-clients.

        let payload = {
          ...rest,
          ewayBillApplicable: values.ewayBillApplicable === 'true',
        };

        // Only include the client field if a value exists (and the current user is NOT the client)
        // If the API expects 'client' for new creations by managers/admins:
        if (!company && client) {
          payload.client = client;
        }

        // If updating, and 'client' field is present:
        if (company && client) {
          payload.client = client;
        }
        // --- END MODIFICATION ---

        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        const body = JSON.stringify(payload); // Use the corrected payload

        const response = await fetch(url, {
          method,
          headers,
          body,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Operation failed');

        Alert.alert(
          'Success',
          `${values.businessName} has been successfully ${
            company ? 'updated' : 'created'
          }.`,
        );
        onFormSubmit();
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'An error occurred',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [baseURL, company, duplicateError, isClient, onFormSubmit],
  );

  // Navigation handlers
  const handleNextStep = useCallback(async () => {
    if (step === 1 && duplicateError) {
      Alert.alert('Validation Error', duplicateError);
      return;
      const url = company
        ? `${baseURL}/api/companies/${company._id}`
        : `${baseURL}/api/companies`;

      const method = company ? "PUT" : "POST";
      
      // --- START MODIFICATION ---
      const { client, ...rest } = values;

      // Construct the payload based on whether the user is a client (which might be handled
      // automatically by the backend) OR if the company is being created by an admin/manager, 
      // requiring explicit client selection. Assuming backend expects the key 'client' 
      // for new creations by non-clients.

      let payload = {
          ...rest,
          ewayBillApplicable: values.ewayBillApplicable === "true",
      };

      // Only include the client field if a value exists (and the current user is NOT the client)
      // If the API expects 'client' for new creations by managers/admins:
      if (!company && client) {
          payload.client = client;
      }

      // If updating, and 'client' field is present:
      if (company && client) {
          payload.client = client;
      }
      // --- END MODIFICATION ---
      
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const body = JSON.stringify(payload); // Use the corrected payload

      const response = await fetch(url, {
        method,
        headers,
        body,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Operation failed");

      Alert.alert(
        "Success",
        `${values.businessName} has been successfully ${company ? "updated" : "created"}.`
      );
      onFormSubmit();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "An error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [baseURL, company, duplicateError, isClient, onFormSubmit]);

  // Navigation handlers
  const handleNextStep = useCallback(async () => {
    if (step === 1 && duplicateError) {
      Alert.alert("Validation Error", duplicateError);
      return;
    }

    const currentStepFields = getStepFields(isClient)[step];
    const isValid = await trigger(currentStepFields);
    
    if (isValid) {
      setStep(step + 1);
    }
  }, [step, duplicateError, isClient, trigger]);
  }, [step, duplicateError, isClient, trigger]);

  const handlePrevStep = useCallback(() => {
  const handlePrevStep = useCallback(() => {
    setStep(step - 1);
  }, [step]);

  // Render form field
  const renderFormField = useCallback(
    (name, isOptional = false) => {
      const label = FIELD_LABELS[name] || name;

      return (
        <View key={name} style={styles.formGroup}>
          <Text style={styles.label}>
            {label}
            {!isOptional && <Text style={styles.required}> *</Text>}
          </Text>
          <Controller
            control={control}
            name={name}
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <TextInput
                  style={[styles.textInput, errors[name] && styles.inputError]}
                  value={value || ''}
                  onChangeText={text => {
                    onChange(text);
                    if (name === 'registrationNumber') {
                      if (checkTimeoutRef.current) {
                        clearTimeout(checkTimeoutRef.current);
                      }
                      checkTimeoutRef.current = setTimeout(() => {
                        checkDuplicateRegistration(text);
                      }, 500);
                    }
                  }}
                  onBlur={onBlur}
                  placeholder={`Enter ${label.toLowerCase()}`}
                  secureTextEntry={name.toLowerCase().includes('password')}
                />
                {name === 'registrationNumber' && isCheckingDuplicate && (
                  <View style={styles.checkingContainer}>
                    <ActivityIndicator size="small" color="#0000ff" />
                    <Text style={styles.checkingText}>Checking...</Text>
                  </View>
                )}
                {name === 'registrationNumber' && duplicateError && (
                  <View style={styles.duplicateErrorContainer}>
                    <AlertCircle size={16} color="#dc2626" />
                    <Text style={styles.duplicateError}>{duplicateError}</Text>
                  </View>
                )}
                {errors[name] && (
                  <Text style={styles.errorText}>{errors[name]?.message}</Text>
                )}
              </View>
            )}
          />
        </View>
      );
    },
    [
      control,
      errors,
      isCheckingDuplicate,
      duplicateError,
      checkDuplicateRegistration,
    ],
  );

  // Render select field
  const renderSelectField = useCallback(
    (name, options, placeholder) => {
      const currentValue = getValues(name);

      return (
        <View key={name} style={styles.formGroup}>
          <Text style={styles.label}>{FIELD_LABELS[name] || name}</Text>
          <Controller
            control={control}
            name={name}
            render={({ field: { value } }) => (
              <View>
                <TouchableOpacity
                  style={[
                    styles.textInput,
                    styles.selectInput,
                    errors[name] && styles.inputError,
                  ]}
                  onPress={() => openSelectModal(name, options, placeholder)}
                >
                  <Text
                    style={[
                      styles.selectText,
                      !currentValue && styles.selectPlaceholderText,
                    ]}
                  >
                    {options.find(opt => opt.value === currentValue)?.label ||
                      placeholder}
                  </Text>
                  <ChevronDown size={18} color="#6b7280" />
                </TouchableOpacity>
                {errors[name] && (
                  <Text style={styles.errorText}>{errors[name]?.message}</Text>
                )}
              </View>
            )}
          />
        </View>
      );
    },
    [control, errors, getValues, openSelectModal],
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
          {company ? 'Edit Company' : 'Add New Company'}
        </Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <X size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Stepper */}
      <View style={styles.stepper}>
        {[1, 2, 3].map(stepNumber => (
          <View key={stepNumber} style={styles.stepperItem}>
            <View
              style={[
                styles.stepperCircle,
                step === stepNumber && styles.stepperCircleActive,
                step > stepNumber && styles.stepperCircleCompleted,
              ]}
            >
              {step > stepNumber ? (
                <Check size={16} color="#ffffff" />
              ) : (
                <Text
                  style={[
                    styles.stepperNumber,
                    step === stepNumber && styles.stepperNumberActive,
                  ]}
                >
                  {stepNumber}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepperLabel,
                step === stepNumber && styles.stepperLabelActive,
              ]}
            >
              {stepNumber === 1 && 'Basic Details'}
              {stepNumber === 2 && 'GST Details'}
              {stepNumber === 3 && 'TDS Details'}
            </Text>
          </View>
        ))}
      </View>

      {/* Form Content */}
      <ScrollView
        style={styles.formContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1 */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            {/* Client Selection (for admin only) */}
            {!isClient &&
              renderSelectField(
                'client',
                clients.map(client => ({
                  label: `${client.contactName} - (${client.email})`,
                  value: client._id,
                })),
                'Select a client',
              )}

            {/* Logo Upload */}
            <View style={styles.logoSection}>
              <Text style={styles.sectionLabel}>
                Company Logo{' '}
                <Text style={styles.optionalText}>(Upload under 200 KB)</Text>
              </Text>
              <TouchableOpacity
                style={styles.logoButton}
                onPress={handleImageSelect}
              >
                <Camera size={24} color="#666" />
                <Text style={styles.logoButtonText}>Select Logo</Text>
              </TouchableOpacity>

              {logoPreview && (
                <View style={styles.logoPreview}>
                  <Image
                    source={{ uri: logoPreview }}
                    style={styles.logoImage}
                  />
                  <TouchableOpacity
                    style={styles.removeLogoButton}
                    onPress={() => {
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                  >
                    <Text style={styles.removeLogoText}>Remove Logo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Business Details */}
            <View style={styles.fieldsGrid}>
              {renderSelectField(
                'businessType',
                defaultBusinessTypes.map(type => ({
                  label: type,
                  value: type,
                })),
                'Select business type',
              )}
              {renderFormField('businessName')}
              {renderFormField('registrationNumber')}
              {renderFormField('address')}
              {renderFormField('Pincode', true)}
              {renderFormField('Telephone', true)}
              {renderFormField('mobileNumber', true)}
              {renderFormField('emailId', true)}
              {renderFormField('Website', true)}
              {renderFormField('PANNumber', true)}
              {renderFormField('IncomeTaxLoginPassword', true)}
              {renderFormField('Country', true)}
              {renderFormField('addressState', true)}
              {renderFormField('City', true)}
            </View>
          </View>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.fieldsGrid}>
              {renderFormField('gstin', true)}
              {renderFormField('gstState', true)}
              {renderSelectField(
                'RegistrationType',
                gstRegistrationTypes.map(type => ({
                  label: type,
                  value: type,
                })),
                'Select registration type',
              )}
              {renderFormField('PeriodicityofGSTReturns', true)}
              {renderFormField('GSTUsername', true)}
              {renderFormField('GSTPassword', true)}
              {renderSelectField(
                'ewayBillApplicable',
                [
                  { label: 'Yes', value: 'true' },
                  { label: 'No', value: 'false' },
                ],
                'Select Yes or No',
              )}
              {renderFormField('EWBBillUsername', true)}
              {renderFormField('EWBBillPassword', true)}
            </View>
          </View>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.fieldsGrid}>
              {renderFormField('TANNumber', true)}
              {renderFormField('TAXDeductionCollectionAcc', true)}
              {renderFormField('DeductorType', true)}
              {renderFormField('TDSLoginUsername', true)}
              {renderFormField('TDSLoginPassword', true)}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <View style={styles.navButtons}>
          {step > 1 ? (
            <TouchableOpacity
              style={[styles.button, styles.prevButton]}
              onPress={handlePrevStep}
              disabled={isSubmitting}
            >
              <ChevronLeft size={20} color="#1e40af" />
              <Text style={styles.prevButtonText}>Previous</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}
          
          {step < 3 ? (
            <TouchableOpacity
              style={[styles.button, styles.nextButton]}
              onPress={handleNextStep}
              disabled={isCheckingDuplicate}
            >
              {isCheckingDuplicate ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.nextButtonText}>Checking...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.nextButtonText}>Next</Text>
                  <ChevronRight size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting || !!duplicateError}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.submitButtonText}>
                    {company ? 'Saving...' : 'Creating...'}
                  </Text>
                </>
              ) : (
                <>
                  {company ? (
                    <Save size={20} color="white" />
                  ) : (
                    <PlusCircle size={20} color="white" />
                  )}
                  <Text style={styles.submitButtonText}>
                    {company ? 'Save Changes' : 'Create Company'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* The Actual Select Modal */}
      <SelectModal
        visible={isSelectModalVisible}
        options={currentSelectField.options}
        onSelect={value => handleSelectOption(currentSelectField.name, value)}
        onClose={() => setIsSelectModalVisible(false)}
        fieldName={currentSelectField.name}
        value={getValues(currentSelectField.name)}
      />
    </SafeAreaView>
  );
}

// Styles remain the same as in your original code
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stepperItem: {
    alignItems: 'center',
  },
  stepperCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepperCircleActive: {
    borderColor: '#1e40af',
    backgroundColor: '#1e40af',
  },
  stepperCircleCompleted: {
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  stepperNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  stepperNumberActive: {
    color: '#ffffff',
  },
  stepperLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  stepperLabelActive: {
    color: '#1e40af',
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  stepContainer: {
    gap: 16,
  },
  logoSection: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  optionalText: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  logoButtonText: {
    fontSize: 14,
    color: '#666',
  },
  logoPreview: {
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeLogoButton: {
    padding: 8,
  },
  removeLogoText: {
    color: '#dc2626',
    fontSize: 14,
  },
  fieldsGrid: {
    gap: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#dc2626',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#1f2937',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  checkingText: {
    fontSize: 12,
    color: '#6b7280',
  },
  duplicateErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  duplicateError: {
    color: '#dc2626',
    fontSize: 12,
  },
  bottomNavigation: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  prevButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  prevButtonText: {
    color: '#1e40af',
    fontWeight: '600',
    fontSize: 14,
  },
  nextButton: {
    backgroundColor: '#1e40af',
  },
  nextButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#1e40af',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  spacer: {
    width: 120,
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 10,
  },
  selectText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  selectPlaceholderText: {
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  selectModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  selectModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  selectOptionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  selectOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectOptionActive: {
    backgroundColor: '#eff6ff',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
  },
  selectOptionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  selectOptionTextActive: {
    fontWeight: '600',
    color: '#1e40af',
  },
});