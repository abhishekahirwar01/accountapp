import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Dimensions,
  FlatList,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CompanyCardAnalytics from '../companies/CompanyCardAnalytics';
import { BASE_URL } from '../../config';

const formatCurrency = amount => {
  return '₹' + amount.toLocaleString('en-IN');
};

// Custom Carousel Component
const CustomCarousel = ({
  data,
  renderItem,
  currentIndex,
  setCurrentIndex,
}) => {
  const flatListRef = useRef(null);
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = screenWidth - 32;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const goToNext = () => {
    if (currentIndex < data.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
      });
    }
  };

  const getItemLayout = (_, index) => ({
    length: cardWidth,
    offset: cardWidth * index,
    index,
  });

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth}
        snapToAlignment="center"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={styles.carouselContent}
        getItemLayout={getItemLayout}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
      />

      {data.length > 1 && (
        <View style={styles.carouselControls}>
          <TouchableOpacity
            style={[
              styles.carouselButton,
              styles.prevButton,
              currentIndex === 0 && styles.disabledButton,
            ]}
            onPress={goToPrev}
            disabled={currentIndex === 0}
          >
            <Icon
              name="chevron-left"
              size={20}
              color={currentIndex === 0 ? '#ccc' : '#3b82f6'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.carouselButton,
              styles.nextButton,
              currentIndex === data.length - 1 && styles.disabledButton,
            ]}
            onPress={goToNext}
            disabled={currentIndex === data.length - 1}
          >
            <Icon
              name="chevron-right"
              size={20}
              color={currentIndex === data.length - 1 ? '#ccc' : '#3b82f6'}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const KpiCarousel = ({ data }) => {
  const { width: screenWidth } = Dimensions.get('window');
  const kpiCardWidth = screenWidth * 0.43;

  const renderKpiItem = ({ item }) => (
    <View style={[styles.kpiCard, { width: kpiCardWidth }]}>
      <View style={styles.kpiHeader}>
        <Text style={styles.kpiTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Icon
          name={item.icon}
          size={16}
          color={item.color}
          style={styles.kpiIcon}
        />
      </View>
      <View style={styles.kpiContent}>
        <Text style={styles.kpiValue} numberOfLines={1}>
          {item.value}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.kpiCarouselContainer}>
      <FlatList
        data={data}
        renderItem={renderKpiItem}
        keyExtractor={item => item.title}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kpiCarouselContent}
        snapToInterval={kpiCardWidth + 8}
        snapToAlignment="start"
        decelerationRate="fast"
        initialNumToRender={4}
        maxToRenderPerBatch={4}
      />
    </View>
  );
};

