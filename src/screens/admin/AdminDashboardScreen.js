import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import UpdateNotification from '../../components/notifications/UpdateNotification';
import UpdateNotificationBadge from '../../components/notifications/UpdateNotificationBadge';

export default function AdminDashboardScreen({ navigation }) {
  const [clients, setClients] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { width } = useWindowDimensions();
  const titleFontSize = width < 360 ? 18 : width < 400 ? 19 : 21;
  const subtitleFontSize = width < 360 ? 13 : 15;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchClients(), fetchCompanies()]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchClients = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login again');
        navigation.navigate('Login');
        return;
      }

      const res = await fetch(`${BASE_URL}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          await AsyncStorage.removeItem('token');
          Alert.alert('Session Expired', 'Please login again');
          navigation.navigate('Login');
          return;
        }
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch clients.');
      }

      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      Alert.alert('Error', error.message || 'Failed to fetch clients');
      throw error;
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/companies/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch companies.');
      }

      const data = await res.json();
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === 'Active').length;
  const totalCompanies = companies.length;

  const totalTransactions = 1452;
  const pendingInvoices = 23;

  const kpiData = [
    {
      title: 'Total Clients',
      value: totalClients.toString(),
      change: `+${Math.floor(Math.random() * 5)} this month`,
      icon: 'account-group',
      iconBg: '#E3F2FD',
      iconColor: '#2196F3',
    },
    {
      title: 'Companies Managed',
      value: totalCompanies.toString(),
      change: '+5 this month',
      icon: 'office-building',
      iconBg: '#E8F5E8',
      iconColor: '#4CAF50',
    },
    {
      title: 'Total Transactions',
      value: totalTransactions.toLocaleString(),
      change: '+120 this week',
      icon: 'database',
      iconBg: '#F3E5F5',
      iconColor: '#9C27B0',
    },
    {
      title: 'Pending Invoices',
      value: pendingInvoices.toString(),
      change: 'Across all clients',
      icon: 'file-document',
      iconBg: '#FFF3E0',
      iconColor: '#FF9800',
    },
  ];

  const getTrendIcon = (change) =>
    change.startsWith('+') ? 'trending-up' : 'trending-down';
  const getTrendColor = (change) =>
    change.startsWith('+') ? '#4CAF50' : '#F44336';

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
       
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text
              style={[styles.headerTitle, { fontSize: titleFontSize }]}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              Master Admin Dashboard
            </Text>
            <Text
              style={[styles.headerSubtitle, { fontSize: subtitleFontSize }]}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              Overview of your accounting software platform
            </Text>
          </View>

          <View style={styles.headerBadgeContainer}>
            <View style={styles.badgeWrapper}>
              <UpdateNotificationBadge />
            </View>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          {kpiData.map((kpi) => (
            <View key={kpi.title} style={styles.kpiCard}>
              <View style={styles.kpiContent}>
                <View style={styles.kpiTextContainer}>
                  <Text style={styles.kpiTitle}>{kpi.title}</Text>
                  <Text style={styles.kpiValue}>{kpi.value}</Text>
                  <View style={styles.kpiChangeContainer}>
                    <Icon
                      name={getTrendIcon(kpi.change)}
                      size={16}
                      color={getTrendColor(kpi.change)}
                    />
                    <Text
                      style={[
                        styles.kpiChange,
                        { color: getTrendColor(kpi.change) },
                      ]}
                    >
                      {kpi.change}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.kpiIconContainer,
                    { backgroundColor: kpi.iconBg },
                  ]}
                >
                  <Icon name={kpi.icon} size={24} color={kpi.iconColor} />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Update Notifications */}
        <View style={styles.notificationSection}>
          <UpdateNotification />
        </View>
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#222',
    includeFontPadding: false,
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 2,
    includeFontPadding: false,
  },
  headerBadgeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  badgeWrapper: {
    transform: [{ scale: 0.8 }],
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 6,
    marginBottom: 4,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  kpiContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kpiTextContainer: {
    flex: 1,
  },
  kpiTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  kpiChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  kpiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  notificationSection: {
    paddingHorizontal: 8,
    paddingTop: 0,
    marginTop: -4,
  },
});