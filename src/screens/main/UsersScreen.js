// UsersScreen.js - FIXED VERSION with Alert.alert for errors
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Clipboard,
  Dimensions,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/Dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/AlertDialog';

import { UserTable } from '../../components/users/UserTable';
import { UserForm } from '../../components/users/UserForm';
import { UserCard } from '../../components/users/UserCard';

import { useToast } from '../../components/hooks/useToast';
import AppLayout from '../../components/layout/AppLayout';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { usePermissions } from '../../contexts/permission-context';
import { useUserPermissions } from '../../contexts/user-permissions-context';

const base64Decode = str => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  str = String(str).replace(/=+$/, '');
  for (let bc = 0, bs, buffer, idx = 0; (buffer = str.charAt(idx++)); ) {
    buffer = chars.indexOf(buffer);
    if (buffer === -1) continue;
    bs = bc % 4 ? bs * 64 + buffer : buffer;
    if (bc++ % 4) output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
  }
  return output;
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('card');
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { toast } = useToast();
  const { permissions, refetch } = usePermissions();
  const { refetch: refetchUserPermissions } = useUserPermissions();
  const userLoginUrl = 'https://yourapp.com/user-login';

  useEffect(() => {
    const { width } = Dimensions.get('window');
    if (width < 640) setViewMode('card');
  }, []);

  const copyToClipboard = async () => {
    try {
      await Clipboard.setString(userLoginUrl);
      setCopied(true);
      toast({
        title: 'URL copied to clipboard!',
        description: 'Share this link with your users for login.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      Alert.alert('Error', 'Failed to copy URL. Please copy manually.');
    }
  };

  const fetchUsersAndCompanies = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const [usersRes, companiesRes] = await Promise.all([
        fetch(`${BASE_URL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/api/companies/my`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!usersRes.ok || !companiesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const usersData = await usersRes.json();
      const companiesData = await companiesRes.json();

      const base64Url = token.split('.')[1];
      const payload = JSON.parse(base64Decode(base64Url));
      const currentUserId = payload.userId || payload.id || payload._id;

      let filteredUsers = usersData;
      if (payload.role === 'admin') {
        filteredUsers = usersData.filter(u => u._id !== currentUserId);
      }

      setUsers(filteredUsers);
      setCompanies(companiesData);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersAndCompanies();
  }, [fetchUsersAndCompanies]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchUsersAndCompanies(true),
        refetch ? refetch() : Promise.resolve(),
        refetchUserPermissions ? refetchUserPermissions() : Promise.resolve(),
      ]);
      toast({ title: 'Users data refreshed successfully' });
    } catch (error) {
      Alert.alert('Refresh Failed', error.message || 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, [fetchUsersAndCompanies, toast]);

  const handleOpenForm = (user = null) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleCloseForm = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
  };

  // 🔥 SOLUTION: Use Alert.alert for errors (shows above everything)
  const handleSave = async formDataFromForm => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found.');
        return;
      }

      const method = selectedUser ? 'PUT' : 'POST';
      const url = selectedUser
        ? `${BASE_URL}/api/users/${selectedUser._id}`
        : `${BASE_URL}/api/users`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formDataFromForm),
      });

      const data = await res.json();

      // ✅ If error - show Alert.alert (native popup above everything)
      if (!res.ok) {
        Alert.alert(
          'Operation Failed',
          data.message ||
            `Failed to ${selectedUser ? 'update' : 'create'} user.`,
          [{ text: 'OK' }],
        );
        return; // Keep dialog open
      }

      // ✅ Success - use toast and close dialog
      toast({
        title: `User ${selectedUser ? 'updated' : 'created'} successfully`,
      });

      await fetchUsersAndCompanies();
      handleCloseForm();
    } catch (error) {
      // Network errors - show Alert.alert
      Alert.alert(
        'Operation Failed',
        error.message || 'Something went wrong.',
        [{ text: 'OK' }],
      );
    }
  };

  const openDeleteDialog = user => {
    setUserToDelete(user);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found.');
        return;
      }

      const res = await fetch(`${BASE_URL}/api/users/${userToDelete._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete user.');
      }

      toast({ title: 'User deleted successfully' });
      fetchUsersAndCompanies();
      setIsAlertOpen(false);
      setUserToDelete(null);
    } catch (error) {
      Alert.alert('Deletion Failed', error.message || 'Something went wrong.');
    }
  };

  const companyMap = useMemo(() => {
    const map = new Map();
    companies.forEach(company => {
      map.set(company._id, company.businessName);
    });
    return map;
  }, [companies]);

  if (isLoading) {
    return (
      <AppLayout>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.fullscreenLoader}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading Users...</Text>
          </View>
        </SafeAreaView>
      </AppLayout>
    );
  }

  if (companies.length === 0) {
    return (
      <AppLayout>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#2563eb']}
                tintColor="#2563eb"
              />
            }
          >
            <View style={styles.noCompanyContainer}>
              <Card style={styles.noCompanyCard}>
                <CardContent style={styles.noCompanyContent}>
                  <View style={styles.iconContainer}>
                    <Icon name="briefcase" size={32} color="#2563eb" />
                  </View>
                  <Text style={styles.noCompanyTitle}>
                    Company Setup Required
                  </Text>
                  <Text style={styles.noCompanyDescription}>
                    Contact us to enable your company account and access all
                    features.
                  </Text>
                  <View style={styles.contactButtons}>
                    <TouchableOpacity style={styles.phoneButton}>
                      <Icon name="phone" size={20} color="#fff" />
                      <Text style={styles.phoneButtonText}>+91-8989773689</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.emailButton}>
                      <Icon name="mail" size={20} color="#2563eb" />
                      <Text style={styles.emailButtonText}>Email Us</Text>
                    </TouchableOpacity>
                  </View>
                </CardContent>
              </Card>
            </View>
          </ScrollView>
        </SafeAreaView>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2563eb']}
            tintColor="#2563eb"
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Users</Text>
              <Text style={styles.subtitle}>Manage your users</Text>
            </View>
            <View style={styles.headerActions}>
              <View style={styles.viewToggle} />
              {permissions?.canCreateUsers && (
                <Button
                  style={styles.addUser}
                  onPress={() => handleOpenForm()}
                  icon="plus-circle"
                >
                  Add User
                </Button>
              )}
            </View>
          </View>

          <Card style={styles.urlCard}>
            <CardContent style={styles.urlCardContent}>
              <View style={styles.urlTextContainer}>
                <Text style={styles.urlLabel}>User Login URL</Text>
                <Text style={styles.urlValue}>{userLoginUrl}</Text>
              </View>
              <Button
                size="sm"
                variant="outline"
                onPress={copyToClipboard}
                style={styles.copyButton}
                icon={copied ? 'check' : 'copy'}
              >
                {copied ? 'Copied!' : 'Copy URL'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent
              style={
                viewMode === 'card' ? styles.cardContent : styles.listContent
              }
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#666" />
                </View>
              ) : users.length > 0 ? (
                viewMode === 'list' ? (
                  <UserTable
                    users={users}
                    onEdit={handleOpenForm}
                    onDelete={openDeleteDialog}
                    companyMap={companyMap}
                  />
                ) : (
                  <UserCard
                    users={users}
                    onEdit={handleOpenForm}
                    onDelete={openDeleteDialog}
                    companyMap={companyMap}
                  />
                )
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="users" size={48} color="#999" />
                  <Text style={styles.emptyStateTitle}>No Users Found</Text>
                  {permissions?.canCreateUsers ? (
                    <>
                      <Text style={styles.emptyStateDescription}>
                        Get started by adding your first user.
                      </Text>
                      <Button
                        onPress={() => handleOpenForm()}
                        icon="plus-circle"
                      >
                        Add User
                      </Button>
                    </>
                  ) : (
                    <Text style={styles.emptyStateDescription}>
                      Please contact your Admin to provide permission for adding
                      users.
                    </Text>
                  )}
                </View>
              )}
            </CardContent>
          </Card>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent style={styles.dialogContent}>
              <DialogHeader>
                <DialogTitle>
                  {selectedUser ? 'Edit User' : 'Add New User'}
                </DialogTitle>
                <DialogDescription>Fill in the form below.</DialogDescription>
              </DialogHeader>
              <UserForm
                user={selectedUser}
                allCompanies={companies}
                onSave={handleSave}
                onCancel={handleCloseForm}
              />
            </DialogContent>
          </Dialog>

          <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  user account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onPress={() => setIsAlertOpen(false)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onPress={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </View>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 8,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  fullscreenLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  noCompanyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCompanyCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#f0f9ff',
  },
  noCompanyContent: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noCompanyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  noCompanyDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  phoneButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  phoneButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  emailButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  emailButtonText: {
    color: '#2563eb',
    fontWeight: '500',
  },
  urlCard: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
    marginBottom: 6,
    marginTop: 6,
    paddingVertical: 6,
  },
  urlCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  urlTextContainer: {
    flex: 1,
    paddingTop: 4,
  },
  urlLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e40af',
  },
  urlValue: {
    fontSize: 12,
    color: '#1d4ed8',
    backgroundColor: '#eff6ff',
    padding: 4,
    marginTop: 2,
    borderRadius: 8,
  },
  copyButton: {
    marginTop: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
    paddingLeft: 10,
    paddingRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    padding: 4,
    gap: 4,
  },
  addUser: {
    fontWeight: '500',
  },
  cardContent: {
    padding: 0,
  },
  listContent: {},
  loadingContainer: {
    height: 256,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  dialogContent: {
    maxWidth: 640,
    width: '100%',
  },
});
