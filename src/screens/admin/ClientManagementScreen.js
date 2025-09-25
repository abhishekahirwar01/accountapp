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
  ActivityIndicator
} from 'react-native';
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
  MessageSquare
} from 'lucide-react-native';
import ClientCard from '../../components/clients/ClientCard';
import ClientForm from '../../components/clients/ClientForm';

const { width } = Dimensions.get('window');

const hardcodedClients = [
  {
    _id: '1',
    contactName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0101',
    clientUsername: 'johndoe',
    slug: 'john-doe',
    maxCompanies: 5,
    maxUsers: 10,
    maxInventories: 50,
    canSendInvoiceEmail: true,
    canSendInvoiceWhatsapp: false,
    canCreateUsers: true,
    canCreateCustomers: true,
    canCreateVendors: true,
    canCreateProducts: true,
    canCreateCompanies: false,
    canUpdateCompanies: true
  },
  {
    _id: '2',
    contactName: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+1-555-0102',
    clientUsername: 'janesmith',
    slug: 'jane-smith',
    maxCompanies: 3,
    maxUsers: 5,
    maxInventories: 25,
    canSendInvoiceEmail: false,
    canSendInvoiceWhatsapp: true,
    canCreateUsers: false,
    canCreateCustomers: true,
    canCreateVendors: false,
    canCreateProducts: true,
    canCreateCompanies: true,
    canUpdateCompanies: false
  }
];

