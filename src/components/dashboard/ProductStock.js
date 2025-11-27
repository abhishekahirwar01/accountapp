import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Dimensions,
  FlatList,
} from 'react-native';
import {
  Card,
  Button,
  Searchbar,
  ActivityIndicator,
  Chip,
  Dialog,
  Portal,
  TextInput as PaperTextInput,
  List,
  FAB,
  Divider,
  Surface,
  Badge,
  Menu,
  IconButton,
  Text,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import your actual components and contexts
import { ProductForm } from '../products/ProductForm';
import { usePermissions } from '../../contexts/permission-context';
import { useCompany } from '../../contexts/company-context';
import { ServiceForm } from '../services/ServiceForm';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { capitalizeWords } from '../../lib/utils';
import ProductTableRow from './ProductTableRow';
import ProductMobileCard from './ProductMobileCard';
import { BASE_URL } from '../../config';
import { useToast } from '../hooks/useToast';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const baseURL = BASE_URL;

const StockEditForm = ({ product, onSuccess, onCancel }) => {
  const [newStock, setNewStock] = useState(product.stocks?.toString() || '0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${baseURL}/api/products/${product._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stocks: parseInt(newStock) }),
      });

      if (!res.ok) throw new Error('Failed to update stock.');
      const data = await res.json();

      showToast('Stock updated successfully!', 'success');
      onSuccess(data.product);
    } catch (error) {
      showToast('Failed to update stock', 'error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <PaperTextInput
        label={`Stock for ${product.name}`}
        value={newStock}
        onChangeText={setNewStock}
        keyboardType="numeric"
        mode="outlined"
        style={{ marginBottom: 16 }}
      />
      <View
        style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}
      >
        <Button mode="outlined" onPress={onCancel}>
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          Save Changes
        </Button>
      </View>
    </View>
  );
};

// Helper functions
const getStockStatus = product => {
  if (product.type === 'service') return null;
  const stock = product.stocks ?? 0;
  if (stock === 0)
    return { status: 'out', color: '#ef4444', text: 'Out of Stock' };
  if (stock <= 10)
    return { status: 'low', color: '#f59e0b', text: 'Low Stock' };
  return { status: 'in', color: '#10b981', text: 'In Stock' };
};

const getStockColor = stock => {
  const stockValue = stock ?? 0;
  if (stockValue > 10) return '#10b981';
  if (stockValue > 0) return '#f59e0b';
  return '#ef4444';
};

