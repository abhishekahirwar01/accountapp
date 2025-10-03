import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  CheckBox,
  Platform,
} from 'react-native';
import {
  Package,
  Server,
  Calendar,
  Edit,
  Trash2,
  PlusCircle,
  MoreHorizontal,
  Loader2,
  X,
  Eye,
  Download,
  Upload,
  CheckCircle,
  FileText,
} from 'lucide-react-native';

// Mock data for demonstration
const MOCK_PRODUCTS = [
  {
    _id: '1',
    name: 'Website Development',
    stocks: 5,
    unit: 'Project',
    type: 'service',
    createdAt: new Date('2024-01-15').toISOString(),
  },
  {
    _id: '2',
    name: 'Laptop',
    stocks: 10,
    unit: 'Piece',
    type: 'product',
    createdAt: new Date('2024-01-20').toISOString(),
  },
  {
    _id: '3',
    name: 'Consulting Hours',
    stocks: 0,
    unit: 'Hour',
    type: 'service',
    createdAt: new Date('2024-02-01').toISOString(),
  },
];

const MOCK_COMPANIES = [
  {
    _id: '1',
    name: 'Demo Company',
    status: 'active',
  }
];

import ProductForm from '../products/ProductForm';

// Custom Checkbox Component for React Native
const Checkbox = ({ checked, onCheckedChange, style }) => {
  return (
    <TouchableOpacity
      style={[
        styles.checkbox,
        checked && styles.checkboxChecked,
        style
      ]}
      onPress={() => onCheckedChange(!checked)}
    >
      {checked && <CheckCircle size={16} color="#3B82F6" />}
    </TouchableOpacity>
  );
};

// Custom Badge Component
const Badge = ({ children, variant = 'default', style }) => {
  const variantStyles = {
    outline: styles.badgeOutline,
    default: styles.badgeDefault,
  };

  return (
    <View style={[styles.badge, variantStyles[variant], style]}>
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  );
};

