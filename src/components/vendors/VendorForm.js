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
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

// Mock data - replace with actual data source
const MOCK_VENDORS = [
  {
    id: '1',
    vendorName: 'Acme Supplies',
    contactNumber: '9876543210',
    email: 'contact@acme.com',
    address: '123 Industrial Area',
    city: 'Mumbai',
    state: 'Maharashtra',
    gstin: '27ABCDE1234F1Z5',
    gstRegistrationType: 'Regular',
    pan: 'ABCDE1234F',
    isTDSApplicable: true,
    tdsRate: 10,
    tdsSection: '194J',
  },
];

const GST_REGISTRATION_TYPES = [
  'Regular',
  'Composition',
  'Unregistered',
  'Consumer',
  'Overseas',
  'Special Economic Zone',
  'Unknown',
];

// Mock states and cities data for India
const INDIA_STATES = [
  { code: 'MH', name: 'Maharashtra' },
  { code: 'DL', name: 'Delhi' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'GJ', name: 'Gujarat' },
];

const CITIES_BY_STATE = {
  MH: ['Mumbai', 'Pune', 'Nagpur', 'Thane'],
  DL: ['New Delhi', 'North Delhi', 'South Delhi'],
  KA: ['Bangalore', 'Mysore', 'Hubli'],
  TN: ['Chennai', 'Coimbatore', 'Madurai'],
  UP: ['Lucknow', 'Kanpur', 'Varanasi'],
  GJ: ['Ahmedabad', 'Surat', 'Vadodara'],
};

