import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import UserForm from '../users/UserForm';

// Hardcoded data
const HARDCODED_USERS = [
  {
    _id: '1',
    userName: 'John Doe',
    userId: 'john.doe@example.com',
    avatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    role: 'admin',
    companies: ['1', '2'],
  },
  {
    _id: '2',
    userName: 'Jane Smith',
    userId: 'jane.smith@example.com',
    avatar:
      'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    role: 'Accountant',
    companies: ['1'],
  },
  {
    _id: '3',
    userName: 'Mike Johnson',
    userId: 'mike.johnson@example.com',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    role: 'Viewer',
    companies: ['2', '3'],
  },
  {
    _id: '4',
    userName: 'Sarah Wilson',
    userId: 'sarah.wilson@example.com',
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    role: 'admin',
    companies: ['1', '2', '3'],
  },
  {
    _id: '5',
    userName: 'David Brown',
    userId: 'david.brown@example.com',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    role: 'Accountant',
    companies: ['2'],
  },
  {
    _id: '6',
    userName: 'Emily Davis',
    userId: 'emily.davis@example.com',
    avatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    role: 'Viewer',
    companies: ['1', '3'],
  },
];

const HARDCODED_COMPANIES = [
  { _id: '1', name: 'Tech Corp' },
  { _id: '2', name: 'Finance LLC' },
  { _id: '3', name: 'Consulting Group' },
];

const HARDCODED_COMPANY_MAP = new Map([
  ['1', 'Tech Corp'],
  ['2', 'Finance LLC'],
  ['3', 'Consulting Group'],
]);

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
  companyMap = HARDCODED_COMPANY_MAP,
}) {
  const [users, setUsers] = useState(HARDCODED_USERS);
  const [companies, setCompanies] = useState(HARDCODED_COMPANIES);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

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

  // Simulate loading
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

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

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setUsers(prevUsers =>
        prevUsers.map(user =>
          user._id === selectedUser._id ? { ...user, ...formData } : user,
        ),
      );

      Alert.alert('Success', 'User updated successfully');
      handleCloseForm();
    } catch (error) {
      Alert.alert('Update Failed', error.message || 'Something went wrong');
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setUsers(prevUsers =>
        prevUsers.filter(user => user._id !== userToDelete._id),
      );
      Alert.alert('Success', 'User deleted successfully');
      setIsAlertOpen(false);
      setUserToDelete(null);
    } catch (error) {
      Alert.alert('Deletion Failed', error.message || 'Something went wrong');
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
      <Text>Loading...</Text>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No users found for this client.</Text>
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
            <Text style={styles.modalTitle}>Edit User</Text>
            <Text style={styles.modalDescription}>
              Update the details for {selectedUser?.userName}.
            </Text>
          </View>
          <UserForm
            user={selectedUser}
            allCompanies={companies}
            onSave={handleSave}
            onCancel={handleCloseForm}
          />
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
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.alertButton, styles.deleteButton]}
                  onPress={handleDelete}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
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
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
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
