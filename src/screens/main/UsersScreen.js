// UsersScreen.js - Optimized Version
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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
import { useCompany } from '../../contexts/company-context';

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

// Memoized URL Card Component
const URLCard = React.memo(({ userLoginUrl, onCopy, copied }) => (
  <View style={styles.urlCardWrapper}>
    <View style={styles.urlCard}>
      <View style={styles.urlCardContent}>
        <View style={styles.urlLeftSection}>
          <View style={styles.urlIconContainer}>
            <Icon name="link" size={14} color="#3B82F6" />
          </View>
          <View style={styles.urlTextSection}>
            <Text style={styles.urlLabel}>User Login URL</Text>
            <Text style={styles.urlValue} numberOfLines={1}>
              {userLoginUrl}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.copyButton, copied && styles.copyButtonActive]}
          onPress={onCopy}
        >
          <Icon
            name={copied ? 'check' : 'copy'}
            size={14}
            color={copied ? '#10B981' : '#3B82F6'}
          />
          <Text
            style={[
              styles.copyButtonText,
              copied && styles.copyButtonTextActive,
            ]}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
));

URLCard.displayName = 'URLCard';

// Memoized Empty State Component
const EmptyState = React.memo(({ canCreateUsers, onAddUser }) => (
  <View style={styles.emptyState}>
    <Icon name="users" size={48} color="#999" />
    <Text style={styles.emptyStateTitle}>No Users Found</Text>
    {canCreateUsers ? (
      <>
        <Text style={styles.emptyStateDescription}>
          Get started by adding your first user.
        </Text>
        <Button onPress={onAddUser} icon="plus-circle">
          Add User
        </Button>
      </>
    ) : (
      <Text style={styles.emptyStateDescription}>
        Please contact your Admin to provide permission for adding users.
      </Text>
    )}
  </View>
));

EmptyState.displayName = 'EmptyState';

// Memoized No Company State
const NoCompanyState = React.memo(() => (
  <View style={styles.noCompanyContainer}>
    <Card style={styles.noCompanyCard}>
      <CardContent style={styles.noCompanyContent}>
        <View style={styles.iconContainer}>
          <Icon name="briefcase" size={32} color="#2563eb" />
        </View>
        <Text style={styles.noCompanyTitle}>Company Setup Required</Text>
        <Text style={styles.noCompanyDescription}>
          Contact us to enable your company account and access all features.
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
));