const VendorForm = ({ vendor, initialName, onSuccess }) => {
  const [formData, setFormData] = useState({
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
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showGSTPicker, setShowGSTPicker] = useState(false);
  const [availableCities, setAvailableCities] = useState([]);

  // Update available cities when state changes
  useEffect(() => {
    if (formData.state) {
      const stateCode = INDIA_STATES.find(s => s.name === formData.state)?.code;
      setAvailableCities(CITIES_BY_STATE[stateCode] || []);
      // Clear city when state changes
      setFormData(prev => ({ ...prev, city: '' }));
    } else {
      setAvailableCities([]);
    }
  }, [formData.state]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.vendorName.trim() || formData.vendorName.length < 2) {
      Alert.alert('Validation Error', 'Vendor name is required and must be at least 2 characters long.');
      return false;
    }

    if (!formData.contactNumber.trim() || formData.contactNumber.length < 10) {
      Alert.alert('Validation Error', 'Mobile number is required and must be at least 10 digits.');
      return false;
    }

    if (!formData.email.trim()) {
      Alert.alert('Validation Error', 'Email is required.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Validation Error', 'Invalid email address.');
      return false;
    }

    if (formData.gstin && formData.gstin.length !== 15) {
      Alert.alert('Validation Error', 'GSTIN must be 15 characters.');
      return false;
    }

    if (formData.pan && formData.pan.length !== 10) {
      Alert.alert('Validation Error', 'PAN must be 10 characters.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create mock vendor object
      const newVendor = {
        _id: vendor?._id || `vendor-${Date.now()}`,
        ...formData,
        createdAt: vendor?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Simulate successful submission
      console.log('Vendor submitted:', newVendor);

      // Call success callback
      if (onSuccess) {
        onSuccess(newVendor);
      }

      Alert.alert(
        'Success',
        vendor ? 'Vendor updated successfully!' : 'Vendor created successfully!',
        [{ text: 'OK' }]
      );

    } catch (error) {
      Alert.alert(
        'Operation Failed',
        error instanceof Error ? error.message : 'An unknown error occurred.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPickerModal = (visible, setVisible, items, selectedValue, onValueChange, title) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <Picker
            selectedValue={selectedValue}
            onValueChange={onValueChange}
          >
            <Picker.Item label={`Select ${title.toLowerCase()}`} value="" />
            {items.map((item, index) => (
              <Picker.Item
                key={index}
                label={typeof item === 'string' ? item : item.name || item.label}
                value={typeof item === 'string' ? item : item.value || item.name || item.code}
              />
            ))}
          </Picker>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Vendor Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vendor Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Acme Supplies"
              value={formData.vendorName}
              onChangeText={(value) => handleInputChange('vendorName', value)}
            />
          </View>

          {/* Contact Number and Email */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Mobile Number / Whatsapp</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9876543210"
                keyboardType="phone-pad"
                value={formData.contactNumber}
                onChangeText={(value) => handleInputChange('contactNumber', value)}
              />
            </View>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Email ID</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. contact@acme.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
              />
            </View>
          </View>

          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 123 Industrial Area"
              value={formData.address}
              onChangeText={(value) => handleInputChange('address', value)}
            />
          </View>

          {/* State and City */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>State</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowStatePicker(true)}
              >
                <Text style={formData.state ? styles.pickerText : styles.pickerPlaceholder}>
                  {formData.state || 'Select state'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>City</Text>
              <TouchableOpacity
                style={[
                  styles.pickerTrigger,
                  !formData.state && styles.pickerDisabled
                ]}
                onPress={() => formData.state && setShowCityPicker(true)}
                disabled={!formData.state}
              >
                <Text style={
                  formData.city ? styles.pickerText : 
                  !formData.state ? styles.pickerDisabledText : styles.pickerPlaceholder
                }>
                  {!formData.state ? 'Select state first' : 
                   formData.city || 'Select city'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* GSTIN and PAN */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>GSTIN</Text>
              <TextInput
                style={styles.input}
                placeholder="15-digit GSTIN"
                value={formData.gstin}
                onChangeText={(value) => handleInputChange('gstin', value)}
                maxLength={15}
              />
            </View>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>PAN</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit PAN"
                value={formData.pan}
                onChangeText={(value) => handleInputChange('pan', value)}
                maxLength={10}
              />
            </View>
          </View>

          {/* GST Registration Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>GST Registration Type</Text>
            <TouchableOpacity
              style={styles.pickerTrigger}
              onPress={() => setShowGSTPicker(true)}
            >
              <Text style={styles.pickerText}>
                {formData.gstRegistrationType}
              </Text>
            </TouchableOpacity>
          </View>

          {/* TDS Applicable Switch */}
          <View style={styles.switchContainer}>
            <Text style={styles.label}>TDS Applicable or Not</Text>
            <Switch
              value={formData.isTDSApplicable}
              onValueChange={(value) => handleInputChange('isTDSApplicable', value)}
            />
          </View>

          {/* TDS Details (conditional) */}
          {formData.isTDSApplicable && (
            <View style={styles.tdsSection}>
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>TDS Rate (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 10"
                    keyboardType="numeric"
                    value={formData.tdsRate?.toString()}
                    onChangeText={(value) => handleInputChange('tdsRate', parseFloat(value) || 0)}
                  />
                </View>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>TDS Section</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 194J"
                    value={formData.tdsSection}
                    onChangeText={(value) => handleInputChange('tdsSection', value)}
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : vendor ? 'Save Changes' : 'Create Vendor'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pickers */}
      {renderPickerModal(
        showStatePicker,
        setShowStatePicker,
        INDIA_STATES,
        formData.state,
        (value) => {
          handleInputChange('state', value);
          setShowStatePicker(false);
        },
        'State'
      )}

      {renderPickerModal(
        showCityPicker,
        setShowCityPicker,
        availableCities,
        formData.city,
        (value) => {
          handleInputChange('city', value);
          setShowCityPicker(false);
        },
        'City'
      )}

      {renderPickerModal(
        showGSTPicker,
        setShowGSTPicker,
        GST_REGISTRATION_TYPES,
        formData.gstRegistrationType,
        (value) => {
          handleInputChange('gstRegistrationType', value);
          setShowGSTPicker(false);
        },
        'GST Registration Type'
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerTrigger: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    height: 44,
  },
  pickerText: {
    fontSize: 16,
    color: '#000',
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
  },
  pickerDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  pickerDisabledText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  tdsSection: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '50%',
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
  },
  modalClose: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
});

export default VendorForm;