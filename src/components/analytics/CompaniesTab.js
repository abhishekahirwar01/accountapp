// CompaniesTab.js
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
  ActivityIndicator,
} from 'react-native';
import { 
  Loader2, 
  Phone, 
  Hash, 
  FileText, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Mail, 
  PlusCircle,
  X
} from 'lucide-react-native';
import AdminCompanyForm from '../companies/AdminCompanyForm';

// Hardcoded data for demonstration
const HARDCODED_COMPANIES = [
  {
    _id: '1',
    businessName: 'Tech Solutions Pvt Ltd',
    businessType: 'Private Limited Company',
    registrationNumber: 'U72900MH2023PTC123456',
    mobileNumber: '9876543210',
    emailId: 'contact@techsolutions.com',
    gstin: '27AABCU9603R1ZM',
    address: '123 Business Tower, Mumbai',
    City: 'Mumbai',
    addressState: 'Maharashtra',
    Country: 'India',
    Pincode: '400001',
    Telephone: '022-12345678',
    Website: 'www.techsolutions.com',
    PANNumber: 'AABCU9603R',
    logo: 'https://via.placeholder.com/150'
  },
  {
    _id: '2',
    businessName: 'Global Traders',
    businessType: 'Partnership',
    registrationNumber: 'PART2023MH12345',
    mobileNumber: '9876543211',
    emailId: 'info@globaltraders.com',
    gstin: '27AABCT4321M1Z2',
    address: '456 Trade Center, Delhi',
    City: 'New Delhi',
    addressState: 'Delhi',
    Country: 'India',
    Pincode: '110001',
    Telephone: '011-87654321',
    Website: 'www.globaltraders.com',
    PANNumber: 'AABCT4321M',
    logo: null
  }
];

const HARDCODED_CLIENTS = [
  {
    _id: 'client1',
    contactName: 'Rahul Sharma',
    email: 'rahul@example.com',
    phone: '9876543210'
  },
  {
    _id: 'client2', 
    contactName: 'Priya Patel',
    email: 'priya@example.com',
    phone: '9876543211'
  }
];

