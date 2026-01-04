import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Linking,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePermissions } from '../../contexts/permission-context';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { useToast } from '../../components/hooks/useToast';
import { BASE_URL } from '../../config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/Dialog';

// Icons
import Icon from 'react-native-vector-icons/MaterialIcons';

// Custom components
import ProductForm from '../../components/products/ProductForm';
import ServiceForm from '../../components/services/ServiceForm';
import ExcelImportExport from '../../components/ui/ExcelImportExport';
import AppLayout from '../../components/layout/AppLayout';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const ITEMS_PER_PAGE = 10;

const formatCurrencyINR = value => {
  if (value === null || value === undefined || value === '') return '₹0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const extractNumber = value => {
  if (!value) return 0;
  const strValue = String(value);
  const numeric = strValue.replace(/[^0-9.]/g, '');
  return numeric ? Number(numeric) : 0;
};

export default function InventoryScreen() {
  const {
    permissions: userCaps,
    isLoading: isLoadingPermissions,
    refetch: refetchUserPermissions,
  } = useUserPermissions();
  const { permissions, refetch, isLoading: isLoadingPerms } = usePermissions();

  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [productCurrentPage, setProductCurrentPage] = useState(1);
  const [serviceCurrentPage, setServiceCurrentPage] = useState(1);

  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);

  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState(null);
  const [serviceToDelete, setServiceToDelete] = useState(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const { toast } = useToast();

  // ==========================================
  // PERMISSION CHECKS - SIRF CREATE KE LIYE
  // ==========================================
  const canCreateProducts =
    userCaps?.canCreateProducts ?? userCaps?.canCreateInventory ?? false;
  const webCanCreate = permissions?.canCreateProducts ?? false;
  const hasCreatePermission = canCreateProducts || webCanCreate;

  // Check role from localStorage (AsyncStorage)
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const loadUserRole = async () => {
      const role = await AsyncStorage.getItem('role');
      setUserRole(role);
    };
    loadUserRole();
  }, []);

  // ==========================================
  // FETCH FUNCTIONS
  // ==========================================
  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch companies.');
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : data.companies || []);
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Failed to load companies',
        description: err.message || 'Something went wrong.',
      });
    } finally {
      setIsLoadingCompanies(false);
    }
  }, [toast]);

  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch products.');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data.products || []);
      setProductCurrentPage(1);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load products',
        description:
          error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [toast]);

  const fetchServices = useCallback(async () => {
    setIsLoadingServices(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch services.');
      const data = await res.json();
      setServices(Array.isArray(data) ? data : data.services || []);
      setServiceCurrentPage(1);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load services',
        description:
          error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsLoadingServices(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCompanies();
    fetchProducts();
    fetchServices();
  }, [fetchCompanies, fetchProducts, fetchServices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchCompanies(),
      fetchProducts(),
      fetchServices(),
      refetch ? refetch() : Promise.resolve(),
      refetchUserPermissions ? refetchUserPermissions() : Promise.resolve(),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [
    fetchCompanies,
    fetchProducts,
    fetchServices,
    refetch,
    refetchUserPermissions,
  ]);

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================
  const openCreateProduct = () => {
    setProductToEdit(null);
    setIsProductFormOpen(true);
  };

  const openCreateService = () => {
    setServiceToEdit(null);
    setIsServiceFormOpen(true);
  };

  const openEditProduct = p => {
    setProductToEdit(p);
    setIsProductFormOpen(true);
  };

  const openEditService = s => {
    setServiceToEdit(s);
    setIsServiceFormOpen(true);
  };

  const onProductSaved = saved => {
    setIsProductFormOpen(false);
    setProductToEdit(null);
    setProducts(prev =>
      prev.some(p => p._id === saved._id)
        ? prev.map(p => (p._id === saved._id ? saved : p))
        : [saved, ...prev],
    );
    toast({
      title: 'Product saved',
      description: 'Product has been saved successfully.',
    });
  };

  const onServiceSaved = saved => {
    setIsServiceFormOpen(false);
    setServiceToEdit(null);
    setServices(prev =>
      prev.some(s => s._id === saved._id)
        ? prev.map(s => (s._id === saved._id ? saved : s))
        : [saved, ...prev],
    );
    toast({
      title: 'Service saved',
      description: 'Service has been saved successfully.',
    });
  };

  const confirmDeleteProduct = p => {
    setProductToDelete(p);
    setServiceToDelete(null);
    setIsAlertOpen(true);
  };

  const confirmDeleteService = s => {
    setServiceToDelete(s);
    setProductToDelete(null);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      if (productToDelete) {
        const res = await fetch(
          `${BASE_URL}/api/products/${productToDelete._id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok) throw new Error('Failed to delete product.');
        setProducts(prev => prev.filter(p => p._id !== productToDelete._id));
        toast({ title: 'Product deleted' });
      } else if (serviceToDelete) {
        const res = await fetch(
          `${BASE_URL}/api/services/${serviceToDelete._id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok) throw new Error('Failed to delete service.');
        setServices(prev => prev.filter(s => s._id !== serviceToDelete._id));
        toast({ title: 'Service deleted' });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Deletion failed',
        description:
          error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsAlertOpen(false);
      setProductToDelete(null);
      setServiceToDelete(null);
    }
  };

  // ==========================================
  // SELECTION HANDLING - EDIT/DELETE PERMISSION CHECK HATAYA
  // ==========================================
  const handleSelectProduct = (productId, checked, index, shiftKey = false) => {
    // EDIT/DELETE PERMISSION CHECK HATAYA
    // if (userRole === 'user') return; // Yeh line hatani hai

    if (shiftKey && lastSelectedIndex !== null && index !== undefined) {
      const startIndex = Math.min(lastSelectedIndex, index);
      const endIndex = Math.max(lastSelectedIndex, index);
      const rangeIds = products.slice(startIndex, endIndex + 1).map(p => p._id);

      if (checked) {
        setSelectedProducts(prev => [...new Set([...prev, ...rangeIds])]);
      } else {
        setSelectedProducts(prev => prev.filter(id => !rangeIds.includes(id)));
      }
      setLastSelectedIndex(index);
    } else {
      if (checked) {
        setSelectedProducts(prev => [...prev, productId]);
      } else {
        setSelectedProducts(prev => prev.filter(id => id !== productId));
      }
      setLastSelectedIndex(index ?? null);
    }
  };

  const handleSelectAllProducts = checked => {
    // EDIT/DELETE PERMISSION CHECK HATAYA
    // if (userRole === 'user') return; // Yeh line hatani hai

    if (checked) {
      setSelectedProducts(products.map(p => p._id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleBulkDeleteProducts = async () => {
    // EDIT/DELETE PERMISSION CHECK HATAYA
    if (selectedProducts.length === 0) return; // if (selectedProducts.length === 0 || userRole === 'user') return;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/products/bulk-delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productIds: selectedProducts }),
      });

      if (!res.ok) throw new Error('Failed to delete products.');

      toast({
        title: 'Products Deleted',
        description: `${selectedProducts.length} products have been successfully removed.`,
      });

      setSelectedProducts([]);
      fetchProducts();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Bulk Deletion Failed',
        description:
          error instanceof Error ? error.message : 'Something went wrong.',
      });
    }
  };

  // ==========================================
  // PAGINATION
  // ==========================================
  const productTotalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const serviceTotalPages = Math.ceil(services.length / ITEMS_PER_PAGE);

  const paginatedProducts = useMemo(() => {
    const startIndex = (productCurrentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return products.slice(startIndex, endIndex);
  }, [products, productCurrentPage]);

  const paginatedServices = useMemo(() => {
    const startIndex = (serviceCurrentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return services.slice(startIndex, endIndex);
  }, [services, serviceCurrentPage]);

  const goToNextProductPage = () => {
    setProductCurrentPage(prev => Math.min(prev + 1, productTotalPages));
  };

  const goToPrevProductPage = () => {
    setProductCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextServicePage = () => {
    setServiceCurrentPage(prev => Math.min(prev + 1, serviceTotalPages));
  };

  const goToPrevServicePage = () => {
    setServiceCurrentPage(prev => Math.max(prev - 1, 1));
  };

  // ==========================================
  // ACTION BUTTONS (SIRF CREATE KE LIYE PERMISSION)
  // ==========================================
  const renderActionButtons = () => {
    if (!hasCreatePermission) {
      return null;
    }

    if (activeTab === 'products') {
      return (
        <View style={styles.actionButtons}>
          <ExcelImportExport
            templateData={
              activeTab === 'products'
                ? [
                    {
                      Company:
                        companies.length > 0
                          ? companies[0].businessName
                          : 'Your Company',
                      'Item Name': '',
                      Stock: '',
                      Unit: '',
                      'Cost Price': '',
                      'Selling Price': '',
                      HSN: '',
                    },
                  ]
                : [{ 'Service Name': '', Amount: '', SAC: '' }]
            }
            templateFileName={`${activeTab}_template.xlsx`}
            onImportSuccess={() => {
              if (activeTab === 'products') fetchProducts();
              else fetchServices();
            }}
            expectedColumns={
              activeTab === 'products'
                ? [
                    'Company',
                    'Item Name',
                    'Stock',
                    'Unit',
                    'Cost Price',
                    'Selling Price',
                    'HSN',
                  ]
                : ['Service Name', 'Amount', 'SAC']
            }
            transformImportData={data => {
              if (activeTab === 'products') {
                return data.map(item => {
                  const companyName = item['Company']?.trim();

                  // Find matching company
                  const foundCompany = companies.find(
                    c =>
                      c.businessName.toLowerCase() ===
                      companyName?.toLowerCase(),
                  );

                  // Log for debugging
                  console.log('Mapping company:', {
                    excelCompany: companyName,
                    availableCompanies: companies.map(c => ({
                      id: c._id,
                      name: c.businessName,
                    })),
                    foundCompanyId: foundCompany?._id,
                  });

                  return {
                    company: foundCompany?._id || companies[0]?._id || '',
                    
                    name: item['Item Name'],
                    stocks: Number(item['Stock']) || 0,
                    unit: item['Unit'] || 'Piece',
                    costPrice: Number(item['Cost Price']) || 0,
                    sellingPrice: Number(item['Selling Price']) || 0,
                    hsn: item['HSN'] || '',
                  };
                });
              } else {
                return data.map(item => ({
                  serviceName: item['Service Name'],
                  amount: Number(item['Amount']) || 0,
                  sac: item['SAC'] || '',
                }));
              }
            }}
            activeTab={activeTab}
            companies={companies} // Add this prop
          />
          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={openCreateProduct}
          >
            <Icon name="add-circle" size={20} color="#007AFF" />
            <Text style={[styles.buttonText, styles.outlineButtonText]}>
              Add Product
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeTab === 'services') {
      return (
        <View style={styles.actionButtons}>
          <ExcelImportExport
            templateData={[
              {
                'Service Name': '',
                Amount: '',
                SAC: '',
              },
            ]}
            templateFileName="service_template.xlsx"
            importEndpoint={`${BASE_URL}/api/services`}
            onImportSuccess={fetchServices}
            expectedColumns={['Service Name', 'Amount', 'SAC']}
            transformImportData={data =>
              data.map(item => ({
                serviceName: item['Service Name'],
                amount: extractNumber(item['Amount']),
                sac: item['SAC'],
              }))
            }
          />
          <TouchableOpacity style={styles.button} onPress={openCreateService}>
            <Icon name="add-circle" size={20} color="white" />
            <Text style={styles.buttonText}>Add Service</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  // ==========================================
  // PRODUCT CARD (EDIT/DELETE KE PERMISSION CHECKS HATAYE)
  // ==========================================
  const renderProductCard = (item, index) => {
    const absoluteIndex = (productCurrentPage - 1) * ITEMS_PER_PAGE + index;
    const isLowStock = (item.stocks ?? 0) <= 10;

    return (
      <View style={styles.card} key={item._id}>
        <View style={styles.cardHeader}>
          <View style={styles.productInfo}>
            <View style={styles.productIcon}>
              <Icon name="inventory" size={20} color="#007AFF" />
            </View>
            <View style={styles.productDetails}>
              <Text style={styles.productName}>
                {item.name?.charAt(0).toUpperCase() + item.name?.slice(1)}
              </Text>
              <Text style={styles.companyName}>
                {typeof item.company === 'object' && item.company
                  ? item.company.businessName
                  : '-'}
              </Text>
            </View>
          </View>

          <View style={styles.priceSection}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Cost Price</Text>
              <Text style={styles.priceValue}>
                {item.costPrice ? formatCurrencyINR(item.costPrice) : '-'}
              </Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Selling Price</Text>
              <Text style={styles.priceValue}>
                {item.sellingPrice ? formatCurrencyINR(item.sellingPrice) : '-'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.stockSection}>
          <Text style={styles.stockLabel}>Stock</Text>
          <View style={styles.stockInfo}>
            <Text
              style={[
                styles.stockValue,
                (item.stocks ?? 0) > 10
                  ? styles.stockHigh
                  : (item.stocks ?? 0) > 0
                  ? styles.stockMedium
                  : styles.stockLow,
              ]}
            >
              {item.stocks ?? 0}
            </Text>
            <Text style={styles.unit}>{item.unit ?? 'Piece'}</Text>
          </View>
          {isLowStock && (item.stocks ?? 0) > 0 && (
            <Text style={styles.lowStockWarning}>Low stock</Text>
          )}
        </View>

        {item.hsn && (
          <View style={styles.hsnSection}>
            <Text style={styles.hsnLabel}>HSN</Text>
            <Text style={styles.hsnValue}>{item.hsn}</Text>
          </View>
        )}

        <View style={styles.cardActions}>
          <View style={styles.dateContainer}>
            <Text style={styles.createdDate}>
              {item.createdAt
                ? new Date(item.createdAt).toLocaleDateString()
                : '—'}
            </Text>
          </View>

          {/* EDIT/DELETE BUTTONS - SABKE LIYE (PERMISSION CHECK HATAYA) */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => openEditProduct(item)}
            >
              <Icon name="edit" size={16} color="#007AFF" />
              <Text style={[styles.actionButtonText, styles.editButtonText]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => confirmDeleteProduct(item)}
            >
              <Icon name="delete" size={16} color="#DC2626" />
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ==========================================
  // SERVICE CARD (EDIT/DELETE KE PERMISSION CHECKS HATAYE)
  // ==========================================
  const renderServiceCard = item => {
    return (
      <View style={styles.card} key={item._id}>
        <View style={styles.cardHeader}>
          <View style={styles.serviceInfo}>
            <View style={[styles.serviceIcon, { backgroundColor: '#EC4899' }]}>
              <Icon name="build" size={20} color="white" />
            </View>
            <View style={styles.serviceDetails}>
              <Text style={styles.serviceName}>{item.serviceName}</Text>
            </View>
          </View>

          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>
              {formatCurrencyINR(item.amount)}
            </Text>
          </View>
        </View>

        {item.sac && (
          <View style={styles.sacSection}>
            <Text style={styles.sacLabel}>SAC</Text>
            <Text style={styles.sacValue}>{item.sac}</Text>
          </View>
        )}

        <View style={styles.cardActions}>
          <View style={styles.dateContainer}>
            <Text style={styles.createdDate}>
              {item.createdAt
                ? new Date(item.createdAt).toLocaleDateString()
                : '—'}
            </Text>
          </View>

          {/* EDIT/DELETE BUTTONS - SABKE LIYE (PERMISSION CHECK HATAYA) */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => openEditService(item)}
            >
              <Icon name="edit" size={16} color="#007AFF" />
              <Text style={[styles.actionButtonText, styles.editButtonText]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => confirmDeleteService(item)}
            >
              <Icon name="delete" size={16} color="#DC2626" />
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ==========================================
  // HEADER COMPONENT
  // ==========================================
  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inventory Management</Text>
          <Text style={styles.subtitle}>
            Track and manage your products and services.
          </Text>
        </View>

        {renderActionButtons()}
      </View>

      <View style={styles.tabsContainer}>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'products' && styles.activeTab]}
            onPress={() => setActiveTab('products')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'products' && styles.activeTabText,
              ]}
            >
              Products ({products.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'services' && styles.activeTab]}
            onPress={() => setActiveTab('services')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'services' && styles.activeTabText,
              ]}
            >
              Services ({services.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bulk Actions - EDIT/DELETE PERMISSION CHECK HATAYA */}
      {activeTab === 'products' && selectedProducts.length > 0 && (
        <View style={styles.bulkActions}>
          <TouchableOpacity
            style={[styles.button, styles.destructiveButton]}
            onPress={handleBulkDeleteProducts}
          >
            <Icon name="delete" size={20} color="white" />
            <Text style={styles.buttonText}>
              Delete ({selectedProducts.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty States with permission checks */}
      {activeTab === 'products' &&
        !isLoadingProducts &&
        products.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="inventory" size={48} color="#666" />
            <Text style={styles.emptyStateTitle}>No Products Found</Text>
            <Text style={styles.emptyStateDescription}>
              {hasCreatePermission
                ? 'Create your first product to get started.'
                : 'No products available in your inventory.'}
            </Text>
            {hasCreatePermission && (
              <TouchableOpacity
                style={styles.button}
                onPress={openCreateProduct}
              >
                <Icon name="add-circle" size={20} color="white" />
                <Text style={styles.buttonText}>Add Product</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

      {activeTab === 'services' &&
        !isLoadingServices &&
        services.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="build" size={48} color="#666" />
            <Text style={styles.emptyStateTitle}>No Services Found</Text>
            <Text style={styles.emptyStateDescription}>
              {hasCreatePermission
                ? 'Create your first service to get started.'
                : 'No services available in your inventory.'}
            </Text>
            {hasCreatePermission && (
              <TouchableOpacity
                style={styles.button}
                onPress={openCreateService}
              >
                <Icon name="add-circle" size={20} color="white" />
                <Text style={styles.buttonText}>Add Service</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
    </View>
  );

  // ==========================================
  // RENDER ITEM FUNCTION
  // ==========================================
  const renderItem = ({ item, index }) => {
    if (activeTab === 'products') {
      return renderProductCard(item, index);
    } else {
      return renderServiceCard(item);
    }
  };

  // ==========================================
  // FOOTER COMPONENT
  // ==========================================
  const renderFooter = () => {
    if (
      activeTab === 'products' &&
      productTotalPages > 1 &&
      products.length > 0
    ) {
      return (
        <View style={styles.pagination}>
          <Text style={styles.paginationInfo}>
            Showing {(productCurrentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
            {Math.min(productCurrentPage * ITEMS_PER_PAGE, products.length)} of{' '}
            {products.length} products
          </Text>
          <View style={styles.paginationButtons}>
            <TouchableOpacity
              style={[
                styles.paginationButton,
                productCurrentPage === 1 && styles.paginationButtonDisabled,
              ]}
              onPress={goToPrevProductPage}
              disabled={productCurrentPage === 1}
            >
              <Icon
                name="chevron-left"
                size={20}
                color={productCurrentPage === 1 ? '#999' : '#333'}
              />
              <Text
                style={[
                  styles.paginationButtonText,
                  productCurrentPage === 1 &&
                    styles.paginationButtonTextDisabled,
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paginationButton,
                styles.paginationButtonPrimary,
                productCurrentPage === productTotalPages &&
                  styles.paginationButtonDisabled,
              ]}
              onPress={goToNextProductPage}
              disabled={productCurrentPage === productTotalPages}
            >
              <Text
                style={[
                  styles.paginationButtonText,
                  styles.paginationButtonTextPrimary,
                ]}
              >
                Next
              </Text>
              <Icon name="chevron-right" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (
      activeTab === 'services' &&
      serviceTotalPages > 1 &&
      services.length > 0
    ) {
      return (
        <View style={styles.pagination}>
          <Text style={styles.paginationInfo}>
            Showing {(serviceCurrentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
            {Math.min(serviceCurrentPage * ITEMS_PER_PAGE, services.length)} of{' '}
            {services.length} services
          </Text>
          <View style={styles.paginationButtons}>
            <TouchableOpacity
              style={[
                styles.paginationButton,
                serviceCurrentPage === 1 && styles.paginationButtonDisabled,
              ]}
              onPress={goToPrevServicePage}
              disabled={serviceCurrentPage === 1}
            >
              <Icon
                name="chevron-left"
                size={20}
                color={serviceCurrentPage === 1 ? '#999' : '#333'}
              />
              <Text
                style={[
                  styles.paginationButtonText,
                  serviceCurrentPage === 1 &&
                    styles.paginationButtonTextDisabled,
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paginationButton,
                styles.paginationButtonPrimary,
                serviceCurrentPage === serviceTotalPages &&
                  styles.paginationButtonDisabled,
              ]}
              onPress={goToNextServicePage}
              disabled={serviceCurrentPage === serviceTotalPages}
            >
              <Text
                style={[
                  styles.paginationButtonText,
                  styles.paginationButtonTextPrimary,
                ]}
              >
                Next
              </Text>
              <Icon name="chevron-right" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return null;
  };

  const getData = () => {
    if (activeTab === 'products') {
      return products.length > 0 ? paginatedProducts : [];
    } else {
      return services.length > 0 ? paginatedServices : [];
    }
  };

  // ==========================================
  // LOADING STATE
  // ==========================================
  if (isLoadingCompanies || isLoadingPermissions || isLoadingPerms) {
    return (
      <AppLayout>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading inventory...</Text>
          </View>
        </SafeAreaView>
      </AppLayout>
    );
  }

  // ==========================================
  // NO COMPANY STATE
  // ==========================================
  if (companies.length === 0) {
    return (
      <AppLayout>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.noCompanyContainer}>
            <View style={styles.noCompanyCard}>
              <View style={styles.noCompanyIcon}>
                <Icon name="business" size={32} color="#007AFF" />
              </View>
              <Text style={styles.noCompanyTitle}>Company Setup Required</Text>
              <Text style={styles.noCompanyDescription}>
                Contact us to enable your company account and access all
                features.
              </Text>
              <View style={styles.noCompanyButtons}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => Linking.openURL('tel:+918989773689')}
                >
                  <Icon name="phone" size={20} color="white" />
                  <Text style={styles.primaryButtonText}>+91-8989773689</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => Linking.openURL('mailto:support@company.com')}
                >
                  <Icon name="email" size={20} color="#007AFF" />
                  <Text style={styles.secondaryButtonText}>Email Us</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </AppLayout>
    );
  }

  // ==========================================
  // MAIN CONTENT
  // ==========================================
  return (
    <AppLayout>
      <View style={styles.container}>
        <FlatList
          data={getData()}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
        />

        {/* Product Form Dialog */}
        <Dialog
          open={isProductFormOpen}
          onOpenChange={isOpen => {
            if (!isOpen) {
              setProductToEdit(null);
              setIsProductFormOpen(false);
            }
          }}
        >
          <DialogContent>
            <View>
              <DialogHeader>
                <DialogTitle>
                  {productToEdit ? 'Edit Product' : 'Create New Product'}
                </DialogTitle>
                <DialogDescription>
                  {productToEdit
                    ? 'Update the product details.'
                    : 'Fill in the form to add a new product.'}
                </DialogDescription>
              </DialogHeader>
              <ScrollView>
                <ProductForm
                  product={productToEdit}
                  onSuccess={onProductSaved}
                  onClose={() => {
                    setIsProductFormOpen(false);
                    setProductToEdit(null);
                  }}
                />
              </ScrollView>
            </View>
          </DialogContent>
        </Dialog>

        {/* Service Form Dialog */}
        <Dialog
          open={isServiceFormOpen}
          onOpenChange={isOpen => {
            if (!isOpen) setServiceToEdit(null);
            setIsServiceFormOpen(isOpen);
          }}
        >
          <DialogContent>
            {/* Header without close button (Dialog has built-in close) */}
            <View style={styles.dialogHeaderRow}>
              <View style={styles.dialogHeaderLeft}>
                <Text style={styles.dialogHeaderTitle}>
                  {serviceToEdit ? 'Edit Service' : 'Create New Service'}
                </Text>
                <Text style={styles.dialogHeaderSubtitle}>
                  {serviceToEdit
                    ? 'Update service details'
                    : 'Add new service to your records'}
                </Text>
              </View>
            </View>

            <ServiceForm
              service={serviceToEdit}
              onSuccess={onServiceSaved}
              onClose={() => {
                setIsServiceFormOpen(false);
                setServiceToEdit(null);
              }}
              headerTitle={
                serviceToEdit ? 'Edit Service' : 'Create New Service'
              }
              headerSubtitle={
                serviceToEdit
                  ? 'Update service details'
                  : 'Add new service to your records'
              }
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal - EDIT/DELETE PERMISSION CHECK HATAYA */}
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
                This action cannot be undone. This will permanently delete the{' '}
                {productToDelete ? 'product' : 'service'}.
              </Text>
              <View style={styles.alertButtons}>
                <TouchableOpacity
                  style={[styles.alertButton, styles.alertCancelButton]}
                  onPress={() => setIsAlertOpen(false)}
                >
                  <Text style={styles.alertCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.alertButton, styles.alertConfirmButton]}
                  onPress={handleDelete}
                >
                  <Text style={styles.alertConfirmButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AppLayout>
  );
}
// ==========================================
// STYLES (Unchanged)
// ==========================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  destructiveButton: {
    backgroundColor: '#DC2626',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  outlineButtonText: {
    color: '#007AFF',
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#333',
  },
  bulkActions: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  createdDate: {
    fontSize: 12,
    color: '#999',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  priceItem: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  stockSection: {
    marginBottom: 12,
  },
  stockLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stockHigh: {
    color: '#059669',
  },
  stockMedium: {
    color: '#D97706',
  },
  stockLow: {
    color: '#DC2626',
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  lowStockWarning: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
    marginTop: 4,
  },
  hsnSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hsnLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  hsnValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  amountSection: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  sacSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sacLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  sacValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 8,
  },
  dateContainer: {
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  editButton: {
    backgroundColor: '#E3F2FD',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  editButtonText: {
    color: '#007AFF',
  },
  deleteButtonText: {
    color: '#DC2626',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  pagination: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  paginationInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  paginationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
    gap: 8,
  },
  paginationButtonPrimary: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  paginationButtonDisabled: {
    opacity: 0.4,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  paginationButtonTextPrimary: {
    color: 'white',
  },
  paginationButtonTextDisabled: {
    color: '#9ca3af',
  },
  noCompanyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  noCompanyCard: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  noCompanyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noCompanyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  noCompanyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  noCompanyButtons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  alertDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  alertButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  alertCancelButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  alertConfirmButton: {
    backgroundColor: '#dc2626',
  },
  alertCancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  alertConfirmButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  dialogHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dialogHeaderLeft: {
    flex: 1,
  },
  dialogHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  dialogHeaderSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});