NoCompanyState.displayName = 'NoCompanyState';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [viewMode, setViewMode] = useState('card');
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { toast } = useToast();
  const { permissions, refetch } = usePermissions();
  const { refetch: refetchUserPermissions } = useUserPermissions();
  const { triggerCompaniesRefresh, refreshTrigger } = useCompany();
  
  const userLoginUrl = 'https://vinimay.sharda.co.in/user-login';
  
  // Refs for cleanup
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const userToDeleteRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Set view mode based on screen size
  useEffect(() => {
    const { width } = Dimensions.get('window');
    if (width < 640) setViewMode('card');
  }, []);

  // Optimized copy to clipboard
  const copyToClipboard = useCallback(async () => {
    try {
      await Clipboard.setString(userLoginUrl);
      if (isMountedRef.current) {
        setCopied(true);
        toast({
          title: 'URL copied to clipboard!',
          description: 'Share this link with your users for login.',
        });
        setTimeout(() => {
          if (isMountedRef.current) {
            setCopied(false);
          }
        }, 2000);
      }
    } catch (err) {
      if (isMountedRef.current) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to copy URL. Please copy manually.',
        });
      }
    }
  }, [userLoginUrl, toast]);

  // Optimized fetch with abort support
  const fetchUsersAndCompanies = useCallback(async (signal) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const [usersRes, companiesRes] = await Promise.all([
        fetch(`${BASE_URL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        }),
        fetch(`${BASE_URL}/api/companies/my`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
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

      if (isMountedRef.current) {
        setUsers(Array.isArray(filteredUsers) ? filteredUsers : []);
        setCompanies(Array.isArray(companiesData) ? companiesData : companiesData?.data || []);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      
      if (isMountedRef.current) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: err.message || 'Failed to fetch data',
        });
      }
    }
  }, [toast]);

  // Initial data fetch
  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchUsersAndCompanies(abortController.signal);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      abortController.abort();
    };
  }, [fetchUsersAndCompanies]);

  // Optimized companies-only fetch
  const fetchCompaniesOnly = useCallback(async (signal) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      
      if (!res.ok) return;
      
      const data = await res.json();
      if (isMountedRef.current) {
        setCompanies(Array.isArray(data) ? data : data?.data || []);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('UsersScreen fetchCompaniesOnly failed:', err);
    }
  }, []);

  // Handle refresh trigger
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      const abortController = new AbortController();
      fetchCompaniesOnly(abortController.signal);
      return () => abortController.abort();
    }
  }, [refreshTrigger, fetchCompaniesOnly]);

  // Optimized refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const abortController = new AbortController();
    
    try {
      await Promise.all([
        fetchUsersAndCompanies(abortController.signal),
        triggerCompaniesRefresh?.(),
        refetch?.(),
        refetchUserPermissions?.(),
      ]);
      
      if (isMountedRef.current) {
        toast({ title: 'Users data refreshed successfully' });
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      
      if (isMountedRef.current) {
        toast({
          variant: 'destructive',
          title: 'Refresh Failed',
          description: error.message || 'Failed to refresh data',
        });
      }
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }

    return () => abortController.abort();
  }, [fetchUsersAndCompanies, triggerCompaniesRefresh, refetch, refetchUserPermissions, toast]);

  // Optimized form handlers
  const handleOpenForm = useCallback((user = null) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedUser(null);
  }, []);

  const handleSave = useCallback(async (formDataFromForm) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Authentication token not found.',
        });
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

      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Operation Failed',
          description:
            data.message ||
            `Failed to ${selectedUser ? 'update' : 'create'} user.`,
        });
        return;
      }

      toast({
        title: `User ${selectedUser ? 'updated' : 'created'} successfully`,
      });

      // Refresh companies if they were assigned/modified
      if (formDataFromForm.companies && formDataFromForm.companies.length > 0) {
        triggerCompaniesRefresh?.();
      }

      const abortController = new AbortController();
      await fetchUsersAndCompanies(abortController.signal);
      handleCloseForm();
    } catch (error) {
      if (error.name === 'AbortError') return;
      
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: error.message || 'Something went wrong.',
      });
    }
  }, [selectedUser, toast, triggerCompaniesRefresh, fetchUsersAndCompanies, handleCloseForm]);

  const openDeleteDialog = useCallback((user) => {
    userToDeleteRef.current = user;
    setIsAlertOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    const userToDelete = userToDeleteRef.current;
    if (!userToDelete) return;
    
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Authentication token not found.',
        });
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
      
      const abortController = new AbortController();
      await fetchUsersAndCompanies(abortController.signal);
      
      if (isMountedRef.current) {
        setIsAlertOpen(false);
        userToDeleteRef.current = null;
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: error.message || 'Something went wrong.',
      });
    }
  }, [toast, fetchUsersAndCompanies]);

  // Memoized company map
  const companyMap = useMemo(() => {
    const map = new Map();
    companies.forEach(company => {
      map.set(company._id, company.businessName);
    });
    return map;
  }, [companies]);

  // Memoized render functions
  const renderUserContent = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#666" />
        </View>
      );
    }

    if (users.length === 0) {
      return (
        <EmptyState
          canCreateUsers={permissions?.canCreateUsers}
          onAddUser={() => handleOpenForm()}
        />
      );
    }

    return viewMode === 'list' ? (
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
    );
  }, [isLoading, users, viewMode, permissions?.canCreateUsers, handleOpenForm, openDeleteDialog, companyMap]);

  // Loading state
  if (isLoading && companies.length === 0) {
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

  // No company state
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
            <NoCompanyState />
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View>
                <Text style={styles.title}>User Management</Text>
                <View style={styles.subtitleRow}>
                  <Text style={styles.subtitle}>Manage your users</Text>
                </View>
              </View>
            </View>
            {permissions?.canCreateUsers && (
              <TouchableOpacity
                style={styles.addUserButton}
                onPress={() => handleOpenForm()}
              >
                <Icon name="plus" size={16} color="#fff" />
                <Text style={styles.addUserButtonText}>Add User</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* URL Card - Uncomment if needed */}
          {/* <URLCard
            userLoginUrl={userLoginUrl}
            onCopy={copyToClipboard}
            copied={copied}
          /> */}

          <Card>
            <CardContent
              style={
                viewMode === 'card' ? styles.cardContent : styles.listContent
              }
            >
              {renderUserContent}
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
    backgroundColor: '#ffffff',
  },
  content: {},
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 8,
    paddingLeft: 10,
    paddingRight: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 6,
  },
  addUserButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  urlCardWrapper: {
    marginLeft: 16,
    marginRight: 16,
  },
  urlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  urlCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  urlLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  urlIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  urlTextSection: {
    flex: 1,
  },
  urlLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  urlValue: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  copyButtonActive: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  copyButtonTextActive: {
    color: '#10B981',
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