import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
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
  Alert,
  TextInput,
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
import RNPrint from 'react-native-print';
import { generatePDF } from 'react-native-html-to-pdf';

// Custom components
import ProductForm from '../../components/products/ProductForm';
import ServiceForm from '../../components/services/ServiceForm';
import ExcelImportExport from '../../components/ui/ExcelImportExport';
import AppLayout from '../../components/layout/AppLayout';
import InventorySocketListener from '../../socketlisteners/InventorySocketListener';
import { SafeAreaView } from 'react-native-safe-area-context';
import BarcodeDisplay from '../../components/ui/BarcodeDisplay';

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

const capitalizeFirst = str => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatDate = dateString => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};


const ProductCard = memo(
  ({ item, index, isSelected, onSelect, onEdit }) => {
    const isLowStock = (item.stocks ?? 0) <= 10;

    return (
      <View style={[styles.card, isSelected && styles.selectedCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.productInfo}>
            <TouchableOpacity
              onPress={() => onSelect(item._id, !isSelected, index)}
              style={styles.checkboxContainer}
            >
              <Icon
                name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={isSelected ? '#3b82f6' : '#64748b'}
              />
            </TouchableOpacity>
            <View style={styles.iconCircle}>
              <Icon name="inventory-2" size={20} color="#3b82f6" />
            </View>
            <View style={styles.productDetails}>
              <Text style={styles.productName} numberOfLines={1}>
                {capitalizeFirst(item.name)}
              </Text>
              <Text style={styles.companyName} numberOfLines={1}>
                {typeof item.company === 'object' && item.company
                  ? item.company.businessName
                  : 'No Company'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.mainInfoRow}>
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

          {item.hsn && (
            <View style={styles.hsnRow}>
              <Text style={styles.hsnLabel}>HSN: </Text>
              <Text style={styles.hsnValue}>{item.hsn}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            <BarcodeDisplay
              value={item._id}
              productId={item._id}
              productName={item.name}
              stockQuantity={item.stocks}
            />
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => onEdit(item)}>
            <Icon name="edit" size={16} color="#3b82f6" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.item._id === nextProps.item._id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.item.stocks === nextProps.item.stocks &&
      prevProps.item.costPrice === nextProps.item.costPrice &&
      prevProps.item.sellingPrice === nextProps.item.sellingPrice
    );
  }
);

ProductCard.displayName = 'ProductCard';


const ServiceCard = memo(
  ({ item, onEdit, onDelete }) => {
    return (
      <View style={styles.card}>
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

        <View style={styles.cardBody}>
          <View style={styles.serviceInfoRow}>
            <View style={styles.serviceAmountBox}>
              <Text style={styles.label}>Amount</Text>
              <Text style={styles.serviceAmount}>
                {formatCurrencyINR(item.amount)}
              </Text>
            </View>

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

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          <View style={styles.serviceActionsContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => onEdit(item)}
            >
              <Icon name="edit" size={16} color="#3b82f6" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButtonCompact}
              onPress={() => onDelete(item)}
            >
              <Icon name="delete" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.item._id === nextProps.item._id &&
      prevProps.item.amount === nextProps.item.amount &&
      prevProps.item.sac === nextProps.item.sac
    );
  }
);

ServiceCard.displayName = 'ServiceCard';


const QuantityControl = memo(({ productId, quantity, onQuantityChange }) => {
  const handleDecrement = useCallback(() => {
    if (quantity > 1) {
      onQuantityChange(productId, quantity - 1);
    }
  }, [productId, quantity, onQuantityChange]);

  const handleIncrement = useCallback(() => {
    if (quantity < 100) {
      onQuantityChange(productId, quantity + 1);
    }
  }, [productId, quantity, onQuantityChange]);

  const handleTextChange = useCallback(
    text => {
      let val = parseInt(text) || 1;
      val = Math.max(1, Math.min(100, val));
      onQuantityChange(productId, val);
    },
    [productId, onQuantityChange]
  );

  return (
    <View style={styles.quantityControls}>
      <TouchableOpacity
        style={[
          styles.quantityButton,
          quantity <= 1 && styles.quantityButtonDisabled,
        ]}
        onPress={handleDecrement}
        disabled={quantity <= 1}
      >
        <Icon name="remove" size={20} color="#64748b" />
      </TouchableOpacity>

      <TextInput
        style={styles.quantityInput}
        value={String(quantity)}
        onChangeText={handleTextChange}
        keyboardType="number-pad"
        maxLength={3}
      />

      <TouchableOpacity
        style={[
          styles.quantityButton,
          quantity >= 100 && styles.quantityButtonDisabled,
        ]}
        onPress={handleIncrement}
        disabled={quantity >= 100}
      >
        <Icon name="add" size={20} color="#64748b" />
      </TouchableOpacity>
    </View>
  );
});

QuantityControl.displayName = 'QuantityControl';

// ==========================================
// MAIN COMPONENT
// ==========================================
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
  const { toast } = useToast();

  // State
  const [user, setUser] = useState(null);
  const [isBulkPrintDialogOpen, setIsBulkPrintDialogOpen] = useState(false);
  const [bulkPrintQuantities, setBulkPrintQuantities] = useState({});
  const [isPrinting, setIsPrinting] = useState(false);

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
  const [userRole, setUserRole] = useState(null);

  // Permissions
  const canCreateProducts =
    userCaps?.canCreateProducts ?? userCaps?.canCreateInventory ?? false;
  const webCanCreate = permissions?.canCreateProducts ?? false;
  const hasCreatePermission = canCreateProducts || webCanCreate;

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [userData, role] = await Promise.all([
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('role'),
        ]);
        if (userData) setUser(JSON.parse(userData));
        if (role) setUserRole(role);
      } catch (error) {
        console.error('❌ Failed to load user data:', error);
      }
    };
    loadUserData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      triggerCompaniesRefresh();
    }, [triggerCompaniesRefresh])
  );

  // Initialize bulk print quantities
  useEffect(() => {
    if (isBulkPrintDialogOpen && selectedProducts.length > 0) {
      const initialQuantities = {};
      selectedProducts.forEach(productId => {
        const product = products.find(p => p._id === productId);
        if (product) {
          initialQuantities[productId] = Math.min(product.stocks || 1, 100);
        }
      });
      setBulkPrintQuantities(initialQuantities);
    }
  }, [isBulkPrintDialogOpen, selectedProducts, products]);

  // ==========================================
  //  Fetch functions 
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
    [toast, selectedCompanyId]
  );

  const fetchServices = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsLoadingServices(true);
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
    [toast]
  );


  useEffect(() => {
    Promise.all([fetchCompanies(), fetchProducts(), fetchServices()]).catch(
      err => console.error('Initial load error:', err)
    );
  }, []);

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

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchCompaniesSilent().catch(err =>
        console.error('Inventory fetchCompaniesSilent after trigger failed:', err)
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
  // CRUD Operations
  // ==========================================
  const openCreateProduct = useCallback(() => {
    setProductToEdit(null);
    setIsProductFormOpen(true);
  }, []);

  const openCreateService = useCallback(() => {
    setServiceToEdit(null);
    setIsServiceFormOpen(true);
  }, []);

  const openEditProduct = useCallback(p => {
    setProductToEdit(p);
    setIsProductFormOpen(true);
  }, []);

  const openEditService = useCallback(s => {
    setServiceToEdit(s);
    setIsServiceFormOpen(true);
  }, []);

  const onProductSaved = useCallback(
    saved => {
      setIsProductFormOpen(false);
      setProductToEdit(null);
      setProducts(prev =>
        prev.some(p => p._id === saved._id)
          ? prev.map(p => (p._id === saved._id ? saved : p))
          : [saved, ...prev]
      );
      toast({
        title: 'Product saved',
        description: 'Product has been saved successfully.',
      });
    },
    [toast]
  );

  const onServiceSaved = useCallback(
    saved => {
      setIsServiceFormOpen(false);
      setServiceToEdit(null);
      setServices(prev =>
        prev.some(s => s._id === saved._id)
          ? prev.map(s => (s._id === saved._id ? saved : s))
          : [saved, ...prev]
      );
      toast({
        title: 'Service saved',
        description: 'Service has been saved successfully.',
      });
    },
    [toast]
  );

  const confirmDeleteProduct = useCallback(p => {
    setProductToDelete(p);
    setServiceToDelete(null);
    setIsAlertOpen(true);
  }, []);

  const confirmDeleteService = useCallback(s => {
    setServiceToDelete(s);
    setProductToDelete(null);
    setIsAlertOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      if (productToDelete) {
        const res = await fetch(
          `${BASE_URL}/api/products/${productToDelete._id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }
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
          }
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
  }, [productToDelete, serviceToDelete, toast]);

  // ==========================================
  // Bulk Print Handler
  // ==========================================
  const handleBulkPrint = useCallback(async () => {
    if (selectedProducts.length === 0) return;

    try {
      setIsPrinting(true);

      const productsToPrint = products.filter(p =>
        selectedProducts.includes(p._id)
      );

      let labelsHtml = '';
      let totalLabels = 0;

      productsToPrint.forEach(product => {
        const qty =
          bulkPrintQuantities[product._id] ||
          Math.min(product.stocks || 1, 100);
        totalLabels += qty;

        for (let i = 0; i < qty; i++) {
          const isLastLabel =
            productsToPrint.indexOf(product) === productsToPrint.length - 1 &&
            i === qty - 1;

          labelsHtml += `
          <div style="
            width: 220px; 
            padding: 10px; 
            text-align: center; 
            font-family: sans-serif; 
            ${!isLastLabel ? 'border-bottom: 1px dashed #999;' : ''}
            page-break-inside: avoid;
            margin-bottom: ${!isLastLabel ? '8px' : '0'};
          ">
            <h2 style="font-size: 14px; margin: 0 0 5px 0; font-weight: bold;">${
              product.name
            }</h2>
            <img id="barcode_${
              product._id
            }_${i}" style="width: 200px; height: 50px; margin: 5px 0;" />
            <p style="font-size: 10px; margin: 5px 0 0 0; color: #555;">ID: ${
              product._id
            }</p>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
            <script>
              JsBarcode("#barcode_${product._id}_${i}", "${product._id}", {
                format: "CODE128", width: 2, height: 50, displayValue: false,
                margin: 0, background: "#ffffff", lineColor: "#000000"
              });
            </script>
          </div>
        `;
        }
      });

      const labelHeight = 80;
      const pageHeight = Math.max(280, labelHeight * totalLabels + 80);

      const html = `
      <html>
        <head>
          <meta name="viewport" content="width=220, initial-scale=1.0">
          <style>
            @page { size: 220px ${pageHeight}px; margin: 0; }
            body { margin: 0; padding: 8px; width: 220px; }
          </style>
        </head>
        <body>${labelsHtml}</body>
      </html>
    `;

      const results = await generatePDF({
        html: html,
        fileName: `Bulk_Barcodes_${Date.now()}`,
        directory: 'Documents',
        base64: true,
        width: 220,
        height: pageHeight,
      });

      await RNPrint.print({ filePath: results.filePath });

      Alert.alert(
        'Bulk Print Started',
        `Printing ${totalLabels} labels for ${selectedProducts.length} products`
      );

      setIsBulkPrintDialogOpen(false);
      setSelectedProducts([]);
      setBulkPrintQuantities({});
    } catch (error) {
      console.error('Bulk print error:', error);
      Alert.alert('Error', 'Failed to generate bulk labels');
    } finally {
      setIsPrinting(false);
    }
  }, [selectedProducts, products, bulkPrintQuantities]);

  // ==========================================
  // Selection Handlers
  // ==========================================
  const handleSelectProduct = useCallback(
    (productId, checked, index, shiftKey = false) => {
      if (shiftKey && lastSelectedIndex !== null && index !== undefined) {
        const startIndex = Math.min(lastSelectedIndex, index);
        const endIndex = Math.max(lastSelectedIndex, index);
        const rangeIds = products
          .slice(startIndex, endIndex + 1)
          .map(p => p._id);

        if (checked) {
          setSelectedProducts(prev => [...new Set([...prev, ...rangeIds])]);
        } else {
          setSelectedProducts(prev =>
            prev.filter(id => !rangeIds.includes(id))
          );
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
    },
    [lastSelectedIndex, products]
  );

  const handleSelectAllProducts = useCallback(
    checked => {
      if (checked) {
        setSelectedProducts(filteredProducts.map(p => p._id));
      } else {
        setSelectedProducts([]);
      }
    },
    [filteredProducts]
  );

  const handleQuantityChange = useCallback((productId, newQuantity) => {
    setBulkPrintQuantities(prev => ({
      ...prev,
      [productId]: newQuantity,
    }));
  }, []);

  
  
  
  const userAllowedCompanyIds = useMemo(() => {
    return companies.map(c => String(c._id));
  }, [companies]);

  const filteredProducts = useMemo(() => {
    let data = products;

    if (userAllowedCompanyIds.length > 0) {
      data = data.filter(p => {
        const cId = typeof p.company === 'object' ? p.company?._id : p.company;
        return userAllowedCompanyIds.includes(String(cId)) || !cId;
      });
    } else if (!isLoadingCompanies && companies.length === 0) {
      return [];
    }

    if (selectedCompanyId) {
      data = data.filter(p => {
        const cId = typeof p.company === 'object' ? p.company?._id : p.company;
        return String(cId) === String(selectedCompanyId) || !cId;
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

    data = data.filter(s => {
      const cId = typeof s.company === 'object' ? s.company?._id : s.company;
      return !cId || userAllowedCompanyIds.includes(String(cId));
    });

    if (selectedCompanyId) {
      data = data.filter(s => {
        const cId = typeof s.company === 'object' ? s.company?._id : s.company;
        return String(cId) === String(selectedCompanyId) || !cId;
      });
    }

    return data;
  }, [services, selectedCompanyId, userAllowedCompanyIds]);

  const productTotalPages = useMemo(
    () => Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1,
    [filteredProducts.length]
  );

  const serviceTotalPages = useMemo(
    () => Math.ceil(filteredServices.length / ITEMS_PER_PAGE) || 1,
    [filteredServices.length]
  );

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

  // ==========================================
  // Pagination
  // ==========================================
  const goToNextProductPage = useCallback(() => {
    setProductCurrentPage(prev => Math.min(prev + 1, productTotalPages));
  }, [productTotalPages]);

  const goToPrevProductPage = useCallback(() => {
    setProductCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  const goToNextServicePage = useCallback(() => {
    setServiceCurrentPage(prev => Math.min(prev + 1, serviceTotalPages));
  }, [serviceTotalPages]);

  const goToPrevServicePage = useCallback(() => {
    setServiceCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  // ==========================================
  // Action Buttons Renderer
  // ==========================================
  const renderActionButtons = useCallback(() => {
    if (!hasCreatePermission) {
      return null;
    }

    if (activeTab === 'products') {
      return (
        <View style={styles.actionButtons}>
          <ExcelImportExport
            templateData={[
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
            ]}
            templateFileName="product_template.xlsx"
            onImportSuccess={fetchProducts}
            expectedColumns={[
              'Company',
              'Item Name',
              'Stock',
              'Unit',
              'Cost Price',
              'Selling Price',
              'HSN',
            ]}
            transformImportData={data => {
              return data.map(item => {
                const companyName = item['Company']?.trim();
                const foundCompany = companies.find(
                  c =>
                    c.businessName.toLowerCase() === companyName?.toLowerCase()
                );

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
            }}
            activeTab={activeTab}
            companies={companies}
          />
          <TouchableOpacity style={styles.button} onPress={openCreateProduct}>
            <Icon name="add-circle" size={20} color="white" />
            <Text style={styles.buttonText}>Add Product</Text>
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
  }, [
    hasCreatePermission,
    activeTab,
    companies,
    fetchProducts,
    fetchServices,
    openCreateProduct,
    openCreateService,
  ]);


  const renderItem = useCallback(
    ({ item, index }) => {
      if (activeTab === 'products') {
        const isSelected = selectedProducts.includes(item._id);
        return (
          <ProductCard
            item={item}
            index={index}
            isSelected={isSelected}
            onSelect={handleSelectProduct}
            onEdit={openEditProduct}
          />
        );
      } else {
        return (
          <ServiceCard
            item={item}
            onEdit={openEditService}
            onDelete={confirmDeleteService}
          />
        );
      }
    },
    [
      activeTab,
      selectedProducts,
      handleSelectProduct,
      openEditProduct,
      openEditService,
      confirmDeleteService,
    ]
  );

  const keyExtractor = useCallback(item => item._id, []);

  const getItemLayout = useCallback(
    (data, index) => ({
      length: 200,
      offset: 200 * index,
      index,
    }),
    []
  );

  const getData = useMemo(() => {
    if (activeTab === 'products') {
      return filteredProducts.length > 0 ? paginatedProducts : [];
    } else {
      return filteredServices.length > 0 ? paginatedServices : [];
    }
  }, [
    activeTab,
    filteredProducts.length,
    paginatedProducts,
    filteredServices.length,
    paginatedServices,
  ]);

  // ==========================================
  // Header Component
  // ==========================================
  const renderHeader = useCallback(() => {
    return (
      <View>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Inventory Management</Text>
            {selectedProducts.length > 0 ? (
              <Text style={styles.selectionCount}>
                {selectedProducts.length} selected
              </Text>
            ) : (
              <Text style={styles.subtitle}>
                Track and manage your products and services.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.headerActionsRow}>
          {hasCreatePermission && renderActionButtons()}

          {selectedProducts.length > 0 && (
            <TouchableOpacity
              style={[styles.button, styles.bulkPrintBtn]}
              onPress={() => setIsBulkPrintDialogOpen(true)}
            >
              <Icon name="print" size={20} color="white" />
              <Text style={styles.buttonText}>
                Print ({selectedProducts.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabsContainer}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'products' && styles.activeTab,
              ]}
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
              style={[
                styles.tab,
                activeTab === 'services' && styles.activeTab,
              ]}
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
  }, [
    selectedProducts.length,
    hasCreatePermission,
    renderActionButtons,
    activeTab,
    filteredProducts.length,
    filteredServices.length,
    isLoadingProducts,
    isLoadingServices,
    openCreateProduct,
    openCreateService,
  ]);

  // ==========================================
  // Footer Component
  // ==========================================
  const renderFooter = useCallback(() => {
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
              filteredProducts.length
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
              filteredServices.length
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
  }, [
    activeTab,
    productTotalPages,
    filteredProducts.length,
    productCurrentPage,
    serviceTotalPages,
    filteredServices.length,
    serviceCurrentPage,
    goToPrevProductPage,
    goToNextProductPage,
    goToPrevServicePage,
    goToNextServicePage,
  ]);

  // ==========================================
  // Loading State
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
  // No Company State
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
  // Main Render
  // ==========================================
  return (
    <AppLayout>
      <View style={styles.container}>
        {socket && user && (
          <InventorySocketListener
            socket={socket}
            user={user}
            onProductUpdate={() => {
              fetchProducts(true);
              refetch?.();
              refetchUserPermissions?.();
            }}
            onServiceUpdate={() => {
              fetchServices(true);
              refetch?.();
              refetchUserPermissions?.();
            }}
          />
        )}

        
        <FlatList
          data={getData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
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
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
        />

     
        <Modal
          visible={isBulkPrintDialogOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsBulkPrintDialogOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.bulkPrintDialog}>
              <View style={styles.dialogHeader}>
                <View>
                  <Text style={styles.dialogTitle}>Print Barcode Labels</Text>
                  <Text style={styles.dialogSubtitle}>
                    Set print quantities for {selectedProducts.length} selected
                    products
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsBulkPrintDialogOpen(false)}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View>
                    <Text style={styles.summaryTitle}>
                      {selectedProducts.length} Products Selected
                    </Text>
                    <Text style={styles.summarySubtext}>
                      Total Labels:{' '}
                      {Object.values(bulkPrintQuantities).reduce(
                        (sum, qty) => sum + qty,
                        0
                      )}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={() => {
                      const newQuantities = {};
                      selectedProducts.forEach(id => {
                        const product = products.find(p => p._id === id);
                        newQuantities[id] = Math.min(product?.stocks || 1, 100);
                      });
                      setBulkPrintQuantities(newQuantities);
                    }}
                  >
                    <Text style={styles.resetButtonText}>Reset to Stock</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={styles.productList}>
                {selectedProducts.map(productId => {
                  const product = products.find(p => p._id === productId);
                  if (!product) return null;

                  return (
                    <View key={productId} style={styles.productListItem}>
                      <View style={styles.productListInfo}>
                        <Text style={styles.productListName} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={styles.productListMeta}>
                          Stock: {product.stocks} | ID: {product._id}
                        </Text>
                      </View>

                      <QuantityControl
                        productId={productId}
                        quantity={bulkPrintQuantities[productId] || 1}
                        onQuantityChange={handleQuantityChange}
                      />
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.dialogFooter}>
                <TouchableOpacity
                  style={styles.cancelDialogButton}
                  onPress={() => {
                    setIsBulkPrintDialogOpen(false);
                    setBulkPrintQuantities({});
                  }}
                >
                  <Text style={styles.cancelDialogButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.printDialogButton,
                    isPrinting && styles.printDialogButtonDisabled,
                  ]}
                  onPress={handleBulkPrint}
                  disabled={isPrinting}
                >
                  <Icon name="print" size={20} color="white" />
                  <Text style={styles.printDialogButtonText}>
                    {isPrinting ? 'Printing...' : 'Print All Labels'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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

        {/* Delete Confirmation Modal */}
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


const styles = StyleSheet.create({
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
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  headerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  bulkPrintBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  destructiveButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  tabsContainer: {
    marginBottom: 10,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
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
  selectedCard: {
    borderColor: '#3b82f6',
    backgroundColor: '#f0f7ff',
  },
  checkboxContainer: {
    marginRight: 10,
  },
  selectionCount: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardBody: {
    padding: 16,
  },
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
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  label: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
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
  mainInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12,
  },
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
  serviceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  serviceAmountBox: {
    flex: 1,
  },
  serviceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bulkPrintDialog: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  dialogSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  closeButton: {
    padding: 4,
  },
  summaryCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 12,
    color: '#64748b',
  },
  resetButton: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  productList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  productListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  productListInfo: {
    flex: 1,
    marginRight: 12,
  },
  productListName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  productListMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantityInput: {
    width: 48,
    height: 38,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    backgroundColor: 'white',
  },
  dialogFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelDialogButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  cancelDialogButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  printDialogButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    gap: 8,
  },
  printDialogButtonDisabled: {
    opacity: 0.6,
  },
  printDialogButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});