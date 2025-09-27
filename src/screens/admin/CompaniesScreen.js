import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  RefreshControl,
  TextInput as RNTextInput,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Card, Button, Dialog, Portal, Provider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const HARDCODED_COMPANIES = [
  {
    _id: '1',
    businessName: 'Tech Solutions Inc',
    businessType: 'Technology',
    registrationNumber: 'REG123456',
    gstin: 'GSTIN123456',
    mobileNumber: '+1-555-0123',
    selectedClient: {
      _id: 'c1',
      contactName: 'John Smith',
      email: 'john@email.com',
    },
  },
  {
    _id: '2',
    businessName: 'Green Energy Ltd',
    businessType: 'Energy',
    registrationNumber: 'REG789012',
    gstin: 'GSTIN789012',
    mobileNumber: '+1-555-0456',
    selectedClient: {
      _id: 'c2',
      contactName: 'Sarah Johnson',
      email: 'sarah@email.com',
    },
  },
  {
    _id: '3',
    businessName: 'TableTech Corp',
    businessType: 'Technology',
    registrationNumber: 'REG345678',
    gstin: 'GSTIN345678',
    mobileNumber: '+1-555-0789',
    selectedClient: {
      _id: 'c3',
      contactName: 'Mike Wilson',
      email: 'mike@email.com',
    },
  },
];

const HARDCODED_CLIENTS = [
  { _id: 'c1', contactName: 'John Smith', email: 'john@email.com' },
  { _id: 'c2', contactName: 'Sarah Johnson', email: 'sarah@email.com' },
  { _id: 'c3', contactName: 'Mike Wilson', email: 'mike@email.com' },
  { _id: 'c4', contactName: 'Emily Davis', email: 'emily@email.com' },
];

