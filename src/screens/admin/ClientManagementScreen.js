import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
  Check,
  Link,
} from 'lucide-react-native';
import ClientCard from '../../components/clients/ClientCard';
import ClientForm from '../../components/clients/ClientForm';
import { useToast } from '../../components/hooks/useToast';
import { BASE_URL } from '../../config';
import AppLayout from '../../components/layout/AppLayout';
import {
  AlertDialog,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../components/ui/AlertDialog';
const { width, height } = Dimensions.get('window');

const getAppOrigin = () => BASE_URL || 'https://yourapp.com';
const getAppLoginUrl = slug =>
  slug ? `${getAppOrigin()}/client-login/${slug}` : '';
const getApiLoginUrl = (slug, base = BASE_URL) =>
  slug ? `${base}/api/clients/${slug}/login` : '';

// Client Login Base URL
const CLIENT_LOGIN_URL = 'https://vinimay.sharda.co.in/client-login';

// Header height constant
const HEADER_MAX_HEIGHT = 200;

// ---------- UI COMPONENTS ----------
const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const Button = ({
  children,
  onPress,
  variant = 'default',
  size = 'default',
  style,
  disabled,
  icon,
  ...props
}) => (
  <TouchableOpacity
    style={[
      styles.button,
      styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
      styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`],
      disabled && styles.buttonDisabled,
      style,
    ]}
    onPress={onPress}
    disabled={disabled}
    {...props}
  >
    {icon && <View style={styles.buttonIcon}>{icon}</View>}
    <Text
      style={[
        styles.buttonText,
        styles[
          `buttonText${variant.charAt(0).toUpperCase() + variant.slice(1)}`
        ],
      ]}
    >
      {children}
    </Text>
  </TouchableOpacity>
);

const Dialog = ({ visible, onClose, title, description, children }) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent={true}
    onRequestClose={onClose}
    statusBarTranslucent={true}
  >
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.modalOverlay}
    >
      <View style={styles.dialogContent}>
        <View style={styles.dialogHeader}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogDescription}>{description}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <View style={styles.dialogBody}>{children}</View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

// const AlertDialog = ({ visible, onClose, title, description, onConfirm }) => (
//   <Modal
//     visible={visible}
//     animationType="fade"
//     transparent={true}
//     onRequestClose={onClose}
//   >
//     <View style={styles.modalOverlay}>
//       <View style={styles.alertDialogContent}>
//         <Text style={styles.alertDialogTitle}>{title}</Text>
//         <Text style={styles.alertDialogDescription}>{description}</Text>
//         <View style={styles.alertDialogActions}>
//           <Button
//             variant="outline"
//             onPress={onClose}
//             style={styles.alertDialogButton}
//           >
//             Cancel
//           </Button>
//           <Button
//             variant="destructive"
//             onPress={onConfirm}
//             style={styles.alertDialogButton}
//           >
//             Continue
//           </Button>
//         </View>
//       </View>
//     </View>
//   </Modal>
// );

// ---------- MAIN COMPONENT ----------
export default function ClientManagementPage() {
  // Animation refs for collapsible header
  const scrollY = useRef(new Animated.Value(0)).current;
  const HEADER_HEIGHT = 200;
  const diffClamp = Animated.diffClamp(scrollY, 0, HEADER_HEIGHT);
  const headerTranslateY = diffClamp.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT],
  });

  // State declarations
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
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] =
    useState(false);
  const [clientToResetPassword, setClientToResetPassword] = useState(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [eyeOpen, setEyeOpen] = useState(false);
  const [contactNameFilter, setContactNameFilter] = useState('');
  const [usernameFilter, setUsernameFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Copy URL to clipboard
  const copyToClipboard = () => {
    Clipboard.setString(CLIENT_LOGIN_URL);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Client login URL copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Fetch clients from API
  const fetchClients = useCallback(async () => {
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
      const sortedClients = data.sort((a, b) => {
        // Extract timestamp from MongoDB ObjectId (first 4 bytes)
        // This is a simplified approach - for actual use, you might want a more robust solution
        const timestampA = a._id
          ? parseInt(a._id.substring(0, 8), 16) * 1000
          : 0;
        const timestampB = b._id
          ? parseInt(b._id.substring(0, 8), 16) * 1000
          : 0;
        return timestampB - timestampA; // Newest first
      });

      setClients(sortedClients);
    } catch (error) {
      toast({
        title: 'Failed to load clients',
        description: error.message || 'Something went wrong.',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

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

      const response = await fetch(
        `${BASE_URL}/api/clients/${clientToDelete._id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete client.');
      }

      toast({
        title: 'Client Deleted',
        description: `${clientToDelete.contactName} has been successfully deleted.`,
      });

      setClients(clients.filter(c => c._id !== clientToDelete._id));
    } catch (error) {
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Something went wrong.',
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
      toast({
        title: 'Validation Error',
        description: 'New password cannot be empty.',
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
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset password.');
      }

      toast({
        title: 'Password Reset Successful',
        description: `Password for ${clientToResetPassword.contactName} has been updated.`,
      });
    } catch (error) {
      toast({
        title: 'Password Reset Failed',
        description: error.message || 'Something went wrong.',
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
        },
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
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update permissions.');
      }

      await fetchClients();
      toast({
        title: 'Permissions Updated',
        description: `Permissions for ${clientForPermissions.contactName} have been saved.`,
      });
      setIsPermissionsDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Something went wrong.',
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
    fetchClients();
  };

  const handleClearFilters = () => {
    setContactNameFilter('');
    setUsernameFilter('');
  };

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.headerContainer,
        {
          transform: [{ translateY: headerTranslateY }],
        },
      ]}
    >
      <View style={styles.headerContent}>
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Client Management</Text>
          <Text style={styles.mainSubtitle}>Manage your clients</Text>
        </View>
        <TouchableOpacity style={styles.modernAddButton} onPress={handleAddNew}>
          <View style={styles.addButtonIcon}>
            <PlusCircle size={18} color="#007AFF" />
          </View>
          <Text style={styles.modernAddButtonText}>Add Client</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.loginUrlCard}>
        <View style={styles.loginUrlHeader}>
          <View style={styles.loginUrlTextContainer}>
            <Text
              style={styles.loginUrlValue}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {CLIENT_LOGIN_URL}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.copyUrlButton}
            onPress={copyToClipboard}
            activeOpacity={0.8}
          >
            {copied ? (
              <Check size={16} color="#ffffff" />
            ) : (
              <Copy size={16} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Filter size={18} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.modernSearchInput}
            placeholder="Search by name/username"
            placeholderTextColor="#999"
            value={contactNameFilter || usernameFilter}
            onChangeText={text => {
              setContactNameFilter(text);
              setUsernameFilter(text);
            }}
          />
          {(contactNameFilter || usernameFilter) && (
            <TouchableOpacity
              onPress={handleClearFilters}
              style={styles.clearIconButton}
            >
              <X size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Card style={styles.emptyStateCard}>
      <Users size={48} color="#9ca3af" />
      <Text style={styles.emptyStateTitle}>No Clients Found</Text>
      <Text style={styles.emptyStateDescription}>
        {clients.length === 0
          ? 'Add your first client to get started'
          : 'Try changing your filters'}
      </Text>
      <Button
        onPress={handleAddNew}
        style={styles.emptyStateButton}
        icon={<PlusCircle size={16} color="#fff" />}
      >
        Add Client
      </Button>
    </Card>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading clients...</Text>
      </View>
    );
  }

  return (
    <AppLayout>
      <View style={styles.container}>
        {renderHeader()}

        <Animated.FlatList
          data={filteredClients}
          renderItem={({ item: client }) => (
            <ClientCard
              key={client._id}
              client={client}
              onEdit={() => handleEdit(client)}
              onDelete={() => handleDelete(client)}
              onResetPassword={() => handleResetPassword(client)}
              onManagePermissions={() => handleManagePermissions(client)}
              copyToClipboard={text => {
                Clipboard.setString(text);
                toast({
                  title: 'Copied',
                  description: 'URL copied to clipboard',
                });
              }}
              getAppLoginUrl={getAppLoginUrl}
              getApiLoginUrl={slug => getApiLoginUrl(slug, BASE_URL)}
            />
          )}
          keyExtractor={item => item._id}
          contentContainerStyle={[
            filteredClients.length === 0
              ? styles.emptyListContent
              : styles.listContent,
            { paddingTop: HEADER_HEIGHT + 10 },
          ]}
          style={styles.listContainer}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              progressViewOffset={HEADER_HEIGHT}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />

        {/* All Modals remain the same */}
        <Dialog
          visible={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title={selectedClient ? 'Edit Client' : 'Add New Client'}
          description={
            selectedClient
              ? `Update the details for ${selectedClient.contactName}.`
              : 'Fill in the form below to add a new client.'
          }
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
            nestedScrollEnabled={true}
          >
            <ClientForm
              client={selectedClient}
              onSubmit={onFormSubmit}
              onCancel={() => setIsDialogOpen(false)}
              hideAdvanced={false}
              baseURL={BASE_URL}
            />
          </ScrollView>
        </Dialog>

        <AlertDialog
          visible={isAlertOpen}
          onClose={() => setIsAlertOpen(false)}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              client account and all associated data for{' '}
              <Text style={{ fontWeight: '700', color: '#000' }}>
                {clientToDelete?.contactName}
              </Text>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setIsAlertOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onPress={confirmDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>

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
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    zIndex: 10,
    elevation: 6,
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleSection: {
    flex: 1,
    marginTop: 4,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  mainSubtitle: {
    fontSize: 13,
    color: '#8e8e93',
    letterSpacing: 0.8,
  },
  modernAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF20',
  },
  addButtonIcon: {
    marginRight: 6,
  },
  modernAddButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  loginUrlCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 6,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#e0e7ff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loginUrlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkIcon: {
    marginRight: 12,
    backgroundColor: '#eef2ff',
    padding: 10,
    borderRadius: 10,
  },
  loginUrlTextContainer: {
    flex: 1,
    marginRight: 5,
  },
  loginUrlLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  loginUrlValue: {
    fontSize: 13,
    color: '#6366f1',
    backgroundColor: '#f5f7ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  copyUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  copyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  copiedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  searchIcon: {
    marginRight: 8,
  },
  modernSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    padding: 0,
  },
  clearIconButton: {
    padding: 4,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: height - 250,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonDefault: { backgroundColor: '#007AFF' },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  buttonDestructive: { backgroundColor: '#ef4444' },
  buttonSm: { paddingHorizontal: 12, paddingVertical: 6 },
  buttonDisabled: { opacity: 0.5 },
  buttonIcon: { marginRight: 8 },
  buttonText: { fontSize: 14, fontWeight: '500', color: '#fff' },
  buttonTextOutline: { color: '#374151' },
  emptyStateCard: {
    alignItems: 'center',
    padding: 48,
    margin: 16,
    backgroundColor: '#fff',
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: { paddingHorizontal: 24, paddingVertical: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '95%',
    height: '90%',
  },
  dialogHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  dialogDescription: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  closeButton: { position: 'absolute', top: 16, right: 16, padding: 4 },
  dialogBody: { flex: 1 },
  alertDialogContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  alertDialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  alertDialogDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  alertDialogActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  alertDialogButton: { minWidth: 80 },
  modalSafeArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    padding: 16,
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
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
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