export function CompaniesTab({ selectedClientId, selectedClient }) {
  const [companies, setCompanies] = useState([]);
  const [clients, setClients] = useState([]);
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(null);

  const fetchCompaniesAndClients = async (clientId) => {
    if (!clientId) return;
    setIsCompaniesLoading(true);
    
    // Simulate API call with hardcoded data
    setTimeout(() => {
      setCompanies(HARDCODED_COMPANIES);
      setClients(HARDCODED_CLIENTS);
      setIsCompaniesLoading(false);
      setRefreshing(false);
    }, 1000);
  };

  useEffect(() => {
    fetchCompaniesAndClients(selectedClientId);
  }, [selectedClientId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompaniesAndClients(selectedClientId);
  };

  const handleAddNew = () => {
    setSelectedCompany(null);
    setIsFormOpen(true);
  };

  const handleEdit = (company) => {
    setSelectedCompany(company);
    setIsFormOpen(true);
    setShowActionsMenu(null);
  };

  const handleDelete = (company) => {
    setCompanyToDelete(company);
    setIsAlertOpen(true);
    setShowActionsMenu(null);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;
    
    // Simulate delete operation
    setTimeout(() => {
      setCompanies(prev => prev.filter(comp => comp._id !== companyToDelete._id));
      Alert.alert(
        'Success', 
        `${companyToDelete.businessName} has been successfully deleted.`
      );
      setIsAlertOpen(false);
      setCompanyToDelete(null);
    }, 500);
  };

  const onFormSubmit = (newCompanyData = null) => {
    setIsFormOpen(false);
    
    if (newCompanyData) {
      if (selectedCompany) {
        // Update existing company
        setCompanies(prev => 
          prev.map(comp => 
            comp._id === selectedCompany._id 
              ? { ...comp, ...newCompanyData }
              : comp
          )
        );
        Alert.alert('Success', 'Company updated successfully!');
      } else {
        // Add new company
        const newCompany = {
          ...newCompanyData,
          _id: `comp_${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        setCompanies(prev => [...prev, newCompany]);
        Alert.alert('Success', 'Company created successfully!');
      }
    }
    
    setSelectedCompany(null);
  };

  const renderCompanyCard = (company) => (
    <View key={company._id} style={styles.companyCard}>
      {/* Header Section */}
      <View style={styles.cardHeader}>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{company.businessName}</Text>
          <Text style={styles.businessType}>{company.businessType}</Text>
        </View>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowActionsMenu(showActionsMenu === company._id ? null : company._id)}
        >
          <MoreHorizontal size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Actions Menu */}
      {showActionsMenu === company._id && (
        <View style={styles.actionsMenu}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => handleEdit(company)}
          >
            <Edit size={16} color="#3b82f6" />
            <Text style={styles.menuText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => handleDelete(company)}
          >
            <Trash2 size={16} color="#ef4444" />
            <Text style={[styles.menuText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Contact Information */}
      <View style={styles.contactSection}>
        <View style={styles.contactItem}>
          <View style={styles.contactLabel}>
            <Phone size={16} color="#666" />
            <Text style={styles.labelText}>Phone:</Text>
          </View>
          <Text style={styles.contactValue}>{company.mobileNumber}</Text>
        </View>
        
        <View style={styles.contactItem}>
          <View style={styles.contactLabel}>
            <Mail size={16} color="#666" />
            <Text style={styles.labelText}>Email:</Text>
          </View>
          <Text style={styles.contactValue} numberOfLines={1}>
            {company.emailId || 'N/A'}
          </Text>
        </View>
      </View>

      {/* Identifiers */}
      <View style={styles.identifiersSection}>
        <View style={styles.identifierItem}>
          <View style={styles.identifierLabel}>
            <Hash size={16} color="#666" />
            <Text style={styles.labelText}>Reg No:</Text>
          </View>
          <View style={[styles.tag, styles.blueTag]}>
            <Text style={styles.tagText}>{company.registrationNumber}</Text>
          </View>
        </View>
        
        <View style={styles.identifierItem}>
          <View style={styles.identifierLabel}>
            <FileText size={16} color="#666" />
            <Text style={styles.labelText}>GSTIN:</Text>
          </View>
          <View style={[styles.tag, styles.greenTag]}>
            <Text style={styles.tagText}>{company.gstin || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(company)}
        >
          <Edit size={16} color="#3b82f6" />
          <Text style={[styles.actionText, styles.editText]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(company)}
        >
          <Trash2 size={16} color="#ef4444" />
          <Text style={[styles.actionText, styles.deleteActionText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Companies</Text>
            <Text style={styles.description}>
              Companies managed by {selectedClient?.contactName || 'Client'}.
            </Text>
          </View>
          <TouchableOpacity style={styles.createButton} onPress={handleAddNew}>
            <PlusCircle size={20} color="#fff" />
            <Text style={styles.createButtonText}>Create Company</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
      >
        {isCompaniesLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading companies...</Text>
          </View>
        ) : companies.length > 0 ? (
          <View style={styles.companiesList}>
            {companies.map(renderCompanyCard)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No companies found for this client.</Text>
          </View>
        )}
        
        {/* Spacer for bottom padding */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Company Form Modal */}
      <Modal
        visible={isFormOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsFormOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {selectedCompany ? "Edit Company" : "Create New Company"}
              </Text>
              <Text style={styles.modalDescription}>
                {selectedCompany
                  ? `Update the details for ${selectedCompany.businessName}.`
                  : `Fill in the form to create a new company for ${selectedClient?.contactName || 'the client'}.`}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setIsFormOpen(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <AdminCompanyForm
            company={selectedCompany || undefined}
            clients={clients}
            onFormSubmit={onFormSubmit}
            onClose={() => {
              setIsFormOpen(false);
              setSelectedCompany(null);
            }}
          />
        </View>
      </Modal>

      {/* Delete Confirmation Alert */}
      <Modal
        visible={isAlertOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAlertOpen(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Are you absolutely sure?</Text>
            <Text style={styles.alertDescription}>
              This action cannot be undone. This will permanently delete the
              company and all associated data for {companyToDelete?.businessName}.
            </Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity 
                style={[styles.alertButton, styles.cancelButton]}
                onPress={() => setIsAlertOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.alertButton, styles.confirmButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  companiesList: {
    padding: 16,
    gap: 16,
  },
  companyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  businessType: {
    fontSize: 14,
    color: '#6b7280',
  },
  menuButton: {
    padding: 4,
  },
  actionsMenu: {
    position: 'absolute',
    top: 40,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuText: {
    fontSize: 14,
    color: '#374151',
  },
  deleteText: {
    color: '#ef4444',
  },
  contactSection: {
    gap: 8,
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 80,
  },
  labelText: {
    fontSize: 14,
    color: '#6b7280',
  },
  contactValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
  },
  identifiersSection: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  identifierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  identifierLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 80,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  blueTag: {
    backgroundColor: '#dbeafe',
  },
  greenTag: {
    backgroundColor: '#dcfce7',
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  editButton: {
    borderColor: '#3b82f6',
    backgroundColor: '#fff',
  },
  deleteButton: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  editText: {
    color: '#3b82f6',
  },
  deleteActionText: {
    color: '#ef4444',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  spacer: {
    height: 20,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  // Alert Styles
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
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  alertDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  alertButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  confirmButton: {
    backgroundColor: '#ef4444',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default CompaniesTab;