import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  PlusCircle, 
  Building, 
  Check, 
  X, 
  FileText, 
  Hash,
  Phone, 
  Mail, 
  MapPin, 
  Percent 
} from 'lucide-react-native';
import VendorForm from '../vendors/VendorForm';

// Hardcoded data
const HARDCODED_VENDORS = [
  {
    _id: '1',
    vendorName: 'ABC Suppliers',
    contactNumber: '+91-9876543210',
    email: 'contact@abcsuppliers.com',
    address: '123 Business Street, Industrial Area',
    city: 'Mumbai',
    state: 'Maharashtra',
    gstin: '27ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    gstRegistrationType: 'Regular',
    isTDSApplicable: true,
    tdsSection: '194C',
    tdsRate: 10
  },
  {
    _id: '2',
    vendorName: 'XYZ Traders',
    contactNumber: '+91-8765432109',
    email: 'info@xyztraders.com',
    address: '456 Trade Center, Commercial Complex',
    city: 'Delhi',
    state: 'Delhi',
    gstin: '07FGHIJ5678G2Z6',
    pan: 'FGHIJ5678G',
    gstRegistrationType: 'Composition',
    isTDSApplicable: false,
    tdsSection: '',
    tdsRate: 0
  },
  {
    _id: '3',
    vendorName: 'Global Imports Ltd',
    contactNumber: '+91-7654321098',
    email: 'sales@globalimports.com',
    address: '789 International Plaza',
    city: 'Bangalore',
    state: 'Karnataka',
    gstin: '29KLMNO9012H3Z7',
    pan: 'KLMNO9012H',
    gstRegistrationType: 'Regular',
    isTDSApplicable: true,
    tdsSection: '194I',
    tdsRate: 5
  }
];

const HARDCODED_COMPANIES = [
  {
    id: '1',
    name: 'My Company Pvt Ltd'
  }
];

