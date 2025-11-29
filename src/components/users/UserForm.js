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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';

// Helper functions
const isObjectId = s => !!s && /^[a-f0-9]{24}$/i.test(s);

const coerceRoleName = r => {
  if (!r) return null;
  if (typeof r === 'string') return r.toLowerCase();
  if (typeof r === 'object') {
    const o = r;
    const n = (o.name || o.label || '').toLowerCase();
    return n || null;
  }
  return null;
};

const mapExistingRoleToForm = (r, roles) => {
  const n = coerceRoleName(r);
  if (n) {
    if (n === 'admin' || n === 'manager' || n === 'client') return 'admin';
    if (n === 'user') return 'user';
  }

  if (typeof r === 'string' && isObjectId(r)) {
    const found = roles.find(x => x._id === r);
    if (found) return found.name;
  }

  if (r && typeof r === 'object' && '_id' in r) {
    const id = r._id;
    const found = roles.find(x => x._id === id);
    if (found) return found.name;
  }

  return 'user';
};

const UserForm = ({ user, allCompanies, onSave, onCancel }) => {
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);

  // Fetch roles from API
  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${BASE_URL}/api/roles`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch roles: ${response.status}`);
      }

      const data = await response.json();

      // Handle different response formats
      const rolesData = Array.isArray(data)
        ? data
        : data?.data || data?.roles || [];

      if (rolesData.length === 0) {
        // Fallback to default roles if API returns empty
        setRoles([
          { _id: 'admin', name: 'admin' },
          { _id: 'user', name: 'user' },
        ]);
      } else {
        setRoles(rolesData);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      Alert.alert('Error', 'Failed to load roles. Using default roles.', [
        { text: 'OK' },
      ]);
      // Fallback to default roles
      setRoles([
        { _id: 'admin', name: 'admin' },
        { _id: 'user', name: 'user' },
      ]);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // Initialize form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        userName: user.userName || '',
        userId: user.userId || '',
        password: '',
        contactNumber: user.contactNumber || '',
        email: user.email || '',
        address: user.address || '',
        companies: [],
        roleId: '',
      });

      // Set selected companies
      const companyIds = Array.isArray(user.companies)
        ? user.companies
            .map(c => (typeof c === 'string' ? c : c?._id))
            .filter(Boolean)
        : [];
      setSelectedCompanyIds(companyIds);
    } else {
      // Reset form for new user
      setFormData({
        userName: '',
        userId: '',
        password: '',
        contactNumber: '',
        email: '',
        address: '',
        companies: [],
        roleId: '',
      });
      setSelectedCompanyIds([]);
    }
  }, [user]);

  // Set default role when roles are loaded
  useEffect(() => {
    if (roles.length === 0) return;

    if (!user) {
      // creating → default to "user"
      const def = roles.find(r => r.name === 'user') || roles[0];
      if (def) {
        setFormData(prev => ({ ...prev, roleId: def._id }));
      }
    } else {
      // editing → correctly map existing role to "admin" | "user"
      const coerced = mapExistingRoleToForm(user.role, roles);
      const match = roles.find(r => r.name === coerced);
      if (match) {
        setFormData(prev => ({ ...prev, roleId: match._id }));
      }
    }
  }, [roles, user]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.userName.trim()) {
      Alert.alert('Error', 'Please enter user name');
      return;
    }

    if (!user && !formData.userId.trim()) {
      Alert.alert('Error', 'Please enter user ID');
      return;
    }

    if (!user && !formData.password.trim()) {
      Alert.alert('Error', 'Please enter password');
      return;
    }

    if (!formData.roleId) {
      Alert.alert('Error', 'Please select a role');
      return;
    }

    const selectedRole = roles.find(r => r._id === formData.roleId);
    if (!selectedRole) {
      Alert.alert('Error', 'Please select a valid role');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build payload
      const payload = {
        userName: formData.userName.trim(),
        contactNumber: formData.contactNumber.trim(),
        email: formData.email?.trim() || ' ',
        address: formData.address.trim(),
        companies: selectedCompanyIds,
      };

      // Creation vs update
      if (!user) {
        payload.userId = formData.userId.trim();
      }

      // Only send password if user typed one (for new users or password change)
      if (formData.password?.trim()) {
        payload.password = formData.password.trim();
      }

      // Send role using whichever your backend accepts
      const looksLikeObjectId = /^[a-f0-9]{24}$/i.test(selectedRole._id);
      if (looksLikeObjectId) {
        payload.roleId = selectedRole._id;
      } else {
        payload.roleName = selectedRole.name;
      }

      // Get auth token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      let response;
      if (user) {
        // Update existing user
        response = await fetch(`${BASE_URL}/api/users/${user._id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new user
        response = await fetch(`${BASE_URL}/api/users`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to ${user ? 'update' : 'create'} user`,
        );
      }

      const result = await response.json();

      Alert.alert(
        'Success',
        `User ${user ? 'updated' : 'created'} successfully`,
        [{ text: 'OK', onPress: onSave }],
      );
    } catch (error) {
      console.error('Error saving user:', error);
      Alert.alert(
        'Error',
        error.message || `Failed to ${user ? 'update' : 'create'} user`,
        [{ text: 'OK' }],
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompanySelect = companyId => {
    setSelectedCompanyIds(prev => {
      if (prev.includes(companyId)) {
        return prev.filter(id => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
  };

  const selectedCompanies = allCompanies.filter(c =>
    selectedCompanyIds.includes(c._id),
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Row: User Name + User ID */}
        <View style={styles.row}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>User Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.userName}
              onChangeText={text =>
                setFormData({ ...formData, userName: text })
              }
              placeholder="Enter user name"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>User ID {!user && '*'}</Text>
            <TextInput
              style={[styles.input, user && styles.disabledInput]}
              value={formData.userId}
              onChangeText={text => setFormData({ ...formData, userId: text })}
              placeholder="Enter user ID"
              editable={!user}
            />
          </View>
        </View>

        {!user && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              value={formData.password}
              onChangeText={text =>
                setFormData({ ...formData, password: text })
              }
              placeholder="Enter password"
              secureTextEntry
            />
          </View>
        )}

        {/* Contact Number */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Contact Number</Text>
          <TextInput
            style={styles.input}
            value={formData.contactNumber}
            onChangeText={text =>
              setFormData({ ...formData, contactNumber: text })
            }
            placeholder="Enter contact number"
            keyboardType="phone-pad"
          />
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={text => setFormData({ ...formData, email: text })}
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Address */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={text => setFormData({ ...formData, address: text })}
            placeholder="Enter address"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Role selector */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Role *</Text>
          {rolesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading roles...</Text>
            </View>
          ) : roles.length === 0 ? (
            <Text style={styles.errorText}>No roles available</Text>
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.roleId}
                onValueChange={value =>
                  setFormData({ ...formData, roleId: value })
                }
                style={styles.picker}
              >
                <Picker.Item label="Select a role" value="" />
                {roles.map(r => (
                  <Picker.Item
                    key={r._id}
                    label={r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                    value={r._id}
                  />
                ))}
              </Picker>
            </View>
          )}
        </View>

        {/* Companies multi-select */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Companies</Text>
          <Text style={styles.helperText}>
            Select companies this user should have access to
          </Text>

          <View style={styles.companiesContainer}>
            {allCompanies.map(company => (
              <TouchableOpacity
                key={company._id}
                style={[
                  styles.companyItem,
                  selectedCompanyIds.includes(company._id) &&
                    styles.selectedCompanyItem,
                ]}
                onPress={() => handleCompanySelect(company._id)}
              >
                <Text
                  style={[
                    styles.companyText,
                    selectedCompanyIds.includes(company._id) &&
                      styles.selectedCompanyText,
                  ]}
                >
                  {company.businessName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Selected companies badges */}
          {selectedCompanies.length > 0 && (
            <View style={styles.selectedCompanies}>
              <Text style={styles.selectedCompaniesLabel}>
                Selected Companies:
              </Text>
              <View style={styles.badgesContainer}>
                {selectedCompanies.map(company => (
                  <View key={company._id} style={styles.badge}>
                    <Text style={styles.badgeText}>{company.businessName}</Text>
                    <TouchableOpacity
                      onPress={() => handleCompanySelect(company._id)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Required fields note */}
        <View style={styles.requiredNote}>
          <Text style={styles.requiredText}>* Required fields</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.cancelButton, isSubmitting && styles.disabledButton]}
            onPress={onCancel}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {user ? 'Update' : 'Create'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  form: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  inputContainer: {
    marginBottom: 20,
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: '#374151',
  },
  helperText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    fontStyle: 'italic',
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
  disabledInput: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  companiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  companyItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    backgroundColor: '#f9fafb',
  },
  selectedCompanyItem: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  companyText: {
    fontSize: 14,
    color: '#374151',
  },
  selectedCompanyText: {
    color: '#fff',
    fontWeight: '500',
  },
  selectedCompanies: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedCompaniesLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  badgeText: {
    fontSize: 14,
    color: '#374151',
  },
  removeButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#9ca3af',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  requiredNote: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fef3f2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  requiredText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    minWidth: 100,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default UserForm;
