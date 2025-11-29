// InventoryScreen.js
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { Card, Button, Badge, Checkbox, IconButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- CONSTANTS AND UTILITIES ---

// Color Constants for easy management
const PRIMARY_COLOR = '#0066CC'; // Brighter, more common corporate blue
const DANGER_COLOR = '#D32F2F'; // Standard Red
const SUCCESS_COLOR = '#388E3C'; // Standard Green
const WARNING_COLOR = '#FBC02D'; // Standard Amber
const LIGHT_BACKGROUND = '#F9FAFB';
const TEXT_COLOR = '#212121'; // Darker text
const SUBTLE_TEXT_COLOR = '#757575'; // Medium grey text
const BORDER_COLOR = '#E0E0E0';

// Icons
const PackageIcon = () => <Icon name="package-variant" size={20} color={PRIMARY_COLOR} />;
const ServerIcon = () => <Icon name="server" size={20} color={PRIMARY_COLOR} />;
const IndianRupeeIcon = ({ size = 14, color = SUBTLE_TEXT_COLOR }) => <Icon name="currency-inr" size={size} color={color} />;
const ChevronLeftIcon = () => <Icon name="chevron-left" size={18} />;
const ChevronRightIcon = () => <Icon name="chevron-right" size={18} />;
const PlusCircleIcon = () => <Icon name="plus-circle" size={18} color="white" />;
const EditIcon = ({ color = PRIMARY_COLOR }) => <Icon name="pencil" size={20} color={color} />;
const TrashIcon = ({ color = DANGER_COLOR }) => <Icon name="trash-can-outline" size={20} color={color} />;
const CloseIcon = ({ color = TEXT_COLOR }) => <Icon name="close" size={24} color={color} />;
const StockStatusIcon = ({ color }) => <Icon name="circle" size={10} color={color} style={{ marginRight: 6 }} />;

const ITEMS_PER_PAGE = 10;

// Toast Component
const Toast = ({ visible, message, type, onHide }) => {
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        hideToast();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, opacity]);

  const hideToast = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const getToastStyle = () => {
    switch (type) {
      case 'error':
        return styles.toastError;
      case 'success':
        return styles.toastSuccess;
      default:
        return styles.toastInfo;
    }
  };

  const getIconName = () => {
    switch (type) {
      case 'error':
        return 'alert-circle';
      case 'success':
        return 'check-circle';
      default:
        return 'information';
    }
  };

  return (
    <Animated.View style={[styles.toastContainer, getToastStyle(), { opacity }]}>
      <Icon name={getIconName()} size={20} color="white" />
      <Text style={styles.toastText}>{message}</Text>
      <TouchableOpacity onPress={hideToast} style={styles.toastCloseButton}>
        <Icon name="close" size={16} color="white" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Custom useToast hook
const useToast = () => {
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  return {
    toast,
    showToast,
    hideToast,
  };
};

// Utility functions
const formatCurrencyINR = (value) => {
  if (value === null || value === undefined || value === "") return "₹0.00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const extractNumber = (value) => {
  if (!value) return 0;
  const strValue = String(value);
  const numeric = strValue.replace(/[^0-9.]/g, "");
  return numeric ? Number(numeric) : 0;
};

// API Configuration
const BASE_URL = 'https://accountbackend.sharda.co.in';

// Excel Import Export Component
const ExcelImportExport = ({
  templateData,
  templateFileName,
  onImportSuccess,
  expectedColumns,
  transformImportData,
  activeTab
}) => {
  const handleExportPress = () => {
    Alert.alert(
      'Excel Export',
      `Template for ${activeTab} will be downloaded`,
      [{ text: 'OK' }]
    );
    console.log('Exporting template:', templateFileName);
  };

  const handleImportPress = () => {
    Alert.alert(
      'Excel Import',
      'Select Excel file to import',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed to Import',
          onPress: () => {
            Alert.alert('File Picker', 'File selection logic goes here. Processing started...');
          }
        },
      ]
    );
  };

  return (
    <View style={styles.excelContainer}>
      <Button
        mode="outlined"
        onPress={handleExportPress}
        style={styles.excelButton}
        icon="download"
        labelStyle={{ color: PRIMARY_COLOR, fontWeight: '600', fontSize: 13 }}
        contentStyle={{ height: 40 }}
      >
        Export
      </Button>
      <Button
        mode="contained"
        onPress={handleImportPress}
        style={[styles.excelButton, { backgroundColor: PRIMARY_COLOR }]}
        icon="upload"
        contentStyle={{ height: 40 }}
        labelStyle={{ fontSize: 13 }}
      >
        Import
      </Button>
    </View>
  );
};

