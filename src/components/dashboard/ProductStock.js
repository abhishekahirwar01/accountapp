import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import smartFetch from '../../lib/smartFetch';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CircularProgress from '../ui/CircularProgress';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { usePermissions } from '../../contexts/permission-context';
import { useCompany } from '../../contexts/company-context';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { capitalizeWords } from '../../lib/utils';
import ProductTableRow from './ProductTableRow';
import { BASE_URL } from '../../config';
import { useToast } from '../hooks/useToast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/Dialog';
import PlusButton from '../ui/PlusButton';
import FabMenu from '../ui/FabMenu';

const isTablet = false; // set to true for tablet layout
const baseURL = BASE_URL;

// ─────────────────────────────────────────────────────────────────────────────
//  PricePanel
// ─────────────────────────────────────────────────────────────────────────────
const PricePanel = ({ item }) => (
  <View style={styles.priceContainer}>
    <View style={styles.priceItem}>
      <Text style={styles.priceLabel}>Selling Price</Text>
      <Text style={styles.priceValue}>
        ₹{item.sellingPrice || item.price || 0}
      </Text>
    </View>
    <View style={styles.priceDivider} />
    <View style={styles.priceItem}>
      <Text style={styles.priceLabel}>Cost Price</Text>
      <Text style={styles.priceValue}>₹{item.costPrice || 0}</Text>
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
//  CompactProductItem  — icon replaces letter initials
// ─────────────────────────────────────────────────────────────────────────────
const CompactProductItem = ({ item, isExpanded, onPress }) => {
  const animProgress = useRef(new Animated.Value(0)).current;
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const pendingOpen = useRef(false);

  useEffect(() => {
    if (isExpanded && measuredHeight === 0) {
      pendingOpen.current = true;
      return;
    }
    pendingOpen.current = false;

    Animated.spring(animProgress, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: false,
      friction: 18,
      tension: 120,
      overshootClamping: true,
    }).start();
  }, [isExpanded, measuredHeight]);

  // Add this function inside CompactProductItem component
  const getProgressForItem = item => {
    // You'll need to determine how to calculate progress based on your data
    // This is just an example - adjust according to your needs
    if (item.type === 'service') {
      return 40; // 40% for services (like "Shop" in image)
    } else {
      // For products, maybe based on stock levels
      const stock = item.stocks || 0;
      const maxStock = 100; // You might want to get this from your data
      return Math.min((stock / maxStock) * 100, 100);
    }
  };

  const onContentLayout = useCallback(
    e => {
      const h = e.nativeEvent.layout.height;
      if (h > 0 && h !== measuredHeight) {
        setMeasuredHeight(h);
        if (pendingOpen.current) {
          pendingOpen.current = false;
          Animated.spring(animProgress, {
            toValue: 1,
            useNativeDriver: false,
            friction: 18,
            tension: 120,
            overshootClamping: true,
          }).start();
        }
      }
    },
    [measuredHeight],
  );

  const animatedHeight = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, measuredHeight],
    extrapolate: 'clamp',
  });

  const contentOpacity = animProgress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const contentTranslateY = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
    extrapolate: 'clamp',
  });

  const rotateChevron = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const getStockColor = stock => {
    const v = stock ?? 0;
    if (v > 10) return '#10b981';
    if (v > 0) return '#f59e0b';
    return '#ef4444';
  };

  const getUnitDisplay = () =>
    item.type === 'service' ? null : item.unit || 'pieces';

  // Icon name and background colour per item type
  const iconName =
    item.type === 'service' ? 'briefcase-outline' : 'package-variant-closed';
  const iconBg = item.type === 'service' ? '#8b5cf6' : '#e6efff';

  return (
    <View style={styles.compactItemContainer}>
      {/* ── Tappable header row ── */}
      <TouchableOpacity
        style={styles.compactItemContent}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Product / Service icon */}
        {/* <View style={[styles.compactIcon, { backgroundColor: iconBg }]}>
          <Icon name={iconName} size={16} color="#3b82f6" />
        </View> */}

        <CircularProgress
          size={36} // Slightly larger than before to accommodate the progress ring
          strokeWidth={2.5}
          progress={getProgressForItem(item)}
        >
          <View style={[styles.compactIcon, { backgroundColor: iconBg }]}>
            <Icon name={iconName} size={16} color="#3b82f6" />
          </View>
        </CircularProgress>

        <Text style={styles.compactName} numberOfLines={1}>
          {capitalizeWords(item.name || item.serviceName || '')}
        </Text>

        {item.type !== 'service' && (
          <View style={styles.stockUnitContainer}>
            <View
              style={[
                styles.compactStock,
                // { backgroundColor: getStockColor(item.stocks) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.compactStockText,
                  { color: getStockColor(item.stocks) },
                ]}
              >
                {item.stocks ?? 0}
              </Text>
            </View>
            <Text style={styles.unitText}>{getUnitDisplay()}</Text>
          </View>
        )}

        <Animated.View style={{ transform: [{ rotate: rotateChevron }] }}>
          <Icon name="chevron-down" size={20} color="#6b7280" />
        </Animated.View>
      </TouchableOpacity>

      {/* ── Animated expand panel ── */}
      <Animated.View
        style={[styles.expandedWrapper, { height: animatedHeight }]}
      >
        {/* Hidden layer used only for measuring height */}
        <View
          style={styles.measureLayer}
          onLayout={onContentLayout}
          pointerEvents="none"
        >
          <PricePanel item={item} />
        </View>

        <Animated.View
          style={{
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
            paddingBottom: 10,
          }}
        >
          <PricePanel item={item} />
        </Animated.View>
      </Animated.View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  StockEditForm