const getAppOrigin = () => 'https://yourapp.com';
const getAppLoginUrl = (slug) => slug ? `${getAppOrigin()}/client-login/${slug}` : '';

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
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [eyeOpen, setEyeOpen] = useState(false);

  

  useEffect(() => {
    const timer = setTimeout(() => {
      setClients(hardcodedClients);
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleDelete = (client) => {
    setClientToDelete(client);
    setIsAlertOpen(true);
  };

  const confirmDelete = () => {
    if (!clientToDelete) return;
    setTimeout(() => {
      setClients(clients.filter(c => c._id !== clientToDelete._id));
      Alert.alert('Deleted', `${clientToDelete.contactName} deleted successfully.`);
      setIsAlertOpen(false);
      setClientToDelete(null);
    }, 500);
  };

  const handleResetPassword = (client) => {
    setClientForPermissions(client);
    setIsResetPasswordDialogOpen(true);
  };

  const confirmResetPassword = () => {
    if (!newPassword) {
      Alert.alert('Error', 'Password cannot be empty.');
      return;
    }
    setIsSubmittingPassword(true);
    setTimeout(() => {
      Alert.alert('Success', `Password for ${clientForPermissions.contactName} reset.`);
      setIsSubmittingPassword(false);
      setNewPassword('');
      setIsResetPasswordDialogOpen(false);
    }, 1000);
  };

  const handleManagePermissions = (client) => {
    setClientForPermissions(client);
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
    setIsPermissionsDialogOpen(true);
  };

  const handlePermissionChange = (field, value) => {
    setCurrentPermissions(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePermissions = () => {
    if (!clientForPermissions) return;
    setIsSavingPermissions(true);
    setTimeout(() => {
      setClients(clients.map(c => c._id === clientForPermissions._id ? { ...c, ...currentPermissions } : c));
      Alert.alert('Success', 'Permissions updated successfully.');
      setIsSavingPermissions(false);
      setIsPermissionsDialogOpen(false);
    }, 1000);
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedClient(null);
    setIsDialogOpen(true);
  };

  const onFormSubmit = (clientData) => {
    if (selectedClient) {
      setClients(clients.map(c => c._id === selectedClient._id ? { ...c, ...clientData } : c));
    } else {
      const newClient = {
        _id: Date.now().toString(),
        ...clientData,
        slug: clientData.contactName.toLowerCase().replace(/\s+/g, '-'),
        maxCompanies: 5,
        maxUsers: 10,
        maxInventories: 50,
        canSendInvoiceEmail: false,
        canSendInvoiceWhatsapp: false,
        canCreateUsers: true,
        canCreateCustomers: true,
        canCreateVendors: true,
        canCreateProducts: true,
        canCreateCompanies: false,
        canUpdateCompanies: false
      };
      setClients([...clients, newClient]);
    }
    setIsDialogOpen(false);
  };

  const copyToClipboard = (text) => Alert.alert('Copied', 'URL copied to clipboard');

  if (isLoading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading clients...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView>
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

        <View style={styles.clientsGrid}>
          {clients.map(client => (
            <ClientCard
              key={client._id}
              client={client}
              onEdit={() => handleEdit(client)}
              onDelete={() => handleDelete(client)}
              onResetPassword={() => handleResetPassword(client)}
              onManagePermissions={() => handleManagePermissions(client)}
              copyToClipboard={copyToClipboard}
              getAppLoginUrl={getAppLoginUrl}
            />
          ))}
          {clients.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No clients found</Text>
              <Text style={styles.emptyStateSubtext}>Add your first client to get started</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={isDialogOpen} transparent animationType="slide" onRequestClose={() => setIsDialogOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ClientForm client={selectedClient} onSubmit={onFormSubmit} onCancel={() => setIsDialogOpen(false)} />
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={isAlertOpen} transparent animationType="fade" onRequestClose={() => setIsAlertOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Delete</Text>
            <Text style={styles.modalText}>Are you sure you want to delete {clientToDelete?.contactName}?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsAlertOpen(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.deleteModalButton]} onPress={confirmDelete}>
                <Text style={styles.deleteModalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal visible={isResetPasswordDialogOpen} transparent animationType="slide" onRequestClose={() => setIsResetPasswordDialogOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalText}>Enter new password for {clientForPermissions?.contactName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                secureTextEntry={!eyeOpen}
                placeholder="New password"
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity onPress={() => setEyeOpen(!eyeOpen)} style={{ marginLeft: 10 }}>
                {eyeOpen ? <EyeOff size={20} /> : <Eye size={20} />}
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsResetPasswordDialogOpen(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.primaryButton]} onPress={confirmResetPassword}>
                {isSubmittingPassword ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Reset</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Permissions Modal */}
      <Modal visible={isPermissionsDialogOpen} transparent animationType="slide" onRequestClose={() => setIsPermissionsDialogOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.permissionsModal}>
            <View style={styles.permissionsHeader}>
              <Text style={styles.permissionsTitle}>Permissions for {clientForPermissions?.contactName}</Text>
              <TouchableOpacity onPress={() => setIsPermissionsDialogOpen(false)}><X size={24} color="#666" /></TouchableOpacity>
            </View>
            <ScrollView style={{ paddingHorizontal: 20 }}>
              <Text style={styles.sectionTitle}>Feature Permissions</Text>
              {[
                { key: 'canCreateUsers', label: 'Create Users', icon: Users },
                { key: 'canCreateCustomers', label: 'Create Customers', icon: User },
                { key: 'canCreateVendors', label: 'Create Vendors', icon: Building },
                { key: 'canCreateProducts', label: 'Create Products', icon: Package },
                { key: 'canSendInvoiceEmail', label: 'Send Email Invoice', icon: Send },
                { key: 'canSendInvoiceWhatsapp', label: 'Send WhatsApp Invoice', icon: MessageSquare }
              ].map(({ key, label, icon: Icon }) => (
                <View key={key} style={styles.permissionItem}>
                  <View style={styles.permissionLabel}><Icon size={20} color="#666" /><Text style={styles.permissionText}>{label}</Text></View>
                  <Switch value={currentPermissions[key] || false} onValueChange={v => handlePermissionChange(key, v)} />
                </View>
              ))}

              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Usage Limits</Text>
              {[
                { key: 'maxCompanies', label: 'Max Companies', icon: Building },
                { key: 'maxUsers', label: 'Max Users', icon: Users },
                { key: 'maxInventories', label: 'Max Inventories', icon: Package }
              ].map(({ key, label, icon: Icon }) => (
                <View key={key} style={styles.limitItem}>
                  <View style={styles.limitLabel}><Icon size={20} color="#666" /><Text style={styles.limitText}>{label}</Text></View>
                  <TextInput
                    style={styles.numberInput}
                    keyboardType="numeric"
                    value={String(currentPermissions[key] || 0)}
                    onChangeText={t => handlePermissionChange(key, Math.max(parseInt(t) || 0, 0))}
                  />
                </View>
              ))}

              <View style={{ height: 80 }} /> {/* Padding for footer */}
            </ScrollView>

            <View style={styles.permissionsFooter}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsPermissionsDialogOpen(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.primaryButton]} onPress={handleSavePermissions}>
                {isSavingPermissions ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addButtonText: { color: '#FFF', fontWeight: '600', marginLeft: 8, fontSize: 14 },
  clientsGrid: { padding: 16 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyStateText: { fontSize: 18, color: '#666', marginBottom: 8 },
  emptyStateSubtext: { fontSize: 14, color: '#999', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalText: { fontSize: 14, color: '#666', marginBottom: 20 },
  modalButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, minWidth: 80, alignItems: 'center', marginLeft: 10 },
  cancelButton: { backgroundColor: '#f8f9fa', marginLeft: 0 },
  cancelButtonText: { color: '#666', fontWeight: '600' },
  deleteModalButton: { backgroundColor: '#FF3B30' },
  deleteModalButtonText: { color: '#FFF', fontWeight: '600' },
  primaryButton: { backgroundColor: '#007AFF' },
  primaryButtonText: { color: '#FFF', fontWeight: '600' },
  textInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 12, fontSize: 16 },
  permissionsModal: { backgroundColor: '#FFF', borderRadius: 12, maxHeight: '80%', width: '100%', maxWidth: 400 },
  permissionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  permissionsTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  permissionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  permissionLabel: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  permissionText: { marginLeft: 12, fontSize: 14, color: '#333' },
  limitItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  limitLabel: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  limitText: { marginLeft: 12, fontSize: 14, color: '#333' },
  numberInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 4, padding: 8, width: 80, textAlign: 'center' },
  permissionsFooter: { flexDirection: 'row', justifyContent: 'flex-end', padding: 20 }
});
