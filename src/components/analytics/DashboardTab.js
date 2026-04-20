import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { KpiCards } from '../dashboard/KPICard';
import { BASE_URL } from '../../config';
import capitalize from 'lodash/capitalize';

const getDisplayValue = value => {
  if (value === undefined || value === null) return 'Not provided';
  const text = String(value).trim();
  return text.length > 0 ? text : 'Not provided';
};

const getCompanyAddress = company => {
  const parts = [
    company?.address,
    company?.City,
    company?.addressState,
    company?.Country,
  ]
    .map(part => (part ? String(part).trim() : ''))
    .filter(Boolean);

  if (parts.length === 0 && !company?.Pincode) {
    return 'Not provided';
  }

  return company?.Pincode
    ? `${parts.join(', ')}${parts.length ? ' - ' : ''}${company.Pincode}`
    : parts.join(', ');
};

// Memoized Custom Carousel Component
const CustomCarousel = React.memo(({
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

  const goToNext = useCallback(() => {
    if (currentIndex < data.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  }, [currentIndex, data.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
      });
    }
  }, [currentIndex]);

  const getItemLayout = useCallback((_, index) => ({
    length: cardWidth,
    offset: cardWidth * index,
    index,
  }), [cardWidth]);

  const keyExtractor = useCallback((item) => item._id, []);

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
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
        removeClippedSubviews={true}
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
            activeOpacity={0.7}
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
            activeOpacity={0.7}
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
});

CustomCarousel.displayName = 'CustomCarousel';

// Memoized Validity Display Component
const ValidityDisplay = React.memo(({ validity }) => {
  const getStatusColor = useCallback((status) => {
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
  }, []);

  const getStatusBackground = useCallback((status) => {
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
  }, []);

  const formatStatus = useCallback((status) => {
    if (!status) return 'Not set';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const normalizedStatus = validity?.status
    ? String(validity.status).toLowerCase()
    : '';

  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Icon name="calendar-clock" size={16} color="#8b77ff" />
      </View>
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>Validity</Text>
        <View style={styles.validityValueRow}>
          <Text style={styles.detailValue}>
            {validity?.expiresAt
              ? `Expires ${formatDate(validity.expiresAt)}`
              : 'Not set'}
          </Text>
          <View
            style={[
              styles.statusBadge,
              normalizedStatus
                ? { backgroundColor: getStatusBackground(normalizedStatus) }
                : styles.statusBadgeNeutral,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                normalizedStatus
                  ? { color: getStatusColor(normalizedStatus) }
                  : styles.statusTextNeutral,
              ]}
            >
              {formatStatus(normalizedStatus)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

ValidityDisplay.displayName = 'ValidityDisplay';

// Loading Component - Memoized
const LoadingView = React.memo(() => {
  const { width: screenWidth } = Dimensions.get('window');
  
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.loadingContainer}
    >
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
});

LoadingView.displayName = 'LoadingView';

// No Client View - Memoized
const NoClientView = React.memo(() => (
  <View style={styles.noClientContainer}>
    <Icon name="account-alert" size={48} color="#9ca3af" />
    <Text style={styles.noClientText}>No Client Selected</Text>
    <Text style={styles.noClientSubtext}>
      Please select a client to view their dashboard.
    </Text>
  </View>
));

NoClientView.displayName = 'NoClientView';

// Client Details Card - Memoized
const ClientDetailsCard = React.memo(({ selectedClient, validity }) => {
  const handleEmailPress = useCallback(() => {
    if (selectedClient.email) {
      Linking.openURL(`mailto:${selectedClient.email}`);
    }
  }, [selectedClient.email]);

  return (
    <View style={styles.clientCard}>
      <View style={styles.clientCardHeader}>
        <View style={styles.clientAvatar}>
          <Icon name="account-tie" size={24} color="#8b77ff" />
        </View>
        <View style={styles.clientHeaderTextBlock}>
          <Text style={styles.clientBadgeText}>Client Details</Text>
          <Text style={styles.clientNameText}>
            {capitalize(selectedClient.contactName || 'Unnamed Client')}
          </Text>
          <Text style={styles.clientSubText}>
            Primary contact and account validity information.
          </Text>
        </View>
      </View>
      <View style={styles.clientDivider} />
      <View style={styles.clientContent}>
      

        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}>
            <Icon name="email-outline" size={16} color="#8b77ff" />
          </View>
          <View style={styles.detailTextWrap}>
            <Text style={styles.detailLabel}>Email</Text>
            {selectedClient.email ? (
              <TouchableOpacity onPress={handleEmailPress} activeOpacity={0.7}>
                <View style={styles.linkValueRow}>
                  <Text style={[styles.detailValue, styles.linkText]}>
                    {selectedClient.email}
                  </Text>
                  <Icon name="open-in-new" size={14} color="#8b77ff" />
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={styles.detailValueMuted}>Not provided</Text>
            )}
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}>
            <Icon name="phone-outline" size={16} color="#8b77ff" />
          </View>
          <View style={styles.detailTextWrap}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>
              {selectedClient.phone || 'Not provided'}
            </Text>
          </View>
        </View>

        <ValidityDisplay validity={validity} />
      </View>
    </View>
  );
});

ClientDetailsCard.displayName = 'ClientDetailsCard';

const CompanyCarouselCard = React.memo(({ company, onIdentifierPress }) => {
  const companyName = capitalize(getDisplayValue(company?.businessName));
  const businessType = capitalize(getDisplayValue(company?.businessType));
  const owner = getDisplayValue(company?.companyOwner);
  const mobile = getDisplayValue(company?.mobileNumber);
  const email = getDisplayValue(company?.emailId);
  const address = getCompanyAddress(company);
  const registrationNumber = getDisplayValue(company?.registrationNumber);
  const gstin = getDisplayValue(company?.gstin);
  const pan = getDisplayValue(company?.PANNumber);

  return (
    <View style={styles.companyCard}>
      <View style={styles.companyCardHeader}>
        <View style={styles.companyAvatar}>
          <Icon name="office-building" size={22} color="#8b77ff" />
        </View>
        <View style={styles.companyHeaderTextBlock}>
          <Text style={styles.clientBadgeText}>Company Details</Text>
          <Text style={styles.companyNameText} numberOfLines={1}>
            {companyName}
          </Text>
          <Text style={styles.companySubText} numberOfLines={1}>
            {businessType}
          </Text>
        </View>
      </View>

      <View style={styles.clientDivider} />

      <View style={styles.companyContent}>
        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}>
            <Icon name="account-tie-outline" size={16} color="#8b77ff" />
          </View>
          <View style={styles.detailTextWrap}>
            <Text style={styles.detailLabel}>Owner</Text>
            <Text style={styles.detailValue}>{owner}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}>
            <Icon name="phone-outline" size={16} color="#8b77ff" />
          </View>
          <View style={styles.detailTextWrap}>
            <Text style={styles.detailLabel}>Contact</Text>
            <Text style={styles.detailValue}>{mobile}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}>
            <Icon name="email-outline" size={16} color="#8b77ff" />
          </View>
          <View style={styles.detailTextWrap}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{email}</Text>
          </View>
        </View>

        <View style={[styles.detailRow, styles.detailRowTop]}>
          <View style={styles.detailIconWrap}>
            <Icon name="map-marker-outline" size={16} color="#8b77ff" />
          </View>
          <View style={styles.detailTextWrap}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue}>{address}</Text>
          </View>
        </View>
      </View>

      <View style={styles.companyTagRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onIdentifierPress?.('Reg. No.', registrationNumber)}
          style={styles.companyTag}
        >
          <Text style={styles.companyTagLabel}>Reg. No.</Text>
          <Text style={styles.companyTagValue} numberOfLines={1}>
            {registrationNumber}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onIdentifierPress?.('GSTIN', gstin)}
          style={styles.companyTag}
        >
          <Text style={styles.companyTagLabel}>GSTIN</Text>
          <Text style={styles.companyTagValue} numberOfLines={1}>
            {gstin}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onIdentifierPress?.('PAN', pan)}
          style={styles.companyTag}
        >
          <Text style={styles.companyTagLabel}>PAN</Text>
          <Text style={styles.companyTagValue} numberOfLines={1}>
            {pan}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

