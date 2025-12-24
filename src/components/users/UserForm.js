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
import { BASE_URL } from '../../config'; // Base URL yahan se aayega
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
  { _id: 'admin', name: 'admin' }, // Backend IDs ke according update karein
  { _id: 'user', name: 'user' },
];

export const UserForm = ({ user, allCompanies, onSave, onCancel }) => {
  const [roles] = useState(DEFAULT_ROLES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companySearch, setCompanySearch] = useState('');

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

  const handleToggleCompany = id => {
    setFormData(prev => ({
      ...prev,
      companies: prev.companies.includes(id)
        ? prev.companies.filter(c => c !== id)
        : [...prev.companies, id],
    }));
  };

  // --- ACTUAL WORKING SUBMIT LOGIC WITH BASE_URL ---
  const handleSubmit = () => {
    if (!formData.userName || (!user && !formData.password)) {
      Alert.alert('Validation Error', 'Please fill required fields.');
      return;
    }

    // Web ki tarah roleId ya roleName decide karna
    const selectedRole = roles.find(r => r._id === formData.roleId);
    const payload = {
      userName: formData.userName,
      contactNumber: formData.contactNumber,
      email: formData.email?.trim(),
      address: formData.address,
      companies: formData.companies,
      roleId: isObjectId(selectedRole?._id) ? selectedRole._id : undefined,
      roleName: !isObjectId(selectedRole?._id)
        ? selectedRole?.name
        : undefined,
    };

    if (!user) payload.userId = formData.userId;
    if (formData.password) payload.password = formData.password;

    onSave(payload);
  };

  const filteredCompanies = allCompanies.filter(c =>
    c.businessName.toLowerCase().includes(companySearch.toLowerCase()),
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>User Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.userName}
            onChangeText={t => setFormData({ ...formData, userName: t })}
            placeholder="e.g. John Doe"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>User ID</Text>
          <TextInput
            style={[styles.input, user && styles.disabledInput]}
            value={formData.userId}
            editable={!user}
            onChangeText={t => setFormData({ ...formData, userId: t })}
            placeholder="Unique User ID"
          />
        </View>

        {!user && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={formData.password}
              onChangeText={t => setFormData({ ...formData, password: t })}
              placeholder="Enter Password"
            />
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Contact Number</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            value={formData.contactNumber}
            onChangeText={t => setFormData({ ...formData, contactNumber: t })}
            placeholder="9876543210"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={formData.email}
            onChangeText={t => setFormData({ ...formData, email: t })}
            placeholder="user@example.com"
          />
        </View>

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
        <Text style={styles.label}>Role *</Text>
        <View style={styles.radioGroup}>
          {roles.map(r => (
            <TouchableOpacity
              key={r._id}
              style={styles.roleItem}
              onPress={() => setFormData({ ...formData, roleId: r._id })}
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

        {/* Companies Dropdown */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Companies Access</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setShowCompanyModal(true)}
          >
            <Text style={styles.triggerText}>Select companies...</Text>
            <Icon name="chevron-down" size={20} color="#15803d" />
          </TouchableOpacity>

          {/* Badges UI */}
          <View style={styles.badgeContainer}>
            {formData.companies.map(id => {
              const comp = allCompanies.find(c => c._id === id);
              return comp ? (
                <View key={id} style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {comp.businessName}
                  </Text>
                  <TouchableOpacity onPress={() => handleToggleCompany(id)}>
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
            onPress={() => setShowCompanyModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Companies</Text>
                <TouchableOpacity onPress={() => setShowCompanyModal(false)}>
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
              <ScrollView
                style={{ maxHeight: 300 }}
                keyboardShouldPersistTaps="handled"
              >
                {filteredCompanies.map(c => {
                  const isSelected = formData.companies.includes(c._id);
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
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setShowCompanyModal(false)}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
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
  form: { padding: 20 },
  fieldGroup: { marginBottom: 18 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
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
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  disabledInput: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  radioGroup: { flexDirection: 'row', gap: 20, marginBottom: 25, marginTop: 4 },
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
    borderColor: '#22c55e',
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
  },
  triggerText: { color: '#15803d', fontWeight: '600' },
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
