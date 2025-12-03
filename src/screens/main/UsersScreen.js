// UsersScreen.js
import React, { useEffect, useState, useMemo } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import all components similar to Next.js
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription 
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

// Import user components
import { UserTable } from '../../components/users/UserTable';
import { UserForm } from '../../components/users/UserForm';
import { UserCard } from '../../components/users/UserCard';

// Import custom hooks
import { useToast } from '../../components/hooks/useToast';

// Import icons
import Icon from 'react-native-vector-icons/Feather';

const baseURL = 'https://accountapp-backend-shardaassociates.onrender.com';



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
  
  const { toast } = useToast();

  // For React Native, you might want to use a different URL or get it from config
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
      toast({
        variant: 'destructive',
        title: 'Failed to copy URL',
        description: 'Please copy the URL manually.',
      });
    }
  };

  const fetchUsersAndCompanies = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const [usersRes, companiesRes] = await Promise.all([
        fetch(`${baseURL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/companies/my`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!usersRes.ok || !companiesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const usersData = await usersRes.json();
      const companiesData = await companiesRes.json();

      // Decode token
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentUserId = payload.userId || payload.id || payload._id;

      // Filter out current admin user
      let filteredUsers = usersData;
      if (payload.role === 'admin') {
        filteredUsers = usersData.filter((u) => u._id !== currentUserId);
      }

      setUsers(filteredUsers);
      setCompanies(companiesData);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error fetching data',
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndCompanies();
  }, []);

  const handleOpenForm = (user = null) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleCloseForm = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
  };

 // In UsersScreen.js, update the handleSave function:

const handleSave = async (formData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found.');

    const method = selectedUser ? 'PUT' : 'POST';
    const url = selectedUser
      ? `${baseURL}/api/users/${selectedUser._id}`
      : `${baseURL}/api/users`;

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        data.message ||
        `Failed to ${selectedUser ? 'update' : 'create'} user.`
      );
    }

    toast({
      title: `User ${selectedUser ? 'updated' : 'created'} successfully`,
    });
    
    // Refresh data
    fetchUsersAndCompanies();
    
    // Automatically close the form
    handleCloseForm();
    
  } catch (error) {
    toast({
      variant: 'destructive',
      title: 'Operation Failed',
      description: error.message || 'Something went wrong.',
    });
  }
};

  const openDeleteDialog = (user) => {
    setUserToDelete(user);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${baseURL}/api/users/${userToDelete._id}`, {
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
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: error.message || 'Something went wrong.',
      });
    }
  };

  const companyMap = useMemo(() => {
    const map = new Map();
    companies.forEach((company) => {
      map.set(company._id, company.businessName);
    });
    return map;
  }, [companies]);

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <Card style={styles.loaderCard}>
          <CardContent style={styles.loaderContent}>
            <ActivityIndicator size="large" color="#666" />
          </CardContent>
        </Card>
      </View>
    );
  }

  if (companies.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
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
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* User Login URL Card */}
        <Card style={styles.urlCard}>
          <CardContent style={styles.urlCardContent}>
            <View style={styles.urlTextContainer}>
              <Text style={styles.urlLabel}>User Login URL</Text>
              <Text style={styles.urlValue}>
                {userLoginUrl}
              </Text>
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

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Users</Text>
            <Text style={styles.subtitle}>Manage your users</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.viewToggle}>
              {/* <Button
                variant={viewMode === 'card' ? 'primary' : 'ghost'}
                size="sm"
                onPress={() => setViewMode('card')}
                icon="grid"
              />
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onPress={() => setViewMode('list')}
                icon="list"
              /> */}
            </View>
            <Button style={styles.addUser} onPress={() => handleOpenForm()} icon="plus-circle">
              Add User
            </Button>
          </View>
        </View>

        <Card>
          <CardContent style={viewMode === 'card' ? styles.cardContent : styles.listContent}>
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
                <Text style={styles.emptyStateDescription}>
                  Get started by adding your first user.
                </Text>
                <Button onPress={() => handleOpenForm()} icon="plus-circle">
                  Add User
                </Button>
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
                This action cannot be undone. This will permanently delete the user account.
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
  );
}

const styles = StyleSheet.create({
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
  
  // Loader styles
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loaderCard: {
    width: '100%',
    maxWidth: 400,
  },
  loaderContent: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // No company styles
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

  // URL Card styles
  urlCard: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
    marginBottom: 8,
    marginTop: 40,
    height: 70,
  },
  urlCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  urlTextContainer: {
    flex: 1,
    paddingTop: 8,
  },
  urlLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e40af',
    // marginBottom: 4,
  },
  urlValue: {
    fontSize: 12,
    color: '#1d4ed8',
    backgroundColor: '#eff6ff',
    padding: 4,
    marginTop: 6,
    borderRadius: 8,
  },
  copyButton: {
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#a2b5ddff',
    
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    backgroundColor: '#ccddebff',
    color: '#fff',
    fontWeight: '500',
  },

  // Card content styles
  cardContent: {
    padding: 0,
  },
  listContent: {
    // padding: 24,
  },
  loadingContainer: {
    height: 256,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty state styles
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

  // Dialog styles
  dialogContent: {
    maxWidth: 640,
    width: '100%',
  },
});