// Validity Display Component
const ValidityDisplay = ({ validity }) => {
  if (!validity) {
    return (
      <View style={styles.clientDetail}>
        <Icon name="calendar-clock" size={18} color="#6b7280" />
        <Text style={styles.clientText}>Validity: Not set</Text>
      </View>
    );
  }

  const getStatusColor = status => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'expired':
        return '#ef4444';
      case 'disabled':
        return '#6b7280';
      default:
        return '#3b82f6';
    }
  };

  const getStatusBackground = status => {
    switch (status) {
      case 'active':
        return '#d1fae5';
      case 'expired':
        return '#fee2e2';
      case 'disabled':
        return '#f3f4f6';
      default:
        return '#dbeafe';
    }
  };

  const formatDate = dateString => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.clientDetail}>
      <Icon name="calendar-clock" size={18} color="#6b7280" />
      <View style={styles.validityContainer}>
        <Text style={styles.clientText}>
          Expires: {formatDate(validity.expiresAt)}
        </Text>
        {validity.status && (
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: getStatusBackground(validity.status),
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: getStatusColor(validity.status),
                },
              ]}
            >
              {validity.status.charAt(0).toUpperCase() +
                validity.status.slice(1)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const DashboardTab = ({ selectedClient, selectedCompanyId = null }) => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalPurchases: 0,
    totalUsers: 0,
  });
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [validity, setValidity] = useState(null);
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = screenWidth - 32;

  const getAuthToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found.');
      }
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      throw new Error('Authentication token not found.');
    }
  };

  // Fetch validity function
  const fetchValidity = async () => {
    if (!selectedClient?._id) return;

    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${BASE_URL}/api/account/${selectedClient._id}/validity`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.status === 404) {
        setValidity(null);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch validity');
      }

      const data = await response.json();
      setValidity(data.validity);
    } catch (error) {
      console.error('Error fetching validity:', error);
      setValidity(null);
    }
  };

  const toArray = x => {
    if (Array.isArray(x)) return x;
    if (Array.isArray(x?.entries)) return x.entries;
    if (Array.isArray(x?.data)) return x.data;
    if (Array.isArray(x?.docs)) return x.docs;
    if (Array.isArray(x?.items)) return x.items;
    return [];
  };

  const mustOk = async (res, label) => {
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`${label} API ${res.status} ${res.statusText} – ${txt}`);
    }
  };

  const idOf = v => {
    if (typeof v === 'string') return v;
    return v?._id || v?.id || v?.$oid || '';
  };

  const filterByCompany = (arr, companyId) => {
    if (!companyId) return arr;
    return arr.filter(r => idOf(r.company?._id ?? r.company) === companyId);
  };

  const extractAmount = row => {
    const candidates = [
      row.amount,
      row.total,
      row.totalAmount,
      row.grandTotal,
      row.finalAmount,
      row.netAmount,
      row?.amount?.total,
      row?.totals?.total,
      row?.summary?.grandTotal,
    ];

    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }

    if (Array.isArray(row.items)) {
      return row.items.reduce((s, it) => {
        const price = Number(it.total ?? it.amount ?? it.rate ?? it.price ?? 0);
        const qty = Number(it.qty ?? it.quantity ?? 1);
        const guess = Number.isFinite(price * qty) ? price * qty : 0;
        return s + guess;
      }, 0);
    }

    return 0;
  };

  const sumAmount = arr => arr.reduce((a, e) => a + extractAmount(e), 0);

  useEffect(() => {
    const fetchStatsAndCompanies = async () => {
      if (!selectedClient?._id) return;

      setIsLoading(true);
      try {
        const token = await getAuthToken();
        const authHeaders = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        const byCompany = !!selectedCompanyId;

        const salesUrl = byCompany
          ? `${BASE_URL}/api/sales/by-client/${selectedClient._id}?companyId=${selectedCompanyId}`
          : `${BASE_URL}/api/sales/by-client/${selectedClient._id}`;

        const purchasesUrl = byCompany
          ? `${BASE_URL}/api/purchase/by-client/${selectedClient._id}?companyId=${selectedCompanyId}&limit=all`
          : `${BASE_URL}/api/purchase/by-client/${selectedClient._id}?limit=all`;

        const companiesUrl = `${BASE_URL}/api/companies/by-client/${selectedClient._id}`;

        const usersUrl = byCompany
          ? `${BASE_URL}/api/users/by-client/${selectedClient._id}?companyId=${selectedCompanyId}`
          : `${BASE_URL}/api/users/by-client/${selectedClient._id}`;

        const [salesRes, purchasesRes, companiesRes, usersRes] =
          await Promise.all([
            fetch(salesUrl, { headers: authHeaders }),
            fetch(purchasesUrl, { headers: authHeaders }),
            fetch(companiesUrl, { headers: authHeaders }),
            fetch(usersUrl, { headers: authHeaders }),
          ]);

        // Use the same error handling as Next.js
        await Promise.all([
          mustOk(salesRes, 'Sales'),
          mustOk(purchasesRes, 'Purchases'),
          mustOk(companiesRes, 'Companies'),
          mustOk(usersRes, 'Users'),
        ]);

        const [salesData, purchasesData, companiesData, usersData] =
          await Promise.all([
            salesRes.json(),
            purchasesRes.json(),
            companiesRes.json(),
            usersRes.json(),
          ]);

        const salesArr = toArray(salesData);
        const purchasesArr = toArray(purchasesData);
        const companiesArr = toArray(companiesData);
        const usersArr = toArray(usersData);

        // Extra client-side filter safeguard (same as Next.js)
        const salesFiltered = filterByCompany(salesArr, selectedCompanyId);
        const purchasesFiltered = filterByCompany(
          purchasesArr,
          selectedCompanyId,
        );

        // Filter users by company (same as Next.js)
        const usersFiltered = !selectedCompanyId
          ? usersArr
          : usersArr.filter(
              u =>
                Array.isArray(u.companies) &&
                u.companies.some(c => idOf(c) === selectedCompanyId),
            );

        setStats({
          totalSales: sumAmount(salesFiltered),
          totalPurchases: sumAmount(purchasesFiltered),
          totalUsers: usersFiltered.length,
        });

        setCompanies(companiesArr);

        // Fetch validity data
        await fetchValidity();
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        Alert.alert(
          'Failed to load data',
          error.message || 'Could not fetch client financial summary.',
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatsAndCompanies();
  }, [selectedClient?._id, selectedCompanyId]);

  const kpiData = [
    {
      title: 'Total Sales',
      value: formatCurrency(stats.totalSales || 0),
      icon: 'currency-inr',
      color: '#10b981',
    },
    {
      title: 'Total Purchases',
      value: formatCurrency(stats.totalPurchases || 0),
      icon: 'currency-inr',
      color: '#ef4444',
    },
    {
      title: 'Total Users',
      value: String(stats.totalUsers || 0),
      icon: 'account-group',
      color: '#3b82f6',
    },
    {
      title: 'Companies',
      value: (companies.length || 0).toString(),
      icon: 'office-building',
      color: '#8b5cf6',
    },
  ];

  const renderCarouselItem = ({ item, index }) => (
    <View style={[styles.carouselItem, { width: cardWidth }]}>
      <CompanyCardAnalytics
        company={item}
        showIndicators={true}
        indicators={companies}
        activeIndex={currentIndex}
      />
    </View>
  );

  if (isLoading) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.loadingContainer}
      >
        {/* Loading KPI Cards */}
        <View style={styles.loadingKpiCarousel}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View
              key={i}
              style={[styles.loadingCard, { width: screenWidth * 0.43 }]}
            >
              <View style={styles.loadingHeader}>
                <View style={styles.loadingText} />
                <View style={styles.loadingIcon} />
              </View>
              <View style={styles.loadingContent} />
            </View>
          ))}
        </View>

        <View style={styles.loadingSection}>
          <View style={styles.loadingTitle} />
          <View style={styles.loadingDescription} />
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.loadingDetail} />
          ))}
        </View>
      </ScrollView>
    );
  }

  if (!selectedClient) {
    return (
      <View style={styles.noClientContainer}>
        <Icon name="account-alert" size={48} color="#9ca3af" />
        <Text style={styles.noClientText}>No Client Selected</Text>
        <Text style={styles.noClientSubtext}>
          Please select a client to view their dashboard.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* KPI Cards Horizontal Carousel */}
      <View style={styles.kpiSection}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <KpiCarousel data={kpiData} />
      </View>

      {/* Main Content Grid */}
      <View style={styles.mainGrid}>
        {/* Client Details Card */}
        <View style={styles.clientCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Client Details</Text>
            <Text style={styles.cardDescription}>
              Primary contact information.
            </Text>
          </View>
          <View style={styles.clientContent}>
            <View style={styles.clientDetail}>
              <Icon name="account" size={18} color="#6b7280" />
              <Text style={styles.clientText}>
                {selectedClient.contactName}
              </Text>
            </View>
            <View style={styles.clientDetail}>
              <Icon name="email" size={18} color="#6b7280" />
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(`mailto:${selectedClient.email}`)
                }
              >
                <Text style={[styles.clientText, styles.link]}>
                  {selectedClient.email}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.clientDetail}>
              <Icon name="phone" size={18} color="#6b7280" />
              <Text style={styles.clientText}>{selectedClient.phone}</Text>
            </View>

            {/* VALIDITY DISPLAY ADDED HERE */}
            <ValidityDisplay validity={validity} />
          </View>
        </View>
      </View>

      {/* Companies Carousel */}
      <View style={styles.companiesSection}>
        <Text style={{ fontSize: 20 }}>Companies</Text>
        {companies.length > 0 ? (
          <CustomCarousel
            data={companies}
            renderItem={renderCarouselItem}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
          />
        ) : (
          <View style={styles.noCompaniesCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>No Companies Found</Text>
              <Text style={styles.cardDescription}>
                This client does not have any companies assigned yet.
              </Text>
            </View>
            <View style={styles.noCompaniesContent}>
              <Icon name="office-building" size={48} color="#9ca3af" />
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  kpiSection: {
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    marginLeft: 16,
  },
  kpiCarouselContainer: {
    paddingLeft: 12,
  },
  kpiCarouselContent: {
    paddingRight: 12,
    gap: 8,
  },
  kpiCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  kpiTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    flex: 1,
    marginRight: 8,
  },
  kpiIcon: {
    marginTop: 1,
  },
  kpiContent: {
    marginTop: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  mainGrid: {
    padding: 12,
    gap: 16,
  },
  clientCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  clientContent: {
    gap: 10,
  },
  clientDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clientText: {
    fontSize: 14,
    color: '#374151',
  },
  link: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  // Validity Styles
  validityContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  companiesSection: {
    flex: 1,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  carouselContainer: {
    position: 'relative',
    minHeight: 600,
    marginTop: 8,
  },
  carouselContent: {
    paddingHorizontal: 0,
  },
  carouselItem: {
    paddingHorizontal: 0,
  },
  carouselControls: {
    position: 'absolute',
    // bottom: 16,
    left: 0,
    right: 0,
    top: '45%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: -16,
    transform: [{ translateY: 0 }],
  },
  carouselButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  prevButton: {
    marginLeft: 0,
  },
  nextButton: {
    marginRight: 0,
  },
  disabledButton: {
    backgroundColor: '#f3f4f6',
  },
  noCompaniesCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginTop: 8,
  },
  noCompaniesContent: {
    padding: 32,
    alignItems: 'center',
  },
  noClientContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noClientText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    color: '#495057',
  },
  noClientSubtext: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 4,
  },
  loadingKpiCarousel: {
    flexDirection: 'row',
    paddingLeft: 12,
    paddingRight: 12,
    gap: 8,
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingText: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    flex: 1,
    marginRight: 8,
  },
  loadingIcon: {
    height: 14,
    width: 14,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
  },
  loadingContent: {
    height: 18,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    width: '60%',
  },
  loadingSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    margin: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingTitle: {
    height: 16,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    width: '40%',
    marginBottom: 6,
  },
  loadingDescription: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    width: '60%',
    marginBottom: 12,
  },
  loadingDetail: {
    height: 14,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    width: '80%',
    marginBottom: 10,
  },
});

export default DashboardTab;
