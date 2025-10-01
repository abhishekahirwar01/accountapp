import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Avatar, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Mock data
const MOCK_CLIENTS = [
  {
    _id: 'c1',
    contactName: 'Aarav Sharma',
    clientUsername: 'aarav01',
    email: 'aarav@example.com',
    phone: '+91 98765 43210',
    companyName: 'Sharma Traders',
    slug: 'sharma-traders',
  },
  {
    _id: 'c2',
    contactName: 'Neha Verma',
    clientUsername: 'nehaV',
    email: 'neha@example.com',
    phone: '+91 99876 54321',
    companyName: 'Verma Foods',
    slug: 'verma-foods',
  },
];

const MOCK_COMPANIES = {
  c1: [
    {
      _id: 'co11',
      businessName: 'Sharma Traders Pvt Ltd',
      businessType: 'Trading',
      companyOwner: 'Aarav Sharma',
      contactNumber: '+91 98765 43210',
      registrationNumber: 'STPL12345',
      gstin: '22AAAAA0000A1Z5',
    },
  ],
  c2: [
    {
      _id: 'co21',
      businessName: 'Verma Foods LLP',
      businessType: 'FMCG',
      companyOwner: 'Neha Verma',
      contactNumber: '+91 99876 54321',
      registrationNumber: 'VFL98765',
      gstin: '27CCCCC0000C1Z7',
    },
  ],
};