// Excel Import/Export Component for React Native
const ExcelImportExport = ({ 
  onImportSuccess, 
  transformImportData 
}) => {
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    // Simulate file import process
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock imported data
      const mockImportedData = [
        { "Item Name": "New Product 1", Stock: "15", Unit: "Piece" },
        { "Item Name": "New Service 1", Stock: "0", Unit: "Hour" },
      ];
      
      const transformedData = transformImportData 
        ? transformImportData(mockImportedData)
        : mockImportedData.map(item => ({
            name: item["Item Name"],
            stocks: parseInt(item["Stock"]),
            unit: item["Unit"],
            type: parseInt(item["Stock"]) === 0 ? 'service' : 'product',
            _id: Date.now().toString() + Math.random(),
            createdAt: new Date().toISOString(),
          }));
      
      onImportSuccess(transformedData);
      Alert.alert('Success', 'Products imported successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to import products');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = () => {
    Alert.alert('Export', 'Export functionality would download Excel file');
  };

  return (
    <View style={styles.excelContainer}>
      <TouchableOpacity
        style={[styles.excelButton, styles.importButton]}
        onPress={handleImport}
        disabled={isImporting}
      >
        {isImporting ? (
          <Loader2 size={16} color="#fff" style={styles.spinner} />
        ) : (
          <Upload size={16} color="#fff" />
        )}
        <Text style={styles.excelButtonText}>
          {isImporting ? 'Importing...' : 'Import Excel'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.excelButton, styles.exportButton]}
        onPress={handleExport}
      >
        <Download size={16} color="#3B82F6" />
        <Text style={[styles.excelButtonText, styles.exportButtonText]}>
          Export Excel
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Dropdown Menu Component
const DropdownMenu = ({ trigger, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity onPress={() => setIsOpen(true)}>
        {trigger}
      </TouchableOpacity>
      
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.dropdownOverlay}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.dropdownContent}>
            {React.Children.map(children, (child) =>
              React.cloneElement(child, {
                onPress: () => {
                  child.props.onPress?.();
                  setIsOpen(false);
                }
              })
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const DropdownMenuTrigger = ({ children }) => children;
const DropdownMenuContent = ({ children }) => children;
const DropdownMenuItem = ({ children, onPress, className }) => (
  <TouchableOpacity 
    style={[
      styles.dropdownMenuItem,
      className?.includes('destructive') && styles.dropdownMenuDestructive
    ]} 
    onPress={onPress}
  >
    {children}
  </TouchableOpacity>
);

// Main ProductSettings Component
const ProductSettings = () => {
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [role, setRole] = useState('admin'); // Mock role

  // Simulate loading companies and products
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingCompanies(true);
      setIsLoading(true);
      
      try {
        // Simulate API calls
        await new Promise(resolve => setTimeout(resolve, 1500));
        setCompanies(MOCK_COMPANIES);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProducts(MOCK_PRODUCTS);
      } catch (error) {
        Alert.alert('Error', 'Failed to load data');
      } finally {
        setIsLoadingCompanies(false);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleOpenForm = (product = null) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = (product) => {
    setProductToDelete(product);
    setIsAlertOpen(true);
  };

  const handleFormSuccess = (productData) => {
    setIsFormOpen(false);
    
    if (selectedProduct) {
      // Update existing product
      setProducts(prev => prev.map(p => 
        p._id === productData._id ? { ...p, ...productData } : p
      ));
    } else {
      // Add new product
      setProducts(prev => [...prev, { ...productData, _id: Date.now().toString() }]);
    }
    
    setSelectedProduct(null);
    Alert.alert('Success', `Product ${selectedProduct ? 'updated' : 'created'} successfully!`);
  };

  const handleDeleteProduct = () => {
    if (!productToDelete) return;
    
    setProducts(prev => prev.filter(p => p._id !== productToDelete._id));
    setIsAlertOpen(false);
    setProductToDelete(null);
    Alert.alert('Success', 'Product deleted successfully!');
  };

  const handleSelectProduct = (productId, checked) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedProducts(products.map(p => p._id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedProducts.length === 0) return;
    
    Alert.alert(
      'Confirm Bulk Delete',
      `Are you sure you want to delete ${selectedProducts.length} items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setProducts(prev => prev.filter(p => !selectedProducts.includes(p._id)));
            setSelectedProducts([]);
            Alert.alert('Success', `${selectedProducts.length} items deleted successfully!`);
          },
        },
      ]
    );
  };

  const handleImportSuccess = (importedProducts) => {
    setProducts(prev => [...prev, ...importedProducts]);
  };

  const renderProductItem = ({ item: product }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          {role !== "user" && (
            <Checkbox
              checked={selectedProducts.includes(product._id)}
              onCheckedChange={(checked) => handleSelectProduct(product._id, checked)}
              style={styles.productCheckbox}
            />
          )}
          <View style={[
            styles.productIcon,
            product.type === 'service' ? styles.serviceIcon : styles.productIconBg
          ]}>
            {product.type === 'service' ? (
              <Server size={16} color="#8B5CF6" />
            ) : (
              <Package size={16} color="#3B82F6" />
            )}
          </View>
          <View style={styles.productDetails}>
            <Text style={styles.productName}>{product.name}</Text>
            {product.type === 'service' && (
              <Badge variant="outline" style={styles.serviceBadge}>
                Service
              </Badge>
            )}
          </View>
        </View>
        
        {role !== "user" && (
          <DropdownMenu
            trigger={
              <TouchableOpacity style={styles.moreButton}>
                <MoreHorizontal size={16} color="#666" />
              </TouchableOpacity>
            }
          >
            <DropdownMenuContent>
              <DropdownMenuItem onPress={() => handleOpenForm(product)}>
                <View style={styles.dropdownItemContent}>
                  <Edit size={14} color="#374151" />
                  <Text style={styles.dropdownItemText}>Edit</Text>
                </View>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onPress={() => handleOpenDeleteDialog(product)}
                className="text-destructive"
              >
                <View style={styles.dropdownItemContent}>
                  <Trash2 size={14} color="#EF4444" />
                  <Text style={[styles.dropdownItemText, styles.destructiveText]}>Delete</Text>
                </View>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </View>

      <View style={styles.productStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>
            {product.type === 'service' ? 'Type' : 'Stock'}
          </Text>
          <View style={styles.statValue}>
            {product.type === 'service' ? (
              <Text style={styles.statText}>Service Item</Text>
            ) : (
              <View style={styles.stockInfo}>
                <View 
                  style={[
                    styles.stockIndicator,
                    { backgroundColor: (product.stocks ?? 0) > 0 ? '#10B981' : '#EF4444' }
                  ]} 
                />
                <Text 
                  style={[
                    styles.stockText,
                    { color: (product.stocks ?? 0) > 0 ? '#10B981' : '#EF4444' }
                  ]}
                >
                  {product.stocks ?? 0} in stock
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Unit</Text>
          <Text style={styles.statText}>{product.unit ?? 'Piece'}</Text>
        </View>
      </View>

      <View style={styles.productFooter}>
        <View style={styles.dateInfo}>
          <Calendar size={12} color="#6B7280" />
          <Text style={styles.dateText}>
            Created: {new Date(product.createdAt).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.actionButtons}>
          {role === "user" ? (
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => handleOpenForm(product)}
            >
              <Eye size={14} color="#3B82F6" />
              <Text style={styles.viewButtonText}>View</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleOpenForm(product)}
              >
                <Edit size={14} color="#3B82F6" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleOpenDeleteDialog(product)}
              >
                <Trash2 size={14} color="#EF4444" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );

  const renderDesktopTable = () => (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        {role !== "user" && (
          <View style={styles.tableHeaderCell}>
            <Checkbox
              checked={selectedProducts.length === products.length && products.length > 0}
              onCheckedChange={handleSelectAll}
            />
          </View>
        )}
        <Text style={styles.tableHeaderText}>Product Name</Text>
        <Text style={styles.tableHeaderText}>Stock</Text>
        <Text style={styles.tableHeaderText}>Unit</Text>
        <Text style={styles.tableHeaderText}>Created At</Text>
        {role !== "user" && <Text style={styles.tableHeaderText}>Actions</Text>}
      </View>
      
      {products.map((product) => (
        <View key={product._id} style={styles.tableRow}>
          {role !== "user" && (
            <View style={styles.tableCell}>
              <Checkbox
                checked={selectedProducts.includes(product._id)}
                onCheckedChange={(checked) => handleSelectProduct(product._id, checked)}
              />
            </View>
          )}
          <View style={styles.tableCell}>
            <View style={styles.productNameCell}>
              {product.type === "service" ? (
                <Server size={16} color="#6B7280" />
              ) : (
                <Package size={16} color="#6B7280" />
              )}
              <Text style={styles.productNameText}>{product.name}</Text>
              {product.type === "service" && (
                <Badge variant="outline">Service</Badge>
              )}
            </View>
          </View>
          <View style={styles.tableCell}>
            <Text style={styles.stockText}>
              {product.type === "service" ? "N/A" : product.stocks ?? 0}
            </Text>
          </View>
          <View style={styles.tableCell}>
            <Text style={styles.unitText}>{product.unit ?? "Piece"}</Text>
          </View>
          <View style={styles.tableCell}>
            <Text style={styles.dateText}>
              {new Date(product.createdAt).toLocaleDateString()}
            </Text>
          </View>
          {role !== "user" && (
            <View style={styles.tableCell}>
              <DropdownMenu
                trigger={
                  <TouchableOpacity style={styles.actionButton}>
                    <MoreHorizontal size={16} color="#666" />
                  </TouchableOpacity>
                }
              >
                <DropdownMenuContent>
                  <DropdownMenuItem onPress={() => handleOpenForm(product)}>
                    <View style={styles.dropdownItemContent}>
                      <Edit size={14} color="#374151" />
                      <Text style={styles.dropdownItemText}>Edit</Text>
                    </View>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onPress={() => handleOpenDeleteDialog(product)}
                    className="text-destructive"
                  >
                    <View style={styles.dropdownItemContent}>
                      <Trash2 size={14} color="#EF4444" />
                      <Text style={[styles.dropdownItemText, styles.destructiveText]}>Delete</Text>
                    </View>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  if (isLoadingCompanies) {
    return (
      <View style={styles.loadingContainer}>
        <Loader2 size={24} color="#3B82F6" style={styles.spinner} />
        <Text style={styles.loadingText}>Loading companies...</Text>
      </View>
    );
  }

  if (companies.length === 0) {
    return (
      <View style={styles.companySetupContainer}>
        <View style={styles.companySetupCard}>
          <View style={styles.companyIcon}>
            <FileText size={32} color="#3B82F6" />
          </View>
          <Text style={styles.companySetupTitle}>Company Setup Required</Text>
          <Text style={styles.companySetupDescription}>
            Contact us to enable your company account and access all features.
          </Text>
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.phoneButton}>
              <Text style={styles.phoneButtonText}>+91-8989773689</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emailButton}>
              <Text style={styles.emailButtonText}>Email Us</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader2 size={24} color="#3B82F6" style={styles.spinner} />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Manage Products & Services</Text>
          <Text style={styles.subtitle}>
            A list of all your products or services.
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <ExcelImportExport
            onImportSuccess={handleImportSuccess}
            transformImportData={(data) =>
              data.map((item) => ({
                name: item["Item Name"],
                stocks: item["Stock"],
                unit: item["Unit"],
              }))
            }
          />

          {selectedProducts.length > 0 && role !== "user" && (
            <TouchableOpacity
              style={styles.bulkDeleteButton}
              onPress={handleBulkDelete}
            >
              <Trash2 size={16} color="#fff" />
              <Text style={styles.bulkDeleteText}>
                Delete ({selectedProducts.length})
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleOpenForm()}
          >
            <PlusCircle size={16} color="#fff" />
            <Text style={styles.addButtonText}>Add Product</Text>
          </TouchableOpacity>
        </View>
      </View>

      {products.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <View style={styles.desktopView}>
            {renderDesktopTable()}
          </View>

          {/* Mobile Card View */}
          <View style={styles.mobileView}>
            {role !== "user" && products.length > 0 && (
              <View style={styles.mobileSelectAll}>
                <Checkbox
                  checked={selectedProducts.length === products.length && products.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Text style={styles.selectAllText}>
                  Select All ({products.length} items)
                </Text>
                {selectedProducts.length > 0 && (
                  <TouchableOpacity
                    style={styles.mobileBulkDelete}
                    onPress={handleBulkDelete}
                  >
                    <Trash2 size={14} color="#fff" />
                    <Text style={styles.mobileBulkDeleteText}>
                      Delete ({selectedProducts.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <FlatList
              data={products}
              renderItem={renderProductItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.productsList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Package size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptyDescription}>
            Get started by adding your first product or service.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => handleOpenForm()}
          >
            <PlusCircle size={16} color="#fff" />
            <Text style={styles.emptyButtonText}>Add Product</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Product Form Modal */}
      <Modal
        visible={isFormOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsFormOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedProduct ? 'Edit Product' : 'Create New Product'}
            </Text>
            <TouchableOpacity
              onPress={() => setIsFormOpen(false)}
              style={styles.closeButton}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ProductForm
            product={selectedProduct}
            onSuccess={handleFormSuccess}
          />
        </View>
      </Modal>

      {/* Delete Confirmation Alert */}
      <Modal
        visible={isAlertOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAlertOpen(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Are you absolutely sure?</Text>
            <Text style={styles.alertDescription}>
              This action cannot be undone. This will permanently delete the item.
            </Text>
            <View style={styles.alertActions}>
              <TouchableOpacity
                style={styles.alertCancel}
                onPress={() => setIsAlertOpen(false)}
              >
                <Text style={styles.alertCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.alertConfirm}
                onPress={handleDeleteProduct}
              >
                <Text style={styles.alertConfirmText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  spinner: {
    transform: [{ rotate: '0deg' }],
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  companySetupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  companySetupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  companyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  companySetupTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  companySetupDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  phoneButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  phoneButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emailButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  emailButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  excelContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  excelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  importButton: {
    backgroundColor: '#10B981',
  },
  exportButton: {
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  excelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  exportButtonText: {
    color: '#3B82F6',
  },
  bulkDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  bulkDeleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  desktopView: {
    display: Platform.OS === 'web' ? 'flex' : 'none',
  },
  mobileView: {
    display: Platform.OS === 'web' ? 'none' : 'flex',
    flex: 1,
  },
  tableContainer: {
    flex: 1,
    padding: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderCell: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
    justifyContent: 'center',
  },
  productNameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productNameText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  stockText: {
    fontSize: 14,
    color: '#374151',
  },
  unitText: {
    fontSize: 14,
    color: '#374151',
  },
  actionButton: {
    padding: 4,
  },
  mobileSelectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  mobileBulkDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  mobileBulkDeleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  productsList: {
    padding: 16,
    gap: 12,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productCheckbox: {
    marginRight: 8,
  },
  productIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  productIconBg: {
    backgroundColor: '#EFF6FF',
  },
  serviceIcon: {
    backgroundColor: '#F3E8FF',
  },
  productDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  serviceBadge: {
    backgroundColor: '#F3E8FF',
  },
  moreButton: {
    padding: 4,
  },
  productStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  stockInfo: {
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
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3B82F6',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3B82F6',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EF4444',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  alertDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  alertCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  alertCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  alertConfirm: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  alertConfirmText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  // Checkbox styles
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  // Badge styles
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  badgeDefault: {
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  // Dropdown styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
  },
  dropdownMenuDestructive: {
    // Additional styles for destructive items
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  destructiveText: {
    color: '#EF4444',
  },
});

export default ProductSettings;