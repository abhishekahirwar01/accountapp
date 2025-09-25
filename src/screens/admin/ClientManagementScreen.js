
// ClientManagementScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  FlatList,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Card, Button, Avatar, Switch, Portal, Dialog, Paragraph } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/* -------------------------------- MOCK DATA ------------------------------- */
const MOCK_CLIENTS = [
  {
    _id: 'c1',
    contactName: 'Aarav Sharma',
    clientUsername: 'aarav01',
    email: 'aarav@example.com',
    phone: '+91 98765 43210',
    companyName: 'Sharma Traders',
    slug: 'sharma-traders',
    maxCompanies: 3,
    maxUsers: 8,
    maxInventories: 100,
    canSendInvoiceEmail: true,
    canSendInvoiceWhatsapp: false,
    canCreateUsers: true,
    canCreateCustomers: true,
    canCreateVendors: true,
    canCreateProducts: true,
    canCreateCompanies: false,
    canUpdateCompanies: false,
  },
  {
    _id: 'c2',
    contactName: 'Neha Verma',
    clientUsername: 'nehaV',
    email: 'neha@example.com',
    phone: '+91 99876 54321',
    companyName: 'Verma Foods',
    slug: 'verma-foods',
    maxCompanies: 5,
    maxUsers: 12,
    maxInventories: 250,
    canSendInvoiceEmail: true,
    canSendInvoiceWhatsapp: true,
    canCreateUsers: true,
    canCreateCustomers: true,
    canCreateVendors: true,
    canCreateProducts: true,
    canCreateCompanies: true,
    canUpdateCompanies: true,
  },
];

