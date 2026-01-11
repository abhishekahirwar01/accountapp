import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/* ----------------------------- Helpers ---------------------------- */
const isObjectId = s => typeof s === 'string' && /^[a-f0-9]{24}$/i.test(s);

const mapExistingRoleToForm = (r, roles) => {
  const getName = obj => (obj?.name || obj?.label || '').toLowerCase();
  const n = typeof r === 'string' ? r.toLowerCase() : getName(r);
  if (['admin', 'manager', 'client'].includes(n)) return 'admin';
  if (n === 'user') return 'user';
  const id = typeof r === 'string' ? r : r?._id;
  const found = roles.find(x => x._id === id);
  return found ? found.name : 'user';
};

const DEFAULT_ROLES = [
  { _id: 'admin', name: 'admin' },
  { _id: 'user', name: 'user' },
];

export const UserForm = ({ user, allCompanies, onSave, onCancel }) => {
  const [roles] = useState(DEFAULT_ROLES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  
  // 🔥 NEW: Temporary selection state
  const [tempSelectedCompanies, setTempSelectedCompanies] = useState([]);

  const [formData, setFormData] = useState({
    userName: '',
    userId: '',
    password: '',
    email: '',
    contactNumber: '',
    address: '',
    companies: [],
    roleId: '',
  });

  // 🔥 Validation errors state
  const [errors, setErrors] = useState({
    userName: '',
    userId: '',
    password: '',
    email: '',
    contactNumber: '',
    roleId: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        userName: user.userName || '',
        userId: user.userId || '',
        password: '',
        contactNumber: user.contactNumber || '',
        email: user.email || '',
        address: user.address || '',
        companies: Array.isArray(user.companies)
          ? user.companies
              .map(c => (typeof c === 'string' ? c : c?._id))
              .filter(Boolean)
          : [],
        roleId: '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      const def = roles.find(r => r.name === 'user') || roles[0];
      setFormData(prev => ({ ...prev, roleId: def?._id }));
    } else {
      const coerced = mapExistingRoleToForm(user.role, roles);
      const match = roles.find(r => r.name === coerced);
      if (match) setFormData(prev => ({ ...prev, roleId: match._id }));
    }
  }, [roles, user]);

  // 🔥 NEW: Open modal and initialize temp selection
  const handleOpenModal = () => {
    setTempSelectedCompanies([...formData.companies]);
    setShowCompanyModal(true);
  };

  // 🔥 NEW: Toggle company in temporary selection
  const handleToggleCompany = id => {
    setTempSelectedCompanies(prev =>
      prev.includes(id)
        ? prev.filter(c => c !== id)
        : [...prev, id]
    );
  };

  // 🔥 NEW: Handle Select All / Deselect All (works on temp selection)
  const handleSelectAllCompanies = () => {
    const filteredIds = filteredCompanies.map(c => c._id);
    const allSelected = filteredIds.every(id => tempSelectedCompanies.includes(id));
    
    if (allSelected) {
      // Deselect all filtered companies
      setTempSelectedCompanies(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all filtered companies
      const uniqueCompanies = [...new Set([...tempSelectedCompanies, ...filteredIds])];
      setTempSelectedCompanies(uniqueCompanies);
    }
  };

  // 🔥 NEW: Apply temp selection to formData when Done is clicked
  const handleDoneSelection = () => {
    setFormData(prev => ({
      ...prev,
      companies: [...tempSelectedCompanies],
    }));
    setShowCompanyModal(false);
    setCompanySearch('');
  };

  // 🔥 NEW: Cancel and revert to original selection
  const handleCancelSelection = () => {
    setTempSelectedCompanies([...formData.companies]);
    setShowCompanyModal(false);
    setCompanySearch('');
  };

  // 🔥 Validation Functions
  const validateEmail = email => {
    if (!email || email.trim() === '') {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validateContactNumber = number => {
    if (!number || number.trim() === '') {
      return 'Contact number is required';
    }
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(number.trim())) {
      return 'Contact number must be exactly 10 digits';
    }
    return '';
  };

  const validateForm = () => {
    const newErrors = {
      userName: '',
      userId: '',
      password: '',
      email: '',
      contactNumber: '',
      roleId: '',
    };

    let isValid = true;

    // User Name validation
    if (!formData.userName.trim()) {
      newErrors.userName = 'User name is required';
      isValid = false;
    }

    // User ID validation (only for new users)
    if (!user && !formData.userId.trim()) {
      newErrors.userId = 'User ID is required';
      isValid = false;
    }

    // Password validation (only for new users)
    if (!user && !formData.password.trim()) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (!user && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    // Email validation (REQUIRED)
    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
      isValid = false;
    }

    // Contact Number validation (REQUIRED)
    const contactError = validateContactNumber(formData.contactNumber);
    if (contactError) {
      newErrors.contactNumber = contactError;
      isValid = false;
    }

    // Role validation
    if (!formData.roleId) {
      newErrors.roleId = 'Role is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // 🔥 Clear error when user starts typing
  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  // 🔥 Clear role error when a role is selected
  const handleRoleSelect = (roleId) => {
    setFormData({ ...formData, roleId });
    if (errors.roleId) {
      setErrors({ ...errors, roleId: '' });
    }
  };

  const handleSubmit = () => {
    // Validate form
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill all required fields before submitting');
      return;
    }

    const selectedRole = roles.find(r => r._id === formData.roleId);
    const payload = {
      userName: formData.userName.trim(),
      contactNumber: formData.contactNumber.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      companies: formData.companies,
      roleId: isObjectId(selectedRole?._id) ? selectedRole._id : undefined,
      roleName: !isObjectId(selectedRole?._id)
        ? selectedRole?.name
        : undefined,
    };

    if (!user) payload.userId = formData.userId.trim();
    if (formData.password) payload.password = formData.password;

    setIsSubmitting(true);
    onSave(payload)
      .catch((error) => {
        Alert.alert('Error', error.message || 'Failed to save user');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const filteredCompanies = allCompanies.filter(c =>
    c.businessName.toLowerCase().includes(companySearch.toLowerCase()),
  );

  // 🔥 Check if all filtered companies are selected (in temp selection)
  const allFilteredSelected = filteredCompanies.length > 0 && 
    filteredCompanies.every(c => tempSelectedCompanies.includes(c._id));

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        {/* User Name Field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            User Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.userName && styles.inputError]}
            value={formData.userName}
            onChangeText={t => handleInputChange('userName', t)}
            placeholder="e.g. John Doe"
          />
          {errors.userName ? (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={14} color="#dc2626" />
              <Text style={styles.errorText}>{errors.userName}</Text>
            </View>
          ) : null}
        </View>

        {/* User ID Field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            User ID {!user && <Text style={styles.required}>*</Text>}
          </Text>
          <TextInput
            style={[
              styles.input,
              user && styles.disabledInput,
              errors.userId && styles.inputError,
            ]}
            value={formData.userId}
            editable={!user}
            onChangeText={t => handleInputChange('userId', t)}
            placeholder="Unique User ID"
          />
          {errors.userId ? (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={14} color="#dc2626" />
              <Text style={styles.errorText}>{errors.userId}</Text>
            </View>
          ) : null}
        </View>

        {/* Password Field (only for new users) */}
        {!user && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Password <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              secureTextEntry
              value={formData.password}
              onChangeText={t => handleInputChange('password', t)}
              placeholder="Enter Password (min 6 characters)"
            />
            {errors.password ? (
              <View style={styles.errorContainer}>
                <Icon name="alert-circle" size={14} color="#dc2626" />
                <Text style={styles.errorText}>{errors.password}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Contact Number Field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Contact Number <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.contactNumber && styles.inputError]}
            keyboardType="phone-pad"
            value={formData.contactNumber}
            onChangeText={t => handleInputChange('contactNumber', t)}
            placeholder="9876543210"
            maxLength={10}
          />
          {errors.contactNumber ? (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={14} color="#dc2626" />
              <Text style={styles.errorText}>{errors.contactNumber}</Text>
            </View>
          ) : null}
        </View>

        {/* Email Field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Email <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            autoCapitalize="none"
            keyboardType="email-address"
            value={formData.email}
            onChangeText={t => handleInputChange('email', t)}
            placeholder="user@example.com"
          />
          {errors.email ? (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={14} color="#dc2626" />
              <Text style={styles.errorText}>{errors.email}</Text>
            </View>
          ) : null}
        </View>

        {/* Address Field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={2}
            value={formData.address}
            onChangeText={t => setFormData({ ...formData, address: t })}
            placeholder="Full Address"
          />
        </View>

        {/* Role Selection */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Role <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.radioGroup}>
            {roles.map(r => (
              <TouchableOpacity
                key={r._id}
                style={styles.roleItem}
                onPress={() => handleRoleSelect(r._id)}
              >
                <View
                  style={[
                    styles.radioCircle,
                    formData.roleId === r._id && styles.radioSelected,
                  ]}
                >
                  {formData.roleId === r._id && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioText}>{r.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.roleId ? (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={14} color="#dc2626" />
              <Text style={styles.errorText}>{errors.roleId}</Text>
            </View>
          ) : null}
        </View>

        {/* Companies Dropdown */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Companies Access</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={handleOpenModal}
          >
            <Text style={styles.triggerText}>Select companies...</Text>
            <Icon name="chevron-down" size={20} color="#15803d" />
          </TouchableOpacity>

          {/* Badges UI - shows actual selected companies */}
          <View style={styles.badgeContainer}>
            {formData.companies.map(id => {
              const comp = allCompanies.find(c => c._id === id);
              return comp ? (
                <View key={id} style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {comp.businessName}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    setFormData(prev => ({
                      ...prev,
                      companies: prev.companies.filter(c => c !== id)
                    }));
                  }}>
                    <Icon
                      name="close-circle"
                      size={16}
                      color="#1d4ed8"
                      style={{ marginLeft: 5 }}
                    />
                  </TouchableOpacity>
                </View>
              ) : null;
            })}
          </View>
        </View>

        {/* Overlay Modal for Companies */}
        <Modal visible={showCompanyModal} transparent animationType="fade">
          <Pressable
            style={styles.modalOverlay}
            onPress={handleCancelSelection}
          >
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Companies</Text>
                <TouchableOpacity onPress={handleCancelSelection}>
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <Icon name="magnify" size={20} color="#94a3b8" />
                <TextInput
                  placeholder="Search..."
                  style={styles.searchBar}
                  value={companySearch}
                  onChangeText={setCompanySearch}
                />
              </View>

              {/* 🔥 Select All Button with new icon */}
              <TouchableOpacity
                style={styles.selectAllBtn}
                onPress={handleSelectAllCompanies}
              >
                <Icon 
                  name={allFilteredSelected ? "check-all" : "checkbox-blank-outline"} 
                  size={22} 
                  color={allFilteredSelected ? "#2563eb" : "#64748b"} 
                />
                <Text style={[
                  styles.selectAllText,
                  allFilteredSelected && styles.selectAllTextActive
                ]}>
                  {allFilteredSelected ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>

              <ScrollView
                style={{ maxHeight: 300 }}
                keyboardShouldPersistTaps="handled"
              >
                {filteredCompanies.map(c => {
                  const isSelected = tempSelectedCompanies.includes(c._id);
                  return (
                    <TouchableOpacity
                      key={c._id}
                      style={[
                        styles.option,
                        isSelected && styles.optionSelected,
                      ]}
                      onPress={() => handleToggleCompany(c._id)}
                    >
                      <Icon
                        name={
                          isSelected
                            ? 'checkbox-marked-circle'
                            : 'circle-outline'
                        }
                        size={22}
                        color={isSelected ? '#22c55e' : '#cbd5e1'}
                      />
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextActive,
                        ]}
                      >
                        {c.businessName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              
              {/* Done Button */}
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={handleDoneSelection}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>{user ? 'Update' : 'Create'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  form: { paddingTop: 5 },
  fieldGroup: { marginBottom: 10 },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  required: {
    color: '#dc2626',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
  },
  inputError: {
    borderColor: '#dc2626',
    borderWidth: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  disabledInput: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  radioGroup: { flexDirection: 'row', gap: 20, marginBottom: 4, marginTop: 4 },
  roleItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#3b82f6' },
  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  radioText: { fontSize: 15, color: '#334155', textTransform: 'capitalize' },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
  },
  triggerText: { fontWeight: '600' },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '600',
    maxWidth: 150,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchBar: { flex: 1, padding: 8, fontSize: 14 },
  // 🔥 Select All Button Styles
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  selectAllTextActive: {
    color: '#2563eb',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  optionSelected: { backgroundColor: '#f0fdf4' },
  optionText: { fontSize: 15, color: '#475569' },
  optionTextActive: { color: '#15803d', fontWeight: '700' },
  doneBtn: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  doneBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 20,
  },
  cancelBtn: { padding: 12 },
  cancelText: { color: '#64748b', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: 'bold' },
});

export default UserForm;