const VendorSettings = () => {
  const [vendors, setVendors] = useState(HARDCODED_VENDORS);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [companies, setCompanies] = useState(HARDCODED_COMPANIES);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [expandedVendorId, setExpandedVendorId] = useState(null);

  // Mock permission checks
  const canShowVendors = true;
  const canCreateVendors = true;

  const handleOpenForm = (vendor = null) => {
    setSelectedVendor(vendor);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = (vendor) => {
    setVendorToDelete(vendor);
    setIsAlertOpen(true);
  };

  const handleFormSuccess = (vendorData) => {
    setIsFormOpen(false);
    
    if (selectedVendor) {
      // Update existing vendor
      setVendors(prevVendors => 
        prevVendors.map(v => 
          v._id === selectedVendor._id 
            ? { ...v, ...vendorData, updatedAt: new Date().toISOString() }
            : v
        )
      );
    } else {
      // Add new vendor
      const newVendor = {
        _id: `vendor-${Date.now()}`,
        ...vendorData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setVendors(prevVendors => [...prevVendors, newVendor]);
    }
    
    const action = selectedVendor ? 'updated' : 'created';
    Alert.alert(
      `Vendor ${action} successfully`,
      `The vendor details have been ${action}.`
    );
    
    setSelectedVendor(null);
  };

  const handleDeleteVendor = () => {
    if (!vendorToDelete) return;
    
    setVendors(prevVendors => 
      prevVendors.filter(vendor => vendor._id !== vendorToDelete._id)
    );
    
    Alert.alert(
      'Vendor Deleted',
      'The vendor has been successfully removed.'
    );
    
    setIsAlertOpen(false);
    setVendorToDelete(null);
  };

  const toggleVendorExpansion = (vendorId) => {
    setExpandedVendorId(expandedVendorId === vendorId ? null : vendorId);
  };

  if (companies.length === 0) {
    return (
      <View style={styles.noCompanyContainer}>
        <View style={styles.noCompanyCard}>
          <View style={styles.iconContainer}>
            <Building size={32} color="#2563eb" />
          </View>
          
          <Text style={styles.noCompanyTitle}>Company Setup Required</Text>
          <Text style={styles.noCompanyDescription}>
            Contact us to enable your company account and access all features.
          </Text>
          
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.primaryButton}>
              <Phone size={20} color="white" />
              <Text style={styles.primaryButtonText}>+91-8989773689</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton}>
              <Mail size={20} color="#2563eb" />
              <Text style={styles.secondaryButtonText}>Email Us</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerContent}>
            <Text style={styles.cardTitle}>Manage Vendors</Text>
            <Text style={styles.cardDescription}>
              A list of all your vendors and suppliers.
            </Text>
          </View>
          
          {canCreateVendors && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => handleOpenForm()}
            >
              <PlusCircle size={20} color="white" />
              <Text style={styles.addButtonText}>Add Vendor</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text>Loading...</Text>
            </View>
          ) : !canShowVendors && !canCreateVendors ? (
            <View style={styles.noPermissionContainer}>
              <Building size={48} color="#6b7280" />
              <Text style={styles.noPermissionTitle}>Access Restricted</Text>
              <Text style={styles.noPermissionText}>
                You don't have permission to view or manage vendors.
              </Text>
            </View>
          ) : vendors.length > 0 && canShowVendors ? (
            <ScrollView style={styles.vendorsList}>
              {vendors.map((vendor) => (
                <View key={vendor._id} style={styles.vendorCard}>
                  {/* Header */}
                  <View style={styles.vendorHeader}>
                    <View style={styles.vendorInfo}>
                      <Text style={styles.vendorName}>{vendor.vendorName}</Text>
                      <View style={styles.badgeContainer}>
                        <View style={styles.typeBadge}>
                          <Text style={styles.badgeText}>
                            {vendor.gstRegistrationType}
                          </Text>
                        </View>
                        <View style={[
                          styles.tdsBadge,
                          vendor.isTDSApplicable ? styles.tdsApplicable : styles.tdsNotApplicable
                        ]}>
                          {vendor.isTDSApplicable ? (
                            <Check size={12} color="white" />
                          ) : (
                            <X size={12} color="white" />
                          )}
                          <Text style={styles.tdsBadgeText}>
                            TDS {vendor.isTDSApplicable ? 'Applicable' : 'Not Applicable'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.menuButton}
                      onPress={() => {
                        Alert.alert(
                          'Actions',
                          'Choose an action',
                          [
                            {
                              text: 'Edit',
                              onPress: () => handleOpenForm(vendor)
                            },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => handleOpenDeleteDialog(vendor)
                            },
                            {
                              text: 'Cancel',
                              style: 'cancel'
                            }
                          ]
                        );
                      }}
                    >
                      <MoreHorizontal size={20} color="#6b7280" />
                    </TouchableOpacity>
                  </View>

                  {/* Contact Information */}
                  <View style={styles.contactSection}>
                    {(vendor.contactNumber || vendor.email) && (
                      <View style={styles.contactContainer}>
                        {vendor.contactNumber && (
                          <View style={styles.contactItem}>
                            <Phone size={16} color="#3b82f6" />
                            <Text style={styles.contactText}>{vendor.contactNumber}</Text>
                          </View>
                        )}
                        {vendor.email && (
                          <View style={styles.contactItem}>
                            <Mail size={16} color="#8b5cf6" />
                            <Text style={styles.contactText}>{vendor.email}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Address */}
                    {vendor.address && (
                      <View style={styles.addressContainer}>
                        <MapPin size={16} color="#10b981" />
                        <View style={styles.addressTextContainer}>
                          <Text style={styles.addressText}>{vendor.address}</Text>
                          {(vendor.city || vendor.state) && (
                            <Text style={styles.addressLocation}>
                              {[vendor.city, vendor.state].filter(Boolean).join(', ')}
                            </Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Tax Information */}
                  {(vendor.gstin || vendor.pan) && (
                    <View style={styles.taxContainer}>
                      <View style={styles.taxHeader}>
                        <FileText size={16} color="#1e40af" />
                        <Text style={styles.taxTitle}>Tax Information</Text>
                      </View>
                      <View style={styles.taxDetails}>
                        {vendor.gstin && (
                          <View style={styles.taxItem}>
                            <Text style={styles.taxLabel}>GSTIN:</Text>
                            <Text style={styles.taxValue}>{vendor.gstin}</Text>
                          </View>
                        )}
                        {vendor.pan && (
                          <View style={styles.taxItem}>
                            <Text style={styles.taxLabel}>PAN:</Text>
                            <Text style={styles.taxValue}>{vendor.pan}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* TDS Details */}
                  {vendor.isTDSApplicable && vendor.tdsSection && (
                    <View style={styles.tdsContainer}>
                      <Percent size={16} color="#059669" />
                      <Text style={styles.tdsLabel}>TDS Section:</Text>
                      <Text style={styles.tdsValue}>{vendor.tdsSection}</Text>
                      {vendor.tdsRate > 0 && (
                        <Text style={styles.tdsRate}>({vendor.tdsRate}%)</Text>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Building size={48} color="#6b7280" />
              <Text style={styles.emptyStateTitle}>No Vendors Found</Text>
              <Text style={styles.emptyStateText}>
                Get started by adding your first vendor.
              </Text>
              {canCreateVendors && (
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => handleOpenForm()}
                >
                  <PlusCircle size={20} color="white" />
                  <Text style={styles.addButtonText}>Add Vendor</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Vendor Form Modal */}
      <Modal
        visible={isFormOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsFormOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedVendor ? 'Edit Vendor' : 'Create New Vendor'}
            </Text>
            <TouchableOpacity 
              onPress={() => setIsFormOpen(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          {/* VendorForm component */}
          <VendorForm
            vendor={selectedVendor || undefined}
            onSuccess={handleFormSuccess}
          />
        </View>
      </Modal>

      {/* Delete Confirmation Alert */}
      {isAlertOpen && (
        <Modal
          visible={isAlertOpen}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.alertOverlay}>
            <View style={styles.alertContainer}>
              <Text style={styles.alertTitle}>Are you absolutely sure?</Text>
              <Text style={styles.alertDescription}>
                This action cannot be undone. This will permanently delete the vendor.
              </Text>
              <View style={styles.alertButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setIsAlertOpen(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={handleDeleteVendor}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  addButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 16,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
  loadingContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPermissionContainer: {
    alignItems: 'center',
    padding: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  noPermissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  noPermissionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  vendorsList: {
    maxHeight: 600,
  },
  vendorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  vendorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  badgeText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '500',
  },
  tdsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  tdsApplicable: {
    backgroundColor: '#dcfce7',
  },
  tdsNotApplicable: {
    backgroundColor: '#fecaca',
  },
  tdsBadgeText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  menuButton: {
    padding: 4,
  },
  contactSection: {
    gap: 12,
    marginBottom: 12,
  },
  contactContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 12,
    color: '#374151',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 18,
  },
  addressLocation: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  taxContainer: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 8,
  },
  taxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  taxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  taxDetails: {
    gap: 4,
  },
  taxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  taxLabel: {
    fontSize: 12,
    color: '#4b5563',
    width: 50,
  },
  taxValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#1f2937',
  },
  tdsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 8,
    flexWrap: 'wrap',
  },
  tdsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
  },
  tdsValue: {
    fontSize: 14,
    color: '#065f46',
  },
  tdsRate: {
    fontSize: 14,
    color: '#065f46',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  noCompanyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  noCompanyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  noCompanyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  noCompanyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  contactButtons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontWeight: '500',
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
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#2563eb',
    fontWeight: '500',
    fontSize: 16,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
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
    lineHeight: 20,
    marginBottom: 24,
  },
  alertButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default VendorSettings;