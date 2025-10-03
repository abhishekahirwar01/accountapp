import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ✅ Correct icon imports for React Native CLI
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Feather from 'react-native-vector-icons/Feather';

import BankDetailsForm from '../bankdetails/BankDetailForm';

// Hardcoded data
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
    branchAddress: '123 Main Street, Mumbai, Maharashtra - 400001',
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
    branchAddress: '456 Central Avenue, Connaught Place, Delhi - 110001',
  },
  {
    _id: '3',
    client: 'client1',
    company: '3',
    bankName: 'ICICI Bank',
    managerName: 'Amit Patel',
    contactNumber: '7654321098',
    email: 'amit.patel@icici.com',
    city: 'Bangalore',
    ifscCode: 'ICIC0000789',
    branchAddress: '789 Tech Park, Koramangala, Bangalore - 560034',
  },
];

const BankSettings = () => {
  const [bankDetails, setBankDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBankDetail, setSelectedBankDetail] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Simulate loading bank details
  const fetchBankDetails = () => {
    setIsLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setBankDetails(HARDCODED_BANK_DETAILS);
      setIsLoading(false);
      setRefreshing(false);
    }, 1000);
  };

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBankDetails();
  };

  // Open form for creating or editing a bank detail
  const handleOpenForm = (bankDetail = null) => {
    setSelectedBankDetail(bankDetail);
    setIsFormOpen(true);
  };

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (bankDetail) => {
    Alert.alert(
      'Delete Bank Detail',
      'Are you sure you want to delete this bank detail? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => handleDeleteBankDetail(bankDetail)
        },
      ]
    );
  };

  // Delete bank detail
  const handleDeleteBankDetail = async (bankDetail) => {
    try {
      // Simulate API call
      setTimeout(() => {
        setBankDetails(prev => prev.filter(item => item._id !== bankDetail._id));
        Alert.alert('Success', 'Bank detail deleted successfully.');
      }, 500);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete bank detail.');
    }
  };

  // Form submission success handler
  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchBankDetails();
    const action = selectedBankDetail ? 'updated' : 'created';
    Alert.alert('Success', `Bank detail ${action} successfully.`);
    setSelectedBankDetail(null);
  };

  // Form cancel handler
  const handleFormCancel = () => {
    setIsFormOpen(false);
    setSelectedBankDetail(null);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading bank details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Manage Bank Details</Text>
            <Text style={styles.description}>
              A list of all your bank details.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleOpenForm()}
          >
            <Feather name="plus-circle" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Bank Details</Text>
          </TouchableOpacity>
        </View>

        {/* Bank Details List */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {bankDetails.length > 0 ? (
            <View style={styles.bankList}>
              {bankDetails.map((bankDetail) => (
                <View key={bankDetail._id} style={styles.bankCard}>
                  {/* Header Section */}
                  <View style={styles.cardHeader}>
                    <View style={styles.bankInfo}>
                      <Text style={styles.bankName}>{bankDetail.bankName}</Text>
                      <Text style={styles.branchAddress}>{bankDetail.branchAddress}</Text>
                    </View>
                    <View style={styles.actions}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleOpenForm(bankDetail)}
                      >
                        <Feather name="edit" size={18} color="#2563eb" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleOpenDeleteDialog(bankDetail)}
                      >
                        <Feather name="trash-2" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Contact Information */}
                  <View style={styles.contactGrid}>
                    {/* Manager Name */}
                    <View style={styles.contactItem}>
                      <View style={[styles.iconContainer, styles.managerIcon]}>
                        <FontAwesome5 name="user-tie" size={14} color="#1d4ed8" />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactLabel}>Manager</Text>
                        <Text style={styles.contactValue}>{bankDetail.managerName}</Text>
                      </View>
                    </View>

                    {/* Contact Number */}
                    <View style={styles.contactItem}>
                      <View style={[styles.iconContainer, styles.phoneIcon]}>
                        <Feather name="phone" size={14} color="#059669" />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactLabel}>Contact</Text>
                        <Text style={styles.contactValue}>{bankDetail.contactNumber}</Text>
                      </View>
                    </View>

                    {/* Email */}
                    {bankDetail.email && (
                      <View style={styles.contactItem}>
                        <View style={[styles.iconContainer, styles.emailIcon]}>
                          <Feather name="mail" size={14} color="#7c3aed" />
                        </View>
                        <View style={styles.contactInfo}>
                          <Text style={styles.contactLabel}>Email</Text>
                          <Text style={styles.contactValue} numberOfLines={1}>
                            {bankDetail.email}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* City & IFSC */}
                    <View style={styles.contactItem}>
                      <View style={[styles.iconContainer, styles.locationIcon]}>
                        <Feather name="map-pin" size={14} color="#dc2626" />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactLabel}>City</Text>
                        <Text style={styles.contactValue}>{bankDetail.city}</Text>
                      </View>
                    </View>

                    {bankDetail.ifscCode && (
                      <View style={styles.contactItem}>
                        <View style={[styles.iconContainer, styles.codeIcon]}>
                          <MaterialIcons name="code" size={14} color="#ea580c" />
                        </View>
                        <View style={styles.contactInfo}>
                          <Text style={styles.contactLabel}>IFSC Code</Text>
                          <Text style={styles.contactValue}>{bankDetail.ifscCode}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Feather name="package" size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Bank Details Found</Text>
              <Text style={styles.emptyDescription}>
                Get started by adding your first bank detail.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => handleOpenForm()}
              >
                <Feather name="plus-circle" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Add Bank Details</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Bank Detail Form Modal - Yahan BankDetailsForm component use kiya hai */}
        <BankDetailsForm
          bankDetail={selectedBankDetail || undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
          visible={isFormOpen}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fafafa',
  },
  headerContent: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  bankList: {
    padding: 16,
    gap: 16,
  },
  bankCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bankInfo: {
    flex: 1,
    marginRight: 12,
  },
  bankName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  branchAddress: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  contactGrid: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managerIcon: {
    backgroundColor: '#dbeafe',
  },
  phoneIcon: {
    backgroundColor: '#d1fae5',
  },
  emailIcon: {
    backgroundColor: '#f3e8ff',
  },
  locationIcon: {
    backgroundColor: '#fee2e2',
  },
  codeIcon: {
    backgroundColor: '#ffedd5',
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
});

export default BankSettings;