// UsersScreen.js - Updated to use navigation instead of Dialog (like ProductSettings)
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
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
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';
import { Card, CardContent } from '../../components/ui/Card';
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
import { UserCard } from '../../components/users/UserCard';

import { useToast } from '../../components/hooks/useToast';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { usePermissions } from '../../contexts/permission-context';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { useCompany } from '../../contexts/company-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

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


const EmptyState = React.memo(({ canCreateUsers, onAddUser }) => (
  <View style={styles.emptyStateContainer}>
    <View style={styles.emptyState}>
      <Icon name="users" size={48} color="#999" />
      <Text style={styles.emptyStateTitle}>No Users Found</Text>
      {canCreateUsers ? (
        <>
          <Text style={styles.emptyStateDescription}>
            Get started by adding your first user.
          </Text>
          <TouchableOpacity style={styles.emptyAddButton} onPress={onAddUser}>
            <Icon name="plus-circle" size={16} color="white" />
            <Text style={styles.emptyAddButtonText}>Add User</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.emptyStateDescription}>
          Please contact your Admin to provide permission for adding users.
        </Text>
      )}
    </View>
  </View>
));
EmptyState.displayName = 'EmptyState';


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
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [viewMode, setViewMode] = useState('card');
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const { toast } = useToast();
  const { permissions, refetch } = usePermissions();
  const { refetch: refetchUserPermissions } = useUserPermissions();
  const { triggerCompaniesRefresh, refreshTrigger } = useCompany();
  const navigation = useNavigation();

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const userToDeleteRef = useRef(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  useEffect(() => {
    const { width } = Dimensions.get('window');
    if (width < 640) setViewMode('card');
  }, []);

  
  const fetchUsersAndCompanies = useCallback(
    async (signal = null) => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found.');

        const [usersRes, companiesRes] = await Promise.all([
          fetch(`${BASE_URL}/api/users`, {
            headers: { Authorization: `Bearer ${token}` },
            ...(signal && { signal }),
          }),
          fetch(`${BASE_URL}/api/companies/my`, {
            headers: { Authorization: `Bearer ${token}` },
            ...(signal && { signal }),
          }),
        ]);

        if (!usersRes.ok || !companiesRes.ok)
          throw new Error('Failed to fetch data');

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
          setCompanies(
            Array.isArray(companiesData)
              ? companiesData
              : companiesData?.data || [],
          );
        }

        return { usersData: filteredUsers, companiesData };
      } catch (err) {
        if (err.name === 'AbortError') return null;
        console.error('Error fetching users and companies:', err);
        if (isMountedRef.current) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: err.message || 'Failed to fetch data',
          });
          setUsers([]);
          setCompanies([]);
        }
        return null;
      }
    },
    [toast],
  );

  // Initial load
  useEffect(() => {
    let isActive = true;
    let abortController = null;

    const loadData = async () => {
      try {
        setIsLoading(true);
        abortController = new AbortController();
        abortControllerRef.current = abortController;
        await fetchUsersAndCompanies(abortController.signal);
        if (isActive && isMountedRef.current) setInitialLoadComplete(true);
      } catch (error) {
        console.error('Error in initial load:', error);
      } finally {
        if (isActive && isMountedRef.current) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isActive = false;
      if (abortController) abortController.abort();
    };
  }, [fetchUsersAndCompanies]);

  
  useFocusEffect(
    useCallback(() => {
      if (!initialLoadComplete) return;
      const abortController = new AbortController();
      fetchUsersAndCompanies(abortController.signal);
      return () => abortController.abort();
    }, [initialLoadComplete, fetchUsersAndCompanies]),
  );

  
  const fetchCompaniesOnly = useCallback(async (signal = null) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
        ...(signal && { signal }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (isMountedRef.current)
        setCompanies(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('fetchCompaniesOnly failed:', err);
    }
  }, []);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && initialLoadComplete) {
      const abortController = new AbortController();
      fetchCompaniesOnly(abortController.signal);
      return () => abortController.abort();
    }
  }, [refreshTrigger, initialLoadComplete, fetchCompaniesOnly]);

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
      if (isMountedRef.current)
        toast({ title: 'Users data refreshed successfully' });
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (isMountedRef.current)
        toast({
          variant: 'destructive',
          title: 'Refresh Failed',
          description: error.message || 'Failed to refresh data',
        });
    } finally {
      if (isMountedRef.current) setRefreshing(false);
    }
    return () => abortController.abort();
  }, [
    fetchUsersAndCompanies,
    triggerCompaniesRefresh,
    refetch,
    refetchUserPermissions,
    toast,
  ]);

  const handleOpenForm = useCallback(
    (user = null) => {
      navigation.navigate('UserForm', {
        user: user || null,   
        companies,            
      });
    },
    [navigation, companies],
  );

  const openDeleteDialog = useCallback(user => {
    userToDeleteRef.current = user;
    setIsAlertOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    const userToDelete = userToDeleteRef.current;
    if (!userToDelete) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        toast({ variant: 'destructive', title: 'Error', description: 'Authentication token not found.' });
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
      toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message || 'Something went wrong.' });
    }
  }, [toast, fetchUsersAndCompanies]);

  const companyMap = useMemo(() => {
    const map = new Map();
    companies.forEach(c => map.set(c._id, c.businessName));
    return map;
  }, [companies]);

  const renderUserContent = useMemo(() => {
    if (isLoading && !initialLoadComplete) {
      return (
        <View style={styles.loadingCard}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        </View>
      );
    }
    if (users.length === 0 && initialLoadComplete) {
      return (
        <EmptyState
          canCreateUsers={permissions?.canCreateUsers}
          onAddUser={() => handleOpenForm()}
        />
      );
    }
    if (users.length > 0) {
      return viewMode === 'list' ? (
        <UserTable
          users={users}
          onEdit={handleOpenForm}
          onDelete={openDeleteDialog}
          companyMap={companyMap}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      ) : (
        <UserCard
          users={users}
          onEdit={handleOpenForm}
          onDelete={openDeleteDialog}
          companyMap={companyMap}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      );
    }
    return null;
  }, [
    isLoading,
    initialLoadComplete,
    users,
    viewMode,
    permissions?.canCreateUsers,
    handleOpenForm,
    openDeleteDialog,
    companyMap,
    refreshing,
    handleRefresh,
  ]);

  
  if (isLoading && !initialLoadComplete && companies.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.fullscreenLoader}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading Users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No company state
  if (companies.length === 0 && initialLoadComplete) {
    return (
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
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>User Management</Text>
          <Text style={styles.subtitle}>Manage all your users</Text>
        </View>
        <View style={styles.headerActions}>
          {permissions?.canCreateUsers && (
            <TouchableOpacity
              style={styles.addUserButton}
              onPress={() => handleOpenForm()}
            >
              <Icon name="plus-circle" size={16} color="white" />
              <Text style={styles.addUserButtonText}>Add User</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentWrapper}>{renderUserContent}</View>

     
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
            <AlertDialogAction onPress={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  headerTitle: { flex: 1 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  subtitle: { fontSize: 10, color: '#666' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 9,
  },
  addUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b77ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  addUserButtonText: { color: 'white', fontWeight: '700', fontSize: 12 },
  contentWrapper: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  fullscreenLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 16,
    marginTop: 8,
    minHeight: 300,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  noCompanyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noCompanyCard: { width: '100%', maxWidth: 400, backgroundColor: '#f0f9ff' },
  noCompanyContent: { padding: 24, alignItems: 'center' },
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
  contactButtons: { flexDirection: 'row', gap: 12, width: '100%' },
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
  phoneButtonText: { color: '#fff', fontWeight: '500' },
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
  emailButtonText: { color: '#2563eb', fontWeight: '500' },
  emptyStateContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 16,
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
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
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  emptyAddButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
}); 