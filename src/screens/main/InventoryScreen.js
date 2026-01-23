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
import { useCompany } from '../../contexts/company-context';
import { useSocket } from '../../components/hooks/useSocket';
import { useToast } from '../../components/hooks/useToast';
import { BASE_URL } from '../../config';
import { useFocusEffect } from '@react-navigation/native';
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
import InventorySocketListener from '../../socketlisteners/InventorySocketListener';
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
  const { selectedCompanyId, triggerCompaniesRefresh, refreshTrigger } =
    useCompany();

  const { socket } = useSocket();

  // Load user data from AsyncStorage
  const [user, setUser] = useState(null);
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
          console.log('📱 InventoryScreen: User loaded from storage');
        }
      } catch (error) {
        console.error('❌ InventoryScreen: Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  // Trigger company refresh when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 InventoryScreen focused - triggering company refresh...');
      triggerCompaniesRefresh();
    }, [triggerCompaniesRefresh]),
  );

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

  const fetchProducts = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoadingProducts(true);
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found.');

        const queryParam = selectedCompanyId
          ? `?companyId=${selectedCompanyId}`
          : '';

        const res = await fetch(`${BASE_URL}/api/products${queryParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch products.');
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : data.products || []);
        setProductCurrentPage(1);

        if (isSilent) {
          console.log('✅ Products updated silently via socket');
        }
      } catch (error) {
        if (!isSilent) {
          toast({
            variant: 'destructive',
            title: 'Failed to load products',
            description:
              error instanceof Error ? error.message : 'Something went wrong.',
          });
        }
      } finally {
        if (!isSilent) setIsLoadingProducts(false);
      }
    },
    [toast, selectedCompanyId],
  );

  const fetchServices = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoadingServices(true);
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found.');

        // Services are global (same for all companies) — fetch without company filter
        const res = await fetch(`${BASE_URL}/api/services`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch services.');
        const data = await res.json();
        setServices(Array.isArray(data) ? data : data.services || []);
        setServiceCurrentPage(1);

        if (isSilent) {
          console.log('✅ Services updated silently via socket');
        }
      } catch (error) {
        if (!isSilent) {
          toast({
            variant: 'destructive',
            title: 'Failed to load services',
            description:
              error instanceof Error ? error.message : 'Something went wrong.',
          });
        }
      } finally {
        if (!isSilent) setIsLoadingServices(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchCompanies();
    fetchProducts();
    fetchServices();
  }, [fetchCompanies, fetchProducts, fetchServices]);

  // Re-fetch companies silently when global refresh is triggered (avoid full-screen loader)
  const fetchCompaniesSilent = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : data.companies || []);
    } catch (err) {
      console.error('fetchCompaniesSilent failed:', err);
    }
  }, []);

  React.useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchCompaniesSilent().catch(err =>
        console.error(
          'Inventory fetchCompaniesSilent after trigger failed:',
          err,
        ),
      );
    }
  }, [refreshTrigger, fetchCompaniesSilent]);

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
      setSelectedProducts(filteredProducts.map(p => p._id));
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

  // React Native Screen ke andar add karein
  const userAllowedCompanyIds = useMemo(() => {
    return companies.map(c => String(c._id));
  }, [companies]);

  const filteredProducts = useMemo(() => {
    let data = products;

    // STEP A: Purani companies ke products hatao (Web logic)
    if (userAllowedCompanyIds.length > 0) {
      data = data.filter(p => {
        const cId = typeof p.company === 'object' ? p.company?._id : p.company;
        // Sirf active company ke ya bina company wale (!cId) product dikhao
        return userAllowedCompanyIds.includes(String(cId)) || !cId;
      });
    } else if (!isLoadingCompanies && companies.length === 0) {
      return [];
    }

    // STEP B: Selected Company Dropdown filter
    if (selectedCompanyId) {
      data = data.filter(p => {
        const cId = typeof p.company === 'object' ? p.company?._id : p.company;
        return String(cId) === String(selectedCompanyId);
      });
    }

    return data;
  }, [
    products,
    selectedCompanyId,
    userAllowedCompanyIds,
    companies.length,
    isLoadingCompanies,
  ]);

  const filteredServices = useMemo(() => {
    let data = services;

    // STEP A: Security Check (Taaki purani/unauthorized company ka data na aaye)
    data = data.filter(s => {
      const cId = typeof s.company === 'object' ? s.company?._id : s.company;
      // Agar service common hai (!cId) toh dikhao,
      // agar kisi company ki hai toh check karo wo active list mein hai ya nahi
      return !cId || userAllowedCompanyIds.includes(String(cId));
    });

    // STEP B: Dropdown logic (Selected company ya All)
    if (selectedCompanyId) {
      data = data.filter(s => {
        const cId = typeof s.company === 'object' ? s.company?._id : s.company;
        // Selected company ki service dikhao YA common service (!cId) dikhao
        return String(cId) === String(selectedCompanyId) || !cId;
      });
    }

    return data;
  }, [services, selectedCompanyId, userAllowedCompanyIds]);

  const productTotalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const serviceTotalPages = Math.ceil(filteredServices.length / ITEMS_PER_PAGE);

  const paginatedProducts = useMemo(() => {
    const startIndex = (productCurrentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, productCurrentPage]);

  const paginatedServices = useMemo(() => {
    const startIndex = (serviceCurrentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredServices.slice(startIndex, endIndex);
  }, [filteredServices, serviceCurrentPage]);

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
            templateFileName="product_template.xlsx"
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
    const isLowStock = (item.stocks ?? 0) <= 10;

    return (
      <View style={styles.card} key={item._id}>
        {/* Header - Product Info */}
        <View style={styles.cardHeader}>
          <View style={styles.productInfo}>
            <View style={styles.iconCircle}>
              <Icon name="inventory-2" size={20} color="#3b82f6" />
            </View>
            <View style={styles.productDetails}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.name?.charAt(0).toUpperCase() + item.name?.slice(1)}
              </Text>
              <Text style={styles.companyName} numberOfLines={1}>
                {typeof item.company === 'object' && item.company
                  ? item.company.businessName
                  : 'No Company'}
              </Text>
            </View>
          </View>
        </View>

        {/* Body - Stock Left, Prices Right */}
        <View style={styles.cardBody}>
          <View style={styles.mainInfoRow}>
            {/* Left Side - Stock */}
            <View style={styles.stockSection}>
              <Text style={styles.label}>Stock</Text>
              <View style={styles.stockDisplay}>
                <Text
                  style={[
                    styles.stockValue,
                    (item.stocks ?? 0) > 10
                      ? styles.stockGood
                      : (item.stocks ?? 0) > 0
                      ? styles.stockWarning
                      : styles.stockDanger,
                  ]}
                >
                  {item.stocks ?? 0}
                </Text>
                <Text style={styles.unit}>{item.unit ?? 'Piece'}</Text>
              </View>
              {isLowStock && (item.stocks ?? 0) > 0 && (
                <View style={styles.lowStockBadge}>
                  <Text style={styles.lowStockText}>Low Stock</Text>
                </View>
              )}
            </View>

            {/* Right Side - Prices */}
            <View style={styles.priceSection}>
              <View style={styles.priceItem}>
                <Text style={styles.label}>Cost Price</Text>
                <Text style={styles.costPrice}>
                  {item.costPrice ? formatCurrencyINR(item.costPrice) : '—'}
                </Text>
              </View>
              <View style={styles.priceItem}>
                <Text style={styles.label}>Selling Price</Text>
                <Text style={styles.sellingPrice}>
                  {item.sellingPrice
                    ? formatCurrencyINR(item.sellingPrice)
                    : '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* HSN if available */}
          {item.hsn && (
            <View style={styles.hsnRow}>
              <Text style={styles.hsnLabel}>HSN: </Text>
              <Text style={styles.hsnValue}>{item.hsn}</Text>
            </View>
          )}
        </View>

        {/* Footer - Date & Edit */}
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            {item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditProduct(item)}
          >
            <Icon name="edit" size={16} color="#3b82f6" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderServiceCard = item => {
    return (
      <View style={styles.card} key={item._id}>
        {/* Header - Service Info */}
        <View style={styles.cardHeader}>
          <View style={styles.serviceInfo}>
            <View style={[styles.iconCircle, { backgroundColor: '#fce7f3' }]}>
              <Icon name="build" size={20} color="#ec4899" />
            </View>
            <View style={styles.serviceDetails}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {item.serviceName}
              </Text>
              <Text style={styles.serviceSubtext}>Service</Text>
            </View>
          </View>
        </View>

        {/* Body - Amount & SAC */}
        <View style={styles.cardBody}>
          <View style={styles.serviceInfoRow}>
            {/* Left Side - Amount */}
            <View style={styles.serviceAmountBox}>
              <Text style={styles.label}>Amount</Text>
              <Text style={styles.serviceAmount}>
                {formatCurrencyINR(item.amount)}
              </Text>
            </View>

            {/* Right Side - SAC Badge (if available) */}
            {item.sac && (
              <View style={styles.sacBadgeContainer}>
                <View style={styles.sacBadge}>
                  <Text style={styles.sacLabel}>SAC</Text>
                  <Text style={styles.sacValue}>{item.sac}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Footer - Date & Actions */}
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            {item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </Text>
          <View style={styles.serviceActionsContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => openEditService(item)}
            >
              <Icon name="edit" size={16} color="#3b82f6" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButtonCompact}
              onPress={() => confirmDeleteService(item)}
            >
              <Icon name="delete" size={16} color="#ef4444" />
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
              Products ({filteredProducts.length})
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
              Services ({filteredServices.length})
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
        filteredProducts.length === 0 && (
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
        filteredServices.length === 0 && (
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
      filteredProducts.length > 0
    ) {
      return (
        <View style={styles.pagination}>
          <Text style={styles.paginationInfo}>
            Showing {(productCurrentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
            {Math.min(
              productCurrentPage * ITEMS_PER_PAGE,
              filteredProducts.length,
            )}{' '}
            of {filteredProducts.length} products
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
      filteredServices.length > 0
    ) {
      return (
        <View style={styles.pagination}>
          <Text style={styles.paginationInfo}>
            Showing {(serviceCurrentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
            {Math.min(
              serviceCurrentPage * ITEMS_PER_PAGE,
              filteredServices.length,
            )}{' '}
            of {filteredServices.length} services
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
      return filteredProducts.length > 0 ? paginatedProducts : [];
    } else {
      return filteredServices.length > 0 ? paginatedServices : [];
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
          <ScrollView
            contentContainerStyle={styles.noCompanyContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#007AFF']}
              />
            }
          >
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
          </ScrollView>
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
        {/* 🔌 Live Socket Listener - Listen for product/service updates */}
        {socket && user && (
          <InventorySocketListener
            socket={socket}
            user={user}
            onProductUpdate={() => {
              fetchProducts(true); // Silent update
              refetch?.(); // Refresh permissions silently
              refetchUserPermissions?.(); // Refresh user permissions silently
            }}
            onServiceUpdate={() => {
              fetchServices(true); // Silent update
              refetch?.(); // Refresh permissions silently
              refetchUserPermissions?.(); // Refresh user permissions silently
            }}
          />
        )}

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
const styles = StyleSheet.create({
  // Main Container
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 14,
    paddingTop: 4,
    flexGrow: 1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },

  // Header Section
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    // marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  destructiveButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  outlineButtonText: {
    color: '#3b82f6',
  },

  // Tabs
  tabsContainer: {
    marginBottom: 10,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    // margin: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  activeTabText: {
    color: 'white',
  },

  // Bulk Actions
  bulkActions: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  // Card Header (Shared)
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  // Icon Circle (Shared)
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  // Card Body (Shared)
  cardBody: {
    padding: 16,
  },

  // Card Footer (Shared)
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },

  // Label (Shared)
  label: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },

  // ==========================================
  // PRODUCT CARD SPECIFIC STYLES
  // ==========================================
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  // Main Info Row (Product)
  mainInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12,
  },

  // Stock Section (Left)
  stockSection: {
    flex: 1,
  },
  stockDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 6,
  },
  stockValue: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20,
  },
  stockGood: {
    color: '#10b981',
  },
  stockWarning: {
    color: '#f59e0b',
  },
  stockDanger: {
    color: '#ef4444',
  },
  unit: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    lineHeight: 20,
    paddingBottom: 1,
  },
  lowStockBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  lowStockText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d97706',
  },

  // Price Section (Right)
  priceSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  priceItem: {
    alignItems: 'flex-end',
  },
  costPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  sellingPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981',
  },

  // HSN Section (Product)
  hsnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  hsnLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  hsnValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },

  // ==========================================
  // SERVICE CARD SPECIFIC STYLES
  // ==========================================
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  serviceSubtext: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  // Service Info Row
  serviceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },

  // Service Amount Box
  serviceAmountBox: {
    flex: 1,
  },
  serviceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },

  // SAC Badge Container
  sacBadgeContainer: {
    justifyContent: 'center',
  },
  sacBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sacLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sacValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },

  // Service Actions Container
  serviceActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButtonCompact: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==========================================
  // EMPTY STATE
  // ==========================================
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
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },

  // ==========================================
  // PAGINATION
  // ==========================================
  pagination: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  paginationInfo: {
    fontSize: 14,
    color: '#64748b',
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
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
    gap: 8,
  },
  paginationButtonPrimary: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  paginationButtonDisabled: {
    opacity: 0.4,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  paginationButtonTextPrimary: {
    color: 'white',
  },
  paginationButtonTextDisabled: {
    color: '#cbd5e1',
  },

  // ==========================================
  // NO COMPANY STATE
  // ==========================================
  noCompanyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noCompanyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  noCompanyDescription: {
    fontSize: 16,
    color: '#64748b',
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
    backgroundColor: '#3b82f6',
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
    borderColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 16,
  },

  // ==========================================
  // ALERT DIALOG
  // ==========================================
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
    color: '#0f172a',
    marginBottom: 8,
  },
  alertDescription: {
    fontSize: 14,
    color: '#64748b',
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
    borderColor: '#e2e8f0',
  },
  alertConfirmButton: {
    backgroundColor: '#ef4444',
  },
  alertCancelButtonText: {
    color: '#64748b',
    fontWeight: '500',
  },
  alertConfirmButtonText: {
    color: 'white',
    fontWeight: '500',
  },

  // ==========================================
  // DIALOG HEADER
  // ==========================================
  dialogHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dialogHeaderLeft: {
    flex: 1,
  },
  dialogHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  dialogHeaderSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },

  // ==========================================
  // OLD SERVICE CARD STYLES (FOR COMPATIBILITY)
  // ==========================================
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
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
  createdDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
