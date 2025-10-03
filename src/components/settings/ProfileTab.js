import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { UserCircle, Save } from 'lucide-react-native';

// Mock user data
const MOCK_USERS = {
  customer: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    role: 'customer'
  },
  admin: {
    name: 'Master Admin',
    email: 'admin@accountech.com',
    phone: '+1 (555) 123-4567',
    role: 'admin'
  }
};

const ProfileTab = () => {
  const [user, setUser] = useState(MOCK_USERS.admin); // Change to MOCK_USERS.customer for customer view
  const [formData, setFormData] = useState({
    fullName: user.name,
    email: user.email,
    phone: user.phone,
  });
  const [isSaving, setIsSaving] = useState(false);

  const isCustomer = user.role === 'customer';

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update user data
      setUser(prev => ({
        ...prev,
        name: formData.fullName,
        phone: formData.phone
      }));
      
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerContent}>
            <UserCircle size={24} color="#374151" />
            <View style={styles.headerText}>
              <Text style={styles.cardTitle}>Profile Settings</Text>
              <Text style={styles.cardDescription}>
                Update your personal information
              </Text>
            </View>
          </View>
        </View>

        {/* Card Content */}
        <View style={styles.cardContent}>
          <View style={styles.formGrid}>
            {/* Full Name Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={formData.fullName}
                onChangeText={(value) => handleInputChange('fullName', value)}
                placeholder="Enter your full name"
              />
            </View>

            {/* Email Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={formData.email}
                editable={false}
                placeholder="Enter your email"
              />
            </View>

            {/* Phone Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Save size={16} color="#fff" style={styles.saveIcon} />
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Role Toggle for Demo (Optional) */}
      <View style={styles.demoToggle}>
        <Text style={styles.demoToggleText}>Demo: Switch Role</Text>
        <View style={styles.toggleButtons}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              user.role === 'admin' && styles.roleButtonActive
            ]}
            onPress={() => {
              setUser(MOCK_USERS.admin);
              setFormData({
                fullName: MOCK_USERS.admin.name,
                email: MOCK_USERS.admin.email,
                phone: MOCK_USERS.admin.phone,
              });
            }}
          >
            <Text style={[
              styles.roleButtonText,
              user.role === 'admin' && styles.roleButtonTextActive
            ]}>
              Admin
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.roleButton,
              user.role === 'customer' && styles.roleButtonActive
            ]}
            onPress={() => {
              setUser(MOCK_USERS.customer);
              setFormData({
                fullName: MOCK_USERS.customer.name,
                email: MOCK_USERS.customer.email,
                phone: MOCK_USERS.customer.phone,
              });
            }}
          >
            <Text style={[
              styles.roleButtonText,
              user.role === 'customer' && styles.roleButtonTextActive
            ]}>
              Customer
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 20,
  },
  cardHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  cardContent: {
    padding: 20,
  },
  formGrid: {
    gap: 20,
  },
  fieldContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 44,
  },
  disabledInput: {
    backgroundColor: '#f9fafb',
    color: '#6b7280',
  },
  cardFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  demoToggle: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  demoToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  toggleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#007AFF',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
});

export default ProfileTab;