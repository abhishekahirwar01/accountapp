import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

// Hardcoded data for demo
const INDIA_STATES = [
  { isoCode: 'MH', name: 'Maharashtra' },
  { isoCode: 'DL', name: 'Delhi' },
  { isoCode: 'KA', name: 'Karnataka' },
  { isoCode: 'TN', name: 'Tamil Nadu' },
  { isoCode: 'UP', name: 'Uttar Pradesh' },
  { isoCode: 'GJ', name: 'Gujarat' },
  { isoCode: 'RJ', name: 'Rajasthan' },
  { isoCode: 'WB', name: 'West Bengal' },
];

const CITIES_BY_STATE = {
  MH: ['Mumbai', 'Pune', 'Nagpur', 'Thane'],
  DL: ['New Delhi', 'Delhi Cantonment'],
  KA: ['Bangalore', 'Mysore', 'Hubli', 'Mangalore'],
  TN: ['Chennai', 'Coimbatore', 'Madurai'],
  UP: ['Lucknow', 'Kanpur', 'Varanasi'],
  GJ: ['Ahmedabad', 'Surat', 'Vadodara'],
  RJ: ['Jaipur', 'Jodhpur', 'Udaipur'],
  WB: ['Kolkata', 'Howrah', 'Durgapur'],
};

const GST_REGISTRATION_TYPES = [
  'Regular',
  'Composition',
  'Unregistered',
  'Consumer',
  'Overseas',
  'Special Economic Zone',
  'Unknown',
];

// Mock customer data for editing
const MOCK_CUSTOMER = {
  _id: '1',
  name: 'John Doe',
  contactNumber: '9876543210',
  email: 'john.doe@example.com',
  address: '456 Park Avenue',
  city: 'Mumbai',
  state: 'Maharashtra',
  gstin: '27ABCDE1234F1Z5',
  gstRegistrationType: 'Regular',
  pan: 'ABCDE1234F',
  isTDSApplicable: false,
  tdsRate: 0,
  tdsSection: '',
};