// --- MAIN SCREEN COMPONENT ---

export default function InventoryScreen() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [productCurrentPage, setProductCurrentPage] = useState(1);
  const [serviceCurrentPage, setServiceCurrentPage] = useState(1);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState(null);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState(null);

  const { toast, showToast, hideToast } = useToast();

  // Get token and role from storage
  const getAuthData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userRole = await AsyncStorage.getItem('role');
      setRole(userRole);
      return token;
    } catch (error) {
      console.error('Error getting auth data:', error);
      return null;
    }
  };

  // API Functions (Fetching real data)
  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const token = await getAuthData();
      if (!token) throw new Error("Authentication token not found.");

      const res = await fetch(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch companies.");

      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : data.companies || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
      showToast('Failed to load companies', 'error');
      setCompanies([]);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const token = await getAuthData();
      if (!token) throw new Error("Authentication token not found.");

      const res = await fetch(`${BASE_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch products.");

      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data.products || []);
      setProductCurrentPage(1);
    } catch (error) {
      console.error('Error fetching products:', error);
      showToast('Failed to load products', 'error');
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    setIsLoadingServices(true);
    try {
      const token = await getAuthData();
      if (!token) throw new Error("Authentication token not found.");

      const res = await fetch(`${BASE_URL}/api/services`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch services.");

      const data = await res.json();
      setServices(Array.isArray(data) ? data : data.services || []);
      setServiceCurrentPage(1);
    } catch (error) {
      console.error('Error fetching services:', error);
      showToast('Failed to load services', 'error');
      setServices([]);
    } finally {
      setIsLoadingServices(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchCompanies(), fetchProducts(), fetchServices()]);
    setRefreshing(false);
    showToast('Data refreshed', 'success');
  }, [fetchCompanies, fetchProducts, fetchServices]);

  useEffect(() => {
    const initializeData = async () => {
      await fetchCompanies();
      await fetchProducts();
      await fetchServices();
    };
    initializeData();
  }, [fetchCompanies, fetchProducts, fetchServices]);

  const handleExcelImportSuccess = (importedData) => {
    showToast(`File selected for ${activeTab}. Data submission logic to API required.`, 'info');
  };

  const openCreateProduct = () => {
    setProductToEdit(null);
    setIsProductFormOpen(true);
  };

  const openCreateService = () => {
    setServiceToEdit(null);
    setIsServiceFormOpen(true);
  };

  const openEditProduct = (product) => {
    setProductToEdit(product);
    setIsProductFormOpen(true);
  };

  const openEditService = (service) => {
    setServiceToEdit(service);
    setIsServiceFormOpen(true);
  };

  const saveProduct = async (productData) => {
    const token = await getAuthData();
    if (!token) throw new Error("Authentication token not found.");

    const isEditing = !!productData._id;
    const url = isEditing
      ? `${BASE_URL}/api/products/${productData._id}`
      : `${BASE_URL}/api/products`;
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(productData),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'create'} product.`);
    }

    return res.json();
  };

  const saveService = async (serviceData) => {
    const token = await getAuthData();
    if (!token) throw new Error("Authentication token not found.");

    const isEditing = !!serviceData._id;
    const url = isEditing
      ? `${BASE_URL}/api/services/${serviceData._id}`
      : `${BASE_URL}/api/services`;
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(serviceData),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'create'} service.`);
    }

    return res.json();
  };

  const onProductSaved = (savedProduct) => {
    setIsProductFormOpen(false);
    setProductToEdit(null);
    fetchProducts();
    showToast('Product saved successfully', 'success');
  };

  const onServiceSaved = (savedService) => {
    setIsServiceFormOpen(false);
    setServiceToEdit(null);
    fetchServices();
    showToast('Service saved successfully', 'success');
  };

  const confirmDeleteProduct = (product) => {
    setProductToDelete(product);
    setServiceToDelete(null);
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete ${product.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ]
    );
  };

  const confirmDeleteService = (service) => {
    setServiceToDelete(service);
    setProductToDelete(null);
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete ${service.serviceName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ]
    );
  };

  const handleDelete = async () => {
    try {
      const token = await getAuthData();
      if (!token) throw new Error("Authentication token not found.");

      if (productToDelete) {
        const res = await fetch(`${BASE_URL}/api/products/${productToDelete._id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to delete product.");

        setProducts((prev) => prev.filter((p) => p._id !== productToDelete._id));
        showToast('Product deleted successfully', 'success');
      } else if (serviceToDelete) {
        const res = await fetch(`${BASE_URL}/api/services/${serviceToDelete._id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to delete service.");

        setServices((prev) => prev.filter((s) => s._id !== serviceToDelete._id));
        showToast('Service deleted successfully', 'success');
      }
    } catch (error) {
      console.error("Deletion API Error:", error);
      showToast('Deletion failed: ' + error.message, 'error');
    } finally {
      setProductToDelete(null);
      setServiceToDelete(null);
    }
  };

  const handleSelectProduct = (productId, checked, index) => {
    if (checked) {
      setSelectedProducts((prev) => [...prev, productId]);
    } else {
      setSelectedProducts((prev) => prev.filter((id) => id !== productId));
    }
    setLastSelectedIndex(index ?? null);
  };

  const handleCheckboxChange = (productId, checked, index) => {
    handleSelectProduct(productId, checked, index);
  };

  const handleBulkDeleteProducts = async () => {
    if (selectedProducts.length === 0) {
      showToast('No products selected', 'error');
      return;
    }

    Alert.alert(
      'Bulk Delete',
      `Are you sure you want to delete ${selectedProducts.length} products?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getAuthData();
              if (!token) throw new Error("Authentication token not found.");

              const res = await fetch(`${BASE_URL}/api/products/bulk-delete`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ids: selectedProducts }),
              });

              if (!res.ok) throw new Error("Failed to perform bulk delete.");

              showToast(`${selectedProducts.length} products deleted successfully`, 'success');
              setSelectedProducts([]);
              fetchProducts();
            } catch (error) {
              console.error("Bulk Deletion API Error:", error);
              showToast('Bulk deletion failed: ' + error.message, 'error');
            }
          }
        },
      ]
    );
  };

  // Pagination (Unchanged, dynamic)
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
    setProductCurrentPage((prev) => Math.min(prev + 1, productTotalPages));
  };

  const goToPrevProductPage = () => {
    setProductCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextServicePage = () => {
    setServiceCurrentPage((prev) => Math.min(prev + 1, serviceTotalPages));
  };

  const goToPrevServicePage = () => {
    setServiceCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  // Render Action Buttons
  const renderActionButtons = () => {
    if (role === 'user' || role === null) {
      return null;
    }

    return (
      <View style={styles.actionBarContent}>
        <View style={styles.excelContainer}>
          <ExcelImportExport
            templateData={
              activeTab === 'products'
                ? [{ "Item Name": "Eg: Laptop", "Stock": "10", "Unit": "Piece", "Cost Price": "50000", "Selling Price": "60000", "HSN": "8471" }]
                : [{ "Service Name": "Eg: Consulting", "Amount": "5000", "SAC": "998311" }]
            }
            templateFileName={`inventory_template_${activeTab}.xlsx`}
            onImportSuccess={handleExcelImportSuccess}
            expectedColumns={
              activeTab === 'products'
                ? ["Item Name", "Stock", "Unit", "Cost Price", "Selling Price", "HSN"]
                : ["Service Name", "Amount", "SAC"]
            }
            transformImportData={(data) => data}
            activeTab={activeTab}
          />
        </View>

        <View style={styles.actionButtonsContainer}>
          <Button
            mode="outlined"
            onPress={openCreateService}
            style={styles.serviceButton}
            icon="server"
            labelStyle={{ color: PRIMARY_COLOR, fontWeight: '600', fontSize: 13 }}
            contentStyle={{ height: 40 }}
          >
            Add Service
          </Button>
          <Button
            mode="contained"
            onPress={openCreateProduct}
            style={styles.addButton}
            icon="package-variant"
            contentStyle={{ height: 40 }}
            labelStyle={{ fontSize: 13 }}
          >
            Add Product
          </Button>
        </View>
      </View>
    );
  };

  const renderTabButton = (title, value, count) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === value && styles.tabButtonActive,
      ]}
      onPress={() => setActiveTab(value)}
    >
      <Text style={[
        styles.tabButtonText,
        activeTab === value && styles.tabButtonTextActive,
      ]}>
        {title} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item: product, index }) => {
    const absoluteIndex = (productCurrentPage - 1) * ITEMS_PER_PAGE + index;
    const stock = product.stocks ?? 0;

    let stockText;
    let stockColor;
    if (stock > 10) {
      stockText = `${stock} in stock`;
      stockColor = SUCCESS_COLOR;
    } else if (stock > 0) {
      stockText = `Low stock: ${stock}`;
      stockColor = WARNING_COLOR;
    } else {
      stockText = 'Out of stock';
      stockColor = DANGER_COLOR;
    }

    const sellingPrice = product.sellingPrice ? formatCurrencyINR(product.sellingPrice) : "-";
    const unitText = product.unit ?? "Piece";


    return (
      <Card style={styles.itemCard} key={product._id}>
        <Card.Content style={styles.cardContent}>

          {/* Header Row: Checkbox, Name, Price, Stock Status */}
          <View style={styles.itemHeader}>
            {role !== 'user' && (
              <View style={styles.checkboxWrapper}>
                <Checkbox
                  status={selectedProducts.includes(product._id) ? 'checked' : 'unchecked'}
                  onPress={() => handleCheckboxChange(
                    product._id,
                    !selectedProducts.includes(product._id),
                    absoluteIndex
                  )}
                  color={PRIMARY_COLOR}
                />
              </View>
            )}

            <View style={styles.itemTitleContainer}>
              <PackageIcon />
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemName}>{product.name}</Text>
                <Text style={styles.companyName}>
                  {typeof product.company === 'object' && product.company?.businessName
                    ? product.company.businessName
                    : "-"}
                </Text>
              </View>
            </View>

            {/* Price and Stock Status on the right */}
            <View style={styles.priceStockContainer}>
              <Text style={styles.itemPrice}>{sellingPrice}</Text>
              <View style={styles.stockBadgeClean}>
                <StockStatusIcon color={stockColor} />
                <Text style={[styles.stockTextClean, { color: stockColor }]}>
                  {stockText}
                </Text>
              </View>
            </View>
          </View>

          {/* Details Section - Simple single column list */}
          <View style={styles.itemDetailsClean}>
            <View style={styles.detailRowClean}>
              <Text style={styles.detailLabelClean}>Cost Price:</Text>
              <Text style={styles.detailValueClean}>
                {product.costPrice ? formatCurrencyINR(product.costPrice) : "-"}
              </Text>
            </View>

            <View style={styles.detailRowClean}>
              <Text style={styles.detailLabelClean}>Unit / HSN:</Text>
              <Text style={styles.detailValueClean}>
                {unitText} {product.hsn ? `(${product.hsn})` : ''}
              </Text>
            </View>
          </View>


          {/* Action Buttons */}
          {role !== 'user' && (
            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={() => openEditProduct(product)}
                style={styles.editButton}
                labelStyle={{ color: PRIMARY_COLOR, fontSize: 13 }}
                contentStyle={{ gap: 4 }}
              >
                <EditIcon color={PRIMARY_COLOR} />
                <Text style={styles.buttonText}>Edit</Text>
              </Button>

              <Button
                mode="outlined"
                onPress={() => confirmDeleteProduct(product)}
                style={styles.deleteButton}
                labelStyle={{ color: DANGER_COLOR, fontSize: 13 }}
                contentStyle={{ gap: 4 }}
              >
                <TrashIcon color={DANGER_COLOR} />
                <Text style={styles.buttonText}>Delete</Text>
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderServiceItem = ({ item: service }) => (
    <Card style={styles.itemCard}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleContainer}>
            <ServerIcon />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemName}>{service.serviceName}</Text>
              <Badge style={styles.serviceBadge}>Service Item</Badge>
            </View>
          </View>

          <View style={styles.priceStockContainer}>
            <Text style={styles.itemPrice}>
              {formatCurrencyINR(service.amount || 0)}
            </Text>
          </View>
        </View>

        <View style={styles.itemDetailsClean}>
          <View style={styles.detailRowClean}>
            <Text style={styles.detailLabelClean}>SAC Code:</Text>
            <Text style={styles.detailValueClean}>{service.sac ?? "N/A"}</Text>
          </View>

          <View style={styles.detailRowClean}>
            <Text style={styles.detailLabelClean}>Created On:</Text>
            <Text style={styles.detailValueClean}>
              {service.createdAt ? new Date(service.createdAt).toLocaleDateString() : "—"}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        {role !== 'user' && (
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={() => openEditService(service)}
              style={styles.editButton}
              labelStyle={{ color: PRIMARY_COLOR, fontSize: 13 }}
              contentStyle={{ gap: 4 }}
            >
              <EditIcon color={PRIMARY_COLOR} />
              <Text style={styles.buttonText}>Edit</Text>
            </Button>

            <Button
              mode="outlined"
              onPress={() => confirmDeleteService(service)}
              style={styles.deleteButton}
              labelStyle={{ color: DANGER_COLOR, fontSize: 13 }}
              contentStyle={{ gap: 4 }}
            >
              <TrashIcon color={DANGER_COLOR} />
              <Text style={styles.buttonText}>Delete</Text>
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderPagination = (currentPage, totalPages, onPrev, onNext, itemType) => (
    <View style={styles.paginationContainer}>
      <Text style={styles.paginationText}>
        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, itemType === 'products' ? products.length : services.length)} of {itemType === 'products' ? products.length : services.length} {itemType}
      </Text>

      {totalPages > 1 && (
        <View style={styles.paginationButtons}>
          <Button
            mode="outlined"
            onPress={onPrev}
            disabled={currentPage === 1}
            style={styles.paginationButton}
            labelStyle={{ color: currentPage === 1 ? SUBTLE_TEXT_COLOR : PRIMARY_COLOR }}
          >
            <ChevronLeftIcon />
            <Text>Previous</Text>
          </Button>

          <Text style={styles.pageNumber}>
            Page {currentPage} of {totalPages}
          </Text>

          <Button
            mode="contained"
            onPress={onNext}
            disabled={currentPage === totalPages}
            style={[styles.paginationButton, { backgroundColor: currentPage === totalPages ? '#9CA3AF' : PRIMARY_COLOR }]}
            labelStyle={{ color: 'white' }}
          >
            <Text>Next</Text>
            <ChevronRightIcon />
          </Button>
        </View>
      )}
    </View>
  );

  const renderEmptyState = (type) => (
    <View style={styles.emptyState}>
      {type === 'products' ? <PackageIcon /> : <ServerIcon />}
      <Text style={styles.emptyStateTitle}>No {type === 'products' ? 'Products' : 'Services'} Found</Text>
      <Text style={styles.emptyStateDescription}>
        Create your first {type.slice(0, -1)} to get started.
      </Text>
      {role !== 'user' && (
        <Button
          mode="contained"
          onPress={type === 'products' ? openCreateProduct : openCreateService}
          style={styles.emptyStateButton}
        >
          <PlusCircleIcon />
          <Text style={{ color: 'white', fontWeight: '600', marginLeft: 5 }}>Add {type === 'products' ? 'Product' : 'Service'}</Text>
        </Button>
      )}
    </View>
  );

  const renderProductForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>
        {productToEdit ? 'Edit Product' : 'Create New Product'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Product Name"
        placeholderTextColor="#9CA3AF"
        value={productToEdit?.name || ''}
        onChangeText={(text) => setProductToEdit(prev => ({ ...prev, name: text }))}
      />

      <TextInput
        style={styles.input}
        placeholder="Cost Price (₹)"
        placeholderTextColor="#9CA3AF"
        keyboardType="numeric"
        value={productToEdit?.costPrice?.toString() || ''}
        onChangeText={(text) => setProductToEdit(prev => ({ ...prev, costPrice: text }))}
      />

      <TextInput
        style={styles.input}
        placeholder="Selling Price (₹)"
        placeholderTextColor="#9CA3AF"
        keyboardType="numeric"
        value={productToEdit?.sellingPrice?.toString() || ''}
        onChangeText={(text) => setProductToEdit(prev => ({ ...prev, sellingPrice: text }))}
      />

      <TextInput
        style={styles.input}
        placeholder="Stock"
        placeholderTextColor="#9CA3AF"
        keyboardType="numeric"
        value={productToEdit?.stocks?.toString() || ''}
        onChangeText={(text) => setProductToEdit(prev => ({ ...prev, stocks: text }))}
      />

      <TextInput
        style={styles.input}
        placeholder="Unit (e.g., Piece, Kg, Meter)"
        placeholderTextColor="#9CA3AF"
        value={productToEdit?.unit || ''}
        onChangeText={(text) => setProductToEdit(prev => ({ ...prev, unit: text }))}
      />

      <TextInput
        style={styles.input}
        placeholder="HSN Code"
        placeholderTextColor="#9CA3AF"
        value={productToEdit?.hsn || ''}
        onChangeText={(text) => setProductToEdit(prev => ({ ...prev, hsn: text }))}
      />

      <View style={styles.formButtons}>
        <Button
          mode="outlined"
          onPress={() => setIsProductFormOpen(false)}
          style={styles.cancelButton}
          labelStyle={{ color: SUBTLE_TEXT_COLOR, fontWeight: '600' }}
        >
          <Text>Cancel</Text>
        </Button>

        <Button
          mode="contained"
          onPress={async () => {
            try {
              if (!productToEdit?.name || productToEdit?.stocks === undefined || productToEdit?.stocks === null) {
                  showToast('Product name and stock are required.', 'error');
                  return;
              }
              
              const productToSave = {
                ...productToEdit,
                company: productToEdit?.company || (productToEdit?._id ? undefined : (companies.length > 0 ? companies[0]._id : undefined)),
              };

              const savedProduct = await saveProduct(productToSave);
              onProductSaved(savedProduct);

            } catch (error) {
              console.error("Product Save Error:", error);
              showToast('Failed to save product: ' + error.message, 'error');
            }
          }}
          style={styles.saveButton}
          labelStyle={{ color: 'white', fontWeight: '600' }}
        >
          <Text>Save</Text>
        </Button>
      </View>
    </View>
  );

  const renderServiceForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>
        {serviceToEdit ? 'Edit Service' : 'Create New Service'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Service Name"
        placeholderTextColor="#9CA3AF"
        value={serviceToEdit?.serviceName || ''}
        onChangeText={(text) => setServiceToEdit(prev => ({ ...prev, serviceName: text }))}
      />

      <TextInput
        style={styles.input}
        placeholder="Amount (₹)"
        placeholderTextColor="#9CA3AF"
        keyboardType="numeric"
        value={serviceToEdit?.amount?.toString() || ''}
        onChangeText={(text) => setServiceToEdit(prev => ({ ...prev, amount: text }))}
      />

      <TextInput
        style={styles.input}
        placeholder="SAC Code"
        placeholderTextColor="#9CA3AF"
        value={serviceToEdit?.sac || ''}
        onChangeText={(text) => setServiceToEdit(prev => ({ ...prev, sac: text }))}
      />

      <View style={styles.formButtons}>
        <Button
          mode="outlined"
          onPress={() => setIsServiceFormOpen(false)}
          style={styles.cancelButton}
          labelStyle={{ color: SUBTLE_TEXT_COLOR, fontWeight: '600' }}
        >
          <Text>Cancel</Text>
        </Button>

        <Button
          mode="contained"
          onPress={async () => {
            try {
              if (!serviceToEdit?.serviceName || serviceToEdit?.amount === undefined || serviceToEdit?.amount === null) {
                  showToast('Service name and amount are required.', 'error');
                  return;
              }
              const savedService = await saveService(serviceToEdit);
              onServiceSaved(savedService);
            } catch (error) {
              console.error("Service Save Error:", error);
              showToast('Failed to save service: ' + error.message, 'error');
            }
          }}
          style={styles.saveButton}
          labelStyle={{ color: 'white', fontWeight: '600' }}
        >
          <Text>Save</Text>
        </Button>
      </View>
    </View>
  );


  // Initial Loading Screen
  if (isLoadingCompanies) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading company settings...</Text>
      </View>
    );
  }

  // Company Setup Required Screen (If no companies are linked)
  if (companies.length === 0) {
    return (
      <View style={styles.setupRequiredContainer}>
        <Card style={styles.setupCard}>
          <Card.Content>
            <View style={styles.setupIcon}>
              <Icon name="office-building" size={48} color={PRIMARY_COLOR} />
            </View>
            <Text style={styles.setupTitle}>Company Setup Required</Text>
            <Text style={styles.setupDescription}>
              Your company account needs to be configured to access inventory features. Please contact support.
            </Text>

            <View style={styles.contactButtons}>
              <Button mode="contained" style={[styles.contactButton, { backgroundColor: PRIMARY_COLOR }]} onPress={() => Alert.alert('Contact', 'Simulating call to +91-8989773689')}>
                <Icon name="phone" size={20} color="white" />
                <Text style={[styles.contactButtonText, { color: 'white' }]}>+91-8989773689</Text>
              </Button>

              <Button mode="outlined" style={styles.contactButton} labelStyle={{ color: PRIMARY_COLOR }} onPress={() => Alert.alert('Contact', 'Simulating email to support')}>
                <Icon name="email" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.contactButtonText}>Email Us</Text>
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
    );
  }

  // Main Inventory Screen
  return (
    <View style={styles.container}>
      {/* Toast Component */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Inventory Management</Text>
        <Text style={styles.subtitle}>Track and manage your products and services.</Text>
      </View>

      <View style={styles.actionBar}>
        {renderActionButtons()}
      </View>

      <View style={styles.tabContainer}>
        {renderTabButton('Products', 'products', products.length)}
        {renderTabButton('Services', 'services', services.length)}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY_COLOR]} tintColor={PRIMARY_COLOR} />
        }
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {activeTab === 'products' && (
          <>
            {isLoadingProducts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                <Text style={styles.loadingText}>Loading products...</Text>
              </View>
            ) : products.length === 0 ? (
              renderEmptyState('products')
            ) : (
              <>
                {selectedProducts.length > 0 && role !== 'user' && (
                  <View style={styles.bulkActions}>
                    <Text style={styles.bulkActionsText}>
                      **{selectedProducts.length} item{selectedProducts.length > 1 ? 's' : ''} selected**
                    </Text>
                    <Button
                      mode="contained"
                      onPress={handleBulkDeleteProducts}
                      style={styles.bulkDeleteButton}
                    >
                      <TrashIcon color="white" />
                      <Text style={styles.bulkDeleteText}>Delete Selected</Text>
                    </Button>
                  </View>
                )}

                <FlatList
                  data={paginatedProducts}
                  renderItem={renderProductItem}
                  keyExtractor={item => item._id}
                  scrollEnabled={false}
                />

                {renderPagination(
                  productCurrentPage,
                  productTotalPages,
                  goToPrevProductPage,
                  goToNextProductPage,
                  'products'
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'services' && (
          <>
            {isLoadingServices ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                <Text style={styles.loadingText}>Loading services...</Text>
              </View>
            ) : services.length === 0 ? (
              renderEmptyState('services')
            ) : (
              <>
                <FlatList
                  data={paginatedServices}
                  renderItem={renderServiceItem}
                  keyExtractor={item => item._id}
                  scrollEnabled={false}
                />

                {renderPagination(
                  serviceCurrentPage,
                  serviceTotalPages,
                  goToPrevServicePage,
                  goToNextServicePage,
                  'services'
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Product Form Modal */}
      <Modal
        visible={isProductFormOpen}
        animationType="slide"
        onRequestClose={() => setIsProductFormOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>{productToEdit ? 'Edit Product' : 'Create Product'}</Text>
            <TouchableOpacity onPress={() => setIsProductFormOpen(false)} style={styles.modalCloseButton}>
              <CloseIcon />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {renderProductForm()}
          </ScrollView>
        </View>
      </Modal>

      {/* Service Form Modal */}
      <Modal
        visible={isServiceFormOpen}
        animationType="slide"
        onRequestClose={() => setIsServiceFormOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>{serviceToEdit ? 'Edit Service' : 'Create Service'}</Text>
            <TouchableOpacity onPress={() => setIsServiceFormOpen(false)} style={styles.modalCloseButton}>
              <CloseIcon />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {renderServiceForm()}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// --- UPDATED STYLES (Clean/Flat Design) ---

const styles = StyleSheet.create({
  // General & Layout
  container: {
    flex: 1,
    backgroundColor: LIGHT_BACKGROUND,
  },

  // Header & Title
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 40,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_COLOR,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: SUBTLE_TEXT_COLOR,
  },

  // Action Bar & Buttons
  actionBar: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  actionBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  excelContainer: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  excelButton: {
    minWidth: 100,
    borderRadius: 8,
    height: 40,
    flexGrow: 1,
    justifyContent: 'center',
    borderColor: PRIMARY_COLOR,
  },
  serviceButton: {
    borderColor: PRIMARY_COLOR,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    justifyContent: 'center',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabButtonText: {
    fontSize: 15,
    color: SUBTLE_TEXT_COLOR,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
  },

  content: {
    flex: 1,
    paddingVertical: 8,
  },

  // Item Card (Cleaner Design)
  itemCard: {
    marginHorizontal: 16,
    marginVertical: 6, // Less vertical margin
    borderRadius: 10,
    elevation: 2, // Softer shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    backgroundColor: 'white',
  },
  cardContent: {
    padding: 16,
  },
  checkboxWrapper: {
    marginRight: 8,
    alignSelf: 'flex-start',
    marginTop: -8,
  },

  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 10,
  },
  itemTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 10,
  },
  itemTextContainer: {
    marginLeft: 10,
    flexShrink: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 2,
  },
  companyName: {
    fontSize: 12,
    color: SUBTLE_TEXT_COLOR,
    fontWeight: '400',
  },
  serviceBadge: {
    backgroundColor: PRIMARY_COLOR,
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    fontWeight: '700',
    fontSize: 10,
  },

  // Price & Stock container (Right side of header)
  priceStockContainer: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 4,
  },
  stockBadgeClean: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  stockTextClean: {
    fontSize: 12,
    fontWeight: '600',
  },


  // Item Details (Single column list)
  itemDetailsClean: {
    marginBottom: 12,
  },
  detailRowClean: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabelClean: {
    fontSize: 13,
    color: SUBTLE_TEXT_COLOR,
    fontWeight: '500',
    minWidth: 100,
  },
  detailValueClean: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_COLOR,
    flex: 1,
    textAlign: 'right',
  },

  // Card Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  editButton: {
    height: 40,
    minWidth: 80,
    borderColor: PRIMARY_COLOR,
    borderRadius: 8,
    justifyContent: 'center',
  },
  deleteButton: {
    height: 40,
    minWidth: 80,
    borderColor: DANGER_COLOR,
    borderRadius: 8,
    justifyContent: 'center',
  },
  buttonText: {
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 13,
  },

  // Pagination
  paginationContainer: {
    padding: 16,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  paginationText: {
    fontSize: 13,
    color: SUBTLE_TEXT_COLOR,
    textAlign: 'center',
    marginBottom: 10,
  },
  paginationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 100,
    height: 36,
    borderRadius: 8,
  },
  pageNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },

  // Bulk Actions
  bulkActions: {
    padding: 12,
    backgroundColor: '#FFF8E1', // Light yellow background
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WARNING_COLOR,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkActionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: DANGER_COLOR,
  },
  bulkDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: DANGER_COLOR,
    borderRadius: 6,
    height: 36,
    paddingHorizontal: 12,
  },
  bulkDeleteText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },

  // Empty State & Setup (minimal changes)
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR + '30',
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 15,
    color: SUBTLE_TEXT_COLOR,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },

  // Loading & Setup
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: SUBTLE_TEXT_COLOR,
  },
  setupRequiredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: LIGHT_BACKGROUND,
  },
  setupCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    elevation: 6,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  setupIcon: {
    alignItems: 'center',
    marginBottom: 20,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    color: TEXT_COLOR,
  },
  setupDescription: {
    fontSize: 14,
    color: SUBTLE_TEXT_COLOR,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  contactButtons: {
    gap: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Modal Forms (cleaner)
  modalContainer: {
    flex: 1,
    backgroundColor: LIGHT_BACKGROUND,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 40,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    backgroundColor: 'white',
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_COLOR,
  },
  modalCloseButton: {
    padding: 5,
  },
  modalContent: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: LIGHT_BACKGROUND,
  },
  formContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 20,
    textAlign: 'left',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: 'white',
    color: TEXT_COLOR,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
  },
  // Toast Styles
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: SUCCESS_COLOR,
  },
  toastError: {
    backgroundColor: DANGER_COLOR,
  },
  toastInfo: {
    backgroundColor: PRIMARY_COLOR,
  },
  toastText: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 10,
    marginRight: 8,
  },
  toastCloseButton: {
    padding: 4,
  },
});
