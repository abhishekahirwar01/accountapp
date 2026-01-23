import React, { useState, useMemo, useCallback, useEffect } from 'react';
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

const idOf = v =>
  typeof v === 'string' ? v : v?._id || v?.id || v?.$oid || '';

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

  const renderProductItem = ({ item }) => {
    const stockCount = item.stocks ?? 0;
    // Dynamic color logic
    const stockStyle =
      stockCount > 10
        ? styles.stockHigh
        : stockCount > 0
        ? styles.stockLow
        : styles.stockOut;
    const stockTextStyle =
      stockCount > 10
        ? styles.textHigh
        : stockCount > 0
        ? styles.textLow
        : styles.textOut;

    return (
      <Surface style={styles.proCard} elevation={1}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <Icon name="package-variant-closed" size={20} color="#3b82f6" />
          </View>
          <View style={styles.titleArea}>
            <Text style={styles.itemName}>{item.name?.toUpperCase()}</Text>
            <Text style={styles.itemSub}>
              {item.company?.businessName || 'No Company'}
            </Text>
          </View>
          <View style={[styles.stockBadge, stockStyle]}>
            <Text style={[styles.stockQtyText, stockTextStyle]}>
              {stockCount}
            </Text>
            <Text style={[styles.stockUnitText, stockTextStyle]}>
              {item.unit || 'pcs'}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>SELLING PRICE</Text>
            <Text style={styles.statValue}>
              {formatCurrencyINR(item.sellingPrice)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>COST PRICE</Text>
            <Text style={styles.statValueMuted}>
              {formatCurrencyINR(item.costPrice)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerInfo}>HSN: {item.hsn || '—'}</Text>
          <Text style={styles.footerInfo}>
            Added:{' '}
            {item.createdAt
              ? new Date(item.createdAt).toLocaleDateString()
              : '—'}
          </Text>
        </View>
      </Surface>
    );
  };

  const renderServiceItem = ({ item }) => (
    <Surface style={styles.proCard} elevation={1}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: '#f5f3ff' }]}>
          <Icon name="hammer-wrench" size={20} color="#8b5cf6" />
        </View>
        <View style={styles.titleArea}>
          <Text style={styles.itemName}>{item.serviceName?.toUpperCase()}</Text>
          <Text style={[styles.itemSub, { color: '#8b5cf6' }]}>
            Service Entry
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>SERVICE AMOUNT</Text>
          <Text style={styles.statValue}>{formatCurrencyINR(item.amount)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>SAC CODE</Text>
          <Text style={styles.statValueMuted}>{item.sac || '—'}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerInfo}>Category: Professional</Text>
        <Text style={styles.footerInfo}>
          Created:{' '}
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
        </Text>
      </View>
    </Surface>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inventory Management</Text>
          <Text style={styles.headerSubtitle}>View and track stock levels</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('products')}
          style={[styles.tab, activeTab === 'products' && styles.activeTab]}
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
          onPress={() => setActiveTab('services')}
          style={[styles.tab, activeTab === 'services' && styles.activeTab]}
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

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'products' ? filteredProducts : filteredServices}
          renderItem={
            activeTab === 'products' ? renderProductItem : renderServiceItem
          }
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listPadding}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  headerSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  activeTabText: { color: '#3b82f6' },

  listPadding: { padding: 16 },
  proCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWeight: 1,
    borderColor: '#f1f5f9',
    margin:10,
    marginBottom:5
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleArea: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  itemSub: { fontSize: 11, color: '#94a3b8', marginTop: 1 },

  stockBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 50,
  },
  stockHigh: { backgroundColor: '#f0fdf4' },
  stockLow: { backgroundColor: '#fff7ed' },
  stockOut: { backgroundColor: '#fef2f2' },
  stockQtyText: { fontSize: 14, fontWeight: '800' },
  stockUnitText: { fontSize: 9, fontWeight: '600', marginTop: -2 },
  textHigh: { color: '#166534' },
  textLow: { color: '#9a3412' },
  textOut: { color: '#991b1b' },

  statsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 12,
  },
  statItem: { flex: 1 },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#cbd5e1',
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  statValueMuted: { fontSize: 14, fontWeight: '600', color: '#64748b' },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  footerInfo: { fontSize: 11, color: '#cbd5e1', fontWeight: '500' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 14, color: '#94a3b8', marginTop: 10 },
});
