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
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import your actual components and contexts
import ProductForm from '../products/ProductForm';
import { usePermissions } from '../../contexts/permission-context';
import { useCompany } from '../../contexts/company-context';
import ServiceForm from '../services/ServiceForm';
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
    <View style={styles.stockEditContainer}>
      <Text style={styles.stockEditLabel}>Stock for {product.name}</Text>
      <TextInput
        style={styles.stockEditInput}
        value={newStock}
        onChangeText={setNewStock}
        keyboardType="numeric"
      />
      <View style={styles.stockEditButtons}>
        <TouchableOpacity
          style={[styles.button, styles.outlineButton]}
          onPress={onCancel}
        >
          <Text style={styles.outlineButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
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

const CustomDialog = ({ visible, onDismiss, title, children, style }) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        style={isTablet ? styles.modalOverlay : styles.modalOverlayMobile}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.dialog, !isTablet && styles.dialogMobile, style]}
        >
          <View style={styles.dialogHeader}>
            <Text style={styles.dialogTitle}>{title}</Text>
            <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.dialogContent}>{children}</ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const CustomButton = ({
  mode = 'contained',
  onPress,
  children,
  icon,
  style,
  textStyle,
  disabled = false,
  compact = false,
}) => {
  const isOutlined = mode === 'outlined';
  const isContained = mode === 'contained';

  return (
    <TouchableOpacity
      style={[
        styles.customButton,
        isContained && styles.customButtonContained,
        isOutlined && styles.customButtonOutlined,
        disabled && styles.buttonDisabled,
        compact && styles.buttonCompact,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {icon && (
        <Icon
          name={icon}
          size={compact ? 16 : 20}
          color={
            isContained
              ? '#fff'
              : isOutlined
              ? '#3b82f6'
              : disabled
              ? '#9ca3af'
              : '#3b82f6'
          }
          style={styles.buttonIcon}
        />
      )}
      <Text
        style={[
          styles.customButtonText,
          isContained && styles.customButtonTextContained,
          isOutlined && styles.customButtonTextOutlined,
          disabled && styles.buttonTextDisabled,
          compact && styles.buttonTextCompact,
          textStyle,
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const SearchBar = ({ placeholder, value, onChangeText, style }) => {
  return (
    <View style={[styles.searchContainer, style]}>
      <Icon
        name="magnify"
        size={20}
        color="#9ca3af"
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#9ca3af"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Icon name="close-circle" size={20} color="#9ca3af" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// ========== UPDATED TABLET BUTTONS ==========
const TabletActionButtons = ({ onAddProduct, onAddService }) => {
  return (
    <View style={styles.tabletButtonsContainer}>
      <TouchableOpacity
        style={styles.tabletButton}
        onPress={onAddProduct}
        activeOpacity={0.7}
      >
        <View
          style={[styles.tabletButtonContent, { backgroundColor: '#667eea' }]}
        >
          <View style={styles.tabletButtonIconContainer}>
            <Icon name="package-variant-plus" size={22} color="#fff" />
          </View>
          <View style={styles.tabletButtonTextContainer}>
            <Text style={styles.tabletButtonTitle}>Add Product</Text>
            <Text style={styles.tabletButtonSubtitle}>Inventory item</Text>
          </View>
          <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.8)" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabletButton}
        onPress={onAddService}
        activeOpacity={0.7}
      >
        <View
          style={[styles.tabletButtonContent, { backgroundColor: '#10b981' }]}
        >
          <View style={styles.tabletButtonIconContainer}>
            <Icon name="server-plus" size={22} color="#fff" />
          </View>
          <View style={styles.tabletButtonTextContainer}>
            <Text style={styles.tabletButtonTitle}>Add Service</Text>
            <Text style={styles.tabletButtonSubtitle}>Service offering</Text>
          </View>
          <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.8)" />
        </View>
      </TouchableOpacity>
    </View>
  );
};

// ========== UPDATED FAB COMPONENT ==========
const FloatingActionButton = ({
  fabOpen,
  setFabOpen,
  onAddProduct,
  onAddService,
}) => {
  const rotation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(rotation, {
      toValue: fabOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fabOpen]);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      <Animated.View
        style={[
          styles.fabMenu,
          {
            opacity: fabOpen ? 1 : 0,
            transform: [
              { scale: fabOpen ? 1 : 0.8 },
              { translateY: fabOpen ? 0 : 20 },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fabMenuItem}
          onPress={onAddProduct}
          activeOpacity={0.7}
        >
          <View style={styles.fabMenuItemContent}>
            <View
              style={[
                styles.fabMenuIconContainer,
                { backgroundColor: '#667eea' },
              ]}
            >
              <Icon name="package-variant-plus" size={22} color="#fff" />
            </View>
            <View style={styles.fabMenuTextContainer}>
              <Text style={styles.fabMenuTitle}>Add Product</Text>
              <Text style={styles.fabMenuSubtitle}>Add new inventory item</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <View style={styles.fabMenuDivider} />

        <TouchableOpacity
          style={styles.fabMenuItem}
          onPress={onAddService}
          activeOpacity={0.7}
        >
          <View style={styles.fabMenuItemContent}>
            <View
              style={[
                styles.fabMenuIconContainer,
                { backgroundColor: '#10b981' },
              ]}
            >
              <Icon name="server-plus" size={22} color="#fff" />
            </View>
            <View style={styles.fabMenuTextContainer}>
              <Text style={styles.fabMenuTitle}>Add Service</Text>
              <Text style={styles.fabMenuSubtitle}>
                Add new service offering
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </Animated.View>

      <TouchableOpacity
        style={styles.fabContainer}
        onPress={() => setFabOpen(!fabOpen)}
        activeOpacity={0.8}
      >
        <View style={styles.fabBackground}>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <Icon name="plus" size={28} color="white" />
          </Animated.View>
        </View>
      </TouchableOpacity>
    </>
  );
};

// ========== EMPTY STATE BUTTON ==========
const EmptyStateActionButton = ({ onAddProduct }) => {
  return (
    <TouchableOpacity
      style={styles.emptyStateButton}
      onPress={onAddProduct}
      activeOpacity={0.7}
    >
      <View style={styles.emptyStateButtonContent}>
        <Icon name="plus-circle" size={24} color="#fff" />
        <Text style={styles.emptyStateButtonText}>Add Your First Item</Text>
      </View>
    </TouchableOpacity>
  );
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
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Product & Service Stock</Text>
              <Text style={styles.subtitle}>
                Current inventory levels and management
              </Text>
            </View>

            {(permissions?.canCreateProducts || userCaps?.canCreateInventory) &&
              isTablet && (
                <TabletActionButtons
                  onAddProduct={() => setIsAddProductOpen(true)}
                  onAddService={() => setIsAddServiceOpen(true)}
                />
              )}
          </View>

          <SearchBar
            placeholder="Search products or services..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchBar}
          />

          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            style={styles.scrollView}
            contentContainerStyle={styles.productScrollContent}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading inventory...</Text>
              </View>
            ) : filteredProducts.length > 0 ? (
              <View>
                {/* Tablet/Desktop Table View */}
                {isTablet ? (
                  <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                      <View style={[styles.tableCell, { flex: 3 }]}>
                        <Text style={styles.tableHeaderText}>Item</Text>
                      </View>
                      <View style={[styles.tableCell, { flex: 1 }]}>
                        <Text style={styles.tableHeaderText}>Stock</Text>
                      </View>
                      <View style={[styles.tableCell, { flex: 1 }]}>
                        <Text style={styles.tableHeaderText}>Unit</Text>
                      </View>
                      {role !== 'user' && (
                        <View
                          style={[
                            styles.tableCell,
                            { flex: 1, alignItems: 'flex-end' },
                          ]}
                        >
                          <Text style={styles.tableHeaderText}>Actions</Text>
                        </View>
                      )}
                    </View>
                    <FlatList
                      data={filteredProducts.slice(0, 4)}
                      renderItem={renderTableRow}
                      keyExtractor={item => item._id}
                      scrollEnabled={false}
                      contentContainerStyle={{ paddingBottom: 160 }}
                    />
                  </View>
                ) : (
                  /* Mobile Card View */
                  <FlatList
                    data={filteredProducts.slice(0, 4)}
                    renderItem={renderProductItem}
                    keyExtractor={item => item._id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.mobileList}
                  />
                )}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                  <Icon name="package-variant" size={32} color="#8b5cf6" />
                </View>
                <Text style={styles.emptyTitle}>No Items Found</Text>
                <Text style={styles.emptyText}>
                  {searchTerm
                    ? `No items match "${searchTerm}". Try a different search term.`
                    : 'Get started by adding your first product or service.'}
                </Text>
                {(permissions?.canCreateProducts ||
                  userCaps?.canCreateInventory) && (
                  <EmptyStateActionButton
                    onAddProduct={() => setIsAddProductOpen(true)}
                  />
                )}
              </View>
            )}
          </ScrollView>

          {filteredProducts.length > 3 && (
            <CustomButton
              mode="outlined"
              onPress={() => navigation.navigate('Inventory')}
              style={styles.viewMoreButton}
              textStyle={styles.viewMoreButtonText}
              icon="chevron-right"
            >
              View More
            </CustomButton>
          )}
        </View>
      </View>

      {/* Name Dialog */}
      <CustomDialog
        visible={!!openNameDialog}
        onDismiss={() => setOpenNameDialog(null)}
        title="Product Name"
      >
        <View style={styles.nameDialogContent}>
          <Text style={styles.nameDialogText}>
            {capitalizeWords(openNameDialog)}
          </Text>
          <TouchableOpacity
            style={styles.dialogCloseButton}
            onPress={() => setOpenNameDialog(null)}
          >
            <Text style={styles.dialogCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </CustomDialog>

      {/* Edit Stock Dialog */}
      <CustomDialog
        visible={isEditDialogOpen}
        onDismiss={() => setIsEditDialogOpen(false)}
        title={
          selectedProduct
            ? `Update stock for ${capitalizeWords(selectedProduct.name)}`
            : 'Update stock'
        }
      >
        <View style={styles.editDialogContent}>
          {selectedProduct && (
            <StockEditForm
              product={selectedProduct}
              onSuccess={handleUpdateSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </View>
      </CustomDialog>

      {/* Add Product Dialog */}
      <CustomDialog
        visible={isAddProductOpen}
        onDismiss={() => setIsAddProductOpen(false)}
        title="Create New Product"
        style={styles.productDialog}
      >
        <View style={styles.formDialogContent}>
          <Text style={styles.dialogDescription}>
            Fill in the form to add a new product to your inventory.
          </Text>
          <ProductForm onSuccess={handleAddProductSuccess} />
        </View>
      </CustomDialog>

      {/* Add Service Dialog */}
      <CustomDialog
        visible={isAddServiceOpen}
        onDismiss={() => setIsAddServiceOpen(false)}
        title="Create New Service"
        style={styles.productDialog}
      >
        <View style={styles.formDialogContent}>
          <Text style={styles.dialogDescription}>
            Fill in the form to add a new service to your offerings.
          </Text>
          <ServiceForm onSuccess={handleAddServiceSuccess} />
        </View>
      </CustomDialog>

      {/* FAB for mobile */}
      {(permissions?.canCreateProducts || userCaps?.canCreateInventory) &&
        !isTablet && (
          <FloatingActionButton
            fabOpen={fabOpen}
            setFabOpen={setFabOpen}
            onAddProduct={() => {
              setFabOpen(false);
              setIsAddProductOpen(true);
            }}
            onAddService={() => {
              setFabOpen(false);
              setIsAddServiceOpen(true);
            }}
          />
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#f8fafc',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  cardContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    paddingHorizontal: 5,
    marginTop: 0,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 0,
    paddingHorizontal: 5,
  },
  // UPDATED Tablet Buttons Styles
  tabletButtonsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  tabletButton: {
    width: 200,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  tabletButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  tabletButtonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tabletButtonTextContainer: {
    flex: 1,
  },
  tabletButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  tabletButtonSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
  },
  // UPDATED FAB Styles
  fabContainer: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  fabBackground: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabMenu: {
    position: 'absolute',
    right: 20,
    bottom: 94,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 12,
    width: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fabMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fabMenuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fabMenuTextContainer: {
    flex: 1,
  },
  fabMenuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  fabMenuSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '400',
  },
  fabMenuDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
  },
  // UPDATED Empty State Button
  emptyStateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    width: 250,
    marginTop: 16,
  },
  emptyStateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#667eea',
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 8,
  },
  searchBar: {
    marginBottom: 16,
  },
  scrollView: {
    maxHeight: 600,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontWeight: 'bold',
    color: '#374151',
    fontSize: 14,
  },
  mobileList: {
    gap: 12,
    paddingBottom: 220,
  },

  productScrollContent: {
    paddingBottom: 220,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 50,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  viewMoreButton: {
    marginTop: 24,
    borderColor: '#d1d5db',
  },
  viewMoreButtonText: {
    color: '#374151',
  },
  // Button styles
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  customButtonContained: {
    backgroundColor: '#3b82f6',
  },
  customButtonOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonCompact: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buttonIcon: {
    marginRight: 4,
  },
  customButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  customButtonTextContained: {
    color: '#fff',
  },
  customButtonTextOutlined: {
    color: '#3b82f6',
  },
  buttonTextDisabled: {
    color: '#9ca3af',
  },
  buttonTextCompact: {
    fontSize: 14,
  },
  // Dialog styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
    minHeight: 200,
  },
  dialogMobile: {
    width: '100%',
    maxWidth: '100%',
    borderRadius: 10,
    marginHorizontal: 0,
    maxHeight: '100%',
    alignSelf: 'stretch',
  },
  modalOverlayMobile: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 0,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  dialogContent: {
    padding: 0,
  },
  productDialog: {
    maxHeight: '100%',
  },
  // Stock Edit Form
  stockEditContainer: {
    padding: 16,
  },
  stockEditLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  stockEditInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  stockEditButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  outlineButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  // Dialog content styles
  nameDialogContent: {
    paddingVertical: 20,
  },
  nameDialogText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 20,
  },
  editDialogContent: {
    paddingVertical: 20,
  },
  formDialogContent: {
    paddingVertical: 20,
  },
  dialogDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 24,
    paddingLeft: 10,
  },
  dialogCloseButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  dialogCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ProductStock;
