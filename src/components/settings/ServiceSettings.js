import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  RefreshControl
} from 'react-native';
import {
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  PlusCircle,
  Server,
  Calendar,
  Eye
} from 'lucide-react-native';
import { ServiceForm } from '../services/ServiceForm';

// Mock data for services
const MOCK_SERVICES = [
  { 
    _id: '1', 
    serviceName: 'Annual Maintenance Contract',
    createdAt: '2024-01-15T00:00:00.000Z'
  },
  { 
    _id: '2', 
    serviceName: 'IT Consulting',
    createdAt: '2024-02-20T00:00:00.000Z'
  },
  { 
    _id: '3', 
    serviceName: 'Software Development',
    createdAt: '2024-03-10T00:00:00.000Z'
  },
];

// Mock companies data
const MOCK_COMPANIES = [
  { _id: '1', companyName: 'Tech Solutions Inc.' },
  { _id: '2', companyName: 'Digital Innovations Ltd.' },
];

const ServiceSettings = () => {
  const [services, setServices] = React.useState(MOCK_SERVICES);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedService, setSelectedService] = React.useState(null);
  const [serviceToDelete, setServiceToDelete] = React.useState(null);
  const [companies, setCompanies] = React.useState(MOCK_COMPANIES);
  const [refreshing, setRefreshing] = React.useState(false);

  // Mock role - you can get this from your app's state management
  const role = 'admin'; // or 'user'

  const fetchCompanies = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCompanies(MOCK_COMPANIES);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const fetchServices = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setServices(MOCK_SERVICES);
    } catch (error) {
      Alert.alert(
        'Failed to load services',
        error instanceof Error ? error.message : 'Something went wrong.',
        [{ text: 'OK' }]
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  const onRefresh = React.useCallback(() => {
    fetchServices();
  }, [fetchServices]);

  React.useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleOpenForm = (service = null) => {
    setSelectedService(service);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = (service) => {
    setServiceToDelete(service);
    setIsAlertOpen(true);
  };

  const handleFormSuccess = (newService) => {
    setIsFormOpen(false);
    const action = selectedService ? 'updated' : 'created';

    if (selectedService) {
      setServices(prev =>
        prev.map(s => (s._id === newService._id ? newService : s))
      );
    } else {
      setServices(prev => [...prev, { ...newService, createdAt: new Date().toISOString() }]);
    }

    Alert.alert(
      `Service ${action} successfully`,
      `The service details have been ${action}.`,
      [{ text: 'OK' }]
    );
    setSelectedService(null);
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Service Deleted',
        'The service has been successfully removed.',
        [{ text: 'OK' }]
      );
      
      setServices(prev => prev.filter(s => s._id !== serviceToDelete._id));
    } catch (error) {
      Alert.alert(
        'Deletion Failed',
        error instanceof Error ? error.message : 'Something went wrong.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAlertOpen(false);
      setServiceToDelete(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Loader2 size={24} color="#3b82f6" style={styles.spinner} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {companies.length === 0 ? (
        <View style={styles.centeredCard}>
          <View style={styles.setupCard}>
            <View style={styles.cardContent}>
              <View style={styles.centeredContent}>
                {/* Icon Section */}
                <View style={styles.iconContainer}>
                  <Server size={32} color="#3b82f6" />
                </View>

                {/* Text Content */}
                <Text style={styles.setupTitle}>Company Setup Required</Text>
                <Text style={styles.setupDescription}>
                  Contact us to enable your company account and access all features.
                </Text>

                {/* Call-to-Action Buttons */}
                <View style={styles.contactButtons}>
                  <TouchableOpacity style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>+91-8989773689</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Email Us</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.headerContent}>
                <View style={styles.headerText}>
                  <Text style={styles.cardTitle}>Manage Services</Text>
                  <Text style={styles.cardDescription}>
                    A list of all your available services.
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => handleOpenForm()}
                >
                  <PlusCircle size={16} color="#fff" />
                  <Text style={styles.addButtonText}>Add Service</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cardContent}>
              {isLoading ? (
                <View style={styles.centered}>
                  <Loader2 size={24} color="#3b82f6" style={styles.spinner} />
                </View>
              ) : services.length > 0 ? (
                <View style={styles.servicesList}>
                  {services.map((service) => (
                    <View key={service._id} style={styles.serviceCard}>
                      {/* Header Section */}
                      <View style={styles.serviceHeader}>
                        <View style={styles.serviceInfo}>
                          <View style={styles.serviceTitle}>
                            <View style={styles.serviceIcon}>
                              <Server size={16} color="#0d9488" />
                            </View>
                            <Text style={styles.serviceName} numberOfLines={1}>
                              {service.serviceName}
                            </Text>
                          </View>
                        </View>

                        {role !== 'user' && (
                          <TouchableOpacity 
                            style={styles.menuButton}
                            onPress={() => handleOpenDeleteDialog(service)}
                          >
                            <MoreHorizontal size={16} color="#666" />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Details Section */}
                      <View style={styles.serviceDetails}>
                        <View style={styles.dateRow}>
                          <View style={styles.dateLabel}>
                            <Calendar size={12} color="#666" />
                            <Text style={styles.dateLabelText}>Created</Text>
                          </View>
                          <Text style={styles.dateValue}>
                            {formatDate(service.createdAt)}
                          </Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={styles.serviceActions}>
                        {role === 'user' ? (
                          <TouchableOpacity 
                            style={styles.viewButton}
                            onPress={() => handleOpenForm(service)}
                          >
                            <Eye size={12} color="#3b82f6" />
                            <Text style={styles.viewButtonText}>View Details</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.actionButtons}>
                            <TouchableOpacity 
                              style={styles.editButton}
                              onPress={() => handleOpenForm(service)}
                            >
                              <Edit size={12} color="#3b82f6" />
                              <Text style={styles.editButtonText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.deleteButton}
                              onPress={() => handleOpenDeleteDialog(service)}
                            >
                              <Trash2 size={12} color="#ef4444" />
                              <Text style={styles.deleteButtonText}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Server size={48} color="#666" />
                  <Text style={styles.emptyTitle}>No Services Found</Text>
                  <Text style={styles.emptyDescription}>
                    Get started by adding your first service.
                  </Text>
                  <TouchableOpacity 
                    style={styles.emptyButton}
                    onPress={() => handleOpenForm()}
                  >
                    <PlusCircle size={16} color="#fff" />
                    <Text style={styles.emptyButtonText}>Add Service</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Service Form Modal */}
          {isFormOpen && (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {selectedService ? 'Edit Service' : 'Create New Service'}
                  </Text>
                  <Text style={styles.modalDescription}>
                    {selectedService
                      ? 'Update the details for this service.'
                      : 'Fill in the form to add a new service.'}
                  </Text>
                </View>
                
                <ServiceForm
                  service={selectedService || undefined}
                  onSuccess={handleFormSuccess}
                  onDelete={selectedService ? handleDeleteService : undefined}
                />
                
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => {
                    setSelectedService(null);
                    setIsFormOpen(false);
                  }}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Delete Confirmation Alert */}
          {isAlertOpen && (
            <View style={styles.modalOverlay}>
              <View style={styles.alertContent}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertTitle}>Are you absolutely sure?</Text>
                  <Text style={styles.alertDescription}>
                    This action cannot be undone. This will permanently delete the service.
                  </Text>
                </View>
                <View style={styles.alertFooter}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setIsAlertOpen(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.confirmButton}
                    onPress={handleDeleteService}
                  >
                    <Text style={styles.confirmButtonText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  spinner: {
    animationKeyframes: {
      '0%': { transform: [{ rotate: '0deg' }] },
      '100%': { transform: [{ rotate: '360deg' }] },
    },
    animationDuration: '1s',
    animationIterationCount: 'infinite',
  },
  centeredCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  setupCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    width: '100%',
    maxWidth: 400,
  },
  cardContent: {
    padding: 0,
  },
  centeredContent: {
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
  setupTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  setupDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#3b82f6',
    fontWeight: '500',
    fontSize: 14,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1f2937',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  cardContent: {
    padding: 16,
  },
  servicesList: {
    gap: 12,
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceIcon: {
    padding: 8,
    backgroundColor: '#ccfbf1',
    borderRadius: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  menuButton: {
    padding: 4,
  },
  serviceDetails: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateLabelText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  dateValue: {
    fontSize: 14,
    color: '#374151',
  },
  serviceActions: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 6,
  },
  viewButtonText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 6,
  },
  editButtonText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1f2937',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  closeButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#6b7280',
    borderRadius: 6,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  alertContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  alertHeader: {
    marginBottom: 20,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1f2937',
  },
  alertDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  alertFooter: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default ServiceSettings;