/* ---------------------------- MAIN SCREEN (RN) ---------------------------- */
const ClientManagementScreen = ({ navigation }) => {
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
  const [clients, setClients] = useState(MOCK_CLIENTS);
  const [filteredClients, setFilteredClients] = useState(MOCK_CLIENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [selectedClient, setSelectedClient] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [permissionsDialogVisible, setPermissionsDialogVisible] = useState(false);
  const [resetPasswordDialogVisible, setResetPasswordDialogVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // ---------- Responsive helpers ----------
  const { width } = useWindowDimensions();
  const isXS = width < 360;
  const isSM = width >= 360 && width < 400;
  const isMD = width >= 400 && width < 600;
  const isLG = width >= 600;

  const numColumns = viewMode === 'card' ? (isLG ? 2 : 1) : 1;
  const avatarSize = isXS ? 32 : isSM ? 36 : 40;
  const baseFont = isXS ? 12 : isSM ? 13 : 14;

  // Filter clients based on search query
  useEffect(() => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const filtered = clients.filter(
        (client) =>
          client.contactName.toLowerCase().includes(q) ||
          client.companyName.toLowerCase().includes(q) ||
          client.email.toLowerCase().includes(q)
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchQuery, clients]);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setModalVisible(true);
  };

  const handleDelete = (client) => {
    setSelectedClient(client);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = () => {
    if (selectedClient) {
      setClients((prev) => prev.filter((c) => c._id !== selectedClient._id));
      setDeleteDialogVisible(false);
      Alert.alert('Success', `Client ${selectedClient.contactName} deleted successfully`);
      setSelectedClient(null);
    }
  };

  const handleResetPassword = (client) => {
    setSelectedClient(client);
    setResetPasswordDialogVisible(true);
  };

  const confirmResetPassword = () => {
    if (newPassword) {
      Alert.alert('Success', `Password reset for ${selectedClient?.contactName}`);
      setResetPasswordDialogVisible(false);
      setNewPassword('');
      setSelectedClient(null);
    }
  };

  const handleManagePermissions = (client) => {
    setSelectedClient(client);
    setPermissionsDialogVisible(true);
  };

  const showClientActions = (client) => {
    Alert.alert(client.contactName, 'Choose an action', [
      {
        text: 'View Details',
        onPress: () => navigation?.navigate?.('ClientDetail', { clientId: client._id }),
      },
      { text: 'Edit Client', onPress: () => handleEdit(client) },
      { text: 'Reset Password', onPress: () => handleResetPassword(client) },
      { text: 'Manage Permissions', onPress: () => handleManagePermissions(client) },
      { text: 'Delete Client', style: 'destructive', onPress: () => handleDelete(client) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  /* ------------------------- Item Renderers (responsive) ------------------------- */
  const ClientCard = ({ client, avatarSize = 40, baseFont = 14 }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Avatar.Text
            size={avatarSize}
            label={client.contactName.split(' ').map((n) => n[0]).join('')}
            style={styles.avatar}
          />
          <View style={styles.cardHeaderText}>
            <Text
              style={[styles.clientName, { fontSize: baseFont + 4 }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {client.contactName}
            </Text>
            <Text
              style={[styles.companyName, { fontSize: baseFont }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {client.companyName}
            </Text>
          </View>
        </View>

        <View style={styles.clientInfo}>
          <View style={styles.infoRow}>
            <Icon name="email" size={14 + (baseFont - 14)} color="#666" />
            <Text style={[styles.infoText, { fontSize: baseFont }]} numberOfLines={1} ellipsizeMode="tail">
              {client.email}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="phone" size={14 + (baseFont - 14)} color="#666" />
            <Text style={[styles.infoText, { fontSize: baseFont }]} numberOfLines={1} ellipsizeMode="tail">
              {client.phone}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="account" size={14 + (baseFont - 14)} color="#666" />
            <Text style={[styles.infoText, { fontSize: baseFont }]} numberOfLines={1} ellipsizeMode="tail">
              {client.clientUsername}
            </Text>
          </View>
        </View>
      </Card.Content>

      <Card.Actions style={styles.cardActions}>
        <Button onPress={() => navigation?.navigate?.('ClientDetail', { clientId: client._id })}>
          View Details
        </Button>
        <Button icon="dots-vertical" onPress={() => showClientActions(client)} />
      </Card.Actions>
    </Card>
  );

  const ClientListItem = ({ client, avatarSize = 40, baseFont = 14 }) => (
    <Card style={styles.listItem}>
      <Card.Content>
        <View style={styles.listItemContent}>
          <Avatar.Text size={avatarSize - 5} label={client.contactName.split(' ').map((n) => n[0]).join('')} />
          <View style={styles.listItemText}>
            <Text style={[styles.listItemName, { fontSize: baseFont + 2 }]} numberOfLines={1} ellipsizeMode="tail">
              {client.contactName}
            </Text>
            <Text style={[styles.listItemCompany, { fontSize: baseFont }]} numberOfLines={1} ellipsizeMode="tail">
              {client.companyName}
            </Text>
            <Text style={[styles.listItemEmail, { fontSize: baseFont - 1 }]} numberOfLines={1} ellipsizeMode="tail">
              {client.email}
            </Text>
          </View>
          <View style={styles.listItemActions}>
            <Button compact onPress={() => navigation?.navigate?.('ClientDetail', { clientId: client._id })}>
              View
            </Button>
            <Button icon="dots-vertical" compact onPress={() => showClientActions(client)} />
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  /* --------------------------------- RENDER --------------------------------- */
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexShrink: 1, paddingRight: 8 }}>
          <Text style={styles.title} numberOfLines={1}>
            Client Management
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            Manage your clients and their accounts
          </Text>
        </View>
        <Button mode="contained" icon="plus" onPress={() => setModalVisible(true)} style={styles.addButton}>
          Add Client
        </Button>
      </View>

      {/* Search + View toggle */}
      <Card style={styles.searchCard}>
        <Card.Content>
          <TextInput
            style={[
              styles.searchInput,
              {
                paddingVertical: Platform.OS === 'ios' ? 10 : 8, // avoid fixed height
                fontSize: baseFont,
              },
            ]}
            placeholder="Search clients..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.viewToggle}>
            <Button
              mode={viewMode === 'card' ? 'contained' : 'outlined'}
              onPress={() => setViewMode('card')}
              compact
            >
              <Icon name="view-grid" size={16} />
            </Button>
            <Button
              mode={viewMode === 'list' ? 'contained' : 'outlined'}
              onPress={() => setViewMode('list')}
              compact
              style={{ marginLeft: 8 }}
            >
              <Icon name="view-list" size={16} />
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Clients */}
      <FlatList
        data={filteredClients}
        key={`${viewMode}-${numColumns}`}
        keyExtractor={(item) => item._id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? { justifyContent: 'space-between' } : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item, index }) =>
          viewMode === 'card' ? (
            <View
              style={[
                { flex: 1, marginVertical: 6 },
                // spacing for single column vs two-column
                numColumns > 1
                  ? { marginRight: index % 2 === 0 ? 6 : 0, marginLeft: index % 2 !== 0 ? 6 : 0 }
                  : { marginHorizontal: 8 },
              ]}
            >
              <ClientCard client={item} avatarSize={avatarSize} baseFont={baseFont} />
            </View>
          ) : (
            <View style={{ marginHorizontal: 8, marginVertical: 6 }}>
              <ClientListItem client={item} avatarSize={avatarSize} baseFont={baseFont} />
            </View>
          )
        }
        contentContainerStyle={[styles.listContainer, { paddingHorizontal: 8, paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
      />

      {/* Add/Edit Client Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedClient ? 'Edit Client' : 'Add New Client'}</Text>
            <Button onPress={() => setModalVisible(false)}>Close</Button>
          </View>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <ClientForm
              client={selectedClient}
              onSubmit={(clientData) => {
                if (selectedClient) {
                  // Update existing client
                  setClients((prev) =>
                    prev.map((c) => (c._id === selectedClient._id ? { ...clientData, _id: selectedClient._id } : c))
                  );
                } else {
                  // Add new client
                  setClients((prev) => [{ ...clientData, _id: Date.now().toString() }, ...prev]);
                }
                setModalVisible(false);
                setSelectedClient(null);
              }}
              baseFont={baseFont}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Confirm Delete</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to delete {selectedClient?.contactName}? This action cannot be undone.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmDelete} textColor="#dc2626">
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Reset Password Dialog */}
      <Portal>
        <Dialog visible={resetPasswordDialogVisible} onDismiss={() => setResetPasswordDialogVisible(false)}>
          <Dialog.Title>Reset Password</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Enter new password for {selectedClient?.contactName}</Paragraph>
            <TextInput
              style={[
                styles.passwordInput,
                { paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontSize: baseFont },
              ]}
              placeholder="New password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setResetPasswordDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmResetPassword}>Reset</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Permissions Dialog */}
      <PermissionsDialog
        visible={permissionsDialogVisible}
        client={selectedClient}
        onDismiss={() => setPermissionsDialogVisible(false)}
        onSave={(permissions) => {
          if (selectedClient) {
            setClients((prev) => prev.map((c) => (c._id === selectedClient._id ? { ...c, ...permissions } : c)));
            setPermissionsDialogVisible(false);
            setSelectedClient(null);
          }
        }}
        baseFont={baseFont}
      />
    </View>
  );
};

/* ---------------------------- CLIENT FORM (RN) ---------------------------- */
const ClientForm = ({ client, onSubmit, baseFont = 14 }) => {
  const [formData, setFormData] = useState({
    contactName: client?.contactName || '',
    clientUsername: client?.clientUsername || '',
    email: client?.email || '',
    phone: client?.phone || '',
    companyName: client?.companyName || '',
    slug: client?.slug || '',
  });

  const handleSubmit = () => {
    if (!formData.contactName || !formData.clientUsername || !formData.email || !formData.companyName) {
      Alert.alert('Validation', 'Please fill all required fields.');
      return;
    }
    onSubmit(formData);
  };

  return (
    <View style={styles.form}>
      <TextInput
        style={[styles.input, { paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: baseFont }]}
        placeholder="Contact Name"
        value={formData.contactName}
        onChangeText={(text) => setFormData({ ...formData, contactName: text })}
      />
      <TextInput
        style={[styles.input, { paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: baseFont }]}
        placeholder="Username"
        value={formData.clientUsername}
        onChangeText={(text) => setFormData({ ...formData, clientUsername: text })}
      />
      <TextInput
        style={[styles.input, { paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: baseFont }]}
        placeholder="Email"
        value={formData.email}
        onChangeText={(text) => setFormData({ ...formData, email: text })}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input, { paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: baseFont }]}
        placeholder="Phone"
        value={formData.phone}
        onChangeText={(text) => setFormData({ ...formData, phone: text })}
        keyboardType="phone-pad"
      />
      <TextInput
        style={[styles.input, { paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: baseFont }]}
        placeholder="Company Name"
        value={formData.companyName}
        onChangeText={(text) => setFormData({ ...formData, companyName: text })}
      />
      <TextInput
        style={[styles.input, { paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: baseFont }]}
        placeholder="Slug"
        value={formData.slug}
        onChangeText={(text) => setFormData({ ...formData, slug: text })}
        autoCapitalize="none"
      />
      <Button mode="contained" onPress={handleSubmit} style={styles.submitButton}>
        {client ? 'Update Client' : 'Add Client'}
      </Button>
    </View>
  );
};

/* ------------------------- PERMISSIONS DIALOG (RN) ------------------------ */
const PermissionsDialog = ({ visible, client, onDismiss, onSave, baseFont = 14 }) => {
  const [permissions, setPermissions] = useState({
    maxCompanies: client?.maxCompanies ?? 3,
    maxUsers: client?.maxUsers ?? 8,
    maxInventories: client?.maxInventories ?? 100,
    canSendInvoiceEmail: client?.canSendInvoiceEmail ?? true,
    canSendInvoiceWhatsapp: client?.canSendInvoiceWhatsapp ?? false,
    canCreateUsers: client?.canCreateUsers ?? true,
    canCreateCustomers: client?.canCreateCustomers ?? true,
    canCreateVendors: client?.canCreateVendors ?? true,
    canCreateProducts: client?.canCreateProducts ?? true,
    canCreateCompanies: client?.canCreateCompanies ?? false,
    canUpdateCompanies: client?.canUpdateCompanies ?? false,
  });

  useEffect(() => {
    if (client) {
      setPermissions({
        maxCompanies: client?.maxCompanies ?? 3,
        maxUsers: client?.maxUsers ?? 8,
        maxInventories: client?.maxInventories ?? 100,
        canSendInvoiceEmail: client?.canSendInvoiceEmail ?? true,
        canSendInvoiceWhatsapp: client?.canSendInvoiceWhatsapp ?? false,
        canCreateUsers: client?.canCreateUsers ?? true,
        canCreateCustomers: client?.canCreateCustomers ?? true,
        canCreateVendors: client?.canCreateVendors ?? true,
        canCreateProducts: client?.canCreateProducts ?? true,
        canCreateCompanies: client?.canCreateCompanies ?? false,
        canUpdateCompanies: client?.canUpdateCompanies ?? false,
      });
    }
  }, [client]);

  const togglePermission = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>Manage Permissions for {client?.contactName}</Dialog.Title>
      <Dialog.ScrollArea>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={styles.sectionTitle}>Usage Limits</Text>
          {[
            { key: 'maxCompanies', label: 'Max Companies' },
            { key: 'maxUsers', label: 'Max Users' },
            { key: 'maxInventories', label: 'Max Inventories' },
          ].map((item) => (
            <View key={item.key} style={styles.limitRow}>
              <Text style={{ fontSize: baseFont }}>{item.label}</Text>
              <TextInput
                style={[
                  styles.numberInput,
                  { paddingVertical: Platform.OS === 'ios' ? 6 : 4, fontSize: baseFont },
                ]}
                value={String(permissions[item.key])}
                onChangeText={(text) =>
                  setPermissions((prev) => ({ ...prev, [item.key]: parseInt(text, 10) || 0 }))
                }
                keyboardType="numeric"
              />
            </View>
          ))}

          <Text style={styles.sectionTitle}>Feature Permissions</Text>
          {[
            { key: 'canCreateUsers', label: 'Create Users' },
            { key: 'canCreateCustomers', label: 'Create Customers' },
            { key: 'canCreateVendors', label: 'Create Vendors' },
            { key: 'canCreateProducts', label: 'Create Products' },
            { key: 'canSendInvoiceEmail', label: 'Send Invoice via Email' },
            { key: 'canSendInvoiceWhatsapp', label: 'Send Invoice via WhatsApp' },
            { key: 'canCreateCompanies', label: 'Create Companies' },
            { key: 'canUpdateCompanies', label: 'Update Companies' },
          ].map((item) => (
            <View key={item.key} style={styles.switchRow}>
              <Text style={{ fontSize: baseFont }}>{item.label}</Text>
              <Switch value={permissions[item.key]} onValueChange={() => togglePermission(item.key)} />
            </View>
          ))}
        </ScrollView>
      </Dialog.ScrollArea>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button onPress={() => onSave(permissions)}>Save</Button>
      </Dialog.Actions>
    </Dialog>
  );
};

/* --------------------------------- STYLES --------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    marginLeft: 10,
  },

  searchCard: {
    margin: 16,
    marginBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  viewToggle: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  listContainer: {
    paddingTop: 8,
  },

  card: {
    // margin is applied by wrapper for grid spacing
    borderRadius: 12,
  },
  listItem: {
    borderRadius: 12,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  clientName: {
    fontWeight: 'bold',
  },
  companyName: {
    color: '#666',
  },

  clientInfo: {
    // replaced 'gap' with margins on rows
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: '#666',
    marginLeft: 8,
  },

  cardActions: {
    justifyContent: 'flex-end',
  },

  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemText: {
    flex: 1,
    marginLeft: 12,
  },
  listItemName: {
    fontWeight: 'bold',
  },
  listItemCompany: {
    color: '#666',
  },
  listItemEmail: {
    color: '#999',
  },
  listItemActions: {
    flexDirection: 'row',
    // no gap; add margin to buttons if needed
  },

  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },

  form: {
    // gap removed; rely on margins
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 4,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  numberInput: {
    width: 72,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
});

export default ClientManagementScreen;
