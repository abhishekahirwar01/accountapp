// ProductSettings.js (React Native)
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
} from 'lucide-react-native';
import axios from 'axios';



// Custom Components
import ProductForm from '../products/ProductForm';
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [openNameDialog, setOpenNameDialog] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);

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

  // Prefer account-level permissions (from `usePermissions`) when available.
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
      setCurrentPage(1); // Reset to first page
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

  useEffect(() => {
    fetchCompanies();
    fetchProducts();
  }, [fetchCompanies, fetchProducts]);

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

  // Render product item for FlatList
  const renderProductItem = ({ item: product }) => {
    const role = AsyncStorage.getItem('role');
    const isSelected = selectedProducts.includes(product._id);

    return (
      <View style={styles.productCard}>
        {/* Header with checkbox and actions */}
        <View style={styles.cardHeader}>
          {role !== 'user' && (
            <CheckBox
              value={isSelected}
              onValueChange={value => handleSelectProduct(product._id, value)}
              style={styles.checkbox}
            />
          )}

          <View style={styles.productInfo}>
            <View style={styles.productTitleRow}>
              {product.type === 'service' ? (
                <Server size={16} color="#8b5cf6" />
              ) : (
                <Package size={16} color="#3b82f6" />
              )}
              <TouchableOpacity onPress={() => setOpenNameDialog(product.name)}>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.name.charAt(0).toUpperCase() + product.name.slice(1)}
                </Text>
              </TouchableOpacity>
              {product.type === 'service' && (
                <View style={styles.serviceBadge}>
                  <Text style={styles.serviceBadgeText}>Service</Text>
                </View>
              )}
            </View>
            <Text style={styles.companyName}>
              {typeof product.company === 'object' && product.company
                ? product.company.businessName
                : '-'}
            </Text>
          </View>

          {role !== 'user' && (
            <View>
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => {
                  setOpenDropdownId(
                    openDropdownId === product._id ? null : product._id,
                  );
                }}
              >
                <MoreHorizontal size={20} color="#6b7280" />
              </TouchableOpacity>

              {openDropdownId === product._id && (
                <View style={styles.dropdown}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handleEditProduct(product)}
                  >
                    <Edit2 size={16} color="#3b82f6" />
                    <Text style={styles.dropdownItemText}>Edit</Text>
                  </TouchableOpacity>
                  <View style={styles.dropdownDivider} />
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handleDeleteProductFromDropdown(product)}
                  >
                    <Trash2 size={16} color="#ef4444" />
                    <Text
                      style={[
                        styles.dropdownItemText,
                        styles.dropdownItemTextDanger,
                      ]}
                    >
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Created date */}
        <View style={styles.createdDate}>
          <Calendar size={14} color="#9ca3af" />
          <Text style={styles.dateText}>
            Created:{' '}
            {new Intl.DateTimeFormat('en-GB').format(
              new Date(product.createdAt),
            )}
          </Text>
        </View>

        {/* Stock and unit info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoColumn}>
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
                      {
                        backgroundColor:
                          (product.stocks ?? 0) > 0 ? '#10b981' : '#ef4444',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.stockText,
                      {
                        color:
                          (product.stocks ?? 0) > 0 ? '#10b981' : '#ef4444',
                      },
                    ]}
                  >
                    {product.stocks ?? 0} in stock
                  </Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Unit</Text>
            <Text style={styles.infoValue}>{product.unit ?? 'Piece'}</Text>
          </View>
        </View>

        {/* Price info */}
        <View style={styles.priceContainer}>
          <View style={styles.priceColumn}>
            <Text style={styles.priceLabel}>Cost Price</Text>
            <Text style={styles.priceValue}>
              {product.type === 'service'
                ? '-'
                : formatCurrency(product.costPrice || 0)}
            </Text>
          </View>
          <View style={styles.priceColumn}>
            <Text style={styles.priceLabel}>Selling Price</Text>
            <Text style={styles.priceValue}>
              {product.type === 'service'
                ? '-'
                : formatCurrency(product.sellingPrice || 0)}
            </Text>
          </View>
        </View>

        {/* HSN Code */}
        <View style={styles.hsnContainer}>
          <Hash size={14} color="#9ca3af" />
          <Text style={styles.hsnText}>
            HSN Code: {product.hsn ? product.hsn : 'N/A'}
          </Text>
        </View>

        {/* Quick actions for users */}
        {role === 'user' && (
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => handleOpenForm(product)}
          >
            <Eye size={14} color="#3b82f6" />
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoadingCompanies) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (companies.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.centerContainer}>
        <View style={styles.noCompanyCard}>
          <View style={styles.noCompanyIcon}>
            <Building size={32} color="#3b82f6" />
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
              <Mail size={20} color="#3b82f6" />
              <Text style={styles.emailButtonText}>Email Us</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={() => setOpenDropdownId(null)}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Manage Products & Services</Text>
              <Text style={styles.description}>
                A list of all your products or services.
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

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleOpenForm()}
                >
                  <PlusCircle size={16} color="white" />
                  <Text style={styles.addButtonText}>Add Product</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : products.length > 0 ? (
            <>
              {/* Bulk actions */}
              {selectedProducts.length > 0 && (
                <View style={styles.bulkActions}>
                  <Text style={styles.bulkText}>
                    {selectedProducts.length} item(s) selected
                  </Text>
                  <TouchableOpacity
                    style={styles.bulkDeleteButton}
                    onPress={handleBulkDelete}
                  >
                    <Trash2 size={16} color="white" />
                    <Text style={styles.bulkDeleteText}>
                      Delete ({selectedProducts.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Products list */}
              <FlatList
                data={currentProducts}
                renderItem={renderProductItem}
                keyExtractor={item => item._id}
                scrollEnabled={false} // Since we're inside ScrollView
                ListFooterComponent={
                  <View style={styles.pagination}>
                    <TouchableOpacity
                      style={[
                        styles.paginationButton,
                        currentPage === 1 && styles.paginationButtonDisabled,
                      ]}
                      onPress={handlePrevPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft
                        size={16}
                        color={currentPage === 1 ? '#9ca3af' : '#4b5563'}
                      />
                      <Text
                        style={[
                          styles.paginationText,
                          currentPage === 1 && styles.paginationTextDisabled,
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
                        styles.paginationButton,
                        currentPage === totalPages &&
                          styles.paginationButtonDisabled,
                      ]}
                      onPress={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      <Text
                        style={[
                          styles.paginationText,
                          currentPage === totalPages &&
                            styles.paginationTextDisabled,
                        ]}
                      >
                        Next
                      </Text>
                      <ChevronRight
                        size={16}
                        color={
                          currentPage === totalPages ? '#9ca3af' : '#4b5563'
                        }
                      />
                    </TouchableOpacity>
                  </View>
                }
              />
            </>
          ) : (
            <View style={styles.emptyState}>
              <Package size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptyDescription}>
                Get started by adding your first product or service.
              </Text>
              {canCreateProducts && (
                <TouchableOpacity
                  style={styles.emptyAddButton}
                  onPress={() => handleOpenForm()}
                >
                  <PlusCircle size={16} color="white" />
                  <Text style={styles.emptyAddButtonText}>Add Product</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Product Form Modal */}
          <Dialog
            open={isFormOpen}
            onOpenChange={(isOpen) => {
              if (!isOpen) setSelectedProduct(null);
              setIsFormOpen(isOpen);
            }}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {selectedProduct ? "Edit Product" : "Create New Product"}
                </DialogTitle>
                <DialogDescription>
                  {selectedProduct
                    ? "Update the details for this item."
                    : "Fill in the form to add a new product or service."}
                </DialogDescription>
              </DialogHeader>
              <ProductForm
                product={selectedProduct || undefined}
                onSuccess={handleFormSuccess}
              />
            </DialogContent>
          </Dialog>

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
              <View style={styles.nameDialogHeader}>
                <Package size={20} color="#3b82f6" />
                <Text style={styles.nameDialogTitle}>Product Overview</Text>
              </View>

              <View style={styles.nameCard}>
                <View style={styles.nameCardIcon}>
                  <Package size={16} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.nameCardLabel}>PRODUCT NAME</Text>
                  <Text style={styles.nameCardValue}>
                    {openNameDialog.charAt(0).toUpperCase() +
                      openNameDialog.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={[styles.nameCard, styles.companyCard]}>
                <View style={[styles.nameCardIcon, styles.companyCardIcon]}>
                  <Building size={16} color="#10b981" />
                </View>
                <View>
                  <Text style={[styles.nameCardLabel, styles.companyCardLabel]}>
                    COMPANY
                  </Text>
                  <Text style={styles.nameCardValue}>
                    {/* You would need to find the company name here */}
                    Company Name
                  </Text>
                </View>
              </View>
            </View>
          </Dialog>
        )}
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bulkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  bulkDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  bulkDeleteText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  productInfo: {
    flex: 1,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
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
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  serviceBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8b5cf6',
  },
  companyName: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 24,
  },
 moreButton: {
  padding: 8,
  borderRadius: 8,
},
dropdown: {
  position: 'absolute',
  top: 24,
  right: 0,
  backgroundColor: 'white',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#e2e8f0',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 5,
  minWidth: 100,
  zIndex: 1000,
},
dropdownItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
  gap: 10,
},
dropdownItemText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#334155',
},
dropdownItemTextDanger: {
  color: '#ef4444',
},
dropdownDivider: {
  height: 1,
  backgroundColor: '#f1f5f9',
},
  createdDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    marginLeft: 28,
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  infoColumn: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  priceColumn: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  hsnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  hsnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3b82f6',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyAddButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    gap: 8,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  paginationTextDisabled: {
    color: '#9ca3af',
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
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
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  noCompanyDescription: {
    fontSize: 14,
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
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
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
    borderColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 10,
  },
  emailButtonText: {
    color: '#3b82f6',
    fontWeight: '500',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  formContainer: {
    padding: 20,
  },
  dialogContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  dialogDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  nameDialogContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
  },
  nameDialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  nameDialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  nameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  nameCardIcon: {
    backgroundColor: '#bfdbfe',
    padding: 8,
    borderRadius: 6,
  },
  nameCardLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#3b82f6',
    marginBottom: 2,
  },
  nameCardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  companyCard: {
    backgroundColor: '#d1fae5',
    borderColor: '#a7f3d0',
  },
  companyCardIcon: {
    backgroundColor: '#a7f3d0',
  },
  companyCardLabel: {
    color: '#10b981',
  },
});
