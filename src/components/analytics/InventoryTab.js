import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const formatPrice = price => {
  if (price === null || price === undefined || price === '') return '0';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0';
  return num.toFixed(2);
};

const formatDate = dateString => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const capitalizeFirst = str => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const idOf = v =>
  typeof v === 'string' ? v : v?._id || v?.id || v?.$oid || '';


const ProductCard = memo(({ item }) => {
  const stockCount = item.stocks ?? 0;
  const isLowStock = stockCount <= 10;

  const companyName = useMemo(() => {
    return typeof item.company === 'object' && item.company
      ? item.company.businessName
      : item.company?.businessName || 'No Company';
  }, [item.company]);

  return (
    <View style={styles.card}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.productInfo}>
          <View style={styles.iconCircle}>
            <Icon name="package-variant-closed" size={18} color="#8b77ff" />
          </View>
          <View style={styles.productDetails}>
            <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
              <Text style={styles.productName} numberOfLines={1}>
                {capitalizeFirst(item.name)}
              </Text>
              {isLowStock && stockCount > 0 && (
                <View style={styles.lowStockBadge}>
                  <Text style={styles.lowStockText}>Low Stock</Text>
                </View>
              )}
            </View>
            <Text style={styles.companyName} numberOfLines={1}>
              {companyName}
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.headerDivider} />

      <View style={styles.cardBody}>
        <View style={styles.metricsRow}>
          {/* STOCK */}
          <View style={styles.metricColumn}>
            <Text style={styles.metricLabel}>STOCK</Text>
            <View style={styles.stockDisplayCompact}>
              <Text
                style={[
                  styles.metricValue,
                  stockCount > 10
                    ? styles.stockGood
                    : stockCount <= 0
                    ? styles.stockDanger
                    : styles.stockWarning,
                ]}
              >
                {stockCount}
              </Text>
              <Text style={styles.unitSmall}>{item.unit ?? 'pc'}</Text>
            </View>
          </View>

          <View style={styles.verticalDivider} />

          {/* COST */}
          <View style={styles.metricColumn}>
            <Text style={styles.metricLabel}>COST</Text>
            <Text style={styles.metricValue}>
              ₹{formatPrice(item.costPrice)}
            </Text>
          </View>

          <View style={styles.verticalDivider} />

          {/* SELL */}
          <View style={styles.metricColumn}>
            <Text style={styles.metricLabel}>SELL</Text>
            <Text style={[styles.metricValue, styles.sellPrice]}>
              ₹{formatPrice(item.sellingPrice)}
            </Text>
          </View>

          {/* HSN - only if present */}
          {item.hsn && (
            <>
              <View style={styles.verticalDivider} />
              <View style={styles.metricColumn}>
                <Text style={styles.metricLabel}>HSN</Text>
                <Text style={styles.metricValue}>{item.hsn}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <MaterialIcon name="calendar-today" size={14} color="#3589ff" />
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
    </View>
  );
});

ProductCard.displayName = 'ProductCard';


const ServiceCard = memo(({ item }) => (
  <View style={styles.card}>
    <View style={styles.ServiceCardHeader}>
      <View style={styles.serviceInfo}>
        <View style={[styles.iconCircle, { backgroundColor: '#e6ddff' }]}>
          <Icon name="hammer-wrench" size={20} color="#6e4fc4" />
        </View>
        <View style={styles.serviceDetails}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {item.serviceName}
          </Text>
        </View>
      </View>
    </View>

    <View style={styles.ServiceCardBody}>
      <View style={styles.serviceInfoRow}>
        <View style={styles.serviceAmountBox}>
          <Text style={styles.metricLabel}>Amount</Text>
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
      <View style={styles.footerLeft}>
        <MaterialIcon name="calendar-today" size={14} color="#3589ff" />
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  </View>
));

ServiceCard.displayName = 'ServiceCard';


export default function InventoryTab({ selectedClient, selectedCompanyId }) {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!selectedCompanyId) return products;
    return products.filter(
      p => p.company && idOf(p.company) === selectedCompanyId,
    );
  }, [products, selectedCompanyId]);

  const filteredServices = useMemo(() => {
    if (!selectedCompanyId) return services;
    return services.filter(
      s => s.company && idOf(s.company) === selectedCompanyId,
    );
  }, [services, selectedCompanyId]);

  const fetchInventory = useCallback(async () => {
    if (!selectedClient?._id) return;
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [pRes, sRes] = await Promise.all([
        fetch(`${BASE_URL}/api/products?clientId=${selectedClient._id}`, {
          headers,
        }),
        fetch(`${BASE_URL}/api/services?clientId=${selectedClient._id}`, {
          headers,
        }),
      ]);

      const pData = await pRes.json();
      const sData = await sRes.json();

      setProducts(Array.isArray(pData) ? pData : pData.products || []);
      setServices(Array.isArray(sData) ? sData : sData.services || []);
    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInventory();
    setRefreshing(false);
  };

  const renderProductItem = useCallback(
    ({ item }) => <ProductCard item={item} />,
    [],
  );

  const renderServiceItem = useCallback(
    ({ item }) => <ServiceCard item={item} />,
    [],
  );

  const keyExtractor = useCallback(item => item._id, []);

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
        <Text style={styles.title}>Inventory Management</Text>
        <Text style={styles.subtitle}>View and track stock levels</Text>
      </View>

      {/* Tab Bar */}
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
            {activeTab === 'products' && (
              <View style={styles.activeTabIndicator} />
            )}
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
            {activeTab === 'services' && (
              <View style={styles.activeTabIndicator} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2887c7" size="large" />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'products' ? filteredProducts : filteredServices}
          renderItem={
            activeTab === 'products' ? renderProductItem : renderServiceItem
          }
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listPadding}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="archive-off-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No records found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9ff',
  },

  // Fixed Header
  fixedHeader: {
    paddingHorizontal: 12,
    paddingTop: 8,
    // paddingBottom: 4,
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 5px rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    // marginTop: 2,
  },

  // Tabs
  tabsContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#111827',
  },
  activeTabIndicator: {
    marginTop: 6,
    height: 3,
    width: '80%',
    borderRadius: 2,
    backgroundColor: '#8b77ff',
  },

  // List
  listPadding: {
    padding: 14,
    paddingTop: 10,
    flexGrow: 1,
  },


  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    boxShadow: '0 1px 5px rgba(0, 0, 0, 0.1)',
  },

  // Product Card Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    // marginBottom: 10,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    backgroundColor: '#f2f0ffb4',
    padding: 6,
    borderRadius: 20,
    marginRight: 10,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  companyName: {
    fontSize: 12,
    color: '#64748b',
  },

  // Low stock badge
  lowStockBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 60,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  lowStockText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d97706',
  },

  // Divider
  headerDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    width: '90%',
    alignSelf: 'center',
  },

 
  cardBody: {
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  stockDisplayCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  unitSmall: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 2,
  },
  verticalDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
  },
  stockGood: { color: '#10b981' },
  stockWarning: { color: '#f59e0b' },
  stockDanger: { color: '#ef4444' },
  sellPrice: { color: '#10b981' },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f7f9ff',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#8f949b',
    fontWeight: '500',
  },

  // Service Card
  ServiceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  ServiceCardBody: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    fontSize: 16,
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

  
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 10,
  },
});