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
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import {
  MoreHorizontal,
  Edit,
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
  Package,
  Server,
  Calendar,
  Eye,
} from 'lucide-react-native';
import ProductForm from '../products/ProductForm';
import ExcelImportExport from '../ui/ExcelImportExport';
import { BASE_URL } from '../../config';
import CheckBox from '@react-native-community/checkbox';

export function ProductSettings() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [openNameDialog, setOpenNameDialog] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 10;

  const [role, setRole] = useState(null);

  useEffect(() => {
    const getRole = async () => {
      try {
        const storedRole = await AsyncStorage.getItem('role');
        setRole(storedRole);
      } catch (error) {
        console.error('Error getting role:', error);
      }
    };
    getRole();
  }, []);

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

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch products.');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data.products || []);
      setCurrentPage(1);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load products',
        text2: error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, [fetchProducts]);

  const handleOpenForm = (product = null) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = product => {
    setProductToDelete(product);
    setIsAlertOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchProducts();
    const action = selectedProduct ? 'updated' : 'created';
    Toast.show({
      type: 'success',
      text1: `Item ${action} successfully`,
      text2: `The item details have been ${action}.`,
    });
    setSelectedProduct(null);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(
        `${BASE_URL}/api/products/${productToDelete._id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) throw new Error('Failed to delete product.');

      Toast.show({
        type: 'success',
        text1: 'Item Deleted',
        text2: 'The item has been successfully removed.',
      });

      fetchProducts();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsAlertOpen(false);
      setProductToDelete(null);
    }
  };

  const handleSelectProduct = (productId, checked) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleSelectAll = checked => {
    if (checked) {
      setSelectedProducts(products.map(p => p._id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;

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

      Toast.show({
        type: 'success',
        text1: 'Items Deleted',
        text2: `${selectedProducts.length} items have been successfully removed.`,
      });

      setSelectedProducts([]);
      fetchProducts();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Bulk Deletion Failed',
        text2: error instanceof Error ? error.message : 'Something went wrong.',
      });
    }
  };

  const extractNumber = value => {
    if (!value) return 0;
    const strValue = String(value);
    const numeric = strValue.replace(/[^0-9.]/g, '');
    return numeric ? Number(numeric) : 0;
  };

  // Pagination Logic
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = products.slice(
    indexOfFirstProduct,
    indexOfLastProduct,
  );
  const totalPages = Math.ceil(products.length / productsPerPage);

  // Loading state
  if (isLoadingCompanies) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading companies...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {companies.length === 0 ? (
          <View style={styles.noCompanyContainer}>
            <View style={styles.card}>
              <View style={styles.cardContent}>
                <View style={styles.companyIconContainer}>
                  <Building size={48} color="#3b82f6" />
                </View>
                <Text style={styles.companyTitle}>Company Setup Required</Text>
                <Text style={styles.companyDescription}>
                  Contact us to enable your company account and access all
                  features.
                </Text>
                <View style={styles.contactButtons}>
                  <TouchableOpacity
                    style={styles.phoneButton}
                    onPress={() => Linking.openURL('tel:+91-8989773689')}
                  >
                    <Phone size={20} color="#fff" />
                    <Text style={styles.buttonText}>+91-8989773689</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.emailButton}
                    onPress={() =>
                      Linking.openURL('mailto:support@company.com')
                    }
                  >
                    <Mail size={20} color="#3b82f6" />
                    <Text style={styles.emailButtonText}>Email Us</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>Manage Products & Services</Text>
                <Text style={styles.subtitle}>
                  A list of all your products or services.
                </Text>
              </View>

              <View style={styles.headerActions}>
                <ExcelImportExport
                  templateData={[
                    {
                      Company: '',
                      'Item Name': '',
                      Stock: '',
                      Unit: '',
                      'Cost Price': '',
                      'Selling Price': '',
                      HSN: '',
                    },
                  ]}
                  templateFileName="product_template.xlsx"
                  importEndpoint={`${BASE_URL}/api/products`}
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
                          c.businessName.toLowerCase() ===
                          companyName?.toLowerCase(),
                      );

                      return {
                        company: foundCompany?._id || companies[0]?._id || '',
                        name: item['Item Name'],
                        stocks: item['Stock'] || 0,
                        unit: item['Unit'] || 'Piece',
                        costPrice: extractNumber(item['Cost Price']),
                        sellingPrice: extractNumber(item['Selling Price']),
                        hsn: item['HSN'] || '',
                      };
                    });
                  }}
                />

                {/* Bulk Delete Button */}
                {selectedProducts.length > 0 && role !== 'user' && (
                  <TouchableOpacity
                    style={styles.bulkDeleteButton}
                    onPress={handleBulkDelete}
                  >
                    <Trash2 size={16} color="#fff" />
                    <Text style={styles.bulkDeleteButtonText}>
                      Delete ({selectedProducts.length})
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Add Item Button */}
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleOpenForm()}
                >
                  <PlusCircle size={16} color="#fff" />
                  <Text style={styles.addButtonText}>Add Product</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Content */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading products...</Text>
              </View>
            ) : products.length > 0 ? (
              <>
                {/* Select All for Mobile */}
                {role !== 'user' && products.length > 0 && (
                  <View style={styles.selectAllContainer}>
                    <View style={styles.checkboxContainer}>
                      <CheckBox
                        value={
                          selectedProducts.length === products.length &&
                          products.length > 0
                        }
                        onValueChange={handleSelectAll}
                        tintColors={{ true: '#3b82f6', false: '#9ca3af' }}
                      />
                      <Text style={styles.selectAllText}>
                        Select All ({products.length} items)
                      </Text>
                    </View>
                    {selectedProducts.length > 0 && (
                      <TouchableOpacity
                        style={styles.mobileDeleteButton}
                        onPress={handleBulkDelete}
                      >
                        <Trash2 size={14} color="#fff" />
                        <Text style={styles.mobileDeleteButtonText}>
                          Delete ({selectedProducts.length})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Product List */}
                <View style={styles.productList}>
                  {currentProducts.map(product => (
                    <View key={product._id} style={styles.productCard}>
                      {/* Product Header */}
                      <View style={styles.productHeader}>
                        <View style={styles.productInfo}>
                          <View style={styles.productNameRow}>
                            {role !== 'user' && (
                              <CheckBox
                                value={selectedProducts.includes(product._id)}
                                onValueChange={checked =>
                                  handleSelectProduct(product._id, checked)
                                }
                                style={styles.productCheckbox}
                                tintColors={{
                                  true: '#3b82f6',
                                  false: '#9ca3af',
                                }}
                              />
                            )}
                            <View style={styles.productIconContainer}>
                              {product.type === 'service' ? (
                                <View style={styles.serviceIcon}>
                                  <Server size={16} color="#8b5cf6" />
                                </View>
                              ) : (
                                <View style={styles.productIcon}>
                                  <Package size={16} color="#3b82f6" />
                                </View>
                              )}
                            </View>
                            <View style={styles.productNameContainer}>
                              <Text
                                style={styles.productName}
                                numberOfLines={1}
                              >
                                {product.name.charAt(0).toUpperCase() +
                                  product.name.slice(1)}
                              </Text>
                              <Text
                                style={styles.companyName}
                                numberOfLines={1}
                              >
                                {typeof product.company === 'object' &&
                                product.company
                                  ? product.company.businessName
                                  : '-'}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.productTags}>
                            {product.type === 'service' && (
                              <View style={styles.serviceTag}>
                                <Text style={styles.serviceTagText}>
                                  Service
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {role !== 'user' && (
                          <TouchableOpacity
                            style={styles.menuButton}
                            onPress={() => {
                              Alert.alert('Actions', 'Choose an action', [
                                {
                                  text: 'Edit',
                                  onPress: () => handleOpenForm(product),
                                },
                                {
                                  text: 'Delete',
                                  onPress: () =>
                                    handleOpenDeleteDialog(product),
                                  style: 'destructive',
                                },
                                { text: 'Cancel', style: 'cancel' },
                              ]);
                            }}
                          >
                            <MoreHorizontal size={20} color="#6b7280" />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Created Date */}
                      <View style={styles.createdDateContainer}>
                        <Calendar size={12} color="#9ca3af" />
                        <Text style={styles.createdDateText}>
                          Created:{' '}
                          {new Date(product.createdAt).toLocaleDateString(
                            'en-GB',
                          )}
                        </Text>
                      </View>

                      {/* Stock and Unit Section */}
                      <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>
                            {product.type === 'service' ? 'Type' : 'Stock'}
                          </Text>
                          <View style={styles.infoValueContainer}>
                            {product.type === 'service' ? (
                              <Text style={styles.infoValue}>Service Item</Text>
                            ) : (
                              <>
                                <View
                                  style={[
                                    styles.stockIndicator,
                                    (product.stocks ?? 0) > 0
                                      ? styles.stockAvailable
                                      : styles.stockOut,
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.stockText,
                                    (product.stocks ?? 0) > 0
                                      ? styles.stockAvailableText
                                      : styles.stockOutText,
                                  ]}
                                >
                                  {product.stocks ?? 0} in stock
                                </Text>
                              </>
                            )}
                          </View>
                        </View>

                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Unit</Text>
                          <Text style={styles.infoValue}>
                            {product.unit ?? 'Piece'}
                          </Text>
                        </View>
                      </View>

                      {/* Price Section */}
                      <View style={styles.priceSection}>
                        <View style={styles.priceItem}>
                          <Text style={styles.priceLabel}>Cost Price</Text>
                          <Text style={styles.priceValue}>
                            {product.type === 'service'
                              ? '-'
                              : product.costPrice
                              ? `₹${product.costPrice}`
                              : '₹0'}
                          </Text>
                        </View>
                        <View style={styles.priceDivider} />
                        <View style={styles.priceItem}>
                          <Text style={styles.priceLabel}>Selling Price</Text>
                          <Text style={styles.priceValue}>
                            {product.type === 'service'
                              ? '-'
                              : product.sellingPrice
                              ? `₹${product.sellingPrice}`
                              : '₹0'}
                          </Text>
                        </View>
                      </View>

                      {/* HSN Code Section */}
                      <View style={styles.hsnSection}>
                        <Hash size={12} color="#9ca3af" />
                        <Text style={styles.hsnText}>
                          HSN Code: {product.hsn ? product.hsn : 'N/A'}
                        </Text>
                      </View>

                      {/* Quick Actions for Users */}
                      {role === 'user' && (
                        <View style={styles.userActions}>
                          <TouchableOpacity
                            style={styles.viewButton}
                            onPress={() => handleOpenForm(product)}
                          >
                            <Eye size={12} color="#3b82f6" />
                            <Text style={styles.viewButtonText}>View</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </View>

                {/* Pagination */}
                {totalPages > 1 && (
                  <View style={styles.pagination}>
                    <TouchableOpacity
                      style={[
                        styles.pageButton,
                        currentPage === 1 && styles.pageButtonDisabled,
                      ]}
                      onPress={() =>
                        setCurrentPage(prev => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft
                        size={20}
                        color={currentPage === 1 ? '#9ca3af' : '#3b82f6'}
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

                    <Text style={styles.pageInfo}>
                      Page {currentPage} of {totalPages}
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.pageButton,
                        currentPage === totalPages && styles.pageButtonDisabled,
                      ]}
                      onPress={() =>
                        setCurrentPage(prev => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      <Text
                        style={[
                          styles.pageButtonText,
                          currentPage === totalPages &&
                            styles.pageButtonTextDisabled,
                        ]}
                      >
                        Next
                      </Text>
                      <ChevronRight
                        size={20}
                        color={
                          currentPage === totalPages ? '#9ca3af' : '#3b82f6'
                        }
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Package size={48} color="#9ca3af" />
                <Text style={styles.emptyTitle}>No Products Found</Text>
                <Text style={styles.emptyText}>
                  Get started by adding your first product or service.
                </Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleOpenForm()}
                >
                  <PlusCircle size={16} color="#fff" />
                  <Text style={styles.addButtonText}>Add Product</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Product Form Modal */}
      <Modal
        visible={isFormOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setSelectedProduct(null);
          setIsFormOpen(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedProduct ? 'Edit Product' : 'Create New Product'}
              </Text>
              <Text style={styles.modalDescription}>
                {selectedProduct
                  ? 'Update the details for this item.'
                  : 'Fill in the form to add a new product or service.'}
              </Text>
            </View>
            <ScrollView style={styles.modalContent}>
              <ProductForm
                product={selectedProduct || undefined}
                onSuccess={handleFormSuccess}
                onCancel={() => {
                  setSelectedProduct(null);
                  setIsFormOpen(false);
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Alert */}
      <Modal visible={isAlertOpen} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.alertModalContainer}>
            <Text style={styles.alertModalTitle}>Delete Product</Text>
            <Text style={styles.alertModalDescription}>
              Are you sure you want to delete this product? This action cannot
              be undone.
            </Text>
            <View style={styles.alertModalButtons}>
              <TouchableOpacity
                style={styles.alertCancelButton}
                onPress={() => setIsAlertOpen(false)}
              >
                <Text style={styles.alertCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.alertDeleteButton}
                onPress={handleDeleteProduct}
              >
                <Text style={styles.alertDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Product Name Dialog Modal */}
      <Modal
        visible={openNameDialog !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setOpenNameDialog(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContainer}>
            <View style={styles.detailModalHeader}>
              <View style={styles.detailModalTitleRow}>
                <Package size={20} color="#3b82f6" />
                <Text style={styles.detailModalTitle}>Product Overview</Text>
              </View>
            </View>

            <View style={styles.detailContent}>
              <View style={styles.detailCard}>
                <View style={styles.detailCardIcon}>
                  <Package size={16} color="#3b82f6" />
                </View>
                <View style={styles.detailCardContent}>
                  <Text style={styles.detailCardLabel}>PRODUCT NAME</Text>
                  <Text style={styles.detailCardValue}>
                    {openNameDialog
                      ? openNameDialog.charAt(0).toUpperCase() +
                        openNameDialog.slice(1)
                      : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <View style={[styles.detailCardIcon, styles.companyIcon]}>
                  <Building size={16} color="#10b981" />
                </View>
                <View style={styles.detailCardContent}>
                  <Text style={[styles.detailCardLabel, styles.companyLabel]}>
                    COMPANY
                  </Text>
                  <Text style={styles.detailCardValue}>
                    {openNameDialog &&
                    products.find(p => p.name === openNameDialog)
                      ? typeof products.find(p => p.name === openNameDialog)
                          .company === 'object'
                        ? products.find(p => p.name === openNameDialog).company
                            .businessName
                        : 'No company assigned'
                      : 'No company assigned'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeDetailButton}
                onPress={() => setOpenNameDialog(null)}
              >
                <Text style={styles.closeDetailButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  noCompanyContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    alignItems: 'center',
  },
  companyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  companyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  phoneButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emailButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  emailButtonText: {
    color: '#3b82f6',
    fontWeight: '500',
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerText: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  bulkDeleteButton: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bulkDeleteButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  mobileDeleteButton: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    gap: 4,
  },
  mobileDeleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  productList: {
    gap: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productCheckbox: {
    marginRight: 4,
  },
  productIconContainer: {
    marginRight: 8,
  },
  productIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productNameContainer: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  companyName: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  productTags: {
    marginTop: 8,
  },
  serviceTag: {
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  serviceTagText: {
    fontSize: 11,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  menuButton: {
    padding: 4,
  },
  createdDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingLeft: 40,
  },
  createdDateText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockAvailable: {
    backgroundColor: '#10b981',
  },
  stockOut: {
    backgroundColor: '#ef4444',
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stockAvailableText: {
    color: '#10b981',
  },
  stockOutText: {
    color: '#ef4444',
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 12,
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  priceDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#d1d5db',
  },
  hsnSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 12,
  },
  hsnText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
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
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 6,
  },
  viewButtonText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  pageButtonTextDisabled: {
    color: '#9ca3af',
  },
  pageInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalContent: {
    maxHeight: Dimensions.get('window').height * 0.7,
  },
  alertModalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
  },
  alertModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  alertModalDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  alertModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  alertCancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  alertCancelButtonText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  alertDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  alertDeleteButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  detailModalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailModalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  detailContent: {
    padding: 20,
  },
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 12,
  },
  detailCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyIcon: {
    backgroundColor: '#d1fae5',
  },
  detailCardContent: {
    flex: 1,
  },
  detailCardLabel: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  companyLabel: {
    color: '#10b981',
  },
  detailCardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeDetailButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeDetailButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
});
