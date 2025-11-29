import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  useWindowDimensions,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Components (Assuming these are correctly adapted React Native components)
import UserForm from '../../components/users/UserForm';
import { UserCard } from '../../components/users/UserCard';
import { UserTable } from '../../components/users/UserTable';

// Icons
const PlusCircleIcon = ({ style }) => (
  <Icon name="plus-circle" size={20} color="#FFFFFF" style={style} />
);
const LayoutGridIcon = ({ color }) => (
  <Icon name="view-grid" size={20} color={color || '#374151'} />
);
const ListIcon = ({ color }) => (
  <Icon name="view-list" size={20} color={color || '#374151'} />
);
const CopyIcon = ({ color }) => (
  <Icon name="content-copy" size={20} color={color || '#3b82f6'} />
);
const CheckIcon = ({ color }) => (
  <Icon name="check-circle" size={20} color={color || '#10b981'} />
);
const PhoneIcon = () => <Icon name="phone" size={20} color="#ffffff" />;
const EmailIcon = () => <Icon name="email" size={20} color="#3b82f6" />;
const BuildingIcon = () => (
  <Icon name="office-building" size={24} color="#3b82f6" />
);
const AlertIcon = () => <Icon name="alert-circle" size={48} color="#dc2626" />;
const UsersLargeIcon = () => (
  <Icon name="account-group" size={48} color="#6b7280" />
);

