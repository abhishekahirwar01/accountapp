// AdminCompanyForm.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { Check, ChevronLeft, ChevronRight, Plus, Save, Upload, X } from 'lucide-react-native';

// Hardcoded data
const HARDCODED_DATA = {
  businessTypes: [
    'Sole Proprietorship',
    'Partnership',
    'Private Limited Company',
    'Limited Company',
    'Others',
  ],
  countries: [
    { label: 'India', value: 'IN' }
  ],
  states: [
    { label: 'Maharashtra', value: 'MH' },
    { label: 'Delhi', value: 'DL' },
    { label: 'Karnataka', value: 'KA' },
    { label: 'Tamil Nadu', value: 'TN' },
    { label: 'Gujarat', value: 'GJ' },
  ],
  cities: {
    MH: [
      { label: 'Mumbai', value: 'Mumbai' },
      { label: 'Pune', value: 'Pune' },
      { label: 'Nagpur', value: 'Nagpur' },
    ],
    DL: [
      { label: 'New Delhi', value: 'New Delhi' },
      { label: 'Delhi Cantonment', value: 'Delhi Cantonment' },
    ],
    KA: [
      { label: 'Bangalore', value: 'Bangalore' },
      { label: 'Mysore', value: 'Mysore' },
    ],
    TN: [
      { label: 'Chennai', value: 'Chennai' },
      { label: 'Coimbatore', value: 'Coimbatore' },
    ],
    GJ: [
      { label: 'Ahmedabad', value: 'Ahmedabad' },
      { label: 'Surat', value: 'Surat' },
    ],
  },
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
    'IncomeTaxLoginPassword',
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

export function AdminCompanyForm({ company, clients, onFormSubmit }) {
  const [formData, setFormData] = useState({
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
    client: company?.client?._id || company?.client || '',
  });

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState(company?.logo || null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('IN');
  const [selectedState, setSelectedState] = useState('');

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep = (stepNumber) => {
    const fields = stepFields[stepNumber];
    for (const field of fields) {
      if (field === 'mobileNumber' && formData[field] && formData[field].length !== 10) {
        Alert.alert('Validation Error', 'Mobile number must be 10 digits');
        return false;
      }
      if (field === 'client' && !formData[field]) {
        Alert.alert('Validation Error', 'Please select a client');
        return false;
      }
      if (field === 'businessType' && !formData[field]) {
        Alert.alert('Validation Error', 'Please select business type');
        return false;
      }
      if (field !== 'client' && field !== 'businessType' && !formData[field] && 
          field !== 'emailId' && field !== 'Website' && field !== 'IncomeTaxLoginPassword') {
        Alert.alert('Validation Error', `${FIELD_LABELS[field]} is required`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Success',
        company ? 'Company updated successfully!' : 'Company created successfully!',
        [{ text: 'OK', onPress: onFormSubmit }]
      );
      
      // Log the form data (replace with actual submission)
      console.log('Form Data:', {
        ...formData,
        ewayBillApplicable: formData.ewayBillApplicable === 'true',
        clients: clients
      });
    }, 2000);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    Alert.alert('Success', 'Logo removed successfully');
  };

  const renderInputField = (name) => {
    const label = FIELD_LABELS[name] || name;
    const value = formData[name] || '';

    if (name === 'client') {
      const selectedClient = clients.find(client => client._id === value);
      
      return (
        <View style={styles.formItem}>
          <Text style={styles.label}>{label}</Text>
          <TouchableOpacity
            style={styles.selectTrigger}
            onPress={() => setShowClientModal(true)}
          >
            <Text style={!value ? styles.placeholder : styles.selectValue}>
              {selectedClient 
                ? `${selectedClient.contactName} - (${selectedClient.email})`
                : 'Select a client'
              }
            </Text>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>
        </View>
      );
    }

    if (name === 'businessType') {
      return (
        <View style={styles.formItem}>
          <Text style={styles.label}>{label}</Text>
          <TouchableOpacity
            style={styles.selectTrigger}
            onPress={() => setShowBusinessTypeModal(true)}
          >
            <Text style={!value ? styles.placeholder : styles.selectValue}>
              {value || 'Select business type'}
            </Text>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>
        </View>
      );
    }

    if (name === 'Country') {
      return (
        <View style={styles.formItem}>
          <Text style={styles.label}>{label}</Text>
          <TouchableOpacity
            style={styles.selectTrigger}
            onPress={() => setShowCountryModal(true)}
          >
            <Text style={styles.selectValue}>
              {formData.Country || 'India'}
            </Text>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>
        </View>
      );
    }

    if (name === 'addressState') {
      return (
        <View style={styles.formItem}>
          <Text style={styles.label}>{label}</Text>
          <TouchableOpacity
            style={styles.selectTrigger}
            onPress={() => setShowStateModal(true)}
            disabled={!selectedCountry}
          >
            <Text style={!value ? styles.placeholder : styles.selectValue}>
              {value || 'Select state'}
            </Text>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>
        </View>
      );
    }

    if (name === 'City') {
      return (
        <View style={styles.formItem}>
          <Text style={styles.label}>{label}</Text>
          <TouchableOpacity
            style={[styles.selectTrigger, !selectedState && styles.disabled]}
            onPress={() => setShowCityModal(true)}
            disabled={!selectedState}
          >
            <Text style={!value ? styles.placeholder : styles.selectValue}>
              {value || (selectedState ? 'Select city' : 'Select state first')}
            </Text>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>
        </View>
      );
    }

    if (name === 'ewayBillApplicable') {
      return (
        <View style={styles.formItem}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => updateFormData('ewayBillApplicable', 'true')}
            >
              <View style={styles.radioCircle}>
                {formData.ewayBillApplicable === 'true' && <View style={styles.radioSelected} />}
              </View>
              <Text style={styles.radioLabel}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => updateFormData('ewayBillApplicable', 'false')}
            >
              <View style={styles.radioCircle}>
                {formData.ewayBillApplicable === 'false' && <View style={styles.radioSelected} />}
              </View>
              <Text style={styles.radioLabel}>No</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.formItem}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => updateFormData(name, text)}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor="#999"
          secureTextEntry={name.includes('Password')}
          keyboardType={
            name === 'mobileNumber' || name === 'Telephone' || name === 'Pincode'
              ? 'phone-pad'
              : name === 'emailId'
              ? 'email-address'
              : 'default'
          }
        />
      </View>
    );
  };

  const renderStep = () => {
    const fields = stepFields[step];
    
    if (step === 1) {
      return (
        <View style={styles.stepContainer}>
          {renderInputField('client')}
          
          {/* Logo Upload */}
          <View style={styles.formItem}>
            <Text style={styles.label}>Company Logo</Text>
            <TouchableOpacity style={styles.uploadButton}>
              <Upload size={20} color="#666" />
              <Text style={styles.uploadText}>Choose Logo</Text>
            </TouchableOpacity>
            {logoPreview && (
              <View style={styles.logoPreview}>
                <Image source={{ uri: logoPreview }} style={styles.logoImage} />
                <TouchableOpacity style={styles.removeLogo} onPress={handleRemoveLogo}>
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.grid}>
            {fields.filter(field => field !== 'client').map(field => (
              <View key={field} style={styles.gridItem}>
                {renderInputField(field)}
              </View>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.stepContainer}>
        <View style={styles.grid}>
          {fields.map(field => (
            <View key={field} style={styles.gridItem}>
              {renderInputField(field)}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderModal = (visible, onClose, title, data, onSelect, valueKey = 'value', displayKey = 'label') => (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item) => item.value || item._id || item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  if (typeof item === 'string') {
                    onSelect(item);
                  } else {
                    onSelect(item[valueKey] || item.value || item._id);
                  }
                  onClose();
                }}
              >
                <Text style={styles.modalItemText}>
                  {typeof item === 'string' 
                    ? item 
                    : item[displayKey] || item.contactName || item.label}
                  {item.email ? ` - (${item.email})` : ''}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Stepper */}
      <View style={styles.stepper}>
        {[1, 2, 3].map((stepNumber) => (
          <View key={stepNumber} style={styles.stepperItem}>
            <TouchableOpacity
              style={[
                styles.stepCircle,
                step === stepNumber && styles.stepCircleActive,
                step > stepNumber && styles.stepCircleCompleted,
              ]}
              onPress={() => {
                if (stepNumber < step) {
                  // Allow going back to previous steps
                  setStep(stepNumber);
                } else if (stepNumber > step) {
                  // Only allow going forward if current step is valid
                  if (validateStep(step)) {
                    setStep(stepNumber);
                  }
                }
              }}
            >
              {step > stepNumber ? (
                <Check size={16} color="#fff" />
              ) : (
                <Text style={[
                  styles.stepText,
                  step === stepNumber && styles.stepTextActive,
                  step > stepNumber && styles.stepTextCompleted,
                ]}>
                  {stepNumber}
                </Text>
              )}
            </TouchableOpacity>
            <Text style={[
              styles.stepLabel,
              step === stepNumber && styles.stepLabelActive,
            ]}>
              {stepNumber === 1 && 'Basic Details'}
              {stepNumber === 2 && 'GST Details'}
              {stepNumber === 3 && 'TDS Details'}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderStep()}
        
        {/* Spacer for bottom buttons */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setStep(step - 1)}
          >
            <ChevronLeft size={20} color="#3b82f6" />
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>
        )}
        
        {step < 3 ? (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary]}
            onPress={() => {
              if (validateStep(step)) {
                setStep(step + 1);
              }
            }}
          >
            <Text style={styles.navButtonPrimaryText}>Next</Text>
            <ChevronRight size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary, isSubmitting && styles.navButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Text style={styles.navButtonPrimaryText}>
                {company ? 'Saving...' : 'Creating...'}
              </Text>
            ) : (
              <>
                {company ? <Save size={20} color="#fff" /> : <Plus size={20} color="#fff" />}
                <Text style={styles.navButtonPrimaryText}>
                  {company ? 'Save' : 'Create'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Modals */}
      {renderModal(
        showClientModal,
        () => setShowClientModal(false),
        'Select Client',
        clients,
        (value) => updateFormData('client', value),
        '_id',
        'contactName'
      )}

      {renderModal(
        showBusinessTypeModal,
        () => setShowBusinessTypeModal(false),
        'Select Business Type',
        HARDCODED_DATA.businessTypes,
        (value) => updateFormData('businessType', value)
      )}

      {renderModal(
        showCountryModal,
        () => setShowCountryModal(false),
        'Select Country',
        HARDCODED_DATA.countries,
        (value) => {
          setSelectedCountry(value);
          updateFormData('Country', 'India');
        }
      )}

      {renderModal(
        showStateModal,
        () => setShowStateModal(false),
        'Select State',
        HARDCODED_DATA.states,
        (value) => {
          setSelectedState(value);
          const state = HARDCODED_DATA.states.find(s => s.value === value);
          updateFormData('addressState', state?.label || '');
        }
      )}

      {renderModal(
        showCityModal,
        () => setShowCityModal(false),
        'Select City',
        HARDCODED_DATA.cities[selectedState] || [],
        (value) => updateFormData('City', value)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stepperItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  stepCircleCompleted: {
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  stepTextActive: {
    color: '#fff',
  },
  stepTextCompleted: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  stepContainer: {
    gap: 16,
  },
  formItem: {
    marginBottom: 16,
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
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectValue: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  placeholder: {
    fontSize: 16,
    color: '#9ca3af',
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  uploadText: {
    fontSize: 16,
    color: '#6b7280',
  },
  logoPreview: {
    marginTop: 8,
    alignSelf: 'flex-start',
    position: 'relative',
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  removeLogo: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    gap: 16,
  },
  gridItem: {
    flex: 1,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  radioLabel: {
    fontSize: 16,
    color: '#374151',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  navButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  navButtonPrimary: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  navButtonPrimaryText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  navButtonDisabled: {
    opacity: 0.6,
  },
  spacer: {
    height: 100,
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
    maxHeight: '80%',
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
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemText: {
    fontSize: 16,
    color: '#374151',
  },
});