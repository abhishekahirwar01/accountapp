import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserForm from '../users/UserForm';
import { BASE_URL } from '../../config';

const roleBadgeColors = {
  admin: { backgroundColor: '#3b82f6', color: '#bfdbfe' },
  accountant: { backgroundColor: '#10b981', color: '#a7f3d0' },
  viewer: { backgroundColor: '#6b7280', color: '#d1d5db' },
  user: { backgroundColor: '#f97316', color: '#fdba74' },
};

const getRoleName = role => {
  if (typeof role === 'string') return role;
  return role?.name || role?.label || role?.role || 'user';
};

export default function UsersTab({
  selectedClient,
  selectedCompanyId,
  companyMap,
}) {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const idOf = value => {
    if (typeof value === 'string') return value;
    return value?._id || value?.id || value?.$oid || '';
  };

  const filteredUsers = React.useMemo(() => {
    if (!selectedCompanyId) return users;
    return users.filter(
      user =>
        Array.isArray(user.companies) &&
        user.companies.some(company => idOf(company) === selectedCompanyId),
    );
  }, [users, selectedCompanyId]);

  // Fetch users and companies from API
  const fetchUsersAndCompanies = useCallback(async () => {
    if (!selectedClient?._id) return;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const [usersRes, companiesRes] = await Promise.all([
        fetch(`${BASE_URL}/api/users/by-client/${selectedClient._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${BASE_URL}/api/companies/by-client/${selectedClient._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!usersRes.ok || !companiesRes.ok) {
        throw new Error('Failed to fetch client data');
      }

      const usersData = await usersRes.json();
      const companiesData = await companiesRes.json();

      // Handle different response formats
      const usersArray = Array.isArray(usersData) ? usersData : [];
      const companiesArray = Array.isArray(companiesData) ? companiesData : [];

      setUsers(usersArray);
      setCompanies(companiesArray);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert(
        'Failed to load data',
        error.message || 'Something went wrong',
        [{ text: 'OK' }],
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    fetchUsersAndCompanies();
  }, [fetchUsersAndCompanies]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchUsersAndCompanies();
  };

  const handleOpenForm = (user = null) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedUser(null);
  };

  const handleOpenDeleteDialog = user => {
    setUserToDelete(user);
    setIsAlertOpen(true);
  };

  const handleSave = async formData => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(
        `${BASE_URL}/api/users/${selectedUser._id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      const data = await response.json();

      Alert.alert('Success', 'User updated successfully', [
        { text: 'OK', onPress: fetchUsersAndCompanies },
      ]);
      handleCloseForm();
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Update Failed', error.message || 'Something went wrong', [
        { text: 'OK' },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(
        `${BASE_URL}/api/users/${userToDelete._id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }

      Alert.alert('Success', 'User deleted successfully', [
        { text: 'OK', onPress: fetchUsersAndCompanies },
      ]);
      setIsAlertOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      Alert.alert('Deletion Failed', error.message || 'Something went wrong', [
        { text: 'OK' },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderUserCard = ({ item: user }) => {
    const roleName = getRoleName(user.role);
    const roleKey = roleName.toLowerCase();
    const roleStyle = roleBadgeColors[roleKey] || roleBadgeColors.user;

    const userCompanies = user.companies || [];
    const displayCompanies = userCompanies.slice(0, 3);
    const remainingCompanies = userCompanies.length - 3;

    return (
      <View style={styles.userCard}>
        {/* User Info Section */}
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user.userName || 'U').substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.userName}
              </Text>
              <Text style={styles.userId} numberOfLines={1}>
                {user.userId}
              </Text>
            </View>
          </View>

          {/* Role Badge */}
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: roleStyle.backgroundColor },
            ]}
          >
            <Text style={[styles.roleText, { color: roleStyle.color }]}>
              {roleName}
            </Text>
          </View>
        </View>

        {/* Assigned Companies Section */}
        <View style={styles.companiesSection}>
          <Text style={styles.sectionLabel}>Assigned Companies</Text>
          <View style={styles.companiesList}>
            {userCompanies.length > 0 ? (
              <>
                {displayCompanies.map(companyId => {
                  const id = idOf(companyId);
                  const companyName = companyMap.get(id);
                  return companyName ? (
                    <View key={id} style={styles.companyBadge}>
                      <Text style={styles.companyText}>{companyName}</Text>
                    </View>
                  ) : null;
                })}
                {remainingCompanies > 0 && (
                  <View style={styles.moreBadge}>
                    <Text style={styles.moreText}>
                      +{remainingCompanies} more
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.noCompaniesText}>No companies</Text>
            )}
          </View>
        </View>

        {/* Actions Section */}
        {/* <View style={styles.actionsSection}>
          <Text style={styles.companyCount}>
            {userCompanies.length} company{(userCompanies.length !== 1 ? 's' : '')}
          </Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleOpenForm(user)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteActionButton]}
              onPress={() => handleOpenDeleteDialog(user)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View> */}
      </View>
    );
  };

  const CardHeader = () => (
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>Users</Text>
      <Text style={styles.cardDescription}>
        User accounts associated with{' '}
        {selectedClient?.contactName || 'the client'}.
      </Text>
    </View>
  );

  const LoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.loadingText}>Loading users...</Text>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No users found for this client.</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={fetchUsersAndCompanies}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <CardHeader />
          <LoadingState />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Fixed Header */}
        <CardHeader />

        {/* FlatList for better performance */}
        <FlatList
          data={filteredUsers}
          renderItem={renderUserCard}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={EmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#3b82f6']}
              tintColor="#3b82f6"
            />
          }
        />
      </View>

      {/* Edit User Modal */}
      <Modal
        visible={isFormOpen}
        animationType="slide"
        onRequestClose={handleCloseForm}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedUser ? 'Edit User' : 'Create User'}
            </Text>
            <Text style={styles.modalDescription}>
              {selectedUser
                ? `Update the details for ${selectedUser?.userName}.`
                : 'Create a new user account.'}
            </Text>
          </View>
          <UserForm
            user={selectedUser}
            allCompanies={companies}
            onSave={handleSave}
            onCancel={handleCloseForm}
          />
          {isSubmitting && (
            <View style={styles.submittingOverlay}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.submittingText}>
                {selectedUser ? 'Updating user...' : 'Creating user...'}
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Delete Confirmation Alert */}
      {isAlertOpen && (
        <Modal
          visible={isAlertOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsAlertOpen(false)}
        >
          <View style={styles.alertOverlay}>
            <View style={styles.alertContainer}>
              <Text style={styles.alertTitle}>Are you sure?</Text>
              <Text style={styles.alertDescription}>
                This action cannot be undone. This will permanently delete the
                user account for {userToDelete?.userName}.
              </Text>
              <View style={styles.alertButtons}>
                <TouchableOpacity
                  style={[styles.alertButton, styles.cancelButton]}
                  onPress={() => setIsAlertOpen(false)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.alertButton, styles.deleteButton]}
                  onPress={handleDelete}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  flatListContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: 'white',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 160,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 16,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    margin: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userId: {
    fontSize: 12,
    color: '#666',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  companiesSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  companiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  companyBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  companyText: {
    fontSize: 12,
    color: '#374151',
  },
  moreBadge: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  moreText: {
    fontSize: 12,
    color: '#6b7280',
  },
  noCompaniesText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  companyCount: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  editButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  deleteActionButton: {
    backgroundColor: '#fef2f2',
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
  },
  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  submittingText: {
    fontSize: 16,
    color: '#666',
  },
  // Alert styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  alertDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  alertButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  alertButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});
