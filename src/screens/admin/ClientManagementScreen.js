import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  Dimensions,
  Switch,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PlusCircle,
  Eye,
  EyeOff,
  X,
  Users,
  User,
  Building,
  Package,
  Send,
  MessageSquare,
  Contact,
  Store,
  Mail,
  Phone,
  Calendar,
  Globe,
  Copy,
  Edit,
  Trash2,
  ShieldCheck,
  KeyRound,
  Filter,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react-native';
import ClientCard from '../../components/clients/ClientCard';
import ClientForm from '../../components/clients/ClientForm';
import { useToast } from '../../components/hooks/useToast';
import { BASE_URL } from '../../config';

const { width, height } = Dimensions.get('window');

const getAppOrigin = () => BASE_URL || 'https://yourapp.com';
const getAppLoginUrl = slug =>
  slug ? `${getAppOrigin()}/client-login/${slug}` : '';
const getApiLoginUrl = (slug, base = BASE_URL) =>
  slug ? `${base}/api/clients/${slug}/login` : '';

export default function ClientManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [clients, setClients] = useState([]);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [clientForPermissions, setClientForPermissions] = useState(null);
  const [currentPermissions, setCurrentPermissions] = useState({});
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [clientToResetPassword, setClientToResetPassword] = useState(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [eyeOpen, setEyeOpen] = useState(false);
  const [contactNameFilter, setContactNameFilter] = useState('');
  const [usernameFilter, setUsernameFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();

  // Fetch clients from API
  const fetchClients = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found.');
      }

      const response = await fetch(`${BASE_URL}/api/clients`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch clients.');
      }

      const data = await response.json();
      setClients(data);
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed to load clients',
        message: error.message || 'Something went wrong.',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
  };

  // Delete client
  const handleDelete = client => {
    setClientToDelete(client);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${BASE_URL}/api/clients/${clientToDelete._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete client.');
      }

      showToast({
        type: 'success',
        title: 'Client Deleted',
        message: `${clientToDelete.contactName} has been successfully deleted.`,
      });

      setClients(clients.filter(c => c._id !== clientToDelete._id));
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Deletion Failed',
        message: error.message || 'Something went wrong.',
      });
    } finally {
      setIsAlertOpen(false);
      setClientToDelete(null);
    }
  };

  // Reset password
  const handleResetPassword = client => {
    setClientToResetPassword(client);
    setIsResetPasswordDialogOpen(true);
  };

  const confirmResetPassword = async () => {
    if (!clientToResetPassword || !newPassword) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'New password cannot be empty.',
      });
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(
        `${BASE_URL}/api/clients/reset-password/${clientToResetPassword._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newpassword: newPassword }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset password.');
      }

      showToast({
        type: 'success',
        title: 'Password Reset Successful',
        message: `Password for ${clientToResetPassword.contactName} has been updated.`,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Password Reset Failed',
        message: error.message || 'Something went wrong.',
      });
    } finally {
      setIsSubmittingPassword(false);
      setNewPassword('');
      setIsResetPasswordDialogOpen(false);
      setClientToResetPassword(null);
    }
  };

  // Manage permissions
  const handleManagePermissions = async client => {
    setClientForPermissions(client);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(
        `${BASE_URL}/api/clients/${client._id}/permissions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCurrentPermissions({
          maxCompanies: data.maxCompanies,
          maxUsers: data.maxUsers,
          maxInventories: data.maxInventories,
          canSendInvoiceEmail: data.canSendInvoiceEmail,
          canSendInvoiceWhatsapp: data.canSendInvoiceWhatsapp,
          canCreateUsers: data.canCreateUsers,
          canCreateCustomers: data.canCreateCustomers,
          canCreateVendors: data.canCreateVendors,
          canCreateProducts: data.canCreateProducts,
          canCreateCompanies: data.canCreateCompanies,
          canUpdateCompanies: data.canUpdateCompanies,
        });
      } else {
        // Fallback to client data
        setCurrentPermissions({
          maxCompanies: client.maxCompanies || 5,
          maxUsers: client.maxUsers || 10,
          maxInventories: client.maxInventories || 50,
          canSendInvoiceEmail: client.canSendInvoiceEmail || false,
          canSendInvoiceWhatsapp: client.canSendInvoiceWhatsapp || false,
          canCreateUsers: client.canCreateUsers || true,
          canCreateCustomers: client.canCreateCustomers || true,
          canCreateVendors: client.canCreateVendors || true,
          canCreateProducts: client.canCreateProducts || true,
          canCreateCompanies: client.canCreateCompanies || false,
          canUpdateCompanies: client.canUpdateCompanies || false,
        });
      }
    } catch (error) {
      // Fallback in case of error
      setCurrentPermissions({
        maxCompanies: client.maxCompanies || 5,
        maxUsers: client.maxUsers || 10,
        maxInventories: client.maxInventories || 50,
        canSendInvoiceEmail: client.canSendInvoiceEmail || false,
        canSendInvoiceWhatsapp: client.canSendInvoiceWhatsapp || false,
        canCreateUsers: client.canCreateUsers || true,
        canCreateCustomers: client.canCreateCustomers || true,
        canCreateVendors: client.canCreateVendors || true,
        canCreateProducts: client.canCreateProducts || true,
        canCreateCompanies: client.canCreateCompanies || false,
        canUpdateCompanies: client.canUpdateCompanies || false,
      });
    }
    setIsPermissionsDialogOpen(true);
  };

  const handlePermissionChange = (field, value) => {
    setCurrentPermissions(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePermissions = async () => {
    if (!clientForPermissions) return;
    setIsSavingPermissions(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const payload = {
        maxCompanies: currentPermissions.maxCompanies,
        maxUsers: currentPermissions.maxUsers,
        maxInventories: currentPermissions.maxInventories,
        canSendInvoiceEmail: currentPermissions.canSendInvoiceEmail,
        canSendInvoiceWhatsapp: currentPermissions.canSendInvoiceWhatsapp,
        canCreateUsers: currentPermissions.canCreateUsers,
        canCreateCustomers: currentPermissions.canCreateCustomers,
        canCreateVendors: currentPermissions.canCreateVendors,
        canCreateProducts: currentPermissions.canCreateProducts,
        canCreateCompanies: currentPermissions.canCreateCompanies,
        canUpdateCompanies: currentPermissions.canUpdateCompanies,
      };

      const response = await fetch(
        `${BASE_URL}/api/clients/${clientForPermissions._id}/permissions`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update permissions.');
      }

      await fetchClients(); // Refresh client list
      showToast({
        type: 'success',
        title: 'Permissions Updated',
        message: `Permissions for ${clientForPermissions.contactName} have been saved.`,
      });
      setIsPermissionsDialogOpen(false);
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Something went wrong.',
      });
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleEdit = client => {
    setSelectedClient(client);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedClient(null);
    setIsDialogOpen(true);
  };

  const copyToClipboard = text => {
    Clipboard.setString(text);
    showToast({
      type: 'success',
      title: 'Copied',
      message: 'URL copied to clipboard',
    });
  };

  const filteredClients = clients.filter(
    c =>
      (contactNameFilter
        ? c.contactName.toLowerCase().includes(contactNameFilter.toLowerCase())
        : true) &&
      (usernameFilter
        ? c.clientUsername.toLowerCase().includes(usernameFilter.toLowerCase())
        : true),
  );

  const onFormSubmit = () => {
    setIsDialogOpen(false);
    fetchClients(); // Refresh the list
  };

  const handleClearFilters = () => {
    setContactNameFilter('');
    setUsernameFilter('');
  };

  if (isLoading)
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Client Management</Text>
              <Text style={styles.subtitle}>Manage your clients</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
              <PlusCircle size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Add Client</Text>
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <View style={styles.filtersRow}>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              placeholder="Filter by name"
              value={contactNameFilter}
              onChangeText={setContactNameFilter}
            />
            <TextInput
              style={[styles.textInput, { flex: 1, marginLeft: 10 }]}
              placeholder="Filter by username"
              value={usernameFilter}
              onChangeText={setUsernameFilter}
            />
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.cancelButton,
                { marginLeft: 10 },
              ]}
              onPress={handleClearFilters}
            >
              <Text style={styles.cancelButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Only Card View - No Toggle */}
          <View style={styles.clientsGrid}>
            {filteredClients.map(client => (
              <ClientCard
                key={client._id}
                client={client}
                onEdit={() => handleEdit(client)}
                onDelete={() => handleDelete(client)}
                onResetPassword={() => handleResetPassword(client)}
                onManagePermissions={() => handleManagePermissions(client)}
                copyToClipboard={copyToClipboard}
                getAppLoginUrl={getAppLoginUrl}
                getApiLoginUrl={(slug) => getApiLoginUrl(slug, BASE_URL)}
              />
            ))}
          </View>

          {filteredClients.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No clients found</Text>
              <Text style={styles.emptyStateSubtext}>
                {clients.length === 0 ? 'Add your first client to get started' : 'Try changing your filters'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Add/Edit Modal */}
        <Modal
          visible={isDialogOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsDialogOpen(false)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <StatusBar backgroundColor="rgba(0,0,0,0.5)" />
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {selectedClient ? 'Edit Client' : 'Add New Client'}
                  </Text>
                  <TouchableOpacity onPress={() => setIsDialogOpen(false)}>
                    <X size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalText}>
                  {selectedClient
                    ? `Update the details for ${selectedClient.contactName}.`
                    : 'Fill in the form below to add a new client.'}
                </Text>

                <ScrollView
                  style={{ flexGrow: 0, maxHeight: 500 }}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <ClientForm
                    client={selectedClient}
                    onSubmit={onFormSubmit}
                    onCancel={() => setIsDialogOpen(false)}
                    hideAdvanced={false}
                    baseURL={BASE_URL}
                  />
                </ScrollView>
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Delete Modal */}
        <Modal
          visible={isAlertOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsAlertOpen(false)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <StatusBar backgroundColor="rgba(0,0,0,0.5)" />
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Confirm Delete</Text>
                <Text style={styles.modalText}>
                  Are you sure you want to delete {clientToDelete?.contactName}?
                </Text>
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setIsAlertOpen(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.deleteModalButton]}
                    onPress={confirmDelete}
                  >
                    <Text style={styles.deleteModalButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Reset Password Modal */}
        <Modal
          visible={isResetPasswordDialogOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsResetPasswordDialogOpen(false)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <StatusBar backgroundColor="rgba(0,0,0,0.5)" />
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalText}>
                  Enter new password for {clientToResetPassword?.contactName}
                </Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    secureTextEntry={!eyeOpen}
                    placeholder="New password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setEyeOpen(!eyeOpen)}
                    style={{ marginLeft: 10 }}
                  >
                    {eyeOpen ? <EyeOff size={20} /> : <Eye size={20} />}
                  </TouchableOpacity>
                </View>
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setIsResetPasswordDialogOpen(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.primaryButton]}
                    onPress={confirmResetPassword}
                  >
                    {isSubmittingPassword ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        Reset Password
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Permissions Modal */}
        <Modal
          visible={isPermissionsDialogOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsPermissionsDialogOpen(false)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <StatusBar backgroundColor="rgba(0,0,0,0.5)" />
            <View style={styles.modalOverlay}>
              <View style={styles.permissionsModal}>
                <View style={styles.permissionsHeader}>
                  <Text style={styles.permissionsTitle}>
                    Permissions for {clientForPermissions?.contactName}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsPermissionsDialogOpen(false)}
                  >
                    <X size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ paddingHorizontal: 20 }}>
                  <Text style={styles.sectionTitle}>Feature Permissions</Text>
                  {[
                    {
                      key: 'canCreateUsers',
                      label: 'Create Users',
                      icon: Users,
                    },
                    {
                      key: 'canCreateCustomers',
                      label: 'Create Customers',
                      icon: User,
                    },
                    {
                      key: 'canCreateVendors',
                      label: 'Create Vendors',
                      icon: Building,
                    },
                    {
                      key: 'canCreateProducts',
                      label: 'Create Products',
                      icon: Package,
                    },
                    {
                      key: 'canSendInvoiceEmail',
                      label: 'Send Email Invoice',
                      icon: Send,
                    },
                    {
                      key: 'canSendInvoiceWhatsapp',
                      label: 'Send WhatsApp Invoice',
                      icon: MessageSquare,
                    },
                  ].map(({ key, label, icon: Icon }) => (
                    <View key={key} style={styles.permissionItem}>
                      <View style={styles.permissionLabel}>
                        <Icon size={20} color="#666" />
                        <Text style={styles.permissionText}>{label}</Text>
                      </View>
                      <Switch
                        value={currentPermissions[key] || false}
                        onValueChange={v => handlePermissionChange(key, v)}
                      />
                    </View>
                  ))}
                  <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                    Usage Limits
                  </Text>
                  {[
                    {
                      key: 'maxCompanies',
                      label: 'Max Companies',
                      icon: Building,
                    },
                    { key: 'maxUsers', label: 'Max Users', icon: Users },
                    {
                      key: 'maxInventories',
                      label: 'Max Inventories',
                      icon: Package,
                    },
                  ].map(({ key, label, icon: Icon }) => (
                    <View key={key} style={styles.limitItem}>
                      <View style={styles.limitLabel}>
                        <Icon size={20} color="#666" />
                        <Text style={styles.limitText}>{label}</Text>
                      </View>
                      <TextInput
                        style={styles.numberInput}
                        keyboardType="numeric"
                        value={String(currentPermissions[key] || 0)}
                        onChangeText={t =>
                          handlePermissionChange(
                            key,
                            Math.max(parseInt(t) || 0, 0),
                          )
                        }
                      />
                    </View>
                  ))}
                  <View style={{ height: 80 }} />
                </ScrollView>

                <View style={styles.permissionsFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setIsPermissionsDialogOpen(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.primaryButton]}
                    onPress={handleSavePermissions}
                  >
                    {isSavingPermissions ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },

  clientsGrid: {
    padding: 16,
    gap: 16,
  },

  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },

  modalSafeArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    width: '95%',
    maxWidth: 480,
    maxHeight: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  
  // Modal Header
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },

  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    marginLeft: 0,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  deleteModalButton: {
    backgroundColor: '#FF3B30',
  },
  deleteModalButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },

  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
    marginTop: 8,
  },

  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
    paddingVertical: 8,
  },
  permissionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  permissionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },

  limitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
    paddingVertical: 8,
  },
  limitLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  limitText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },

  numberInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    width: 80,
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: '#FFF',
  },

  // Password Input Container
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },

  permissionsModal: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  permissionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fafafa',
  },
  permissionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  permissionsFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fafafa',
    gap: 10,
  },
});