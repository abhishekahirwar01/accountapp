import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
} from 'react-native';
import { Card, Button, Portal, Dialog, Paragraph, Chip, Checkbox, FAB } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import your forms and Excel component
import { ServiceForm } from '../../components/services/ServiceForm';
import { ProductForm } from '../../components/products/ProductForm';
import ExcelImportExport from '../../components/ui/ExcelImportExport';

// Hardcoded Data with HSN/SAC
const HARDCODED_COMPANIES = [
  {
    _id: '1',
    name: 'My Company',
    email: 'contact@mycompany.com',
    phone: '+91-8989773689'
  }
];

const HARDCODED_PRODUCTS = [
  {
    _id: '1',
    name: 'Laptop',
    stocks: 15,
    unit: 'Piece',
    hsn: '8471',
    createdAt: '2024-01-15T10:30:00.000Z',
  },
  {
    _id: '2',
    name: 'Wireless Mouse',
    stocks: 50,
    unit: 'Piece',
    hsn: '8471',
    createdAt: '2024-01-16T14:20:00.000Z',
  },
  {
    _id: '3',
    name: 'Mechanical Keyboard',
    stocks: 25,
    unit: 'Piece',
    hsn: '8471',
    createdAt: '2024-01-17T09:15:00.000Z',
  },
  {
    _id: '4',
    name: '24-inch Monitor',
    stocks: 10,
    unit: 'Piece',
    hsn: '8528',
    createdAt: '2024-01-18T11:45:00.000Z',
  }
];

const HARDCODED_SERVICES = [
  {
    _id: '1',
    serviceName: 'Web Development',
    description: 'Custom website development',
    sac: '998314',
    createdAt: '2024-01-10T08:00:00.000Z',
  },
  {
    _id: '2',
    serviceName: 'Mobile App Development',
    description: 'Cross-platform mobile applications',
    sac: '998314',
    createdAt: '2024-01-12T13:30:00.000Z',
  },
  {
    _id: '3',
    serviceName: 'Digital Marketing',
    description: 'SEO and social media marketing',
    sac: '998339',
    createdAt: '2024-01-14T16:45:00.000Z',
  }
];

