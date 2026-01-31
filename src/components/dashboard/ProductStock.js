import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/Dialog';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const baseURL = BASE_URL;

const StockEditForm = ({ product, onSuccess, onCancel }) => {
  const [newStock, setNewStock] = useState(product.stocks?.toString() || '0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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

      toast({
        title: 'Stock updated',
        description: 'Stock has been updated successfully.',
      });
      onSuccess(data.product);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to update stock',
        description: error.message,
      });
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

// ========== IMPROVED TABLET BUTTONS ==========
const TabletActionButtons = ({ onAddProduct, onAddService }) => {
  return (
    <View style={styles.tabletButtonsContainer}>
      <TouchableOpacity
        style={styles.tabletButton}
        onPress={onAddProduct}
        activeOpacity={0.8}
      >
        <View
          style={[styles.tabletButtonContent, { backgroundColor: '#6366f1' }]}
        >
          <View style={styles.tabletButtonIconContainer}>
            <Icon name="package-variant-plus" size={22} color="#fff" />
          </View>
          <View style={styles.tabletButtonTextContainer}>
            <Text style={styles.tabletButtonTitle}>Add Product</Text>
            <Text style={styles.tabletButtonSubtitle}>Inventory item</Text>
          </View>
          <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.9)" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabletButton}
        onPress={onAddService}
        activeOpacity={0.8}
      >
        <View
          style={[styles.tabletButtonContent, { backgroundColor: '#059669' }]}
        >
          <View style={styles.tabletButtonIconContainer}>
            <Icon name="server-plus" size={22} color="#fff" />
          </View>
          <View style={styles.tabletButtonTextContainer}>
            <Text style={styles.tabletButtonTitle}>Add Service</Text>
            <Text style={styles.tabletButtonSubtitle}>Service offering</Text>
          </View>
          <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.9)" />
        </View>
      </TouchableOpacity>
    </View>
  );
};

// ========== IMPROVED EMPTY STATE BUTTON ==========
const EmptyStateActionButton = ({ onAddProduct }) => {
  return (
    <TouchableOpacity
      style={styles.emptyStateButton}
      onPress={onAddProduct}
      activeOpacity={0.8}
    >
      <View style={styles.emptyStateButtonContent}>
        <Icon name="plus-circle" size={24} color="#fff" />
        <Text style={styles.emptyStateButtonText}>Add Your First Item</Text>
      </View>
    </TouchableOpacity>
  );
};