const ClientDetailScreen = ({ route, navigation }) => {
  const { clientId } = route.params;
  const [client, setClient] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const { width } = useWindowDimensions();
  const isXS = width < 360;
  const isSM = width >= 360 && width < 400;
  const isMD = width >= 400 && width < 600;
  const isLG = width >= 600;

  const baseFont = isXS ? 12 : isSM ? 13 : 14;
  const titleFont = baseFont + 6;
  const subTitleFont = baseFont + 2;
  const avatarSize = isXS ? 42 : isSM ? 46 : 50;

  const kpiPerRow = isLG ? 4 : isMD ? 3 : 2;
  const kpiGap = 8;
  const kpiHorizontalPad = 8 * 2;
  const kpiCardWidthPx =
    (width - kpiHorizontalPad - (kpiPerRow - 1) * kpiGap) / kpiPerRow;

  useEffect(() => {
    const foundClient = MOCK_CLIENTS.find(c => c._id === clientId);
    setClient(foundClient);
    setCompanies(MOCK_COMPANIES[clientId] || []);
    setLoading(false);
  }, [clientId]);

  if (loading)
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  if (!client)
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text>Client not found</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </SafeAreaView>
    );

  const kpiData = [
    { title: 'Lifetime Revenue', value: '₹500,000', icon: 'currency-inr' },
    { title: 'Net Profit', value: '₹225,000', icon: 'trending-up' },
    { title: 'Active Users', value: '6', icon: 'account-group' },
    {
      title: 'Companies',
      value: String(companies.length),
      icon: 'office-building',
    },
  ];

  const KpiCard = ({ title, value, icon, widthPx }) => (
    <Card style={[styles.kpiCard, { width: widthPx }]}>
      <Card.Content style={styles.kpiContent}>
        <View style={{ flexShrink: 1, paddingRight: 6 }}>
          <Text
            style={[styles.kpiValue, { fontSize: baseFont + 4 }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {value}
          </Text>
          <Text
            style={[styles.kpiTitle, { fontSize: baseFont - 1 }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
        </View>
        <Icon name={icon} size={isXS ? 18 : 22} color="#666" />
      </Card.Content>
    </Card>
  );

  const CompanyCard = ({ company }) => (
    <Card style={styles.companyCard}>
      <Card.Content>
        <Text
          style={[styles.companyName, { fontSize: baseFont + 2 }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {company.businessName}
        </Text>
        <Text
          style={[styles.companyType, { fontSize: baseFont }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {company.businessType}
        </Text>
        <View>
          <View style={styles.detailRow}>
            <Icon name="account" size={14 + (baseFont - 14)} color="#666" />
            <Text
              style={[styles.detailText, { fontSize: baseFont }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {company.companyOwner}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="phone" size={14 + (baseFont - 14)} color="#666" />
            <Text
              style={[styles.detailText, { fontSize: baseFont }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {company.contactNumber}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="identifier" size={14 + (baseFont - 14)} color="#666" />
            <Text
              style={[styles.detailText, { fontSize: baseFont }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {company.registrationNumber}
            </Text>
          </View>
          {company.gstin && (
            <View style={styles.detailRow}>
              <Icon
                name="file-document"
                size={14 + (baseFont - 14)}
                color="#666"
              />
              <Text
                style={[styles.detailText, { fontSize: baseFont }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {company.gstin}
              </Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.header}>
              <Avatar.Text
                size={avatarSize}
                label={client.contactName
                  .split(' ')
                  .map(n => n[0])
                  .join('')}
                style={styles.clientAvatar}
              />
              <View style={styles.headerText}>
                <Text
                  style={[styles.clientName, { fontSize: titleFont }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {client.contactName}
                </Text>
                <Text
                  style={[styles.companyName, { fontSize: subTitleFont }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {client.companyName}
                </Text>
                <Text
                  style={[styles.clientEmail, { fontSize: baseFont }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {client.email}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Button
                mode="outlined"
                icon="account-plus"
                onPress={() => Alert.alert('UI Only', 'Add User functionality')}
                style={{ marginRight: 8 }}
                compact={isXS}
              >
                Add User
              </Button>
              <Button
                mode="contained"
                icon="pencil"
                onPress={() =>
                  Alert.alert('UI Only', 'Edit Client functionality')
                }
                compact={isXS}
              >
                Edit Client
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* KPI Cards */}
        <View style={[styles.kpiGrid, { paddingHorizontal: 8 }]}>
          {kpiData.map((kpi, index) => (
            <View
              key={kpi.title}
              style={{
                marginBottom: kpiGap,
                marginRight: (index + 1) % kpiPerRow === 0 ? 0 : kpiGap,
              }}
            >
              <KpiCard {...kpi} widthPx={kpiCardWidthPx} />
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tabs}>
              {['overview', 'financials', 'companies', 'users'].map(
                (tab, i) => {
                  const selected = activeTab === tab;
                  return (
                    <Chip
                      key={tab}
                      selected={selected}
                      onPress={() => setActiveTab(tab)}
                      style={[styles.tabChip, { marginRight: i === 3 ? 0 : 8 }]}
                      textStyle={[styles.tabText, { fontSize: baseFont - 1 }]}
                      compact={isXS}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Chip>
                  );
                },
              )}
            </View>
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <Card>
              <Card.Content>
                <Text style={[styles.sectionTitle, { fontSize: baseFont + 4 }]}>
                  Client Overview
                </Text>
                <Text style={{ fontSize: baseFont }}>
                  Comprehensive dashboard for {client.contactName} at{' '}
                  {client.companyName}. Monitor performance, manage accounts,
                  and track usage statistics.
                </Text>
              </Card.Content>
            </Card>
          )}
          {activeTab === 'financials' && (
            <Card>
              <Card.Content>
                <Text style={[styles.sectionTitle, { fontSize: baseFont + 4 }]}>
                  Financial Reports
                </Text>
              </Card.Content>
            </Card>
          )}
          {activeTab === 'companies' && (
            <Card>
              <Card.Content>
                <Text style={[styles.sectionTitle, { fontSize: baseFont + 4 }]}>
                  Company Management
                </Text>
                {companies.map(c => (
                  <CompanyCard key={c._id} company={c} />
                ))}
              </Card.Content>
            </Card>
          )}
          {activeTab === 'users' && (
            <Card>
              <Card.Content>
                <Text style={[styles.sectionTitle, { fontSize: baseFont + 4 }]}>
                  User Management
                </Text>
                <Button
                  mode="contained"
                  icon="account-plus"
                  onPress={() =>
                    Alert.alert('UI Only', 'Add User functionality')
                  }
                  style={styles.addUserButton}
                  compact={isXS}
                >
                  Add User
                </Button>
              </Card.Content>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? 8 : 0,
  }, // top padding for Android
  scrollContainer: { paddingBottom: 16 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  headerCard: { margin: 16, marginBottom: 8, borderRadius: 12 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  clientAvatar: { marginRight: 12 },
  headerText: { flex: 1 },
  clientName: { fontWeight: 'bold' },
  companyName: { color: '#666', marginTop: 2 },
  clientEmail: { color: '#999', marginTop: 2 },
  headerActions: { flexDirection: 'row' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  kpiCard: { borderRadius: 12 },
  kpiContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiValue: { fontWeight: 'bold' },
  kpiTitle: { color: '#666', marginTop: 4 },
  tabContainer: { paddingHorizontal: 16, marginVertical: 8 },
  tabs: { flexDirection: 'row' },
  tabChip: {},
  tabText: {},
  tabContent: { padding: 16, paddingTop: 0 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 8 },
  sectionSubtitle: { color: '#666', marginBottom: 12 },
  reportCard: { marginBottom: 12, borderRadius: 12 },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportText: { flex: 1, marginLeft: 10 },
  reportTitle: { fontWeight: 'bold' },
  reportDescription: { color: '#666' },
  companyCard: { marginBottom: 12, borderRadius: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailText: { color: '#666', marginLeft: 8 },
  noDataText: { textAlign: 'center', color: '#999', marginVertical: 24 },
  addUserButton: { marginTop: 12, alignSelf: 'flex-start' },
});

export default ClientDetailScreen;