export default function CompaniesScreen() {
  const [companies, setCompanies] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // simulate API
      setCompanies(HARDCODED_COMPANIES);
      setClients(HARDCODED_CLIENTS);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleAddNew = () => {
    setSelectedCompany(null);
    setIsDialogOpen(true);
  };

  const handleEdit = company => {
    setSelectedCompany(company);
    setIsDialogOpen(true);
  };

  const handleDelete = company => {
    setCompanyToDelete(company);
    setIsAlertOpen(true);
  };

  const confirmDelete = () => {
    if (!companyToDelete) return;
    setCompanies(prev => prev.filter(c => c._id !== companyToDelete._id));
    Alert.alert('Success', `${companyToDelete.businessName} has been deleted.`);
    setIsAlertOpen(false);
    setCompanyToDelete(null);
  };

  const onFormSubmit = companyData => {
    if (selectedCompany) {
      setCompanies(prev =>
        prev.map(c => (c._id === selectedCompany._id ? { ...c, ...companyData } : c))
      );
    } else {
      const newCompany = { ...companyData, _id: Date.now().toString() };
      setCompanies(prev => [...prev, newCompany]);
    }
    setIsDialogOpen(false);
  };

  const getClientInfo = clientIdentifier => {
    if (!clientIdentifier) return { name: 'N/A', email: 'N/A' };
    if (typeof clientIdentifier === 'object' && clientIdentifier.contactName) {
      return { name: clientIdentifier.contactName, email: clientIdentifier.email || 'N/A' };
    }
    const clientId = clientIdentifier._id || clientIdentifier;
    const client = clients.find(c => String(c._id) === String(clientId));
    return { name: client?.contactName || 'N/A', email: client?.email || 'N/A' };
  };

  const renderCompanyCard = ({ item: company }) => {
    const clientInfo = getClientInfo(company.selectedClient || company.client);
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitle}>
              <Icon name="office-building" size={20} color="#3f51b5" />
              <Text style={styles.companyName} numberOfLines={1}>{company.businessName}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleEdit(company)}
              >
                <Icon name="pencil" size={18} color="#3f51b5" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleDelete(company)}
              >
                <Icon name="delete" size={18} color="#ff4444" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.businessType}>{company.businessType}</Text>
          <View style={styles.cardInfo}>
            <View style={styles.infoRow}>
              <Icon name="account" size={16} color="#666" />
              <Text style={styles.infoText} numberOfLines={1}>{clientInfo.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Icon name="phone" size={16} color="#666" />
              <Text style={styles.infoText} numberOfLines={1}>{company.mobileNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Icon name="identifier" size={16} color="#666" />
              <Text style={styles.infoText} numberOfLines={1}>{company.registrationNumber}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="loading" size={32} color="#3f51b5" />
        <Text style={styles.loadingText}>Loading companies...</Text>
      </View>
    );
  }

  return (
    <Provider>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Company Management</Text>
            <Text style={styles.subtitle}>Manage all companies across all clients.</Text>
          </View>
          <Button
            mode="contained"
            onPress={handleAddNew}
            style={styles.addButton}
            contentStyle={styles.addButtonContent}
            labelStyle={styles.addButtonLabel}
            icon="plus"
          >
            Create Company
          </Button>
        </View>

        {/* Companies List */}
        {companies.length > 0 ? (
          <FlatList
            data={companies}
            renderItem={renderCompanyCard}
            keyExtractor={item => item._id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Card style={styles.emptyState}>
              <Card.Content style={styles.emptyContent}>
                <Icon name="office-building" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Companies Found</Text>
                <Text style={styles.emptyDescription}>
                  Get started by creating the first company.
                </Text>
                <Button 
                  mode="contained" 
                  onPress={handleAddNew} 
                  style={styles.emptyButton}
                  contentStyle={styles.emptyButtonContent}
                >
                  Create Company
                </Button>
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Company Form Dialog */}
        <Portal>
          <Dialog
            visible={isDialogOpen}
            onDismiss={() => setIsDialogOpen(false)}
            style={styles.dialog}
          >
            <Dialog.Title style={styles.dialogTitle}>
              {selectedCompany ? 'Edit Company' : 'Create New Company'}
            </Dialog.Title>
            <Dialog.ScrollArea style={styles.dialogScrollArea}>
              <ScrollView 
                contentContainerStyle={styles.dialogContent}
                showsVerticalScrollIndicator={false}
              >
                <CompanyForm
                  company={selectedCompany}
                  clients={clients}
                  onFormSubmit={onFormSubmit}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </ScrollView>
            </Dialog.ScrollArea>
          </Dialog>
        </Portal>

        {/* Delete Confirmation Dialog */}
        <Portal>
          <Dialog visible={isAlertOpen} onDismiss={() => setIsAlertOpen(false)} style={styles.alertDialog}>
            <Dialog.Title style={styles.alertTitle}>Are you absolutely sure?</Dialog.Title>
            <Dialog.Content>
              <Text style={styles.alertText}>
                This will permanently delete {companyToDelete?.businessName}. This action cannot be undone.
              </Text>
            </Dialog.Content>
            <Dialog.Actions style={styles.alertActions}>
              <Button onPress={() => setIsAlertOpen(false)} style={styles.alertButton}>
                Cancel
              </Button>
              <Button onPress={confirmDelete} textColor="#ff4444" style={styles.alertButton}>
                Delete
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </KeyboardAvoidingView>
    </Provider>
  );
}

// Company Form Component
function CompanyForm({ company, clients, onFormSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    businessName: company?.businessName || '',
    businessType: company?.businessType || '',
    registrationNumber: company?.registrationNumber || '',
    gstin: company?.gstin || '',
    mobileNumber: company?.mobileNumber || '',
    selectedClient: company?.selectedClient?._id || '',
  });

  const handleSubmit = () => {
    if (!formData.businessName.trim()) {
      Alert.alert('Error', 'Business name is required');
      return;
    }
    if (!formData.selectedClient) {
      Alert.alert('Error', 'Please select a client');
      return;
    }
    onFormSubmit(formData);
  };

  return (
    <View style={styles.form}>
      <LabeledInput
        label="Business Name *"
        value={formData.businessName}
        onChangeText={text => setFormData(prev => ({ ...prev, businessName: text }))}
        placeholder="Enter business name"
      />
      <LabeledInput
        label="Business Type"
        value={formData.businessType}
        onChangeText={text => setFormData(prev => ({ ...prev, businessType: text }))}
        placeholder="e.g., Technology, Retail, etc."
      />
      <LabeledInput
        label="Registration Number"
        value={formData.registrationNumber}
        onChangeText={text => setFormData(prev => ({ ...prev, registrationNumber: text }))}
        placeholder="Enter registration number"
      />
      <LabeledInput
        label="GSTIN"
        value={formData.gstin}
        onChangeText={text => setFormData(prev => ({ ...prev, gstin: text }))}
        placeholder="Enter GSTIN number"
      />
      <LabeledInput
        label="Mobile Number"
        value={formData.mobileNumber}
        onChangeText={text => setFormData(prev => ({ ...prev, mobileNumber: text }))}
        placeholder="Enter mobile number"
        keyboardType="phone-pad"
      />

      <Text style={styles.inputLabel}>Select Client *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.selectedClient}
          onValueChange={value => setFormData(prev => ({ ...prev, selectedClient: value }))}
          style={styles.picker}
        >
          <Picker.Item label="-- Select Client --" value="" />
          {clients.map(client => (
            <Picker.Item key={client._id} label={client.contactName} value={client._id} />
          ))}
        </Picker>
      </View>

      <View style={styles.formActions}>
        <Button 
          mode="outlined" 
          onPress={onCancel} 
          style={styles.cancelButton}
          contentStyle={styles.buttonContent}
        >
          Cancel
        </Button>
        <Button 
          mode="contained" 
          onPress={handleSubmit} 
          style={styles.submitButton}
          contentStyle={styles.buttonContent}
        >
          {company ? 'Update' : 'Create'} Company
        </Button>
      </View>
    </View>
  );
}