const ProductStock = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [role, setRole] = useState('user');
  const [openNameDialog, setOpenNameDialog] = useState(null);

  const { showToast } = useToast();
  const { permissions } = usePermissions();
  const { selectedCompanyId } = useCompany();
  const { permissions: userCaps } = useUserPermissions();

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      // Get user role
      const userRole = await AsyncStorage.getItem('role');
      setRole(userRole || 'user');

      const url = selectedCompanyId
        ? `${baseURL}/api/products?companyId=${selectedCompanyId}`
        : `${baseURL}/api/products`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch products.');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch (error) {
      showToast('Failed to load products', 'error', error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCompanyId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleEditClick = product => {
    setSelectedProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSuccess = updatedProduct => {
    setProducts(prev =>
      prev.map(p => (p._id === updatedProduct._id ? updatedProduct : p)),
    );
    setIsEditDialogOpen(false);
    setSelectedProduct(null);
  };

  const handleAddProductSuccess = newProduct => {
    setProducts(prev => [...prev, newProduct]);
    setIsAddProductOpen(false);
    showToast(
      `${capitalizeWords(newProduct.name)} added.`,
      'success',
      'Product Created!',
    );
    fetchProducts();
  };

  const handleAddServiceSuccess = newService => {
    const serviceAsProduct = {
      _id: newService._id,
      name: newService.serviceName,
      type: 'service',
      stocks: 0,
      createdByClient: newService.createdByClient,
      price: undefined,
    };

    setProducts(prev => [...prev, serviceAsProduct]);
    setIsAddServiceOpen(false);
    showToast(
      `${capitalizeWords(newService.serviceName)} added.`,
      'success',
      'Service Created!',
    );
    fetchProducts();
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const renderProductItem = ({ item }) => (
    <ProductMobileCard
      product={item}
      onEditClick={handleEditClick}
      role={role}
      onNamePress={() => setOpenNameDialog(item.name)}
    />
  );

  const renderTableRow = ({ item, index }) => (
    <ProductTableRow
      product={item}
      onEditClick={handleEditClick}
      role={role}
      onNamePress={() => setOpenNameDialog(item.name)}
      isLast={index === filteredProducts.length - 1}
    />
  );

  if (
    !permissions?.canCreateProducts &&
    !userCaps?.canCreateInventory &&
    (permissions?.maxInventories ?? 0) === 0
  ) {
    return null;
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Card style={{ marginBottom: 16 }}>
        <Card.Content>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <View>
              <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
                Product & Service Stock
              </Text>
              <Text variant="bodyMedium" style={{ color: '#666' }}>
                Current inventory levels and management
              </Text>
            </View>

            {(permissions?.canCreateProducts || userCaps?.canCreateInventory) &&
              isTablet && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    mode="contained"
                    onPress={() => setIsAddProductOpen(true)}
                    icon="package-variant"
                    compact
                  >
                    Product
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => setIsAddServiceOpen(true)}
                    icon="server"
                    compact
                  >
                    Service
                  </Button>
                </View>
              )}
          </View>

          <Searchbar
            placeholder="Search products or services..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={{ marginBottom: 16 }}
          />

          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            style={{ maxHeight: 400 }}
          >
            {isLoading ? (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text
                  variant="bodyMedium"
                  style={{ marginTop: 8, color: '#6b7280' }}
                >
                  Loading inventory...
                </Text>
              </View>
            ) : filteredProducts.length > 0 ? (
              <View>
                {/* Tablet/Desktop Table View */}
                {isTablet ? (
                  <Surface
                    style={{ elevation: 1, borderRadius: 8, marginBottom: 16 }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#e5e5e5',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <View style={{ flex: 3 }}>
                        <Text
                          variant="bodyMedium"
                          style={{ fontWeight: 'bold', color: '#374151' }}
                        >
                          Item
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          variant="bodyMedium"
                          style={{ fontWeight: 'bold', color: '#374151' }}
                        >
                          Stock
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          variant="bodyMedium"
                          style={{ fontWeight: 'bold', color: '#374151' }}
                        >
                          Unit
                        </Text>
                      </View>
                      {role !== 'user' && (
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <Text
                            variant="bodyMedium"
                            style={{ fontWeight: 'bold', color: '#374151' }}
                          >
                            Actions
                          </Text>
                        </View>
                      )}
                    </View>
                    <FlatList
                      data={filteredProducts.slice(0, 4)}
                      renderItem={renderTableRow}
                      keyExtractor={item => item._id}
                      scrollEnabled={false}
                    />
                  </Surface>
                ) : (
                  /* Mobile Card View */
                  <FlatList
                    data={filteredProducts.slice(0, 4)}
                    renderItem={renderProductItem}
                    keyExtractor={item => item._id}
                    scrollEnabled={false}
                    contentContainerStyle={{ gap: 12 }}
                  />
                )}
              </View>
            ) : (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <View
                  style={{
                    backgroundColor: '#f3f4f6',
                    padding: 16,
                    borderRadius: 50,
                    marginBottom: 16,
                  }}
                >
                  <Icon name="package-variant" size={32} color="#8b5cf6" />
                </View>
                <Text
                  variant="titleLarge"
                  style={{ marginTop: 8, fontWeight: 'bold', color: '#1f2937' }}
                >
                  No Items Found
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{
                    textAlign: 'center',
                    marginTop: 8,
                    color: '#6b7280',
                  }}
                >
                  {searchTerm
                    ? `No items match "${searchTerm}". Try a different search term.`
                    : 'Get started by adding your first product or service.'}
                </Text>
              </View>
            )}
          </ScrollView>

          {filteredProducts.length > 3 && (
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Inventory')}
              style={{ marginTop: 16, borderColor: '#d1d5db' }}
              textColor="#374151"
              icon="chevron-right"
            >
              View More
            </Button>
          )}
        </Card.Content>
      </Card>

      {/* Name Dialog */}
      <Portal>
        <Dialog
          visible={!!openNameDialog}
          onDismiss={() => setOpenNameDialog(null)}
        >
          <Dialog.Title>Product Name</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{capitalizeWords(openNameDialog)}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setOpenNameDialog(null)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Edit Stock Dialog */}
      <Portal>
        <Dialog
          visible={isEditDialogOpen}
          onDismiss={() => setIsEditDialogOpen(false)}
        >
          <Dialog.Title>Edit Stock</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
              Update the stock quantity for the selected product.
            </Text>
            {selectedProduct && (
              <StockEditForm
                product={selectedProduct}
                onSuccess={handleUpdateSuccess}
                onCancel={() => setIsEditDialogOpen(false)}
              />
            )}
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* Add Product Dialog */}
      <Portal>
        <Dialog
          visible={isAddProductOpen}
          onDismiss={() => setIsAddProductOpen(false)}
          style={{ maxHeight: '80%' }}
        >
          <Dialog.Title>Create New Product</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <Dialog.Content>
                <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
                  Fill in the form to add a new product to your inventory.
                </Text>
                <ProductForm onSuccess={handleAddProductSuccess} />
              </Dialog.Content>
            </ScrollView>
          </Dialog.ScrollArea>
        </Dialog>
      </Portal>

      {/* Add Service Dialog */}
      <Portal>
        <Dialog
          visible={isAddServiceOpen}
          onDismiss={() => setIsAddServiceOpen(false)}
          style={{ maxHeight: '80%' }}
        >
          <Dialog.Title>Create New Service</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <Dialog.Content>
                <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
                  Fill in the form to add a new service to your offerings.
                </Text>
                <ServiceForm onSuccess={handleAddServiceSuccess} />
              </Dialog.Content>
            </ScrollView>
          </Dialog.ScrollArea>
        </Dialog>
      </Portal>

      {/* FAB for mobile */}
      {(permissions?.canCreateProducts || userCaps?.canCreateInventory) &&
        !isTablet && (
          <Menu
            visible={fabOpen}
            onDismiss={() => setFabOpen(false)}
            anchor={
              <FAB
                icon="plus"
                style={{
                  position: 'absolute',
                  margin: 16,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#3b82f6',
                }}
                onPress={() => setFabOpen(true)}
                color="white"
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setFabOpen(false);
                setIsAddProductOpen(true);
              }}
              title="Add Product"
              leadingIcon="package-variant"
            />
            <Menu.Item
              onPress={() => {
                setFabOpen(false);
                setIsAddServiceOpen(true);
              }}
              title="Add Service"
              leadingIcon="server"
            />
          </Menu>
        )}
    </View>
  );
};

export default ProductStock;