const InventoryScreen = () => {
  // Main States
  const [products, setProducts] = useState(HARDCODED_PRODUCTS);
  const [services, setServices] = useState(HARDCODED_SERVICES);
  const [companies, setCompanies] = useState(HARDCODED_COMPANIES);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Dialog States
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState('');
  const [bulkDeleteDialogVisible, setBulkDeleteDialogVisible] = useState(false);

  // Form States
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [serviceToEdit, setServiceToEdit] = useState(null);

  // Mock user data
  const [userRole, setUserRole] = useState('client');

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setCompanies(HARDCODED_COMPANIES);
    setProducts(HARDCODED_PRODUCTS);
    setServices(HARDCODED_SERVICES);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Excel Import Success Handler
  const handleExcelImportSuccess = (importedData) => {
    if (activeTab === 'products') {
      const newProducts = importedData.map((item, index) => ({
        _id: Date.now().toString() + index,
        name: item['Item Name'] || item.name,
        stocks: parseInt(item['Stock'] || item.stocks) || 0,
        unit: item['Unit'] || item.unit || 'Piece',
        hsn: item['HSN'] || item.hsn || '',
        createdAt: new Date().toISOString(),
      }));
      setProducts(prev => [...newProducts, ...prev]);
    } else {
      const newServices = importedData.map((item, index) => ({
        _id: Date.now().toString() + index,
        serviceName: item['Service Name'] || item.serviceName,
        description: item['Description'] || item.description || '',
        sac: item['SAC'] || item.sac || '',
        createdAt: new Date().toISOString(),
      }));
      setServices(prev => [...newServices, ...prev]);
    }
  };

  // Product Form Handlers
  const openProductForm = (product = null) => {
    setProductToEdit(product);
    setIsProductFormOpen(true);
  };

  const handleProductSuccess = (savedProduct) => {
    setIsProductFormOpen(false);
    setProductToEdit(null);
    
    if (productToEdit) {
      setProducts(prev => prev.map(p => 
        p._id === savedProduct._id ? { ...p, ...savedProduct } : p
      ));
      Alert.alert('Success', 'Product updated successfully');
    } else {
      const newProduct = {
        ...savedProduct,
        _id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      setProducts(prev => [newProduct, ...prev]);
      Alert.alert('Success', 'Product added successfully');
    }
  };

  const handleProductCancel = () => {
    setIsProductFormOpen(false);
    setProductToEdit(null);
  };

  // Service Form Handlers
  const openServiceForm = (service = null) => {
    setServiceToEdit(service);
    setIsServiceFormOpen(true);
  };

  const handleServiceSuccess = (savedService) => {
    setIsServiceFormOpen(false);
    setServiceToEdit(null);
    
    if (serviceToEdit) {
      setServices(prev => prev.map(s => 
        s._id === savedService._id ? { ...s, ...savedService } : s
      ));
      Alert.alert('Success', 'Service updated successfully');
    } else {
      const newService = {
        ...savedService,
        _id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      setServices(prev => [newService, ...prev]);
      Alert.alert('Success', 'Service added successfully');
    }
  };

  // ... (Rest of your existing handlers remain the same)
  const handleServiceDelete = (serviceToDelete) => {
    setServices(prev => prev.filter(s => s._id !== serviceToDelete._id));
    setIsServiceFormOpen(false);
    setServiceToEdit(null);
    Alert.alert('Success', 'Service deleted successfully');
  };

  const handleServiceCancel = () => {
    setIsServiceFormOpen(false);
    setServiceToEdit(null);
  };

  // Delete handlers
  const confirmDelete = (item, type) => {
    if (userRole === 'user') {
      Alert.alert('Permission Denied', 'You do not have permission to delete items.');
      return;
    }
    setItemToDelete(item);
    setDeleteType(type);
    setDeleteDialogVisible(true);
  };

  const handleDelete = async () => {
    try {
      if (deleteType === 'product') {
        setProducts(prev => prev.filter(p => p._id !== itemToDelete._id));
        Alert.alert('Success', 'Product deleted successfully');
      } else if (deleteType === 'service') {
        setServices(prev => prev.filter(s => s._id !== itemToDelete._id));
        Alert.alert('Success', 'Service deleted successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete item');
    } finally {
      setDeleteDialogVisible(false);
      setItemToDelete(null);
      setDeleteType('');
    }
  };

  const handleSelectProduct = (productId) => {
    if (userRole === 'user') return;
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAllProducts = () => {
    if (userRole === 'user') return;
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p._id));
    }
  };

  const confirmBulkDelete = () => {
    if (userRole === 'user') {
      Alert.alert('Permission Denied', 'You do not have permission to delete items.');
      return;
    }
    if (selectedProducts.length === 0) {
      Alert.alert('Info', 'Please select products to delete');
      return;
    }
    setBulkDeleteDialogVisible(true);
  };

  const handleBulkDeleteProducts = async () => {
    try {
      setProducts(prev => prev.filter(p => !selectedProducts.includes(p._id)));
      Alert.alert('Success', `${selectedProducts.length} products deleted successfully`);
      setSelectedProducts([]);
      setBulkDeleteDialogVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete products');
    }
  };

  // Permission checks
  const canCreateItems = userRole !== 'user';
  const canDeleteItems = userRole !== 'user';
  const canEditItems = userRole !== 'user';

  // Render functions (same as before)
  const renderProductItem = ({ item }) => (
    <Card style={styles.itemCard} key={item._id}>
      <Card.Content>
        <View style={styles.itemHeader}>
          {canDeleteItems && (
            <View style={styles.productSelection}>
              <Checkbox.Android
                status={selectedProducts.includes(item._id) ? 'checked' : 'unchecked'}
                onPress={() => handleSelectProduct(item._id)}
                disabled={userRole === 'user'}
              />
            </View>
          )}
          <View style={styles.itemInfo}>
            <Icon name="package-variant" size={20} color="#666" />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={styles.detailsRow}>
                <Text style={styles.stockText}>Stock: {item.stocks || 0} {item.unit || 'Piece'}</Text>
              </View>
            </View>
          </View>
          <View style={styles.stockInfo}>
            <Text style={[
              styles.stockValue,
              { color: (item.stocks || 0) > 0 ? '#22c55e' : '#ef4444' }
            ]}>
              {item.stocks || 0}
            </Text>
          </View>
        </View>
        
        <View style={styles.metaInfo}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>HSN:</Text>
            <Text style={styles.metaValue}>{item.hsn || 'N/A'}</Text>
          </View>
          <Text style={styles.createdDate}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
          </Text>
        </View>

        {canEditItems && (
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => openProductForm(item)}
              style={styles.actionButton}
            >
              <Icon name="pencil" size={16} />
              Edit
            </Button>
            <Button
              mode="outlined"
              onPress={() => confirmDelete(item, 'product')}
              style={[styles.actionButton, styles.deleteButton]}
            >
              <Icon name="delete" size={16} color="#ef4444" />
              Delete
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderServiceItem = ({ item }) => (
    <Card style={styles.itemCard} key={item._id}>
      <Card.Content>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Icon name="server" size={20} color="#666" />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemName}>{item.serviceName}</Text>
              {item.description && (
                <Text style={styles.itemDescription}>{item.description}</Text>
              )}
            </View>
            <Chip mode="outlined" style={styles.serviceChip}>Service</Chip>
          </View>
        </View>
        
        <View style={styles.metaInfo}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>SAC:</Text>
            <Text style={styles.metaValue}>{item.sac || 'N/A'}</Text>
          </View>
          <Text style={styles.createdDate}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
          </Text>
        </View>

        {canEditItems && (
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => openServiceForm(item)}
              style={styles.actionButton}
            >
              <Icon name="pencil" size={16} />
              Edit
            </Button>
            <Button
              mode="outlined"
              onPress={() => confirmDelete(item, 'service')}
              style={[styles.actionButton, styles.deleteButton]}
            >
              <Icon name="delete" size={16} color="#ef4444" />
              Delete
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderEmptyState = (type) => (
    <Card style={styles.emptyStateCard}>
      <Card.Content style={styles.emptyStateContent}>
        <Icon 
          name={type === 'products' ? 'package-variant' : 'server'} 
          size={48} 
          color="#999" 
        />
        <Text style={styles.emptyStateTitle}>
          No {type === 'products' ? 'Products' : 'Services'} Found
        </Text>
        <Text style={styles.emptyStateDescription}>
          Create your first {type.slice(0, -1)} to get started.
        </Text>
        {canCreateItems && (
          <Button
            mode="contained"
            onPress={() => type === 'products' ? openProductForm() : openServiceForm()}
            style={styles.emptyStateButton}
          >
            <Icon name="plus-circle" size={16} />
            Add {type === 'products' ? 'Product' : 'Service'}
          </Button>
        )}
      </Card.Content>
    </Card>
  );

  if (companies.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.centerContainer}>
          <Card style={styles.setupCard}>
            <Card.Content style={styles.setupContent}>
              <View style={styles.iconContainer}>
                <Icon name="office-building" size={48} color="#3b82f6" />
              </View>
              <Text style={styles.setupTitle}>Company Setup Required</Text>
              <Text style={styles.setupDescription}>
                Contact us to enable your company account and access all features.
              </Text>
              
              <View style={styles.contactButtons}>
                <Button
                  mode="contained"
                  onPress={() => Alert.alert('Call', 'Calling +91-8989773689')}
                  style={styles.contactButton}
                >
                  <Icon name="phone" size={16} />
                  +91-8989773689
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => Alert.alert('Email', 'Emailing support@company.com')}
                  style={styles.contactButton}
                >
                  <Icon name="email" size={16} />
                  Email Us
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Inventory Management</Text>
              <Text style={styles.subtitle}>Track and manage your products and services</Text>
            </View>
            
            {canCreateItems && (
              <View style={styles.headerButtons}>
                <ExcelImportExport
                  templateData={[
                    activeTab === 'products' 
                      ? { 'Item Name': '', 'Stock': '', 'Unit': '', 'HSN': '' }
                      : { 'Service Name': '', 'Description': '', 'SAC': '' }
                  ]}
                  templateFileName={`inventory_template_${activeTab}.xlsx`}
                  onImportSuccess={handleExcelImportSuccess}
                  expectedColumns={
                    activeTab === 'products' 
                      ? ['Item Name', 'Stock', 'Unit', 'HSN']
                      : ['Service Name', 'Description', 'SAC']
                  }
                  transformImportData={(data) =>
                    data.map((item) => ({
                      ...item,
                      // Add any transformations if needed
                    }))
                  }
                  activeTab={activeTab}
                />
                
                <Button
                  mode="outlined"
                  onPress={() => openProductForm()}
                  style={styles.headerButton}
                >
                  <Icon name="plus-circle" size={16} />
                  Add Product
                </Button>
                <Button
                  mode="contained"
                  onPress={() => openServiceForm()}
                  style={styles.headerButton}
                >
                  <Icon name="plus-circle" size={16} />
                  Add Service
                </Button>
              </View>
            )}
          </View>

          {/* Bulk Actions */}
          {selectedProducts.length > 0 && canDeleteItems && (
            <Card style={styles.bulkActionCard}>
              <Card.Content>
                <View style={styles.bulkActions}>
                  <View style={styles.bulkActionInfo}>
                    <Text style={styles.bulkActionText}>
                      {selectedProducts.length} product(s) selected
                    </Text>
                    <TouchableOpacity onPress={handleSelectAllProducts}>
                      <Text style={styles.selectAllText}>
                        {selectedProducts.length === products.length ? 'Deselect All' : 'Select All'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Button
                    mode="contained"
                    onPress={confirmBulkDelete}
                    style={styles.bulkDeleteButton}
                  >
                    <Icon name="delete" size={16} />
                    Delete Selected
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Tabs */}
          <Card style={styles.mainCard}>
            <Card.Content>
              <View style={styles.tabs}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === 'products' && styles.activeTab
                  ]}
                  onPress={() => setActiveTab('products')}
                >
                  <Text style={[
                    styles.tabText,
                    activeTab === 'products' && styles.activeTabText
                  ]}>
                    Products ({products.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === 'services' && styles.activeTab
                  ]}
                  onPress={() => setActiveTab('services')}
                >
                  <Text style={[
                    styles.tabText,
                    activeTab === 'services' && styles.activeTabText
                  ]}>
                    Services ({services.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Products Tab Content */}
              {activeTab === 'products' && (
                <View style={styles.tabContent}>
                  {products.length === 0 ? (
                    renderEmptyState('products')
                  ) : (
                    <FlatList
                      data={products}
                      renderItem={renderProductItem}
                      keyExtractor={item => item._id}
                      scrollEnabled={false}
                    />
                  )}
                </View>
              )}

              {/* Services Tab Content */}
              {activeTab === 'services' && (
                <View style={styles.tabContent}>
                  {services.length === 0 ? (
                    renderEmptyState('services')
                  ) : (
                    <FlatList
                      data={services}
                      renderItem={renderServiceItem}
                      keyExtractor={item => item._id}
                      scrollEnabled={false}
                    />
                  )}
                </View>
              )}
            </Card.Content>
          </Card>
        </ScrollView>

        {/* Product Form Modal */}
        <Modal
          visible={isProductFormOpen}
          transparent={true}
          animationType="slide"
          onRequestClose={handleProductCancel}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {productToEdit ? 'Edit Product' : 'Create New Product'}
                  </Text>
                  <Text style={styles.modalDescription}>
                    {productToEdit
                      ? 'Update the product details.'
                      : 'Fill in the form to add a new product.'}
                  </Text>
                </View>
                <ProductForm
                  product={productToEdit}
                  onSuccess={handleProductSuccess}
                  onCancel={handleProductCancel}
                  visible={isProductFormOpen}
                />
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Service Form Modal */}
        <Modal
          visible={isServiceFormOpen}
          transparent={true}
          animationType="slide"
          onRequestClose={handleServiceCancel}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {serviceToEdit ? 'Edit Service' : 'Create New Service'}
                  </Text>
                  <Text style={styles.modalDescription}>
                    {serviceToEdit
                      ? 'Update the service details.'
                      : 'Fill in the form to add a new service.'}
                  </Text>
                </View>
                <ServiceForm
                  service={serviceToEdit}
                  onSuccess={handleServiceSuccess}
                  onDelete={handleServiceDelete}
                  onCancel={handleServiceCancel}
                  visible={isServiceFormOpen}
                />
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Delete Dialogs */}
        <Portal>
          <Dialog
            visible={deleteDialogVisible}
            onDismiss={() => setDeleteDialogVisible(false)}
          >
            <Dialog.Title>Confirm Delete</Dialog.Title>
            <Dialog.Content>
              <Paragraph>
                Are you sure you want to delete this {deleteType}? This action cannot be undone.
              </Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
              <Button onPress={handleDelete} textColor="#ef4444">
                Delete
              </Button>
            </Dialog.Actions>
          </Dialog>

          <Dialog
            visible={bulkDeleteDialogVisible}
            onDismiss={() => setBulkDeleteDialogVisible(false)}
          >
            <Dialog.Title>Confirm Bulk Delete</Dialog.Title>
            <Dialog.Content>
              <Paragraph>
                Are you sure you want to delete {selectedProducts.length} product(s)? This action cannot be undone.
              </Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setBulkDeleteDialogVisible(false)}>Cancel</Button>
              <Button onPress={handleBulkDeleteProducts} textColor="#ef4444">
                Delete {selectedProducts.length} Items
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* FAB for adding new items */}
        {canCreateItems && (
          <FAB
            icon="plus"
            style={styles.fab}
            onPress={() => activeTab === 'products' ? openProductForm() : openServiceForm()}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

// ... (Your existing styles remain the same)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  headerButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
    alignItems: 'center',
  },
  headerButton: {
    flex: 1,
  },
  bulkActionCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#fef3c7',
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkActionInfo: {
    flex: 1,
  },
  bulkActionText: {
    fontWeight: 'bold',
    color: '#92400e',
    fontSize: 16,
  },
  selectAllText: {
    color: '#3b82f6',
    fontSize: 14,
    marginTop: 4,
  },
  bulkDeleteButton: {
    backgroundColor: '#ef4444',
  },
  mainCard: {
    margin: 16,
    marginTop: 8,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  tabContent: {
    minHeight: 200,
  },
  itemCard: {
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productSelection: {
    marginRight: 8,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    flexWrap: 'wrap',
  },
  itemTextContainer: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  stockText: {
    fontSize: 14,
    color: '#666',
  },
  itemDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  stockInfo: {
    alignItems: 'flex-end',
  },
  stockValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  createdDate: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    marginLeft: 8,
  },
  deleteButton: {
    borderColor: '#ef4444',
  },
  serviceChip: {
    marginLeft: 8,
    height: 24,
  },
  emptyStateCard: {
    marginVertical: 20,
  },
  emptyStateContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateButton: {
    marginTop: 8,
  },
  setupCard: {
    margin: 20,
  },
  setupContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  setupDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  contactButtons: {
    width: '100%',
    gap: 12,
  },
  contactButton: {
    marginHorizontal: 8,
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
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#3b82f6',
  },
});

export default InventoryScreen;