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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CompanyCard from '../companies/CompanyCard';

// Hardcoded data
const HARDCODED_CLIENT = {
  _id: '1',
  contactName: 'John Smith',
  email: 'john.smith@example.com',
  phone: '+1 (555) 123-4567',
};

const HARDCODED_COMPANIES = [
  {
    _id: '1',
    businessName: 'Tech Solutions Inc.',
    businessType: 'Information Technology',
    companyOwner: 'John Doe',
    mobileNumber: '+1 (555) 123-4567',
    registrationNumber: 'REG-2024-001',
    gstin: 'GSTIN-123456789',
    PANNumber: 'ABCDE1234F',
    address: '123 Business Street',
    City: 'New York',
    addressState: 'NY',
    Country: 'USA',
    Pincode: '10001',
    emailId: 'contact@techsolutions.com',
    ewayBillApplicable: true,
  },
  {
    _id: '2',
    businessName: 'Global Manufacturing Corp',
    businessType: 'Manufacturing',
    companyOwner: 'Sarah Wilson',
    mobileNumber: '+1 (555) 987-6543',
    registrationNumber: 'MFG-2024-789',
    gstin: 'GSTIN-987654321',
    PANNumber: 'WXYZE5678G',
    address: '789 Industrial Avenue',
    City: 'Chicago',
    addressState: 'IL',
    Country: 'USA',
    Pincode: '60616',
    emailId: 'info@globalmfg.com',
    ewayBillApplicable: false,
  }
];

const HARDCODED_STATS = {
  totalSales: 1250000,
  totalPurchases: 850000,
  totalUsers: 45,
};

const formatCurrency = (amount) => {
  return '₹' + amount.toLocaleString('en-IN');
};

// Custom Carousel Component
const CustomCarousel = ({ data, renderItem, currentIndex, setCurrentIndex }) => {
  const flatListRef = useRef(null);
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = screenWidth - 32; // 16px padding on each side

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
        animated: true
      });
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true
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
        keyExtractor={(item) => item._id}
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

      {/* Navigation Arrows - Moved to bottom */}
      {data.length > 1 && (
        <View style={styles.carouselControls}>
          <TouchableOpacity
            style={[
              styles.carouselButton,
              styles.prevButton,
              currentIndex === 0 && styles.disabledButton
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
              currentIndex === data.length - 1 && styles.disabledButton
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
  const kpiCardWidth = screenWidth * 0.45;

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
        keyExtractor={(item) => item.title}
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

const DashboardTab = ({
  selectedClient = HARDCODED_CLIENT,
  selectedCompanyId = null
}) => {
  // ALL HOOKS AT THE TOP LEVEL - before any conditional returns
  const [stats, setStats] = useState({
    totalSales: 0,
    totalPurchases: 0,
    totalUsers: 0,
  });
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = screenWidth - 32;

  useEffect(() => {
    // Simulate API call with timeout
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStats(HARDCODED_STATS);
        setCompanies(HARDCODED_COMPANIES);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedClient._id, selectedCompanyId]);

  // Move all variables that use hooks BEFORE conditional returns
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
      <CompanyCard
        company={item}
        showIndicators={true}
        indicators={companies}
        activeIndex={currentIndex}
      />
    </View>
  );

  // NOW conditional returns are safe - all hooks have been called
  if (isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.loadingContainer}>
        {/* Loading KPI Cards */}
        <View style={styles.loadingKpiCarousel}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={[styles.loadingCard, { width: screenWidth * 0.45 }]}>
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
              <Text style={styles.clientText}>{selectedClient.contactName}</Text>
            </View>
            <View style={styles.clientDetail}>
              <Icon name="email" size={18} color="#6b7280" />
              <TouchableOpacity
                onPress={() => Linking.openURL(`mailto:${selectedClient.email}`)}
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
          </View>
        </View>
      </View>

      {/* Companies Carousel - MOVED TO BOTTOM */}
      <View style={styles.companiesSection}>
        <Text style={styles.sectionTitle}>Companies</Text>
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
  companiesSection: {
    flex: 1,
    marginTop: 8, // Added margin to separate from above content
    paddingHorizontal: 12,
  },
  carouselContainer: {
    position: 'relative',
    minHeight: 400,
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
    bottom: 16, // Changed from top to bottom
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    transform: [{ translateY: 0 }], // Removed vertical translation
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