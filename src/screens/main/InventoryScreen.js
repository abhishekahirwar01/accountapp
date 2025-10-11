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

// ------------------------------------------
// 1. PROFESSIONAL UI CONSTANTS
// ------------------------------------------

const COLORS = {
  primary: '#0056b3',      // Deep, corporate blue
  secondary: '#6c757d',    // Muted grey for secondary info
  background: '#f8f9fa',   // Very light grey screen background
  card: '#ffffff',         // Clean white for cards
  border: '#e9ecef',       // Light border color
  success: '#28a745',      // Standard green
  danger: '#dc3545',       // Standard red
  warning: '#ffc107',      // Standard yellow-orange
  textPrimary: '#212529',  // Dark text
  textSecondary: '#6c757d',// Lighter text for details
};

const TYPOGRAPHY = {
  h1: 24,
  h2: 18,
  body: 16,
  caption: 12,
};


// ------------------------------------------
// 2. HARDCODED DATA
// ------------------------------------------

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

// ------------------------------------------
// 3. MAIN COMPONENT LOGIC
// ------------------------------------------

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

  // Mock user data (Changed to 'admin' to show all features by default)
  const [userRole, setUserRole] = useState('admin');

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
    Alert.alert('Success', `Successfully imported ${importedData.length} new ${activeTab}.`);
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

  // Render functions
  const renderProductItem = ({ item }) => (
    <Card style={professionalStyles.itemCard} key={item._id}>
      <Card.Content>
        <View style={professionalStyles.itemHeader}>
          {canDeleteItems && (
            <View style={professionalStyles.productSelection}>
              <Checkbox.Android
                status={selectedProducts.includes(item._id) ? 'checked' : 'unchecked'}
                onPress={() => handleSelectProduct(item._id)}
                disabled={userRole === 'user'}
                color={COLORS.primary}
              />
            </View>
          )}
          <View style={professionalStyles.itemInfo}>
            <Icon name="package-variant" size={20} color={COLORS.secondary} />
            <View style={professionalStyles.itemTextContainer}>
              <Text style={professionalStyles.itemName}>{item.name}</Text>
              <View style={professionalStyles.detailsRow}>
                <Text style={professionalStyles.stockText}>Unit: {item.unit || 'Piece'}</Text>
              </View>
            </View>
          </View>
          <View style={professionalStyles.stockInfo}>
            <Text style={[
              professionalStyles.stockValue,
              { color: (item.stocks || 0) > 0 ? COLORS.success : COLORS.danger }
            ]}>
              {item.stocks || 0}
            </Text>
          </View>
        </View>

        <View style={professionalStyles.metaInfo}>
          <View style={professionalStyles.metaItem}>
            <Text style={professionalStyles.metaLabel}>HSN:</Text>
            <Text style={professionalStyles.metaValue}>{item.hsn || 'N/A'}</Text>
          </View>
          <Text style={professionalStyles.createdDate}>
            createdAt: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
          </Text>
        </View>

        {canEditItems && (
          <View style={professionalStyles.actions}>
            <Button
              mode="outlined"
              onPress={() => openProductForm(item)}
              style={professionalStyles.actionButton}
              textColor={COLORS.primary}
            >
              <Icon name="pencil" size={16} />
              Edit
            </Button>
            <Button
              mode="outlined"
              onPress={() => confirmDelete(item, 'product')}
              style={[professionalStyles.actionButton, professionalStyles.deleteButton]}
              textColor={COLORS.danger}
            >
              <Icon name="delete" size={16} color={COLORS.danger} />
              Delete
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderServiceItem = ({ item }) => (
    <Card style={professionalStyles.itemCard} key={item._id}>
      <Card.Content>
        <View style={professionalStyles.itemHeader}>
          <View style={professionalStyles.itemInfo}>
            <Icon name="server" size={20} color={COLORS.secondary} />
            <View style={professionalStyles.itemTextContainer}>
              <Text style={professionalStyles.itemName}>{item.serviceName}</Text>
              {item.description && (
                <Text style={professionalStyles.itemDescription} numberOfLines={2}>{item.description}</Text>
              )}
            </View>
            <Chip mode="outlined" style={professionalStyles.serviceChip} textStyle={{ color: COLORS.primary }}>Service</Chip>
          </View>
        </View>

        <View style={professionalStyles.metaInfo}>
          <View style={professionalStyles.metaItem}>
            <Text style={professionalStyles.metaLabel}>SAC:</Text>
            <Text style={professionalStyles.metaValue}>{item.sac || 'N/A'}</Text>
          </View>
          <Text style={professionalStyles.createdDate}>
            Added: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
          </Text>
        </View>

        {canEditItems && (
          <View style={professionalStyles.actions}>
            <Button
              mode="outlined"
              onPress={() => openServiceForm(item)}
              style={professionalStyles.actionButton}
              textColor={COLORS.primary}
            >
              <Icon name="pencil" size={16} />
              Edit
            </Button>
            <Button
              mode="outlined"
              onPress={() => confirmDelete(item, 'service')}
              style={[professionalStyles.actionButton, professionalStyles.deleteButton]}
              textColor={COLORS.danger}
            >
              <Icon name="delete" size={16} color={COLORS.danger} />
              Delete
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderEmptyState = (type) => (
    <Card style={professionalStyles.emptyStateCard}>
      <Card.Content style={professionalStyles.emptyStateContent}>
        <Icon
          name={type === 'products' ? 'package-variant' : 'server'}
          size={48}
          color={COLORS.secondary}
        />
        <Text style={professionalStyles.emptyStateTitle}>
          No {type === 'products' ? 'Products' : 'Services'} Found
        </Text>
        <Text style={professionalStyles.emptyStateDescription}>
          Create your first {type.slice(0, -1)} to get started, or import from an Excel file.
        </Text>
        {canCreateItems && (
          <Button
            mode="contained"
            onPress={() => type === 'products' ? openProductForm() : openServiceForm()}
            style={professionalStyles.emptyStateButton}
            contentStyle={{ paddingHorizontal: 10 }}
            buttonColor={COLORS.primary}
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
      <SafeAreaView style={professionalStyles.safeArea}>
        <ScrollView contentContainerStyle={professionalStyles.centerContainer}>
          <Card style={professionalStyles.setupCard}>
            <Card.Content style={professionalStyles.setupContent}>
              <View style={professionalStyles.iconContainer}>
                <Icon name="office-building" size={32} color={COLORS.primary} />
              </View>
              <Text style={professionalStyles.setupTitle}>Company Setup Required</Text>
              <Text style={professionalStyles.setupDescription}>
                It looks like your company account isn't fully set up. Please contact our support team to enable all features.
              </Text>

              <View style={professionalStyles.contactButtons}>
                <Button
                  mode="contained"
                  onPress={() => Alert.alert('Call', 'Calling +91-8989773689')}
                  style={professionalStyles.contactButton}
                  buttonColor={COLORS.primary}
                  icon="phone"
                >
                  +91-8989773689
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => Alert.alert('Email', 'Emailing support@company.com')}
                  style={professionalStyles.contactButton}
                  textColor={COLORS.primary}
                  icon="email"
                >
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
    <SafeAreaView style={professionalStyles.safeArea}>
      <View style={professionalStyles.container}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        >
          {/* Header */}
          <View style={professionalStyles.header}>
            <View>
              <Text style={professionalStyles.title}>Inventory Management</Text>
              <Text style={professionalStyles.subtitle}>Track and manage your products and services</Text>
            </View>

            {canCreateItems && (
              <View style={professionalStyles.headerButtons}>
                <ExcelImportExport
                  templateData={[
                    activeTab === 'products'
                      ? { 'Item Name': 'Eg: Laptop', 'Stock': 10, 'Unit': 'Piece', 'HSN': '8471' }
                      : { 'Service Name': 'Eg: Consulting', 'Description': 'One hour consulting', 'SAC': '998311' }
                  ]}
                  templateFileName={`inventory_template_${activeTab}.xlsx`}
                  onImportSuccess={handleExcelImportSuccess}
                  expectedColumns={
                    activeTab === 'products'
                      ? ['Item Name', 'Stock', 'Unit', 'HSN']
                      : ['Service Name', 'Description', 'SAC']
                  }
                  transformImportData={(data) => data}
                  activeTab={activeTab}
                />

                <Button
                  mode="outlined"
                  onPress={() => openProductForm()}
                  style={professionalStyles.headerButton}
                  textColor={COLORS.primary}
                >
                  <Icon name="plus-circle" size={16} />
                  Add Product
                </Button>
                <Button
                  mode="contained"
                  onPress={() => openServiceForm()}
                  style={professionalStyles.headerButton}
                  buttonColor={COLORS.primary}
                >
                  <Icon name="plus-circle" size={16} />
                  Add Service
                </Button>
              </View>
            )}
          </View>

          {/* Bulk Actions */}
          {selectedProducts.length > 0 && activeTab === 'products' && canDeleteItems && (
            <Card style={professionalStyles.bulkActionCard}>
              <Card.Content>
                <View style={professionalStyles.bulkActions}>
                  <View style={professionalStyles.bulkActionInfo}>
                    <Text style={professionalStyles.bulkActionText}>
                      {selectedProducts.length} product(s) selected
                    </Text>
                    <TouchableOpacity onPress={handleSelectAllProducts}>
                      <Text style={professionalStyles.selectAllText}>
                        {selectedProducts.length === products.length ? 'Deselect All' : 'Select All'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Button
                    mode="contained"
                    onPress={confirmBulkDelete}
                    style={professionalStyles.bulkDeleteButton}
                    buttonColor={COLORS.danger}
                    icon="delete"
                  >
                    Delete Selected
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Tabs and Main Content */}
          <Card style={professionalStyles.mainCard}>
            <Card.Content>
              <View style={professionalStyles.tabs}>
                <TouchableOpacity
                  style={[
                    professionalStyles.tab,
                    activeTab === 'products' && professionalStyles.activeTab
                  ]}
                  onPress={() => setActiveTab('products')}
                >
                  <Text style={[
                    professionalStyles.tabText,
                    activeTab === 'products' && professionalStyles.activeTabText
                  ]}>
                    Products ({products.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    professionalStyles.tab,
                    activeTab === 'services' && professionalStyles.activeTab
                  ]}
                  onPress={() => setActiveTab('services')}
                >
                  <Text style={[
                    professionalStyles.tabText,
                    activeTab === 'services' && professionalStyles.activeTabText
                  ]}>
                    Services ({services.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Products Tab Content */}
              {activeTab === 'products' && (
                <View style={professionalStyles.tabContent}>
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
                <View style={professionalStyles.tabContent}>
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
          <SafeAreaView style={professionalStyles.modalSafeArea}>
            <View style={professionalStyles.modalOverlay}>
              <View style={professionalStyles.modalContent}>
                <View style={professionalStyles.modalHeader}>
                  <Text style={professionalStyles.modalTitle}>
                    {productToEdit ? 'Edit Product' : 'Create New Product'}
                  </Text>
                  <Text style={professionalStyles.modalDescription}>
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
          <SafeAreaView style={professionalStyles.modalSafeArea}>
            <View style={professionalStyles.modalOverlay}>
              <View style={professionalStyles.modalContent}>
                <View style={professionalStyles.modalHeader}>
                  <Text style={professionalStyles.modalTitle}>
                    {serviceToEdit ? 'Edit Service' : 'Create New Service'}
                  </Text>
                  <Text style={professionalStyles.modalDescription}>
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
              <Button onPress={() => setDeleteDialogVisible(false)} textColor={COLORS.secondary}>Cancel</Button>
              <Button onPress={handleDelete} textColor={COLORS.danger}>
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
              <Button onPress={() => setBulkDeleteDialogVisible(false)} textColor={COLORS.secondary}>Cancel</Button>
              <Button onPress={handleBulkDeleteProducts} textColor={COLORS.danger}>
                Delete {selectedProducts.length} Items
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* FAB for adding new items */}
        {canCreateItems && (
          <FAB
            icon="plus"
            style={professionalStyles.fab}
            onPress={() => activeTab === 'products' ? openProductForm() : openServiceForm()}
            color={COLORS.card}
            backgroundColor={COLORS.primary}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

// ------------------------------------------
// 4. PROFESSIONAL STYLES
// ------------------------------------------

const professionalStyles = StyleSheet.create({
  // --- Global Layout ---
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },

  // --- Header ---
  header: {
    padding: 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: TYPOGRAPHY.h1,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
    alignItems: 'center',
  },
  headerButton: {
    flex: 1,
    borderRadius: 8,
    borderColor: COLORS.primary,
  },

  // --- Bulk Actions ---
  bulkActionCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 16,
    backgroundColor: COLORS.warning + '10',
    borderColor: COLORS.warning,
    borderWidth: 1,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 2,
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  bulkActionInfo: {
    flex: 1,
  },
  bulkActionText: {
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.body,
  },
  selectAllText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.caption,
    marginTop: 4,
    fontWeight: '500',
  },
  bulkDeleteButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 6,
    marginLeft: 10,
  },

  // --- Main Card & Tabs ---
  mainCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  tabContent: {
    minHeight: 200,
    paddingTop: 16,
  },

  // --- Item Card (Clean & Compact) ---
  itemCard: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productSelection: {
    marginRight: 4,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  itemTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  itemName: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  stockText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  itemDescription: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  stockInfo: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  stockValue: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: 'bold',
  },

  // --- Meta Info ---
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  createdDate: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },

  // --- Actions ---
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 10,
  },
  actionButton: {
    minWidth: 100,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  deleteButton: {
    borderColor: COLORS.danger,
  },
  serviceChip: {
    marginLeft: 'auto',
    height: 30,
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary + '30',
  },

  // --- Empty & Setup States ---
  emptyStateCard: {
    marginVertical: 40,
    paddingVertical: 30,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyStateContent: {
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    color: COLORS.textPrimary,
  },
  emptyStateDescription: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  setupCard: {
    margin: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5.46,
    elevation: 8,
  },
  setupContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  setupTitle: {
    fontSize: TYPOGRAPHY.h1,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    color: COLORS.textPrimary,
  },
  setupDescription: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  contactButtons: {
    width: '100%',
    gap: 12,
  },
  contactButton: {
    marginHorizontal: 0,
    borderRadius: 8,
  },

  // --- Modal & FAB ---
  modalSafeArea: {
    flex: 1,
    backgroundColor: 'rgba(33, 37, 41, 0.75)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(33, 37, 41, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.h1,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  fab: {
    position: 'absolute',
    margin: 24,
    right: 0,
    bottom: 0,
  },
});

export default InventoryScreen;