export default function UsersScreen() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 600;
  const isMobile = width < 768; // Mobile devices के लिए breakpoint

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('card');
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Hardcoded Data
  const hardcodedCompanies = useMemo(
    () => [
      { _id: '1', businessName: 'Tech Solutions Inc.' },
      { _id: '2', businessName: 'Marketing Pro' },
      { _id: '3', businessName: 'Finance Corp' },
    ],
    [],
  );

  const hardcodedUsers = useMemo(
    () => [
      {
        _id: '1',
        userId: 'USR001',
        userName: 'John Doe',
        email: 'john@example.com',
        contactNumber: '+1234567890',
        role: 'admin',
        status: 'Active',
        address: '123 Main St, New York, NY',
        companies: ['1', '2'],
      },
      {
        _id: '2',
        userId: 'USR002',
        userName: 'Jane Smith',
        email: 'jane@example.com',
        contactNumber: '+0987654321',
        role: 'user',
        status: 'Active',
        address: '456 Oak Ave, Los Angeles, CA',
        companies: ['1'],
      },
      {
        _id: '3',
        userId: 'USR003',
        userName: 'Mike Johnson',
        email: 'mike@example.com',
        contactNumber: '+1122334455',
        role: 'user',
        status: 'Inactive',
        address: '789 Pine St, Chicago, IL',
        companies: ['2', '3'],
      },
    ],
    [],
  );

  const userLoginUrl = 'https://yourapp.com/user-login';

  const copyToClipboard = async () => {
    try {
      await Clipboard.setString(userLoginUrl);
      setCopied(true);
      Alert.alert('URL Copied!', 'Share this link with your users for login.');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      Alert.alert('Failed to copy URL', 'Please copy the URL manually.');
    }
  };

  const fetchUsersAndCompanies = async () => {
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Set hardcoded data
      setUsers(hardcodedUsers);
      setCompanies(hardcodedCompanies);
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsersAndCompanies();
  }, [hardcodedUsers, hardcodedCompanies]);

  // Mobile devices के लिए automatically card view set करें
  useEffect(() => {
    if (isMobile) {
      setViewMode('card');
    }
  }, [isMobile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsersAndCompanies();
  };

  const handleOpenForm = (user = null) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleCloseForm = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
  };

  const handleSave = async formData => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      if (selectedUser) {
        // Update existing user
        setUsers(prev =>
          prev.map(user =>
            user._id === selectedUser._id ? { ...user, ...formData } : user,
          ),
        );
        Alert.alert('Success', 'User updated successfully');
      } else {
        // Create new user
        const newUser = {
          _id: Date.now().toString(),
          userId: `USR${String(users.length + 1).padStart(3, '0')}`,
          ...formData,
          status: 'Active',
          createdAt: new Date().toISOString(),
        };
        setUsers(prev => [...prev, newUser]);
        Alert.alert('Success', 'User created successfully');
      }

      handleCloseForm();
    } catch (error) {
      Alert.alert('Error', 'Operation failed');
    }
  };

  const openDeleteDialog = user => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      setUsers(prev => prev.filter(user => user._id !== userToDelete._id));
      Alert.alert('Success', 'User deleted successfully');
      closeDeleteDialog();
    } catch (error) {
      Alert.alert('Error', 'Deletion failed');
    }
  };

  const companyMap = useMemo(() => {
    const map = new Map();
    companies.forEach(company => {
      map.set(company._id, company.businessName);
    });
    return map;
  }, [companies]);

  // Delete Confirmation Modal Component
  const DeleteConfirmationModal = () => (
    <Modal
      visible={isDeleteModalOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={closeDeleteDialog}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.deleteModalContent}>
          <View style={styles.deleteIconContainer}>
            <AlertIcon />
          </View>

          <Text style={styles.deleteModalTitle}>Are you sure?</Text>

          <Text style={styles.deleteModalDescription}>
            This action cannot be undone. This will permanently delete the user
            account.
          </Text>

          {userToDelete && (
            <View style={styles.userToDeleteInfo}>
              <Text style={styles.userToDeleteName}>
                {userToDelete.userName}
              </Text>
              <Text style={styles.userToDeleteEmail}>{userToDelete.email}</Text>
            </View>
          )}

          <View style={styles.deleteModalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={closeDeleteDialog}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteConfirmButton}
              onPress={handleDelete}
            >
              <Text style={styles.deleteConfirmButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // User Form Modal Component
  const UserFormModal = () => (
    <Modal
      visible={isDialogOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCloseForm}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <View
          style={[
            styles.dialogContent,
            { maxWidth: isSmallScreen ? '95%' : 600 },
          ]}
        >
          <View style={styles.dialogHeader}>
            <Text style={styles.dialogTitle}>
              {selectedUser ? 'Edit User' : 'Add New User'}
            </Text>
            <Text style={styles.dialogDescription}>
              Fill in the form below.
            </Text>
          </View>
          <ScrollView
            style={styles.formContainer}
            contentContainerStyle={styles.formContentPadding}
          >
            <UserForm
              user={selectedUser}
              allCompanies={companies}
              onSave={handleSave}
              onCancel={handleCloseForm}
            />
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // --- Render Logic ---

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <View style={styles.loaderCard}>
          <ActivityIndicator size="large" color="#6b7280" />
          <Text style={styles.loaderText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (companies.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          {/* Icon Section */}
          <View style={styles.companyEmptyIcon}>
            <BuildingIcon />
          </View>

          {/* Text Content */}
          <Text style={styles.emptyTitle}>Company Setup Required</Text>
          <Text style={styles.emptyDescription}>
            Contact us to enable your company account and access all features.
          </Text>

          {/* Call-to-Action Buttons */}
          <View
            style={[
              styles.contactButtons,
              { flexDirection: isSmallScreen ? 'column' : 'row' },
            ]}
          >
            <TouchableOpacity
              style={styles.phoneButton}
              onPress={() =>
                Alert.alert('Dialing', 'Calling +91-8989773689...')
              }
            >
              <PhoneIcon />
              <Text style={styles.phoneButtonText}>+91-8989773689</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.emailButton}
              onPress={() =>
                Alert.alert(
                  'Email',
                  'Opening email client for support@company.com...',
                )
              }
            >
              <EmailIcon />
              <Text style={styles.emailButtonText}>Email Us</Text>
            </TouchableOpacity>
          </View>

          {/* Support Hours */}
          <Text style={styles.supportText}>
            Support available Monday - Friday, 9:00 AM to 5:00 PM IST
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.pageContent}>
          {/* User Login URL Card */}
          <View style={styles.urlCard}>
            <View style={styles.urlContent}>
              <Text style={styles.urlTitle}>User Login URL</Text>
              <Text
                style={styles.urlText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {userLoginUrl}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.copyButton, copied && styles.copiedButton]}
              onPress={copyToClipboard}
            >
              {copied ? (
                <CheckIcon color="white" />
              ) : (
                <CopyIcon color="#3b82f6" />
              )}
              <Text
                style={[
                  styles.copyButtonText,
                  copied && styles.copiedButtonText,
                ]}
              >
                {copied ? 'Copied!' : 'Copy URL'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Header and Actions */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Users</Text>
              <Text style={styles.subtitle}>Manage your users</Text>
            </View>
            <View style={styles.headerActions}>
              {/* View Toggle - Only show on desktop */}
              {!isMobile && (
                <View style={styles.viewToggle}>
                  <TouchableOpacity
                    style={[
                      styles.viewButton,
                      viewMode === 'card' && styles.activeViewButton,
                    ]}
                    onPress={() => setViewMode('card')}
                  >
                    <LayoutGridIcon
                      color={viewMode === 'card' ? '#3b82f6' : '#374151'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.viewButton,
                      viewMode === 'list' && styles.activeViewButton,
                    ]}
                    onPress={() => setViewMode('list')}
                  >
                    <ListIcon
                      color={viewMode === 'list' ? '#3b82f6' : '#374151'}
                    />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleOpenForm()}
              >
                <PlusCircleIcon />
                <Text style={styles.addButtonText}>Add User</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Users List/Card View */}
          <View
            style={[
              styles.contentCard,
              viewMode === 'list' && styles.contentCardNoPadding,
            ]}
          >
            {users.length > 0 ? (
              // Mobile devices के लिए हमेशा card view दिखाएं
              isMobile || viewMode === 'card' ? (
                <View style={styles.userCardGrid}>
                  <UserCard
                    users={users}
                    onEdit={handleOpenForm}
                    onDelete={openDeleteDialog}
                    companyMap={companyMap}
                  />
                </View>
              ) : (
                <UserTable
                  users={users}
                  onEdit={handleOpenForm}
                  onDelete={openDeleteDialog}
                  companyMap={companyMap}
                />
              )
            ) : (
              <View style={styles.noUsersContainer}>
                <UsersLargeIcon />
                <Text style={styles.noUsersTitle}>No Users Found</Text>
                <Text style={styles.noUsersDescription}>
                  Get started by adding your first user.
                </Text>
                <TouchableOpacity
                  style={styles.addUserButton}
                  onPress={() => handleOpenForm()}
                >
                  <PlusCircleIcon />
                  <Text style={styles.addUserButtonText}>Add User</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <UserFormModal />
        <DeleteConfirmationModal />
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Static Stylesheet ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  pageContent: {
    paddingBottom: 20,
  },

  // --- Loader Styles ---
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loaderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },

  // --- Company Setup Required Styles ---
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 600,
  },
  emptyCard: {
    backgroundColor: '#f5faff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  companyEmptyIcon: {
    marginBottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  contactButtons: {
    gap: 12,
    marginBottom: 20,
    width: '100%',
  },
  phoneButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  phoneButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  emailButton: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emailButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  supportText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },

  // --- User Login URL Card Styles ---
  urlCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  urlContent: {
    flex: 1,
    marginRight: 12,
  },
  urlTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  urlText: {
    fontSize: 12,
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 6,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  copiedButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3b82f6',
  },
  copiedButtonText: {
    color: 'white',
  },

  // --- Header and Actions Styles ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  headerText: {
    flexShrink: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  viewButton: {
    padding: 8,
    borderRadius: 6,
  },
  activeViewButton: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },

  // --- Users Content Card Styles ---
  contentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 15,
  },
  contentCardNoPadding: {
    padding: 0,
  },
  userCardGrid: {
    // Styles for the container when using UserCard (Grid)
  },

  // --- No Users Found Styles ---
  noUsersContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  noUsersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noUsersDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  addUserButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },

  // --- Modal (Dialog) Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  dialogContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  dialogHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  dialogDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  formContainer: {
    flexGrow: 1,
  },
  formContentPadding: {
    padding: 20,
  },

  // --- Delete Modal Styles ---
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  userToDeleteInfo: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  userToDeleteName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  userToDeleteEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
