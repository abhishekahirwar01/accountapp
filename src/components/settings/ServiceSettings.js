import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
  TextInput,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pick } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import * as XLSX from 'xlsx';
import Toast from 'react-native-toast-message';
import {
  MoreHorizontal,
  Edit2,
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
  Percent,
  Upload,
  ChevronLeft,
  ChevronRight,
  Download,
  Server,
  Calendar,
  Eye,
  IndianRupee,
  Loader2,
} from 'lucide-react-native';
import { BASE_URL } from '../../config';
import ServiceForm from '../services/ServiceForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/Dialog';

const { width } = Dimensions.get('window');
const ITEMS_PER_PAGE = 10;

const ServiceSettings = () => {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const totalPages = Math.ceil(services.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentServices = services.slice(startIndex, endIndex);

  const formatCurrency = amount => {
    if (!amount) amount = 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const userRole = await AsyncStorage.getItem('role');
        setRole(userRole);
      } catch (error) {
        console.error('Error getting user role:', error);
      }
    };
    getUserRole();
  }, []);

  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${BASE_URL}/api/companies/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch companies.');

      const data = await response.json();
      setCompanies(Array.isArray(data) ? data : data.companies || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load companies',
      });
    } finally {
      setIsLoadingCompanies(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${BASE_URL}/api/services`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch services.');

      const data = await response.json();
      setServices(Array.isArray(data) ? data : data.services || []);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching services:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load services',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchServices();
  }, [fetchServices]);

  const handleOpenForm = (service = null) => {
    setSelectedService(service);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = service => {
    setServiceToDelete(service);
    setIsAlertOpen(true);
  };

  const handleFormSuccess = newService => {
    setIsFormOpen(false);
    const action = selectedService ? 'updated' : 'created';

    if (selectedService) {
      setServices(prev =>
        prev.map(s => (s._id === newService._id ? newService : s)),
      );
    } else {
      setServices(prev => [...prev, newService]);
    }

    Toast.show({
      type: 'success',
      text1: `Service ${action} successfully`,
      text2: `The service details have been ${action}.`,
    });
    setSelectedService(null);
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(
        `${BASE_URL}/api/services/${serviceToDelete._id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) throw new Error('Failed to delete service.');

      Toast.show({
        type: 'success',
        text1: 'Service Deleted',
        text2: 'The service has been successfully removed.',
      });

      setServices(prev => prev.filter(s => s._id !== serviceToDelete._id));

      if (currentServices.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: error.message || 'Something went wrong.',
      });
    } finally {
      setIsAlertOpen(false);
      setServiceToDelete(null);
    }
  };

  const handleEditService = service => {
    setOpenDropdownId(null);
    handleOpenForm(service);
  };

  const handleDeleteServiceFromDropdown = service => {
    setOpenDropdownId(null);
    handleOpenDeleteDialog(service);
  };

  const handleImportClick = () => {
    setIsImportDialogOpen(true);
  };

  const handleFilePick = async () => {
    try {
      const result = await pick({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        allowMultiSelection: false,
      });

      const file = Array.isArray(result) ? result[0] : result;

      if (!file) return;

      const fileSize = file.size || file.fileSize || 0;
      if (fileSize > 10 * 1024 * 1024) {
        Toast.show({
          type: 'error',
          text1: 'File too large',
          text2: 'Please select a file smaller than 10MB.',
        });
        return;
      }

      await handleFileUpload(file);
    } catch (err) {
      if (
        err.code === 'DOCUMENT_PICKER_CANCELED' ||
        err.message?.toLowerCase()?.includes('cancel')
      ) {
        return;
      }
      console.error('Error picking file:', err);
      Toast.show({ type: 'error', text1: 'File selection failed' });
    }
  };

  const handleFileUpload = async file => {
    setIsImporting(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type:
          file.type ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        name: file.name,
      });

      const response = await fetch(`${BASE_URL}/api/services/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import services');
      }

      const result = await response.json();

      Toast.show({
        type: 'success',
        text1: 'Import Successful',
        text2: `Successfully imported ${result.importedCount} services. ${
          result.errors?.length
            ? `${result.errors.length} errors occurred.`
            : ''
        }`,
      });

      fetchServices();
      setIsImportDialogOpen(false);
    } catch (error) {
      console.error('Error importing services:', error);
      Toast.show({
        type: 'error',
        text1: 'Import Failed',
        text2: error.message || 'Something went wrong during import.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${BASE_URL}/api/services/import/template`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to download template');

      // Blob ko base64 mein convert karne ka sahi tarika
      const result = await response.blob();
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(result);
      });

      const fileName = 'services_import_template.xlsx';
      let path = '';

      // Android aur iOS ke liye alag-alag public paths
      if (Platform.OS === 'android') {
        // ExternalStorageDirectoryPath se file public Downloads mein jayegi
        path = `${RNFS.ExternalStorageDirectoryPath}/Download/${fileName}`;
      } else {
        path = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      }

      // File likhna (base64 data se prefix hatane ke liye split use kiya hai)
      await RNFS.writeFile(path, base64Data.split(',')[1], 'base64');

      if (Platform.OS === 'android') {
        // System ko refresh karna taaki file turant dikhne lage
        await RNFS.scanFile(path);

        Alert.alert(
          'Download Successful',
          `File saved to your Downloads folder as ${fileName}`,
          [{ text: 'OK' }],
        );
      } else {
        Alert.alert('Download Successful', 'File saved to Documents folder.', [
          { text: 'OK' },
        ]);
      }

      Toast.show({
        type: 'success',
        text1: 'Template Downloaded',
        text2: 'File is ready to use.',
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      Toast.show({
        type: 'error',
        text1: 'Download Failed',
        text2: error.message || 'Failed to download template.',
      });
    }
  };

  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const makePhoneCall = () => {
    Linking.openURL('tel:+918989773689');
  };

  const sendEmail = () => {
    Linking.openURL('mailto:support@company.com');
  };

  const renderServiceItem = ({ item }) => (
    <View style={styles.serviceCard}>
      <View style={styles.serviceCardHeader}>
        <View style={styles.serviceTitleContainer}>
          <View style={styles.serviceIcon}>
            <Server size={16} color="#0d9488" />
          </View>
          <Text style={styles.serviceName} numberOfLines={1}>
            {item.serviceName}
          </Text>
        </View>

        {role !== 'user' && (
          <View>
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => {
                setOpenDropdownId(
                  openDropdownId === item._id ? null : item._id,
                );
              }}
            >
              <MoreHorizontal size={20} color="#666" />
            </TouchableOpacity>

            {openDropdownId === item._id && (
              <View style={styles.dropdown}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleEditService(item)}
                >
                  <Edit2 size={16} color="#3b82f6" />
                  <Text style={styles.dropdownItemText}>Edit</Text>
                </TouchableOpacity>
                <View style={styles.dropdownDivider} />
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleDeleteServiceFromDropdown(item)}
                >
                  <Trash2 size={16} color="#ef4444" />
                  <Text
                    style={[
                      styles.dropdownItemText,
                      styles.dropdownItemTextDanger,
                    ]}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.serviceDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailLabel}>
            <IndianRupee size={14} color="#666" />
            <Text style={styles.detailLabelText}>Amount</Text>
          </View>
          <Text style={styles.detailValue}>
            {formatCurrency(item.amount || 0)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailLabel}>
            <Calendar size={14} color="#666" />
            <Text style={styles.detailLabelText}>Created</Text>
          </View>
          <Text style={styles.detailValue}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailLabel}>
            <Hash size={14} color="#666" />
            <Text style={styles.detailLabelText}>SAC Code</Text>
          </View>
          <Text style={styles.detailValue}>{item.sac || 'N/A'}</Text>
        </View>
      </View>

      {role === 'user' && (
        <View style={styles.userActions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => handleOpenForm(item)}
          >
            <Eye size={14} color="#3b82f6" />
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (isLoadingCompanies) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (companies.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.noCompanyCard}>
            <View style={styles.iconContainer}>
              <Building size={32} color="#3b82f6" />
            </View>
            <Text style={styles.noCompanyTitle}>Company Setup Required</Text>
            <Text style={styles.noCompanyDescription}>
              Contact us to enable your company account and access all features.
            </Text>

            <View style={styles.contactButtons}>
              <TouchableOpacity
                style={styles.phoneButton}
                onPress={makePhoneCall}
              >
                <Phone size={20} color="white" />
                <Text style={styles.phoneButtonText}>+91-8989773689</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.emailButton} onPress={sendEmail}>
                <Mail size={20} color="#3b82f6" />
                <Text style={styles.emailButtonText}>Email Us</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={() => setOpenDropdownId(null)}>
      <View style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.mainCard}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.title}>Manage Services</Text>
                <Text style={styles.subtitle}>
                  A list of all your available services with their pricing.
                </Text>
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleOpenForm()}
                >
                  <PlusCircle size={20} color="white" />
                  <Text style={styles.addButtonText}>Add Service</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.importButton}
                  onPress={handleImportClick}
                >
                  <Upload size={20} color="#3b82f6" />
                  <Text style={styles.importButtonText}>Import Services</Text>
                </TouchableOpacity>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : services.length > 0 ? (
              <>
                <FlatList
                  data={currentServices}
                  renderItem={renderServiceItem}
                  keyExtractor={item => item._id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.flatListContent}
                />

                {totalPages > 1 && (
                  <View style={styles.paginationContainer}>
                    <TouchableOpacity
                      style={[
                        styles.pageButton,
                        currentPage === 1 && styles.pageButtonDisabled,
                      ]}
                      onPress={goToPrevPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft
                        size={20}
                        color={currentPage === 1 ? '#999' : '#333'}
                      />
                      <Text
                        style={[
                          styles.pageButtonText,
                          currentPage === 1 && styles.pageButtonTextDisabled,
                        ]}
                      >
                        Previous
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.pageButton,
                        styles.nextButton,
                        currentPage === totalPages && styles.pageButtonDisabled,
                      ]}
                      onPress={goToNextPage}
                      disabled={currentPage === totalPages}
                    >
                      <Text
                        style={[
                          styles.pageButtonText,
                          styles.nextButtonText,
                          currentPage === totalPages &&
                            styles.pageButtonTextDisabled,
                        ]}
                      >
                        Next
                      </Text>
                      <ChevronRight
                        size={20}
                        color={currentPage === totalPages ? '#999' : 'white'}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noServicesContainer}>
                <Server size={48} color="#999" />
                <Text style={styles.noServicesTitle}>No Services Found</Text>
                <Text style={styles.noServicesDescription}>
                  Get started by adding your first service.
                </Text>
                <TouchableOpacity
                  style={styles.addServiceButton}
                  onPress={() => handleOpenForm()}
                >
                  <PlusCircle size={20} color="white" />
                  <Text style={styles.addServiceButtonText}>Add Service</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Service Form Modal */}
        {/* <Modal
        visible={isFormOpen}
        animationType="slide"
        onRequestClose={() => {
          setSelectedService(null);
          setIsFormOpen(false);
        }}
      >
        <ServiceForm
          service={selectedService || undefined}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setSelectedService(null);
            setIsFormOpen(false);
          }}
        />
      </Modal> */}

        <Dialog
          open={isFormOpen}
          onOpenChange={isOpen => {
            if (!isOpen) {
              setSelectedService(null);
              setIsFormOpen(false);
            }
          }}
        >
          <DialogContent>
            <View>
              <DialogHeader>
                <DialogTitle>
                  {selectedService ? 'Edit Service' : 'Create New Service'}
                </DialogTitle>
                <DialogDescription>
                  {selectedService
                    ? 'Update the service details.'
                    : 'Fill in the form to add a new service.'}
                </DialogDescription>
              </DialogHeader>
              <ScrollView>
                <ServiceForm
                  service={selectedService || undefined}
                  onSuccess={handleFormSuccess}
                  onCancel={() => {
                    setSelectedService(null);
                    setIsFormOpen(false);
                  }}
                />
              </ScrollView>
            </View>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={isAlertOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsAlertOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.alertModal}>
              <Text style={styles.alertTitle}>Are you absolutely sure?</Text>
              <Text style={styles.alertDescription}>
                This action cannot be undone. This will permanently delete the
                service.
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
                  onPress={handleDeleteService}
                >
                  <Text style={styles.deleteButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Import Dialog Modal */}
        <Modal
          visible={isImportDialogOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsImportDialogOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.importModal}>
              <Text style={styles.importTitle}>Import Services</Text>
              <Text style={styles.importDescription}>
                Upload an Excel file (.xlsx, .xls) or CSV file containing
                services data.
              </Text>

              <TouchableOpacity
                style={styles.uploadArea}
                onPress={handleFilePick}
                disabled={isImporting}
                activeOpacity={0.8}
              >
                <Upload size={32} color="#999" />
                <Text style={styles.uploadText}>
                  Drag and drop your file here, or click to browse
                </Text>

                <View
                  style={[
                    styles.selectFileButton,
                    isImporting && styles.selectFileButtonDisabled,
                  ]}
                >
                  {isImporting ? (
                    <ActivityIndicator size="small" color="#666" />
                  ) : (
                    <>
                      <Upload size={20} color="#666" />
                      <Text style={styles.selectFileButtonText}>
                        Select File
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.downloadTemplateButton}
                onPress={downloadTemplate}
              >
                <Download size={20} color="#3b82f6" />
                <Text style={styles.downloadTemplateButtonText}>
                  Download Template
                </Text>
              </TouchableOpacity>

              <Text style={styles.templateNote}>
                Download the template file to ensure proper formatting.
              </Text>

              {/* Top-right X close button (replaces bottom Close button) */}
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsImportDialogOpen(false)}
                accessibilityLabel="Close import dialog"
              >
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCompanyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  noCompanyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  contactButtons: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  phoneButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  phoneButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  emailButton: {
    borderWidth: 1,
    borderColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  emailButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  mainCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  importButton: {
    borderWidth: 1,
    borderColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  importButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContent: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatListContent: {
    gap: 12,
  },
  serviceCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  serviceIcon: {
    backgroundColor: '#ccfbf1',
    padding: 8,
    borderRadius: 6,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  moreButton: {
    padding: 8,
    borderRadius: 8,
  },
  dropdown: {
    position: 'absolute',
    top: 24,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    minWidth: 100,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  dropdownItemTextDanger: {
    color: '#ef4444',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  serviceDetails: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabelText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
  },
  userActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 6,
  },
  viewButtonText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  noServicesContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noServicesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noServicesDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addServiceButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  addServiceButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    gap: 8,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  pageButtonTextDisabled: {
    color: '#9ca3af',
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  nextButtonText: {
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
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
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  importModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 8,
  },
  importTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  importDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 20,
  },
  selectFileButton: {
    backgroundColor: '#f3f4f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    gap: 8,
  },
  selectFileButtonDisabled: {
    opacity: 0.5,
  },
  selectFileButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  downloadTemplateButton: {
    borderWidth: 1,
    borderColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
    marginBottom: 8,
  },
  downloadTemplateButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  templateNote: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeImportButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeImportButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
});

export default ServiceSettings;