// Custom Labeled Input
function LabeledInput({ label, value, onChangeText, placeholder, keyboardType = 'default' }) {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor="#999"
        keyboardType={keyboardType}
      />
    </View>
  );
}

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isLargeScreen = width > 768;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  header: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isSmallScreen ? 'flex-start' : 'center',
    padding: isSmallScreen ? 12 : 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: { 
    flex: isSmallScreen ? 0 : 1, 
    paddingRight: isSmallScreen ? 0 : 16,
    marginBottom: isSmallScreen ? 12 : 0
  },
  title: { 
    fontSize: isSmallScreen ? 20 : 24, 
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  subtitle: { 
    fontSize: isSmallScreen ? 13 : 14, 
    color: '#666', 
    marginTop: 4 
  },
  addButton: {
    minWidth: isSmallScreen ? '100%' : 150,
    borderRadius: 8,
    backgroundColor: '#3f51b5'
  },
  addButtonContent: {
    paddingVertical: 6,
    paddingHorizontal: 12
  },
  addButtonLabel: {
    fontSize: 14,
    fontWeight: '600'
  },
  listContent: {
    padding: isSmallScreen ? 12 : 16,
    paddingBottom: 100
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    backgroundColor: '#fff'
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 8 
  },
  cardTitle: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    flex: 1,
    marginRight: 8
  },
  companyName: { 
    fontSize: isSmallScreen ? 16 : 18, 
    fontWeight: 'bold', 
    color: '#2c3e50',
    flex: 1
  },
  cardActions: { 
    flexDirection: 'row', 
    gap: 8 
  },
  actionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f8f9fa'
  },
  businessType: { 
    color: '#666', 
    marginBottom: 12,
    fontSize: 14,
    fontStyle: 'italic'
  },
  cardInfo: { 
    gap: 10 
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10 
  },
  infoText: { 
    fontSize: 14, 
    color: '#333',
    flex: 1
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyState: { 
    width: isSmallScreen ? '100%' : '80%',
    maxWidth: 400,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#fff'
  },
  emptyContent: { 
    alignItems: 'center', 
    padding: 32 
  },
  emptyTitle: { 
    fontSize: isSmallScreen ? 18 : 20, 
    fontWeight: 'bold', 
    marginTop: 16,
    color: '#2c3e50'
  },
  emptyDescription: { 
    textAlign: 'center', 
    color: '#666', 
    marginVertical: 8,
    fontSize: 14,
    lineHeight: 20
  },
  emptyButton: { 
    marginTop: 16,
    backgroundColor: '#3f51b5',
    borderRadius: 8
  },
  emptyButtonContent: {
    paddingHorizontal: 20
  },
  dialog: {
    maxHeight: '85%',
    width: isSmallScreen ? '95%' : isLargeScreen ? '70%' : '85%',
    alignSelf: 'center',
    borderRadius: 12
  },
  dialogTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  dialogScrollArea: {
    paddingHorizontal: 0,
    maxHeight: height * 0.6
  },
  dialogContent: {
    paddingHorizontal: 24,
    paddingBottom: 20
  },
  alertDialog: {
    width: isSmallScreen ? '90%' : 400,
    alignSelf: 'center',
    borderRadius: 12
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  alertText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666'
  },
  alertActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  alertButton: {
    minWidth: 80
  },
  form: { 
    gap: 16 
  },
  inputContainer: { 
    marginBottom: 4 
  },
  inputLabel: { 
    fontSize: 14, 
    color: '#333', 
    marginBottom: 6,
    fontWeight: '600'
  },
  textInput: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    padding: isSmallScreen ? 12 : 14, 
    fontSize: 16, 
    color: '#333',
    backgroundColor: '#fff'
  },
  pickerContainer: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    overflow: 'hidden',
    backgroundColor: '#fff'
  },
  picker: {
    height: isSmallScreen ? 50 : 55
  },
  formActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: 12, 
    marginTop: 20,
    flexWrap: 'wrap'
  },
  cancelButton: {
    borderColor: '#6c757d',
    borderWidth: 1,
    borderRadius: 8
  },
  submitButton: {
    backgroundColor: '#3f51b5',
    borderRadius: 8
  },
  buttonContent: {
    paddingVertical: 6,
    paddingHorizontal: 16
  }
});