// ─────────────────────────────────────────────────────────────────────────────
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
        body: JSON.stringify({ stocks: parseInt(newStock, 10) }),
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

// ─────────────────────────────────────────────────────────────────────────────
//  Small reusable components
// ─────────────────────────────────────────────────────────────────────────────
const CustomButton = ({
  mode = 'contained',
  onPress,
  children,
  icon,
  style,
  textStyle,
  disabled = false,
  compact = false,
  iconPosition = 'left',
}) => {
  const isOutlined = mode === 'outlined';
  const isContained = mode === 'contained';

  // Separate text from icon elements in children
  const getTextAndIcon = () => {
    if (typeof children === 'string') {
      return { text: children, icon: null };
    }

    // If children is an array, separate strings from elements
    if (Array.isArray(children)) {
      const text = children.filter(child => typeof child === 'string').join('');
      const iconElement = children.find(child => React.isValidElement(child));
      return { text, icon: iconElement };
    }

    return { text: children, icon: null };
  };

  const { text, icon: childIcon } = getTextAndIcon();

  const IconComponent = icon ? (
    <Icon
      name={icon}
      size={compact ? 16 : 20}
      color={
        isContained
          ? '#fff'
          : isOutlined
          ? '#000000'
          : disabled
          ? '#9ca3af'
          : '#000000'
      }
      style={
        iconPosition === 'left' ? styles.buttonIconLeft : styles.buttonIconRight
      }
    />
  ) : childIcon ? (
    <View
      style={
        iconPosition === 'left' ? styles.buttonIconLeft : styles.buttonIconRight
      }
    >
      {childIcon}
    </View>
  ) : null;

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
      {iconPosition === 'left' && IconComponent}
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
        {text}
      </Text>
      {iconPosition === 'right' && IconComponent}
    </TouchableOpacity>
  );
};

