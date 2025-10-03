import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

// Hardcoded companies data
const COMPANIES = [
  { _id: '1', businessName: 'Tech Solutions Inc.' },
  { _id: '2', businessName: 'Global Enterprises Ltd.' },
  { _id: '3', businessName: 'Innovation Corp' },
];

// Hardcoded bank details data
const HARDCODED_BANK_DETAILS = [
  {
    _id: '1',
    client: 'client1',
    company: '1',
    bankName: 'State Bank of India',
    managerName: 'Rajesh Kumar',
    contactNumber: '9876543210',
    email: 'rajesh@sbi.com',
    city: 'Mumbai',
    ifscCode: 'SBIN0000123',
    branchAddress: '123 Main Street, Mumbai',
  },
  {
    _id: '2',
    client: 'client1',
    company: '2',
    bankName: 'HDFC Bank',
    managerName: 'Priya Sharma',
    contactNumber: '8765432109',
    email: 'priya@hdfc.com',
    city: 'Delhi',
    ifscCode: 'HDFC0000456',
    branchAddress: '456 Central Avenue, Delhi',
  },
];

const BankDetailsForm = ({ bankDetail, onSuccess, onCancel, visible }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    bankName: '',
    managerName: '',
    contactNumber: '',
    email: '',
    city: '',
    ifscCode: '',
    branchAddress: '',
  });

  const [errors, setErrors] = useState({});

  // Initialize form with bankDetail data when component mounts or bankDetail changes
  useEffect(() => {
    if (bankDetail) {
      setFormData({
        company: bankDetail.company,
        bankName: bankDetail.bankName,
        managerName: bankDetail.managerName,
        contactNumber: bankDetail.contactNumber,
        email: bankDetail.email || '',
        city: bankDetail.city,
        ifscCode: bankDetail.ifscCode || '',
        branchAddress: bankDetail.branchAddress || '',
      });
    } else {
      // Reset form for new entry
      setFormData({
        company: '',
        bankName: '',
        managerName: '',
        contactNumber: '',
        email: '',
        city: '',
        ifscCode: '',
        branchAddress: '',
      });
    }
    setErrors({});
  }, [bankDetail, visible]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.company) newErrors.company = 'Company is required.';
    if (!formData.bankName || formData.bankName.length < 2) newErrors.bankName = 'Bank name is required.';
    if (!formData.managerName || formData.managerName.length < 2) newErrors.managerName = 'Manager name is required.';
    if (!formData.contactNumber || formData.contactNumber.length !== 10) newErrors.contactNumber = 'Valid 10-digit contact number required.';
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email address.';
    if (!formData.city || formData.city.length < 2) newErrors.city = 'City is required.';
    if (formData.ifscCode && formData.ifscCode.length !== 11) newErrors.ifscCode = 'IFSC code must be 11 characters.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      
      // Show success message
      Alert.alert(
        'Success',
        `Bank detail ${bankDetail ? 'updated' : 'created'} successfully.`,
        [{ text: 'OK', onPress: onSuccess }]
      );
    }, 1000);
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {bankDetail ? 'Edit Bank Detail' : 'Create New Bank Detail'}
          </Text>
          <Text style={styles.description}>
            {bankDetail ? 'Update the details for this bank.' : 'Fill in the form to add a new bank detail.'}
          </Text>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.form}>
            {/* Company Picker */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Company</Text>
              <View style={[styles.pickerContainer, errors.company && styles.inputError]}>
                <Picker
                  selectedValue={formData.company}
                  onValueChange={(value) => updateFormData('company', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select a company" value="" />
                  {COMPANIES.map(company => (
                    <Picker.Item 
                      key={company._id} 
                      label={company.businessName} 
                      value={company._id} 
                    />
                  ))}
                </Picker>
              </View>
              {errors.company && <Text style={styles.errorText}>{errors.company}</Text>}
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flex1]}>
                <Text style={styles.label}>Bank Name</Text>
                <TextInput
                  style={[styles.input, errors.bankName && styles.inputError]}
                  placeholder="e.g. State Bank of India"
                  value={formData.bankName}
                  onChangeText={(value) => updateFormData('bankName', value)}
                />
                {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}
              </View>

              <View style={[styles.formGroup, styles.flex1]}>
                <Text style={styles.label}>Manager Name</Text>
                <TextInput
                  style={[styles.input, errors.managerName && styles.inputError]}
                  placeholder="e.g. John Doe"
                  value={formData.managerName}
                  onChangeText={(value) => updateFormData('managerName', value)}
                />
                {errors.managerName && <Text style={styles.errorText}>{errors.managerName}</Text>}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flex1]}>
                <Text style={styles.label}>Contact Number</Text>
                <TextInput
                  style={[styles.input, errors.contactNumber && styles.inputError]}
                  placeholder="e.g. 9876543210"
                  value={formData.contactNumber}
                  onChangeText={(value) => updateFormData('contactNumber', value)}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                {errors.contactNumber && <Text style={styles.errorText}>{errors.contactNumber}</Text>}
              </View>

              <View style={[styles.formGroup, styles.flex1]}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="e.g. john@example.com"
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flex1]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={[styles.input, errors.city && styles.inputError]}
                  placeholder="e.g. New York"
                  value={formData.city}
                  onChangeText={(value) => updateFormData('city', value)}
                />
                {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
              </View>

              <View style={[styles.formGroup, styles.flex1]}>
                <Text style={styles.label}>IFSC Code</Text>
                <TextInput
                  style={[styles.input, errors.ifscCode && styles.inputError]}
                  placeholder="e.g. SBIN0123456"
                  value={formData.ifscCode}
                  onChangeText={(value) => updateFormData('ifscCode', value.toUpperCase())}
                  maxLength={11}
                  autoCapitalize="characters"
                />
                {errors.ifscCode && <Text style={styles.errorText}>{errors.ifscCode}</Text>}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Branch Address</Text>
              <TextInput
                style={[styles.input, styles.textArea, errors.branchAddress && styles.inputError]}
                placeholder="e.g. 123 Main St, New York"
                value={formData.branchAddress}
                onChangeText={(value) => updateFormData('branchAddress', value)}
                multiline
                numberOfLines={3}
              />
              {errors.branchAddress && <Text style={styles.errorText}>{errors.branchAddress}</Text>}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {onCancel && (
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.button, styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Processing...' : (bankDetail ? 'Save Changes' : 'Create Bank Detail')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  formGroup: {
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
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    backgroundColor: '#fafafa',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  submitButton: {
    backgroundColor: '#2563eb',
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default BankDetailsForm;