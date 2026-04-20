// UserForm.js
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
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { useCompany } from '../../contexts/company-context';

const { height: SCREEN_H } = Dimensions.get('window');

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

const UserForm = ({ navigation, route }) => {
  const user = route?.params?.user ?? null;
  const { triggerCompaniesRefresh } = useCompany();

  const [roles] = useState(DEFAULT_ROLES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allCompanies, setAllCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [tempSelectedCompanies, setTempSelectedCompanies] = useState([]);

  const [formData, setFormData] = useState({
    userName: '', userId: '', password: '', email: '',
    contactNumber: '', address: '', companies: [], roleId: '',
  });
  const [errors, setErrors] = useState({
    userName: '', userId: '', password: '', email: '', contactNumber: '', roleId: '',
  });

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${BASE_URL}/api/companies/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setAllCompanies(Array.isArray(data) ? data : data?.data || []);
      } catch (e) {
        console.error('fetch companies', e);
      } finally {
        setIsLoadingCompanies(false);
      }
    };
    fetch_();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        userName: user.userName || '', userId: user.userId || '', password: '',
        contactNumber: user.contactNumber || '', email: user.email || '',
        address: user.address || '',
        companies: Array.isArray(user.companies)
          ? user.companies.map(c => (typeof c === 'string' ? c : c?._id)).filter(Boolean)
          : [],
        roleId: '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      const def = roles.find(r => r.name === 'user') || roles[0];
      setFormData(p => ({ ...p, roleId: def?._id }));
    } else {
      const match = roles.find(r => r.name === mapExistingRoleToForm(user.role, roles));
      if (match) setFormData(p => ({ ...p, roleId: match._id }));
    }
  }, [roles, user]);

  const handleOpenModal = () => {
    setTempSelectedCompanies([...formData.companies]);
    setShowCompanyModal(true);
  };
  const handleToggleCompany = id =>
    setTempSelectedCompanies(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);

  const filteredCompanies = allCompanies.filter(c =>
    c.businessName.toLowerCase().includes(companySearch.toLowerCase()));
  const allFilteredSelected =
    filteredCompanies.length > 0 && filteredCompanies.every(c => tempSelectedCompanies.includes(c._id));

  const handleSelectAll = () => {
    const ids = filteredCompanies.map(c => c._id);
    const all = ids.every(id => tempSelectedCompanies.includes(id));
    setTempSelectedCompanies(p => all ? p.filter(id => !ids.includes(id)) : [...new Set([...p, ...ids])]);
  };
  const handleDone = () => {
    setFormData(p => ({ ...p, companies: [...tempSelectedCompanies] }));
    setShowCompanyModal(false);
    setCompanySearch('');
  };
  const handleCancelModal = () => {
    setTempSelectedCompanies([...formData.companies]);
    setShowCompanyModal(false);
    setCompanySearch('');
  };

  const validateForm = () => {
    const e = { userName: '', userId: '', password: '', email: '', contactNumber: '', roleId: '' };
    let ok = true;
    if (!formData.userName.trim()) { e.userName = 'User name is required'; ok = false; }
    if (!user && !formData.userId.trim()) { e.userId = 'User ID is required'; ok = false; }
    if (!user && !formData.password.trim()) { e.password = 'Password is required'; ok = false; }
    else if (!user && formData.password.length < 6) { e.password = 'Min 6 characters'; ok = false; }
    if (!formData.email?.trim()) { e.email = 'Email is required'; ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) { e.email = 'Invalid email'; ok = false; }
    if (!formData.contactNumber?.trim()) { e.contactNumber = 'Contact is required'; ok = false; }
    else if (!/^[0-9]{10}$/.test(formData.contactNumber.trim())) { e.contactNumber = 'Must be 10 digits'; ok = false; }
    if (!formData.roleId) { e.roleId = 'Role is required'; ok = false; }
    setErrors(e);
    return ok;
  };

  const handleInputChange = (field, value) => {
    setFormData(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) { Alert.alert('Validation Error', 'Please fill all required fields'); return; }
    const selectedRole = roles.find(r => r._id === formData.roleId);
    const payload = {
      userName: formData.userName.trim(), contactNumber: formData.contactNumber.trim(),
      email: formData.email.trim(), address: formData.address.trim(), companies: formData.companies,
      roleId: isObjectId(selectedRole?._id) ? selectedRole._id : undefined,
      roleName: !isObjectId(selectedRole?._id) ? selectedRole?.name : undefined,
    };
    if (!user) payload.userId = formData.userId.trim();
    if (formData.password) payload.password = formData.password;
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { Alert.alert('Error', 'Token not found'); return; }
      const res = await fetch(
        user ? `${BASE_URL}/api/users/${user._id}` : `${BASE_URL}/api/users`,
        {
          method: user ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) { Alert.alert('Failed', data.message || 'Error'); return; }
      if (payload.companies?.length) triggerCompaniesRefresh?.();
      Alert.alert('Success', `User ${user ? 'updated' : 'created'}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ErrRow = ({ msg }) => msg ? (
    <View style={styles.errorRow}>
      <Icon name="alert-circle" size={13} color="#EF4444" />
      <Text style={styles.error}>{msg}</Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <IonIcon name="arrow-back" size={22} color="#4F46E5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{user ? 'Edit User' : 'Create New User'}</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.field}>
            <Text style={styles.label}>User Name <Text style={styles.req}>*</Text></Text>
            <TextInput style={[styles.input, errors.userName && styles.inputErr]}
              placeholder="e.g. John Doe" placeholderTextColor="#9CA3AF"
              value={formData.userName} onChangeText={t => handleInputChange('userName', t)} />
            <ErrRow msg={errors.userName} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>User ID {!user && <Text style={styles.req}>*</Text>}</Text>
            <TextInput style={[styles.input, user && styles.inputDisabled, errors.userId && styles.inputErr]}
              placeholder="Unique User ID" placeholderTextColor="#9CA3AF"
              value={formData.userId} editable={!user} onChangeText={t => handleInputChange('userId', t)} />
            <ErrRow msg={errors.userId} />
          </View>

          {!user && (
            <View style={styles.field}>
              <Text style={styles.label}>Password <Text style={styles.req}>*</Text></Text>
              <TextInput style={[styles.input, errors.password && styles.inputErr]}
                secureTextEntry placeholder="Min 6 characters" placeholderTextColor="#9CA3AF"
                value={formData.password} onChangeText={t => handleInputChange('password', t)} />
              <ErrRow msg={errors.password} />
            </View>
          )}

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Contact No. <Text style={styles.req}>*</Text></Text>
              <TextInput style={[styles.input, errors.contactNumber && styles.inputErr]}
                keyboardType="phone-pad" placeholder="9876543210" placeholderTextColor="#9CA3AF"
                value={formData.contactNumber} maxLength={10}
                onChangeText={t => handleInputChange('contactNumber', t)} />
              <ErrRow msg={errors.contactNumber} />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Email <Text style={styles.req}>*</Text></Text>
              <TextInput style={[styles.input, errors.email && styles.inputErr]}
                autoCapitalize="none" keyboardType="email-address"
                placeholder="user@example.com" placeholderTextColor="#9CA3AF"
                value={formData.email} onChangeText={t => handleInputChange('email', t)} />
              <ErrRow msg={errors.email} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Address</Text>
            <TextInput style={[styles.input, styles.textArea]} multiline numberOfLines={2}
              placeholder="Full Address" placeholderTextColor="#9CA3AF"
              value={formData.address} onChangeText={t => setFormData(p => ({ ...p, address: t }))} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Role <Text style={styles.req}>*</Text></Text>
            <View style={styles.roleRow}>
              {roles.map(r => (
                <TouchableOpacity key={r._id}
                  style={[styles.roleChip, formData.roleId === r._id && styles.roleChipActive]}
                  onPress={() => { setFormData(p => ({ ...p, roleId: r._id })); setErrors(p => ({ ...p, roleId: '' })); }}
                  activeOpacity={0.75}>
                  <View style={[styles.radio, formData.roleId === r._id && styles.radioOn]}>
                    {formData.roleId === r._id && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.roleText, formData.roleId === r._id && styles.roleTextOn]}>
                    {r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <ErrRow msg={errors.roleId} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Companies Access <Text style={styles.req}>*</Text></Text>
            <TouchableOpacity style={styles.input} onPress={handleOpenModal} activeOpacity={0.7}>
              {isLoadingCompanies
                ? <ActivityIndicator size="small" color="#9CA3AF" />
                : <Text style={[styles.inputText, !formData.companies.length && styles.placeholder]}>
                    {formData.companies.length
                      ? `${formData.companies.length} compan${formData.companies.length > 1 ? 'ies' : 'y'} selected`
                      : 'Select companies...'}
                  </Text>}
              <Text style={styles.chevron}>⌄</Text>
            </TouchableOpacity>
            {formData.companies.length > 0 && (
              <View style={styles.badges}>
                {formData.companies.map(id => {
                  const comp = allCompanies.find(c => c._id === id);
                  return comp ? (
                    <View key={id} style={styles.badge}>
                      <Text style={styles.badgeText} numberOfLines={1}>{comp.businessName}</Text>
                      <TouchableOpacity onPress={() => setFormData(p => ({ ...p, companies: p.companies.filter(c => c !== id) }))}>
                        <Icon name="close-circle" size={16} color="#4F46E5" style={{ marginLeft: 5 }} />
                      </TouchableOpacity>
                    </View>
                  ) : null;
                })}
              </View>
            )}
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.saveBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>{user ? 'Update User' : 'Create User'}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      
      <Modal visible={showCompanyModal} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={handleCancelModal}>
          <Pressable
            style={styles.sheet}
            onPress={e => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Choose Companies</Text>
              <TouchableOpacity onPress={handleCancelModal} style={styles.closeBtn}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            
            <TextInput style={styles.search} placeholder="Search..."
              placeholderTextColor="#9CA3AF" value={companySearch} onChangeText={setCompanySearch} />

            
            <TouchableOpacity style={styles.selectAll} onPress={handleSelectAll}>
              <Icon name={allFilteredSelected ? 'check-all' : 'checkbox-blank-outline'}
                size={20} color={allFilteredSelected ? '#4F46E5' : '#6B7280'} />
              <Text style={[styles.selectAllText, allFilteredSelected && { color: '#4F46E5' }]}>
                {allFilteredSelected ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>

            
            {isLoadingCompanies ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.centerText}>Loading...</Text>
              </View>
            ) : filteredCompanies.length === 0 ? (
              <View style={styles.centerBox}>
                <Text style={styles.centerText}>No companies found</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                {filteredCompanies.map(c => {
                  const sel = tempSelectedCompanies.includes(c._id);
                  return (
                    <TouchableOpacity key={c._id}
                      style={[styles.listItem, sel && styles.listItemSel]}
                      onPress={() => handleToggleCompany(c._id)}>
                      <Icon name={sel ? 'checkbox-marked-circle' : 'circle-outline'}
                        size={22} color={sel ? '#4F46E5' : '#D1D5DB'} />
                      <Text style={[styles.listItemText, sel && styles.listItemTextSel]}>
                        {c.businessName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

           
            <View style={styles.sheetFooter}>
              <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default UserForm;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1F2937', textAlign: 'center' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  field: { marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12 },

  label: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 7 },
  req: { color: '#EF4444' },

  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, backgroundColor: '#fff',
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#111827', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  inputErr: { borderColor: '#EF4444' },
  inputDisabled: { backgroundColor: '#F9FAFB' },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  inputText: { fontSize: 15, color: '#111827', flex: 1 },
  placeholder: { color: '#9CA3AF' },
  chevron: { fontSize: 16, color: '#6B7280' },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  error: { fontSize: 12, color: '#EF4444', fontWeight: '500' },

  roleRow: { flexDirection: 'row', gap: 12 },
  roleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1,
    borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11,
  },
  roleChipActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: '#4F46E5' },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#4F46E5' },
  roleText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  roleTextOn: { color: '#4F46E5', fontWeight: '600' },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  badgeText: { fontSize: 12, color: '#4F46E5', fontWeight: '600', maxWidth: 150 },

  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 10 : 16,
    borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#fff',
  },
  saveBtn: { backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ── Modal ──
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },

  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SCREEN_H * 0.75,        
    overflow: 'hidden',
  },

  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginTop: 10 },

  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  closeX: { fontSize: 13, color: '#6B7280', fontWeight: '600' },

  search: {
    margin: 12, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
  },

  selectAll: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 8, paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  selectAllText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },

  
  list: { height: SCREEN_H * 0.33 },

  centerBox: { height: SCREEN_H * 0.2, alignItems: 'center', justifyContent: 'center' },
  centerText: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },

  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  listItemSel: { backgroundColor: '#F5F3FF' },
  listItemText: { fontSize: 15, color: '#374151' },
  listItemTextSel: { color: '#4F46E5', fontWeight: '600' },

  sheetFooter: {
    paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  doneBtn: {
    backgroundColor: '#4F46E5', borderRadius: 10,
    paddingVertical: 15, alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});