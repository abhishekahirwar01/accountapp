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
  admin: { backgroundColor: '#ebf1fc', color: '#3b82f6' },
  accountant: { backgroundColor: '#10b981', color: '#a7f3d0' },
  viewer: { backgroundColor: '#6b7280', color: '#d1d5db' },
  user: { backgroundColor: '#faefe8', color: '#f97316' },
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

  const fetchUsersAndCompanies = useCallback(async () => {
    if (!selectedClient?._id) return;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

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

      if (!usersRes.ok || !companiesRes.ok)
        throw new Error('Failed to fetch client data');

      const usersData = await usersRes.json();
      const companiesData = await companiesRes.json();

      setUsers(Array.isArray(usersData) ? usersData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Failed to load data', error.message || 'Something went wrong', [{ text: 'OK' }]);
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
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch(`${BASE_URL}/api/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      Alert.alert('Success', 'User updated successfully', [
        { text: 'OK', onPress: fetchUsersAndCompanies },
      ]);
      handleCloseForm();
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Update Failed', error.message || 'Something went wrong', [{ text: 'OK' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch(`${BASE_URL}/api/users/${userToDelete._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

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
      Alert.alert('Deletion Failed', error.message || 'Something went wrong', [{ text: 'OK' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderUserCard = ({ item: user }) => {
    const roleName = getRoleName(user.role);
    const roleKey = roleName.toLowerCase();
    const roleStyle = roleBadgeColors[roleKey] || roleBadgeColors.user;
    const avatarColor = { bg: '#ebe8fc', text: '#8b77ff' };

    const userCompanies = user.companies || [];
    const displayCompanies = userCompanies.slice(0, 3);
    const remainingCompanies = userCompanies.length - 3;

    return (
      <View style={styles.userCard}>
       
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
              <Text style={[styles.avatarText, { color: avatarColor.text }]}>
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

          <View style={[styles.roleBadge, { backgroundColor: roleStyle.backgroundColor }]}>
            <View style={[styles.roleDot, { backgroundColor: roleStyle.color }]} />
            <Text style={[styles.roleText, { color: roleStyle.color }]}>
              {roleName}
            </Text>
          </View>
        </View>

        
        <View style={styles.divider} />

        
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
                    <Text style={styles.moreText}>+{remainingCompanies} more</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.noCompaniesText}>No companies assigned</Text>
            )}
          </View>
        </View>

        {/* Footer: Status */}
        {/* <View style={styles.cardFooter}>
          <View style={styles.statusIndicator}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active</Text>
          </View>
          <Text style={styles.companyCountText}>
            {userCompanies.length} {userCompanies.length === 1 ? 'company' : 'companies'}
          </Text>
        </View> */}
      </View>
    );
  };


  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Users</Text>
          <Text style={styles.subtitle}>
            User accounts associated with {selectedClient?.contactName || 'the client'}.
          </Text>
        </View>
        <View style={styles.headerMeta}>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filteredUsers.length}</Text>
          </View>
        </View>
      </View>

      {/* FlatList */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserCard}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        windowSize={10}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>👤</Text>
            </View>
            <Text style={styles.emptyTitle}>No Users Found</Text>
            <Text style={styles.emptyDescription}>
              No users are associated with this client yet.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchUsersAndCompanies}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Edit User Modal */}
      <Modal visible={isFormOpen} animationType="slide" onRequestClose={handleCloseForm}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {selectedUser ? 'Edit User' : 'Create User'}
              </Text>
              <Text style={styles.modalDescription}>
                {selectedUser
                  ? `Update the details for ${selectedUser?.userName}.`
                  : 'Create a new user account.'}
              </Text>
            </View>
          </View>
          <UserForm
            user={selectedUser}
            allCompanies={companies}
            onSave={handleSave}
            onCancel={handleCloseForm}
          />
          {isSubmitting && (
            <View style={styles.submittingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
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
              <View style={styles.alertIconRow}>
                <View style={styles.alertIconBg}>
                  <Text style={styles.alertIconText}>🗑️</Text>
                </View>
              </View>
              <Text style={styles.alertTitle}>Delete User?</Text>
              <Text style={styles.alertDescription}>
                This will permanently delete the account for{' '}
                <Text style={styles.alertHighlight}>{userToDelete?.userName}</Text>. This action cannot be undone.
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
    backgroundColor: '#f8fafc',
  },

 
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 4,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  headerTitle: { flex: 1 },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  headerMeta: {
    marginTop: 6,
  },
  countBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  countText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },


  listContent: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

 
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
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
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  userDetails: { flex: 1 },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  userId: {
    fontSize: 11,
    color: '#888',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },


  companiesSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  companiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  companyBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  companyText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  moreBadge: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  moreText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  noCompaniesText: {
    fontSize: 12,
    color: '#aaa',
    fontStyle: 'italic',
  },


  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  statusText: {
    fontSize: 10,
    color: '#666',
  },
  companyCountText: {
    fontSize: 10,
    color: '#999',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  modalDescription: {
    fontSize: 13,
    color: '#666',
  },
  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  submittingText: {
    fontSize: 16,
    color: '#444',
  },

  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  alertIconRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  alertIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertIconText: {
    fontSize: 26,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 21,
    textAlign: 'center',
  },
  alertHighlight: {
    fontWeight: '700',
    color: '#1a1a1a',
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
});