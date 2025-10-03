import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  RefreshControl,
} from 'react-native';
import { Card } from 'react-native-paper';
import CustomerForm from '../customers/CustomerForm'; // Make sure CustomerForm is default export

// Hardcoded customer data for demo
const HARDCODED_CUSTOMERS = [
  {
    _id: '1',
    name: 'John Doe',
    contactNumber: '9876543210',
    email: 'john.doe@example.com',
    address: '456 Park Avenue',
    city: 'Mumbai',
    state: 'Maharashtra',
    gstin: '27ABCDE1234F1Z5',
    gstRegistrationType: 'Regular',
    pan: 'ABCDE1234F',
    isTDSApplicable: false,
    tdsRate: 0,
    tdsSection: '',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    _id: '2',
    name: 'Jane Smith',
    contactNumber: '9876543211',
    email: 'jane.smith@example.com',
    address: '789 Oak Street',
    city: 'Bangalore',
    state: 'Karnataka',
    gstin: '29XYZDE5678G2H6',
    gstRegistrationType: 'Regular',
    pan: 'XYZDE5678G',
    isTDSApplicable: true,
    tdsRate: 10,
    tdsSection: '194J',
    createdAt: '2024-01-16T11:30:00Z',
    updatedAt: '2024-01-16T11:30:00Z',
  },
  {
    _id: '3',
    name: 'Raj Kumar',
    contactNumber: '9876543212',
    email: 'raj.kumar@example.com',
    address: '321 Gandhi Road',
    city: 'Delhi',
    state: 'Delhi',
    gstin: '',
    gstRegistrationType: 'Unregistered',
    pan: 'FGHIJ6789K',
    isTDSApplicable: false,
    tdsRate: 0,
    tdsSection: '',
    createdAt: '2024-01-17T12:30:00Z',
    updatedAt: '2024-01-17T12:30:00Z',
  },
];

function CustomerSettings() {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = () => {
    setIsLoading(true);
    setTimeout(() => {
      setCustomers(HARDCODED_CUSTOMERS);
      setIsLoading(false);
      setRefreshing(false);
    }, 1000);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  const handleOpenForm = (customer = null) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = (customer) => {
    setCustomerToDelete(customer);
    setIsAlertOpen(true);
  };

  const handleFormSuccess = (customer) => {
    setIsFormOpen(false);
    if (selectedCustomer) {
      setCustomers(prev => prev.map(c => c._id === customer._id ? customer : c));
    } else {
      setCustomers(prev => [...prev, customer]);
    }
    Alert.alert(
      'Success',
      selectedCustomer ? 'Customer updated successfully!' : 'Customer created successfully!'
    );
  };

  const handleDeleteCustomer = () => {
    if (!customerToDelete) return;
    setCustomers(prev => prev.filter(c => c._id !== customerToDelete._id));
    setIsAlertOpen(false);
    setCustomerToDelete(null);
    Alert.alert('Success', 'Customer deleted successfully!');
  };

  const renderCustomerCard = (customer) => (
    <Card key={customer._id} style={styles.customerCard}>
      <Card.Content>
        <View style={styles.section}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactText}>{customer.contactNumber || 'N/A'}</Text>
            {customer.email ? <Text style={styles.contactText}>{customer.email}</Text> : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Address</Text>
          <Text style={styles.addressText}>{customer.address}</Text>
          <Text style={styles.cityText}>{customer.city}, {customer.state}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>GST/PAN Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>GSTIN:</Text>
            <Text style={styles.detailValue}>{customer.gstin || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>PAN:</Text>
            <Text style={styles.detailValue}>{customer.pan || 'N/A'}</Text>
          </View>
          <View style={styles.registrationType}>
            <Text style={styles.registrationText}>{customer.gstRegistrationType}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TDS</Text>
          <View style={styles.tdsRow}>
            <View style={[
              styles.tdsIndicator,
              customer.isTDSApplicable ? styles.tdsActive : styles.tdsInactive
            ]}>
              <Text style={styles.tdsIndicatorText}>
                {customer.isTDSApplicable ? '✓' : '✗'}
              </Text>
            </View>
            {customer.isTDSApplicable && (
              <Text style={styles.tdsSection}>
                {customer.tdsSection} ({customer.tdsRate}%)
              </Text>
            )}
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleOpenForm(customer)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleOpenDeleteDialog(customer)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Manage Customers</Text>
          <Text style={styles.subtitle}>A list of all your customers</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleOpenForm()}
        >
          <Text style={styles.addButtonText}>Add Customer</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {customers.length > 0 ? (
          customers.map(renderCustomerCard)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Customers Found</Text>
            <Text style={styles.emptyStateText}>Get started by adding your first customer</Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => handleOpenForm()}
            >
              <Text style={styles.emptyStateButtonText}>Add Customer</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Customer Form Modal */}
      <Modal
        visible={isFormOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsFormOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedCustomer ? 'Edit Customer' : 'Create New Customer'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsFormOpen(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <CustomerForm
            customer={selectedCustomer || undefined}
            onSuccess={handleFormSuccess}
          />
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={isAlertOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAlertOpen(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Are you absolutely sure?</Text>
            <Text style={styles.alertMessage}>
              This action cannot be undone. This will permanently delete the customer.
            </Text>
            <View style={styles.alertActions}>
              <TouchableOpacity
                style={[styles.alertButton, styles.cancelButton]}
                onPress={() => setIsAlertOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertButton, styles.confirmButton]}
                onPress={handleDeleteCustomer}
              >
                <Text style={styles.confirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default CustomerSettings;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  customerCard: {
    margin: 8,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  section: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  contactInfo: {
    marginTop: 4,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
  },
  cityText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 60,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontFamily: 'monospace',
  },
  registrationType: {
    marginTop: 4,
  },
  registrationText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#f0f8ff',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  tdsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tdsIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  tdsActive: {
    backgroundColor: '#d4edda',
  },
  tdsInactive: {
    backgroundColor: '#f8d7da',
  },
  tdsIndicatorText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  tdsSection: {
    fontSize: 14,
    color: '#333',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButtonText: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  alertButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#6c757d',
  },
  confirmButton: {
    backgroundColor: '#dc3545',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});