export function CustomerForm({ customer, initialName, onSuccess }) {
  const [formData, setFormData] = useState({
    name: initialName || '',
    contactNumber: '',
    email: '',
    address: '',
    city: '',
    state: '',
    gstin: '',
    gstRegistrationType: 'Unregistered',
    pan: '',
    isTDSApplicable: false,
    tdsRate: 0,
    tdsSection: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [selectedStateCode, setSelectedStateCode] = useState(null);
  const [availableCities, setAvailableCities] = useState([]);

  // Initialize form with customer data if provided
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        contactNumber: customer.contactNumber || '',
        email: customer.email || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        gstin: customer.gstin || '',
        gstRegistrationType: customer.gstRegistrationType || 'Unregistered',
        pan: customer.pan || '',
        isTDSApplicable: customer.isTDSApplicable || false,
        tdsRate: customer.tdsRate || 0,
        tdsSection: customer.tdsSection || '',
      });

      // Set state code based on customer's state
      const state = INDIA_STATES.find(s => s.name === customer.state);
      if (state) {
        setSelectedStateCode(state.isoCode);
        setAvailableCities(CITIES_BY_STATE[state.isoCode] || []);
      }
    }
  }, [customer]);

  // Update cities when state changes
  useEffect(() => {
    if (selectedStateCode) {
      setAvailableCities(CITIES_BY_STATE[selectedStateCode] || []);
    } else {
      setAvailableCities([]);
    }
  }, [selectedStateCode]);

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Customer name is required.';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Customer name must be at least 2 characters.';
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address.';
    }

    // GSTIN validation for registered types
    if (formData.gstRegistrationType !== 'Unregistered') {
      if (!formData.gstin || formData.gstin.length !== 15) {
        newErrors.gstin = 'GSTIN must be 15 characters for the selected registration type.';
      }
    }

    // PAN validation
    if (formData.pan && formData.pan.length !== 10) {
      newErrors.pan = 'PAN must be 10 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create mock response data
      const mockParty = {
        _id: customer?._id || Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Call success callback with mock data
      onSuccess(mockParty);

      Alert.alert(
        'Success',
        customer ? 'Customer updated successfully!' : 'Customer created successfully!'
      );

    } catch (error) {
      Alert.alert('Error', 'Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }

    // Clear GSTIN when switching to Unregistered
    if (field === 'gstRegistrationType' && value === 'Unregistered') {
      setFormData(prev => ({
        ...prev,
        gstin: '',
      }));
    }
  };

  const handleStateSelect = (state) => {
    const selectedState = INDIA_STATES.find(s => s.isoCode === state);
    if (selectedState) {
      setSelectedStateCode(state);
      updateFormData('state', selectedState.name);
      updateFormData('city', ''); // Clear city when state changes
    }
    setShowStateModal(false);
  };

  const handleCitySelect = (city) => {
    updateFormData('city', city);
    setShowCityModal(false);
  };

  const renderFormField = (label, field, placeholder, required = false, keyboardType = 'default') => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          errors[field] && styles.inputError,
        ]}
        placeholder={placeholder}
        value={formData[field]}
        onChangeText={(value) => updateFormData(field, value)}
        keyboardType={keyboardType}
      />
      {errors[field] ? (
        <Text style={styles.errorText}>{errors[field]}</Text>
      ) : null}
    </View>
  );

  const renderSelectField = (label, field, options, valueKey = 'value', labelKey = 'label') => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.pickerContainer, errors[field] && styles.inputError]}>
        <Picker
          selectedValue={formData[field]}
          onValueChange={(value) => updateFormData(field, value)}
          style={styles.picker}
        >
          {options.map((option, index) => (
            <Picker.Item
              key={index}
              label={option[labelKey] || option}
              value={option[valueKey] || option}
            />
          ))}
        </Picker>
      </View>
      {errors[field] ? (
        <Text style={styles.errorText}>{errors[field]}</Text>
      ) : null}
    </View>
  );

  const renderModalSelect = (label, field, items, visible, onClose, onSelect, placeholder) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.modalTrigger, errors[field] && styles.inputError]}
        onPress={onClose}
      >
        <Text style={formData[field] ? styles.modalTriggerText : styles.modalTriggerPlaceholder}>
          {formData[field] || placeholder}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select {label}</Text>
            <FlatList
              data={items}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => onSelect(item)}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onClose}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {errors[field] ? (
        <Text style={styles.errorText}>{errors[field]}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Customer Name */}
        {renderFormField('Customer Name', 'name', 'e.g. John Doe', true)}

        {/* Contact Details */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            {renderFormField('Mobile Number / Whatsapp', 'contactNumber', 'e.g. 9876543210', true, 'phone-pad')}
          </View>
          <View style={styles.halfWidth}>
            {renderFormField('Email ID', 'email', 'e.g. john.doe@example.com', true, 'email-address')}
          </View>
        </View>

        {/* Address */}
        {renderFormField('Address', 'address', 'e.g. 456 Park Avenue')}

        {/* State and City */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            {renderModalSelect(
              'State',
              'state',
              INDIA_STATES.map(s => s.name),
              showStateModal,
              () => setShowStateModal(true),
              handleStateSelect,
              'Select state'
            )}
          </View>
          <View style={styles.halfWidth}>
            {renderModalSelect(
              'City',
              'city',
              availableCities,
              showCityModal,
              () => setShowCityModal(true),
              handleCitySelect,
              selectedStateCode ? 'Select city' : 'Select state first'
            )}
          </View>
        </View>

        {/* GST Registration Type and PAN */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            {renderSelectField('GST Registration Type', 'gstRegistrationType', GST_REGISTRATION_TYPES)}
          </View>
          <View style={styles.halfWidth}>
            {renderFormField('PAN', 'pan', '10-digit PAN', false, 'default')}
          </View>
        </View>

        {/* GSTIN (conditionally shown) */}
        {formData.gstRegistrationType !== 'Unregistered' && (
          renderFormField('GSTIN', 'gstin', '15-digit GSTIN')
        )}

        {/* TDS Applicable Switch */}
        <View style={styles.switchContainer}>
          <Text style={styles.label}>TDS Applicable?</Text>
          <Switch
            value={formData.isTDSApplicable}
            onValueChange={(value) => updateFormData('isTDSApplicable', value)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={formData.isTDSApplicable ? '#007AFF' : '#f4f3f4'}
          />
        </View>

        {/* TDS Details (conditionally shown) */}
        {formData.isTDSApplicable && (
          <View style={styles.tdsContainer}>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                {renderFormField('TDS Rate (%)', 'tdsRate', 'e.g. 10', false, 'numeric')}
              </View>
              <View style={styles.halfWidth}>
                {renderFormField('TDS Section', 'tdsSection', 'e.g. 194J')}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Processing...' : (customer ? 'Save Changes' : 'Create Customer')}
          </Text>
        </TouchableOpacity>
      </View>
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
  },
  scrollContent: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  required: {
    color: 'red',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
  },
  tdsContainer: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
  },
  modalTrigger: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  modalTriggerText: {
    fontSize: 16,
    color: '#333',
  },
  modalTriggerPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemText: {
    fontSize: 16,
  },
  modalCloseButton: {
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
