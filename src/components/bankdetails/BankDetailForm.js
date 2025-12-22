// BankDetailsForm.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import bankListData from '../../data/bankList.json';
import ImageCropper from '../ui/ImageCropper';
import { BASE_URL } from '../../config';

const { width } = Dimensions.get('window');

const BankDetailsForm = ({ bankDetail, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    company: '',
    bankName: '',
    city: '',
    accountNo: '',
    ifscCode: '',
    branchAddress: '',
    upiId: '',
    upiName: '',
    upiMobile: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  // Bank search states
  const [bankSuggestions, setBankSuggestions] = useState([]);
  const [showBankSuggestions, setShowBankSuggestions] = useState(false);
  const [isLoadingBankSuggestions, setIsLoadingBankSuggestions] = useState(false);
  const [bankSelectedFromDropdown, setBankSelectedFromDropdown] = useState(false);

  // QR Code states
  const [qrCodeFile, setQrCodeFile] = useState(null);
  const [existingQrCode, setExistingQrCode] = useState('');
  const [qrCodePreview, setQrCodePreview] = useState(null);
  const [showQrCropper, setShowQrCropper] = useState(false);
  const [tempQrImage, setTempQrImage] = useState('');

  const cityRef = useRef(null);
  const accountNoRef = useRef(null);
  const ifscCodeRef = useRef(null);
  const branchAddressRef = useRef(null);
  const upiIdRef = useRef(null);
  const upiNameRef = useRef(null);
  const upiMobileRef = useRef(null);

  const getCompanyId = company => {
    if (!company) return '';
    return typeof company === 'string' ? company : company._id;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.company) newErrors.company = 'Company is required';
    if (!formData.bankName) newErrors.bankName = 'Bank name is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.accountNo) newErrors.accountNo = 'Account number is required';
    if (formData.ifscCode && formData.ifscCode.length !== 11) {
      newErrors.ifscCode = 'IFSC code must be 11 characters';
    }
    if (formData.upiMobile && formData.upiMobile.length !== 10) {
      newErrors.upiMobile = 'Mobile number must be 10 digits';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(response.data);
    } catch (error) {
      console.error('Fetch companies error:', error);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  useEffect(() => {
    if (bankDetail) {
      setFormData({
        company: getCompanyId(bankDetail.company),
        bankName: bankDetail.bankName || '',
        city: bankDetail.city || '',
        accountNo: bankDetail.accountNo || '',
        ifscCode: bankDetail.ifscCode || '',
        branchAddress: bankDetail.branchAddress || '',
        upiId: bankDetail.upiDetails?.upiId || '',
        upiName: bankDetail.upiDetails?.upiName || '',
        upiMobile: bankDetail.upiDetails?.upiMobile || '',
      });
      setExistingQrCode(bankDetail.qrCode || '');
      if (bankDetail.bankName) setBankSelectedFromDropdown(true);
    }
  }, [bankDetail]);

  useEffect(() => {
    if (bankSelectedFromDropdown) {
      setShowBankSuggestions(false);
      return;
    }
    const timer = setTimeout(() => {
      if (formData.bankName && formData.bankName.length >= 2) {
        setIsLoadingBankSuggestions(true);
        const results = bankListData
          .filter(bank => 
            bank.bank_name.toLowerCase().includes(formData.bankName.toLowerCase()) ||
            bank.ifsc.toLowerCase().includes(formData.bankName.toLowerCase())
          ).slice(0, 10);
        setBankSuggestions(results);
        setShowBankSuggestions(true);
        setIsLoadingBankSuggestions(false);
      } else {
        setShowBankSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.bankName, bankSelectedFromDropdown]);

  const handleBankSelect = bank => {
    setFormData(prev => ({ ...prev, bankName: bank.bank_name, ifscCode: bank.ifsc }));
    setBankSelectedFromDropdown(true);
    setShowBankSuggestions(false);
    Keyboard.dismiss();
  };

  const handleQrCodePick = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.assets && response.assets[0]) {
        setTempQrImage(response.assets[0].uri);
        setShowQrCropper(true);
      }
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const clientId = payload.clientId || payload.id;

      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => formDataToSend.append(key, formData[key]));
      formDataToSend.append('client', clientId);

      if (qrCodeFile) {
        formDataToSend.append('qrCode', {
          uri: qrCodeFile.uri,
          type: 'image/jpeg',
          name: 'qrcode.jpg',
        });
      }

      const method = bankDetail ? 'PUT' : 'POST';
      const url = bankDetail ? `${BASE_URL}/api/bank-details/${bankDetail._id}` : `${BASE_URL}/api/bank-details`;

      await axios({
        method,
        url,
        data: formDataToSend,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Bank details saved');
      onSuccess();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowBankSuggestions(false); }}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Company */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Company *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.company}
                onValueChange={v => setFormData({ ...formData, company: v })}
                style={styles.picker}
              >
                <Picker.Item label="Select Company" value="" />
                {companies.map(c => <Picker.Item key={c._id} label={c.businessName} value={c._id} />)}
              </Picker>
            </View>
            {errors.company && <Text style={styles.errorText}>{errors.company}</Text>}
          </View>

          {/* Bank Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Bank Name *</Text>
            <TextInput
              style={[styles.input, errors.bankName && styles.inputError]}
              value={formData.bankName}
              onChangeText={v => { setFormData({ ...formData, bankName: v }); setBankSelectedFromDropdown(false); }}
              placeholder="Search Bank..."
            />
            {isLoadingBankSuggestions && <ActivityIndicator style={styles.bankLoader} />}
            
            {/* FIXED: Replaced FlatList with .map() inside a View */}
            {showBankSuggestions && bankSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {bankSuggestions.map((item) => (
                  <TouchableOpacity 
                    key={item.ifsc + item.bank_name} 
                    style={styles.suggestionItem}
                    onPress={() => handleBankSelect(item)}
                  >
                    <Text style={styles.suggestionBankName}>{item.bank_name}</Text>
                    <Text style={styles.suggestionIfsc}>{item.ifsc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}
          </View>

          {/* City & Account */}
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>City *</Text>
              <TextInput 
                style={styles.input} 
                value={formData.city} 
                onChangeText={v => setFormData({...formData, city: v})} 
                ref={cityRef}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Account No *</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={formData.accountNo} 
                onChangeText={v => setFormData({...formData, accountNo: v})}
              />
            </View>
          </View>

          {/* IFSC & Address */}
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>IFSC Code</Text>
              <TextInput 
                style={styles.input} 
                autoCapitalize="characters" 
                value={formData.ifscCode} 
                onChangeText={v => setFormData({...formData, ifscCode: v.toUpperCase()})}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Branch Address</Text>
              <TextInput 
                style={styles.input} 
                value={formData.branchAddress} 
                onChangeText={v => setFormData({...formData, branchAddress: v})}
              />
            </View>
          </View>

          {/* UPI Section */}
          <Text style={[styles.label, {marginTop: 10}]}>UPI Details</Text>
          <View style={styles.row}>
             <TextInput 
                placeholder="UPI ID" 
                style={[styles.input, styles.flex1]} 
                value={formData.upiId} 
                onChangeText={v => setFormData({...formData, upiId: v})}
             />
             <TextInput 
                placeholder="UPI Mobile" 
                style={[styles.input, styles.flex1]} 
                keyboardType="phone-pad" 
                value={formData.upiMobile} 
                onChangeText={v => setFormData({...formData, upiMobile: v})}
             />
          </View>

          {/* QR Code */}
          <TouchableOpacity style={styles.qrCodeButton} onPress={handleQrCodePick}>
            <Text>{qrCodePreview || existingQrCode ? 'Change QR Code' : 'Upload QR Code'}</Text>
          </TouchableOpacity>
          {(qrCodePreview || existingQrCode) && (
            <Image 
              source={{ uri: qrCodePreview || `${BASE_URL}/${existingQrCode}` }} 
              style={styles.qrCodeImage} 
            />
          )}

          {/* Submission */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && {opacity: 0.5}]} 
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={{color: 'white', fontWeight: 'bold'}}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>

        <ImageCropper
          image={tempQrImage}
          visible={showQrCropper}
          onCropComplete={cropped => {
            setQrCodeFile(cropped);
            setQrCodePreview(cropped.uri);
            setShowQrCropper(false);
          }}
          onCancel={() => setShowQrCropper(false)}
        />
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 50 },
  formGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 14 },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  flex1: { flex: 1 },
  pickerContainer: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, overflow: 'hidden' },
  picker: { height: 50 },
  bankLoader: { position: 'absolute', right: 10, top: 35 },
  suggestionsContainer: { backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#EEE', elevation: 3, marginTop: 5 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE', flexDirection: 'row', justifyContent: 'space-between' },
  suggestionBankName: { fontSize: 14, fontWeight: '500', flex: 1 },
  suggestionIfsc: { fontSize: 12, color: '#666' },
  qrCodeButton: { padding: 15, backgroundColor: '#F3F4F6', borderRadius: 8, alignItems: 'center', marginTop: 10 },
  qrCodeImage: { width: 100, height: 100, marginTop: 10, alignSelf: 'center', borderRadius: 10 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 30 },
  submitButton: { flex: 1, backgroundColor: '#3B82F6', padding: 15, borderRadius: 8, alignItems: 'center' },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', padding: 15, borderRadius: 8, alignItems: 'center' },
});

export default BankDetailsForm;