CompanyCarouselCard.displayName = 'CompanyCarouselCard';

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
  const [identifierPopup, setIdentifierPopup] = useState({
    visible: false,
    label: '',
    value: '',
  });
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = screenWidth - 32;

  // Cached auth token
  const authTokenRef = useRef(null);

  const getAuthToken = useCallback(async () => {
    if (authTokenRef.current) {
      return authTokenRef.current;
    }
    
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found.');
      }
      authTokenRef.current = token;
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      throw new Error('Authentication token not found.');
    }
  }, []);

  // Utility functions moved outside of useEffect for better optimization
  const toArray = useCallback((x) => {
    if (Array.isArray(x)) return x;
    if (Array.isArray(x?.entries)) return x.entries;
    if (Array.isArray(x?.data)) return x.data;
    if (Array.isArray(x?.docs)) return x.docs;
    if (Array.isArray(x?.items)) return x.items;
    return [];
  }, []);

  const mustOk = useCallback(async (res, label) => {
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`${label} API ${res.status} ${res.statusText} – ${txt}`);
    }
  }, []);

  const idOf = useCallback((v) => {
    if (typeof v === 'string') return v;
    return v?._id || v?.id || v?.$oid || '';
  }, []);

  const filterByCompany = useCallback((arr, companyId) => {
    if (!companyId) return arr;
    return arr.filter(r => idOf(r.company?._id ?? r.company) === companyId);
  }, [idOf]);

  const extractAmount = useCallback((row) => {
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
  }, []);

  const sumAmount = useCallback((arr) => 
    arr.reduce((a, e) => a + extractAmount(e), 0)
  , [extractAmount]);

  // Fetch validity function
  const fetchValidity = useCallback(async () => {
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
  }, [selectedClient?._id, getAuthToken]);

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

        const salesFiltered = filterByCompany(salesArr, selectedCompanyId);
        const purchasesFiltered = filterByCompany(
          purchasesArr,
          selectedCompanyId,
        );

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
  }, [selectedClient?._id, selectedCompanyId, getAuthToken, toArray, filterByCompany, idOf, sumAmount, mustOk, fetchValidity]);

  const openIdentifierPopup = useCallback((label, value) => {
    setIdentifierPopup({
      visible: true,
      label,
      value,
    });
  }, []);

  const closeIdentifierPopup = useCallback(() => {
    setIdentifierPopup(prev => ({ ...prev, visible: false }));
  }, []);

  // Memoized carousel render item
  const renderCarouselItem = useCallback(({ item }) => (
    <View style={[styles.carouselItem, { width: cardWidth }]}>
      <CompanyCarouselCard
        company={item}
        onIdentifierPress={openIdentifierPopup}
      />
    </View>
  ), [cardWidth, openIdentifierPopup]);

  if (isLoading) {
    return <LoadingView />;
  }

  if (!selectedClient) {
    return <NoClientView />;
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Dashboard-style overview card */}
        <View style={styles.kpiSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <KpiCards
            data={{
              totalSales: stats.totalSales || 0,
              totalPurchases: stats.totalPurchases || 0,
              users: stats.totalUsers || 0,
              companies: companies.length || 0,
            }}
            selectedCompanyId={selectedCompanyId}
            companies={companies}
          />
        </View>

        {/* Main Content Grid */}
        <View style={styles.mainGrid}>
          <ClientDetailsCard 
            selectedClient={selectedClient} 
            validity={validity} 
          />
        </View>

        {/* Companies Carousel */}
        <View style={styles.companiesSection}>
          <View style={styles.companiesHeader}>
            <Text style={styles.companiesTitle}>Companies</Text>
            <Text style={styles.companiesSubtitle}>
              Swipe to review company profiles for this client.
            </Text>
          </View>
          {companies.length > 0 ? (
            <CustomCarousel
              data={companies}
              renderItem={renderCarouselItem}
              currentIndex={currentIndex}
              setCurrentIndex={setCurrentIndex}
            />
          ) : (
            <View style={styles.noCompaniesCard}>
              <View style={styles.noCompaniesIconWrap}>
                <Icon name="office-building" size={24} color="#8b77ff" />
              </View>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>No Companies Found</Text>
                <Text style={styles.cardDescription}>
                  This client does not have any companies assigned yet.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={identifierPopup.visible}
        onRequestClose={closeIdentifierPopup}
      >
        <View style={styles.popupBackdrop}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>{identifierPopup.label}</Text>
            <Text style={styles.popupValue}>{identifierPopup.value}</Text>
            <TouchableOpacity
              style={styles.popupCloseButton}
              onPress={closeIdentifierPopup}
              activeOpacity={0.8}
            >
              <Text style={styles.popupCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
  mainGrid: {
    padding: 12,
    gap: 16,
  },
  clientCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)',
  },
  clientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e4dfff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d3cbff',
  },
  clientHeaderTextBlock: {
    flex: 1,
    gap: 2,
  },
  clientBadgeText: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: '#8b77ff',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  clientNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  clientSubText: {
    fontSize: 12,
    color: '#64748b',
  },
  clientDivider: {
    height: 1,
    backgroundColor: '#e0daff',
    marginVertical: 14,
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
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7ff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  detailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e9e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextWrap: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  detailValue: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  detailValueMuted: {
    fontSize: 14,
    color: '#94a3b8',
  },
  linkValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkText: {
    color: '#8b77ff',
  },
  validityValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeNeutral: {
    backgroundColor: '#e2e8f0',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextNeutral: {
    color: '#475569',
  },
  companiesSection: {
    flex: 1,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  companiesHeader: {
    marginBottom: 8,
  },
  companiesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  companiesSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
  },
  carouselContainer: {
    position: 'relative',
    minHeight: 500,
    marginTop: 8,
  },
  carouselContent: {
    paddingHorizontal: 0,
  },
  carouselItem: {
    paddingHorizontal: 0,
  },
  companyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  companyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  companyAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e4dfff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d3cbff',
  },
  companyHeaderTextBlock: {
    flex: 1,
    gap: 2,
  },
  companyNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  companySubText: {
    fontSize: 12,
    color: '#64748b',
  },
  companyContent: {
    gap: 10,
  },
  detailRowTop: {
    alignItems: 'flex-start',
  },
  companyTagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  companyTag: {
    flex: 1,
    backgroundColor: '#f8f7ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e4dfff',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  companyTagLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8b77ff',
    textTransform: 'uppercase',
  },
  companyTagValue: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  popupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  popupCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  popupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  popupValue: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  popupCloseButton: {
    marginTop: 16,
    alignSelf: 'flex-end',
    backgroundColor: '#8b77ff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  popupCloseText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  carouselControls: {
    position: 'absolute',
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
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 8,
  },
  noCompaniesIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e4dfff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d3cbff',
    marginBottom: 12,
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