// ========== IMPROVED MOBILE HEADER BUTTONS ==========
const MobileHeaderButton = ({ icon, label, color, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.mobileHeaderButton, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.mobileHeaderButtonInner}>
        <View style={styles.mobileHeaderIconContainer}>
          <Icon name={icon} size={18} color="#fff" />
        </View>
        <Text style={styles.mobileHeaderButtonText}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const ProductStock = ({
  navigation,
  refetchPermissions,
  refetchUserPermissions,
}) => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState('user');
  const [openNameDialog, setOpenNameDialog] = useState(null);

  const { toast } = useToast();
  const { permissions } = usePermissions();
  const { selectedCompanyId } = useCompany();
  const { permissions: userCaps } = useUserPermissions();

  // Permission checks - accept both 'products' and 'inventory' flags
  const canCreateProducts =
    userCaps?.canCreateProducts ?? userCaps?.canCreateInventory ?? false;
  const webCanCreate =
    permissions?.canCreateProducts ?? permissions?.canCreateInventory ?? false;
  const showCreateButtons = canCreateProducts || webCanCreate;

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
      let data = await res.json();
      let productsList = Array.isArray(data) ? data : data.products || [];

      // Client-side extra safety filter
      if (selectedCompanyId) {
        productsList = productsList.filter(p => {
          // Product's company can be an object or a string ID
          const cId = typeof p.company === 'object' ? p.company?._id : p.company;
          return cId === selectedCompanyId || !cId; // !cId handles products that are globally available
        });
      }

      setProducts(productsList);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load products',
        description: error.message,
      });
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
    Promise.all([
      fetchProducts(),
      refetchPermissions ? refetchPermissions() : Promise.resolve(),
      refetchUserPermissions ? refetchUserPermissions() : Promise.resolve(),
    ]).finally(() => {
      setRefreshing(false);
    });
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
    toast({
      title: 'Product Created',
      description: `${capitalizeWords(
        newProduct.name,
      )} has been added successfully.`,
    });
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
    toast({
      title: 'Service Created',
      description: `${capitalizeWords(
        newService.serviceName,
      )} has been added successfully.`,
    });
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

  const shouldShowComponent = () => {
    const hasProductPermission = permissions?.canCreateProducts;
    const hasUserInventoryPermission = userCaps?.canCreateInventory;
    const maxInventories = permissions?.maxInventories ?? 0;
    

    if (!hasProductPermission && !hasUserInventoryPermission && maxInventories === 0) {
      return false;
    }
    
    return true;
  };

  // Hide component if user has no permissions
  if (!shouldShowComponent()) {
    return null; // Component will not render
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Product & Service Stock</Text>
              <Text style={styles.subtitle}>
                Current inventory levels and management
              </Text>
            </View>

            {showCreateButtons && isTablet && (
              <TabletActionButtons
                onAddProduct={() => setIsAddProductOpen(true)}
                onAddService={() => setIsAddServiceOpen(true)}
              />
            )}
          </View>

          {/* IMPROVED: Header buttons for mobile (non-tablet) */}
          {showCreateButtons && !isTablet && (
            <View style={styles.mobileHeaderButtonsContainer}>
              <MobileHeaderButton
                label="Add Product"
                color="#486adaff"
                onPress={() => setIsAddProductOpen(true)}
              />
              <MobileHeaderButton
                label="Add Service"
                color="#2b9775ff"
                onPress={() => setIsAddServiceOpen(true)}
              />
            </View>
          )}

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
                <ActivityIndicator size="large" color="#6366f1" />
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
                {showCreateButtons && (
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
      <Dialog
        open={!!openNameDialog}
        onOpenChange={() => setOpenNameDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Product Name</DialogTitle>
          </DialogHeader>
          <View style={styles.nameDialogContent}>
            <Text style={styles.nameDialogText}>
              {capitalizeWords(openNameDialog)}
            </Text>
          </View>
        </DialogContent>
      </Dialog>

      {/* Edit Stock Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={() => setIsEditDialogOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedProduct
                ? `Update stock for ${capitalizeWords(selectedProduct.name)}`
                : 'Update stock'}
            </DialogTitle>
          </DialogHeader>
          <View style={styles.editDialogContent}>
            {selectedProduct && (
              <StockEditForm
                product={selectedProduct}
                onSuccess={handleUpdateSuccess}
                onCancel={() => setIsEditDialogOpen(false)}
              />
            )}
          </View>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog
        open={isAddProductOpen}
        onOpenChange={() => setIsAddProductOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
            <DialogDescription>
              Fill in the form to add a new product to your inventory.
            </DialogDescription>
          </DialogHeader>
          <View style={styles.formDialogContent}>
            <ProductForm
              hideHeader={true}
              onSuccess={handleAddProductSuccess}
              onClose={() => setIsAddProductOpen(false)}
            />
          </View>
        </DialogContent>
      </Dialog>

      {/* Add Service Dialog */}
      <Dialog
        open={isAddServiceOpen}
        onOpenChange={() => setIsAddServiceOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Service</DialogTitle>
            <DialogDescription>
              Fill in the form to add a new service to your offerings.
            </DialogDescription>
          </DialogHeader>
          <View style={styles.formDialogContent}>
            <ServiceForm
              hideHeader={true}
              onSuccess={handleAddServiceSuccess}
              onClose={() => setIsAddServiceOpen(false)}
            />
          </View>
        </DialogContent>
      </Dialog>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    // backgroundColor: '#ffffff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  cardContent: {
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    // marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '400',
  },
  // IMPROVED: Mobile Header Buttons
  mobileHeaderButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  mobileHeaderButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  mobileHeaderButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 10,
  },
  mobileHeaderButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  // IMPROVED: Tablet Buttons Styles
  tabletButtonsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  tabletButton: {
    width: 220,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  tabletButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  tabletButtonIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  tabletButtonTextContainer: {
    flex: 1,
  },
  tabletButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  tabletButtonSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  // IMPROVED: Empty State Button
  emptyStateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    width: 260,
    marginTop: 20,
  },
  emptyStateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 18,
    gap: 12,
    backgroundColor: '#6366f1',
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 10,
    fontWeight: '400',
  },
 
  scrollView: {
    maxHeight: 600,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '500',
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    fontWeight: '700',
    color: '#374151',
    fontSize: 14,
    letterSpacing: 0.3,
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
    padding: 40,
  },
  emptyIcon: {
    backgroundColor: '#f3f4f6',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
    maxWidth: '80%',
  },
  viewMoreButton: {
    marginTop: 24,
    borderColor: '#d1d5db',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
  },
  viewMoreButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  // Button styles
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  customButtonContained: {
    backgroundColor: '#6366f1',
  },
  customButtonOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#6366f1',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonCompact: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonIcon: {
    marginRight: 6,
  },
  customButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  customButtonTextContained: {
    color: '#fff',
  },
  customButtonTextOutlined: {
    color: '#6366f1',
  },
  buttonTextDisabled: {
    color: '#9ca3af',
  },
  buttonTextCompact: {
    fontSize: 14,
  },
  // Dialog styles
  dialogContent: {
    padding: 24,
  },
  dialogHeader: {
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  dialogDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  // Stock Edit Form
  stockEditContainer: {
    padding: 24,
  },
  stockEditLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    fontWeight: '500',
  },
  stockEditInput: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
    fontWeight: '500',
  },
  stockEditButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
  },
  outlineButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  nameDialogContent: {
    padding: 0,
  },
  nameDialogText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 0,
    lineHeight: 24,
    fontWeight: '500',
  },
  editDialogContent: {
    padding: 0,
  },
  formDialogContent: {
    flex: 1,
    padding: 0,
  },
  formDialogStyle: {
    maxHeight: '88%',
  },
});

export default ProductStock;