const SearchBar = ({ placeholder, value, onChangeText, style }) => (
  <View style={[styles.searchContainer, style]}>
    <Icon name="magnify" size={20} color="#838282" style={styles.searchIcon} />
    <TextInput
      style={styles.searchInput}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor="#838282"
      returnKeyType="search"
      blurOnSubmit={false}
      autoCorrect={false}
    />
    {value.length > 0 && (
      <TouchableOpacity onPress={() => onChangeText('')}>
        <Icon name="close-circle" size={20} color="#9ca3af" />
      </TouchableOpacity>
    )}
  </View>
);

const EmptyStateActionButton = ({ onAddProduct }) => (
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

const MobileHeaderButton = ({ label, color, onPress }) => (
  <TouchableOpacity
    style={[styles.mobileHeaderButton, { backgroundColor: color }]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.mobileHeaderButtonInner}>
      <Text style={styles.mobileHeaderButtonText}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const ProductStock = ({
  navigation: propNavigation,
  refetchPermissions,
  refetchUserPermissions,
}) => {
  const navigation = propNavigation || useNavigation();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState('user');
  const [openNameDialog, setOpenNameDialog] = useState(null);
  const [expandedProductId, setExpandedProductId] = useState(null);
  const plusButtonRef = useRef(null);
  const [fabAnchor, setFabAnchor] = useState(null);
  const [open, setOpen] = useState(false);

  const { toast } = useToast();
  const { permissions } = usePermissions();
  const { selectedCompanyId } = useCompany();
  const { permissions: userCaps } = useUserPermissions();

  const canCreateProducts =
    userCaps?.canCreateProducts ?? userCaps?.canCreateInventory ?? false;
  const webCanCreate =
    permissions?.canCreateProducts ?? permissions?.canCreateInventory ?? false;
  const showCreateButtons = canCreateProducts || webCanCreate;

  const handleOpenFabMenu = () => {
    plusButtonRef.current?.measureInWindow((x, y, width, height) => {
      setFabAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  const fetchProducts = async (force = false) => {
    const prodEndpoint = selectedCompanyId
      ? `/api/products?companyId=${selectedCompanyId}`
      : `/api/products`;
    const servEndpoint = `/api/services`;

    const prodKey = `products:${selectedCompanyId || 'all'}`;
    const servKey = `services:${selectedCompanyId || 'all'}`;

    try {
      const [prodResult, servResult] = await Promise.allSettled([
        smartFetch(prodEndpoint, { cacheKey: prodKey, forceRefresh: force }),
        smartFetch(servEndpoint, { cacheKey: servKey, forceRefresh: force }),
      ]);

      let usedCache = false;

      if (prodResult.status === 'fulfilled' && prodResult.value?.data) {
        const pdata = prodResult.value.data;
        let productsList = Array.isArray(pdata) ? pdata : pdata.products || [];
        if (selectedCompanyId) {
          productsList = productsList.filter(p => {
            const cId =
              typeof p.company === 'object' ? p.company?._id : p.company;
            return cId === selectedCompanyId || !cId;
          });
        }
        setProducts(productsList);
        if (prodResult.value.fromCache) usedCache = true;
      }

      if (servResult.status === 'fulfilled' && servResult.value?.data) {
        const sdata = servResult.value.data;
        const servicesList = Array.isArray(sdata)
          ? sdata
          : sdata.services || [];
        if (servResult.value.fromCache) usedCache = true;

        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p._id));
          const appended = servicesList
            .filter(s => !existingIds.has(s._id))
            .map(s => ({
              _id: s._id,
              name: s.serviceName || s.name,
              type: 'service',
              stocks: 0,
              unit: s.unit,
              price: s.price,
              sellingPrice: s.sellingPrice || s.price,
              costPrice: s.costPrice,
            }));
          return [...prev, ...appended];
        });
      }

      // Background refresh when we served from cache
      if (usedCache && !force) {
        Promise.allSettled([
          smartFetch(prodEndpoint, { cacheKey: prodKey, forceRefresh: true }),
          smartFetch(servEndpoint, { cacheKey: servKey, forceRefresh: true }),
        ])
          .then(([p, s]) => {
            if (
              p.status === 'fulfilled' &&
              !p.value.fromCache &&
              p.value.data
            ) {
              const pdata = p.value.data;
              let productsList = Array.isArray(pdata)
                ? pdata
                : pdata.products || [];
              if (selectedCompanyId) {
                productsList = productsList.filter(item => {
                  const cId =
                    typeof item.company === 'object'
                      ? item.company?._id
                      : item.company;
                  return cId === selectedCompanyId || !cId;
                });
              }
              setProducts(productsList);
            }
            if (
              s.status === 'fulfilled' &&
              !s.value.fromCache &&
              s.value.data
            ) {
              const sdata = s.value.data;
              const servicesList = Array.isArray(sdata)
                ? sdata
                : sdata.services || [];
              setProducts(prev => {
                const base = prev.filter(item => item.type !== 'service');
                const existingIds = new Set(base.map(item => item._id));
                const appended = servicesList
                  .filter(sv => !existingIds.has(sv._id))
                  .map(sv => ({
                    _id: sv._id,
                    name: sv.serviceName || sv.name,
                    type: 'service',
                    stocks: 0,
                    unit: sv.unit,
                    price: sv.price,
                    sellingPrice: sv.sellingPrice || sv.price,
                    costPrice: sv.costPrice,
                  }));
                return [...base, ...appended];
              });
            }
          })
          .catch(() => {});
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load inventory',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProducts(true);
    }, []),
  );

  useEffect(() => {
    fetchProducts();
  }, [selectedCompanyId]);

  useEffect(() => {
    const getRole = async () => {
      try {
        const storedRole = await AsyncStorage.getItem('role');
        if (storedRole) setRole(storedRole);
      } catch (_) {}
    };
    getRole();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchProducts(true),
      refetchPermissions ? refetchPermissions() : Promise.resolve(),
      refetchUserPermissions ? refetchUserPermissions() : Promise.resolve(),
    ]).finally(() => setRefreshing(false));
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
    toast({
      title: 'Product Created',
      description: `${capitalizeWords(
        newProduct.name,
      )} has been added successfully.`,
    });
    fetchProducts();
  };

  const handleProductPress = useCallback(productId => {
    setExpandedProductId(prev => (prev === productId ? null : productId));
  }, []);

  const filteredProducts = useMemo(() => {
    const q = (searchTerm || '').trim().toLowerCase();
    if (!products || products.length === 0) return [];
    if (!q) return products;
    return products.filter(p =>
      (p.name || p.serviceName || '').toLowerCase().includes(q),
    );
  }, [products, searchTerm]);

  const { totalItems, totalServices } = useMemo(() => {
    const totalItems = (products || []).filter(
      p => p.type !== 'service',
    ).length;
    const totalServices = (products || []).filter(
      p => p.type === 'service',
    ).length;
    return { totalItems, totalServices };
  }, [products]);

  const renderCompactProductItem = useCallback(
    ({ item }) => (
      <CompactProductItem
        item={item}
        isExpanded={expandedProductId === item._id}
        onPress={() => handleProductPress(item._id)}
      />
    ),
    [expandedProductId, handleProductPress],
  );

  const InventorySummaryCard = ({ totalItems, totalServices, onViewMore }) => {
    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={[styles.summaryBlock]}>
            <View style={styles.blockHeader}>
              <Text style={styles.summaryLabel}>Total Products</Text>
            </View>
            <Text style={styles.summaryValue}>{totalItems}</Text>
          </View>

          {/* <View style={styles.verticalDivider}></View> */}

          <View style={styles.summaryBlock}>
            <View style={styles.blockHeader}>
              <Text style={styles.summaryLabel}>Total Services</Text>
            </View>
            <Text style={styles.summaryValue}>{totalServices}</Text>
          </View>

          <TouchableOpacity
            style={styles.summaryBtn}
            onPress={onViewMore}
            activeOpacity={0.8}
          >
            <Text style={styles.summaryBtnText}>View More</Text>
            <Icon name="arrow-right" size={12} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
    const canCreate = permissions?.canCreateProducts;
    const userInventoryCap = userCaps?.canCreateInventory;
    const maxInventories = permissions?.maxInventories ?? 0;
    if (!canCreate && !userInventoryCap && maxInventories === 0) return false;
    return true;
  };

  if (!shouldShowComponent()) return null;

  return (
    <View style={styles.container}>
      <View>
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Product & Service Stock</Text>
            </View>

            {/* PLUS BUTTON */}

            <View ref={plusButtonRef} collapsable={false}>
              <PlusButton onPress={handleOpenFabMenu} />
            </View>

            {/* FAB MENU */}
            <FabMenu
              visible={open}
              onClose={() => setOpen(false)}
              anchor={fabAnchor}
              actions={[
                {
                  label: '+ Add Product',
                  onPress: () => navigation.navigate('ProductForm'),
                },
                {
                  label: '+ Add Service',
                  onPress: () => navigation.navigate('ServiceForm'),
                },
              ]}
            />
          </View>

          {/* Mobile add buttons 
          {showCreateButtons && !isTablet && (
            <View style={styles.mobileHeaderButtonsContainer}>
              <MobileHeaderButton
                label="Add Product"
                color="#327ffa"
                onPress={() => navigation.navigate('ProductForm')}
              />
              <MobileHeaderButton
                label="Add Service"
                color="#2b9775ff"
                onPress={() => navigation.navigate('ServiceForm')}
              />
            </View>
          )}*/}

          <InventorySummaryCard
            totalItems={totalItems}
            totalServices={totalServices}
            onViewMore={() => navigation.navigate('Inventory')}
          />

          {/* Search */}
          <SearchBar
            placeholder="Search products or services..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchBar}
          />

          {/* List */}
          <View>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Loading inventory...</Text>
              </View>
            ) : filteredProducts.length > 0 ? (
              <View>
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
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      initialNumToRender={4}
                      maxToRenderPerBatch={8}
                      windowSize={5}
                      removeClippedSubviews
                      keyboardShouldPersistTaps="always"
                      keyboardDismissMode="none"
                    />
                  </View>
                ) : (
                  <FlatList
                    data={filteredProducts.slice(0, 5)}
                    renderItem={renderCompactProductItem}
                    keyExtractor={item => item._id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.compactList}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    initialNumToRender={5}
                    maxToRenderPerBatch={8}
                    windowSize={5}
                    removeClippedSubviews={false}
                    keyboardShouldPersistTaps="always"
                    keyboardDismissMode="none"
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
                    onAddProduct={() =>
                      navigation.navigate('ProductForm', {
                        onSuccess: handleAddProductSuccess,
                      })
                    }
                  />
                )}
              </View>
            )}
          </View>

          {/* View more */}
          {/* {filteredProducts.length > 3 && (
            <CustomButton
              mode="outlined"
              onPress={() => navigation.navigate('Inventory')}
              style={styles.viewMoreButton}
              textStyle={styles.viewMoreButtonText}
              iconPosition="right"
            >
              View More
              <ArrowRight size={15} color="#6366f1" />
            </CustomButton>
          )} */}
        </View>
      </View>

      {/* Name Dialog */}
      <Dialog
        open={!!openNameDialog}
        onOpenChange={() => setOpenNameDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Text>Product Name</Text>
            </DialogTitle>
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
              <Text>
                {selectedProduct
                  ? `Update stock for ${capitalizeWords(selectedProduct.name)}`
                  : 'Update stock'}
              </Text>
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

      {/* ProductForm now opens as a full screen via navigation */}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, padding: 0, marginTop: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    // marginBottom: 16,
    marginTop: 8,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  cardContent: { padding: 5 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: { flex: 1 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  subtitle: { fontSize: 10, color: '#6b7280', fontWeight: '400' },

  // Compact list item
  compactItemContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    borderBottomColor: '#f0f0f0',
    overflow: 'hidden',
  },
  compactItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 12,
    backgroundColor: 'transparent',
  },
  compactIcon: {
    width: 30,
    height: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactName: { flex: 1, fontSize: 13, fontWeight: '500', color: '#1f2937' },
  stockUnitContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: '-2px',
  },
  compactStock: {
    paddingHorizontal: 2,
    paddingVertical: 0,
    minWidth: 36,
    alignItems: 'center',
  },
  compactStockText: { fontSize: 15, fontWeight: '600' },
  unitText: { fontSize: 12, color: '#6b7280', fontWeight: '400' },

  expandedWrapper: { overflow: 'hidden', backgroundColor: '#fff' },
  measureLayer: {
    position: 'absolute',
    opacity: 0,
    top: 0,
    left: 0,
    right: 0,
    zIndex: -1,
  },

  // Price panel
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#f7f7f7',
  },
  priceItem: { flex: 1, alignItems: 'center' },
  priceDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  priceValue: { fontSize: 12, fontWeight: '700', color: '#1f2937' },

  compactList: { paddingBottom: 0 },

  // Mobile header buttons
  mobileHeaderButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  mobileHeaderButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  mobileHeaderButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  mobileHeaderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },

  // Empty state
  emptyStateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
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

  // Search bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 78,
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 40,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    // borderWidth: 1,
    // borderColor: '#f8f8f8',
  },
  searchIcon: { marginRight: 12 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#18191a',
    paddingVertical: 10,
    fontWeight: '400',
  },

  // Loading / empty
  loadingContainer: { alignItems: 'center', padding: 40 },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '500',
  },
  emptyContainer: { alignItems: 'center', padding: 40 },
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

  // Table (tablet)
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
  tableCell: { paddingHorizontal: 10 },
  tableHeaderText: {
    fontWeight: '700',
    color: '#374151',
    fontSize: 14,
    letterSpacing: 0.3,
  },

  // View more button
  viewMoreButton: {
    marginTop: 6,
    borderColor: '#ececec',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    width: 150,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  viewMoreButtonText: { color: '#374151', fontWeight: '400' },

  // Custom button
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  customButtonContained: { backgroundColor: '#6366f1' },
  customButtonOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#6366f1',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonCompact: { paddingHorizontal: 14, paddingVertical: 8 },
  buttonIconLeft: { marginRight: 6 },
  buttonIconRight: { marginLeft: 6 },
  customButtonText: { fontSize: 14, fontWeight: '600', letterSpacing: 0.3 },
  customButtonTextContained: { color: '#fff' },
  customButtonTextOutlined: { color: '#6366f1' },
  buttonTextDisabled: { color: '#9ca3af' },
  buttonTextCompact: { fontSize: 13 },

  // Stock edit form
  stockEditContainer: { padding: 24 },
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
  plusbutton: {
    backgroundColor: '#e0e0e0', // Light grey background
    width: 50,
    height: 50,
    borderRadius: 25, // Makes it a circle (half of width/height)
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer', // Changes cursor to pointer on web
    transition: 'background-color 0.2s ease', // Smooth hover effect
    // Optional: Add a subtle shadow
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  buttonHover: {
    backgroundColor: '#d0d0d0',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 1, // Ensures the text is vertically centered
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

  // Dialogs
  nameDialogContent: { padding: 0 },
  nameDialogText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 0,
    lineHeight: 24,
    fontWeight: '500',
  },
  editDialogContent: { padding: 0 },
  formDialogContent: { flex: 1, padding: 0 },

  summaryCard: {
    backgroundColor: '#857bee',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryBlock: {
    flex: 1,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  verticalDivider: {
    backgroundColor: '#000000',
    height: '100%',
    width: 1,
    position: 'relative',
  },
  summaryBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  summaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
});

export default ProductStock;
