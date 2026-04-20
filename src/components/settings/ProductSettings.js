import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import {
  MoreHorizontal,
  Trash2,
  PlusCircle,
  Building,
  Phone,
  Mail,
  Package,
  Server,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  Hash,
  Edit2,
  Loader2,
  DollarSign,
} from 'lucide-react-native';
import axios from 'axios';

// Custom Components
import ProductForm from '../products/ProductForm';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ExcelImportExport from '../ui/ExcelImportExport';
import { BASE_URL } from '../../config';
import CheckBox from '@react-native-community/checkbox';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { usePermissions } from '../../contexts/permission-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/Dialog';

export default function ProductSettings() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [openNameDialog, setOpenNameDialog] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const navigation = useNavigation();

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10);

  // Permission checks
  const { permissions: userCaps, refetch: refetchUserPermissions } =
    useUserPermissions();
  const {
    permissions: accountPermissions,
    refetch: refetchAccountPermissions,
  } = usePermissions();

  const canCreateProducts =
    accountPermissions?.canCreateProducts ??
    accountPermissions?.canCreateInventory ??
    userCaps?.accountPermissions?.canCreateProducts ??
    userCaps?.canCreateProducts ??
    userCaps?.canCreateInventory ??
    false;

  // Format currency function
  const formatCurrency = amount => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Fetch companies
  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await axios.get(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data;
      setCompanies(Array.isArray(data) ? data : data.companies || []);
    } catch (err) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'Failed to load companies',
        text2: err.message || 'Something went wrong',
      });
    } finally {
      setIsLoadingCompanies(false);
    }
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await axios.get(`${BASE_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data;
      setProducts(Array.isArray(data) ? data : data.products || []);
      setCurrentPage(1);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load products',
        text2: error.message || 'Something went wrong',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const tasks = [fetchProducts(), fetchCompanies()];
    if (typeof refetchUserPermissions === 'function') {
      tasks.push(refetchUserPermissions());
    }
    if (typeof refetchAccountPermissions === 'function') {
      tasks.push(refetchAccountPermissions());
    }
    await Promise.all(tasks);
    setIsRefreshing(false);
  }, [
    fetchProducts,
    fetchCompanies,
    refetchUserPermissions,
    refetchAccountPermissions,
  ]);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
      fetchCompanies();
    }, [fetchProducts, fetchCompanies]),
  );

  const handleOpenForm = (product = null) => {
    navigation.navigate('ProductForm', {
      product,
    });
  };
 
  const handleOpenDeleteDialog = product => {
    setProductToDelete(product);
    setIsAlertOpen(true);
  };

  const handleFormSuccess = () => {
    fetchProducts();
    Toast.show({
      type: 'success',
      text1: `Item saved successfully`,
      text2: `The item details have been saved.`,
    });
    setSelectedProduct(null);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      await axios.delete(`${BASE_URL}/api/products/${productToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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
        text2: error.message || 'Something went wrong',
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

    Alert.alert(
      'Confirm Bulk Delete',
      `Are you sure you want to delete ${selectedProducts.length} items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) throw new Error('Authentication token not found.');

              await axios.delete(`${BASE_URL}/api/products/bulk-delete`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                data: { productIds: selectedProducts },
              });

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
                text2: error.message || 'Something went wrong',
              });
            }
          },
        },
      ],
    );
  };

  const handleEditProduct = product => {
    setOpenDropdownId(null);
    handleOpenForm(product);
  };

  const handleDeleteProductFromDropdown = product => {
    setOpenDropdownId(null);
    handleOpenDeleteDialog(product);
  };

  const extractNumber = value => {
    if (!value) return 0;
    const strValue = String(value);
    const numeric = strValue.replace(/[^0-9.]/g, '');
    return numeric ? Number(numeric) : 0;
  };

  // Pagination logic
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = products.slice(
    indexOfFirstProduct,
    indexOfLastProduct,
  );
  const totalPages = Math.ceil(products.length / productsPerPage);

  const paginate = pageNumber => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleNextPage = () => paginate(currentPage + 1);
  const handlePrevPage = () => paginate(currentPage - 1);

  // Close dropdown when clicking anywhere
  const handleOutsideClick = () => {
    if (openDropdownId) {
      setOpenDropdownId(null);
    }
  };

  // Render product item for FlatList - REDESIGNED COMPACT VERSION
  const renderProductItem = ({ item: product }) => {
    const role = AsyncStorage.getItem('role');
    const isSelected = selectedProducts.includes(product._id);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() =>
          role === 'user'
            ? handleOpenForm(product)
            : setOpenNameDialog(product.name)
        }
        activeOpacity={0.7}
      >
        {/* Compact Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.leftSection}>
            {/* {role !== 'user' && (
              <CheckBox
                value={isSelected}
                onValueChange={value => handleSelectProduct(product._id, value)}
                style={styles.checkbox}
              />
            )} */}

            <View style={styles.iconBadge}>
              {product.type === 'service' ? (
                <Server size={14} color="#8b5cf6" />
              ) : (
                <Package size={14} color="#8b77ff" />
              )}
            </View>

            <View style={styles.nameSection}>
              <View style={styles.nameRow}>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.name.charAt(0).toUpperCase() + product.name.slice(1)}
                </Text>
                {product.type === 'service' && (
                  <View style={styles.serviceBadge}>
                    <Text style={styles.serviceBadgeText}>SVC</Text>
                  </View>
                )}
              </View>
              <Text style={styles.companyName} numberOfLines={1}>
                {typeof product.company === 'object' && product.company
                  ? product.company.businessName
                  : '-'}
              </Text>
            </View>
          </View>

          {role !== 'user' && (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={e => {
                e.stopPropagation();
                setOpenDropdownId(
                  openDropdownId === product._id ? null : product._id,
                );
              }}
            >
              <MoreHorizontal size={18} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdown Menu */}
        {openDropdownId === product._id && (
          <TouchableWithoutFeedback>
            <View style={styles.dropdown}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleEditProduct(product)}
              >
                <Edit2 size={14} color="#8b77ff" />
                <Text style={styles.dropdownItemText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* Compact Info Grid */}
        <View style={styles.infoRow}>
          {/* Stock/Type */}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>
              {product.type === 'service' ? 'Type' : 'Stock'}
            </Text>
            {product.type === 'service' ? (
              <Text style={styles.infoValue}>Service</Text>
            ) : (
              <View style={styles.stockRow}>
                <View
                  style={[
                    styles.stockDot,
                    {
                      backgroundColor:
                        (product.stocks ?? 0) > 0 ? '#10b981' : '#ef4444',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.stockValue,
                    {
                      color: (product.stocks ?? 0) > 0 ? '#10b981' : '#ef4444',
                    },
                  ]}
                >
                  {product.stocks ?? 0}
                </Text>
              </View>
            )}
          </View>

          {/* Unit */}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Unit</Text>
            <Text style={styles.infoValue}>{product.unit ?? 'Piece'}</Text>
          </View>

          {/* Cost Price */}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Cost</Text>
            <Text style={styles.priceValue}>
              {product.type === 'service'
                ? '-'
                : formatCurrency(product.costPrice || 0)}
            </Text>
          </View>

          {/* Selling Price */}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Sell</Text>
            <Text style={styles.priceValue}>
              {product.type === 'service'
                ? '-'
                : formatCurrency(product.sellingPrice || 0)}
            </Text>
          </View>
        </View>

        {/* Footer Row */}
        <View style={styles.footerRow}>
          <View style={styles.hsnRow}>
            <Hash size={10} color="#9ca3af" />
            <Text style={styles.hsnText}>
              {product.hsn ? product.hsn : 'N/A'}
            </Text>
          </View>

          <View style={styles.dateRow}>
            <Calendar size={10} color="#9ca3af" />
            <Text style={styles.dateText}>
              {new Intl.DateTimeFormat('en-GB').format(
                new Date(product.createdAt),
              )}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoadingCompanies) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8b77ff" />
      </View>
    );
  }

  if (companies.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.centerContainer}>
        <View style={styles.noCompanyCard}>
          <View style={styles.noCompanyIcon}>
            <Building size={32} color="#8b77ff" />
          </View>

          <Text style={styles.noCompanyTitle}>Company Setup Required</Text>
          <Text style={styles.noCompanyDescription}>
            Contact us to enable your company account and access all features.
          </Text>

          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={styles.phoneButton}
              onPress={() => Linking.openURL('tel:+918989773689')}
            >
              <Phone size={20} color="white" />
              <Text style={styles.phoneButtonText}>+91-8989773689</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.emailButton}
              onPress={() => Linking.openURL('mailto:support@company.com')}
            >
              <Mail size={20} color="#8b77ff" />
              <Text style={styles.emailButtonText}>Email Us</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={handleOutsideClick}>
        <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.card}>
              {/* Compact Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.title}>Products</Text>
                  <Text style={styles.description}>
                    {products.length} item{products.length !== 1 ? 's' : ''}
                  </Text>
                </View>

                {canCreateProducts && (
                  <View style={styles.headerButtons}>
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
                            company:
                              foundCompany?._id || companies[0]?._id || '',
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

                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => handleOpenForm()}
                    >
                      <PlusCircle size={16} color="white" />
                      <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Content */}
              {isLoading ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color="#8b77ff" />
                </View>
              ) : products.length > 0 ? (
                <>
                  {/* Products list */}
                  <FlatList
                    data={currentProducts}
                    renderItem={renderProductItem}
                    keyExtractor={item => item._id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.listContainer}
                    ListFooterComponent={
                      totalPages > 1 && (
                        <View style={styles.pagination}>
                          <TouchableOpacity
                            style={[
                              styles.paginationButton,
                              currentPage === 1 &&
                                styles.paginationButtonDisabled,
                            ]}
                            onPress={handlePrevPage}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft
                              size={16}
                              color={currentPage === 1 ? '#9ca3af' : '#4b5563'}
                            />
                          </TouchableOpacity>

                          <Text style={styles.pageInfo}>
                            {currentPage} / {totalPages}
                          </Text>

                          <TouchableOpacity
                            style={[
                              styles.paginationButton,
                              currentPage === totalPages &&
                                styles.paginationButtonDisabled,
                            ]}
                            onPress={handleNextPage}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight
                              size={16}
                              color={
                                currentPage === totalPages
                                  ? '#9ca3af'
                                  : '#4b5563'
                              }
                            />
                          </TouchableOpacity>
                        </View>
                      )
                    }
                  />
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Package size={40} color="#9ca3af" />
                  <Text style={styles.emptyTitle}>No Products Found</Text>
                  <Text style={styles.emptyDescription}>
                    Get started by adding your first product.
                  </Text>
                  {canCreateProducts && (
                    <TouchableOpacity
                      style={styles.emptyAddButton}
                      onPress={() => handleOpenForm()}
                    >
                      <PlusCircle size={14} color="white" />
                      <Text style={styles.emptyAddButtonText}>Add Product</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Product Form is now opened via navigation, not as a dialog/modal */}

            {/* Delete Confirmation Dialog */}
            <Dialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
              <View style={styles.dialogContent}>
                <Text style={styles.dialogTitle}>Are you absolutely sure?</Text>
                <Text style={styles.dialogDescription}>
                  This action cannot be undone. This will permanently delete the
                  item.
                </Text>
                <View style={styles.dialogButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setIsAlertOpen(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeleteProduct}
                  >
                    <Text style={styles.deleteButtonText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Dialog>

            {/* Product Name Dialog */}
            {openNameDialog && (
              <Dialog
                open={!!openNameDialog}
                onOpenChange={() => setOpenNameDialog(null)}
              >
                <View style={styles.nameDialogContent}>
                  <Text style={styles.nameDialogTitle}>Product Details</Text>
                  <Text style={styles.nameDialogValue}>
                    {openNameDialog.charAt(0).toUpperCase() +
                      openNameDialog.slice(1)}
                  </Text>
                </View>
              </Dialog>
            )}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9ff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 8,
    // margin: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
     backgroundColor: '#f7f9ff',
  },

  // Compact Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  description: {
    fontSize: 11,
    color: '#6b7280',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b77ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },

  // Compact Product Card
  listContainer: {
    gap: 8,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    // borderWidth: 1,
    // borderColor: '#e5e7eb',
  },

  // Card Header (Name + Actions)
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 8,
  },
  checkbox: {
    marginTop: 2,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  serviceBadge: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#8b5cf6',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  serviceBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  companyName: {
    fontSize: 12,
    color: '#6b7280',
  },
  moreButton: {
    padding: 4,
  },

  // Dropdown
  dropdown: {
    position: 'absolute',
    top: 32,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 120,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },

  // Compact Info Row (4 columns)
  infoRow: {
    flexDirection: 'row',
    backgroundColor: '#faf8ff',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    gap: 8,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },

  // Footer Row (HSN + Date)
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hsnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hsnText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 10,
    color: '#9ca3af',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDescription: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b77ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  emptyAddButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 13,
  },

  // Compact Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 16,
  },
  paginationButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  paginationButtonDisabled: {
    opacity: 0.4,
  },
  pageInfo: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },

  // No Company Card
  noCompanyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noCompanyIcon: {
    backgroundColor: '#dbeafe',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noCompanyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  noCompanyDescription: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  contactButtons: {
    width: '100%',
    gap: 12,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b77ff',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 10,
  },
  phoneButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8b77ff',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 10,
  },
  emailButtonText: {
    color: '#8b77ff',
    fontWeight: '500',
    fontSize: 14,
  },

  // Dialogs
  dialogContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  dialogDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'white',
  },
  nameDialogContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  nameDialogTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  nameDialogValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
});
