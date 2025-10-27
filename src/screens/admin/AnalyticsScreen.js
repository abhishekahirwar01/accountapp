// ...existing code...
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import {
  Users,
  LayoutDashboard,
  FileText,
  Briefcase,
  ChevronDown,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DashboardTab from '../../components/analytics/DashboardTab';
import TransactionsTab from '../../components/analytics/TransactionsTab';
import CompaniesTab from '../../components/analytics/CompaniesTab';
import UsersTab from '../../components/analytics/UsersTab';
import ProfitAndLossTab from '../../components/analytics/ProfitAndLoss';
import BalanceSheetTab from '../../components/analytics/BalanceSheet';

import { BASE_URL } from '../../config';
// ...existing code...

export default function AnalyticsScreen() {
  const [clients, setClients] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  // keep empty string '' as "All Companies"
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeReport, setActiveReport] = useState('profitandloss');
  const [isClientsLoading, setIsClientsLoading] = useState(true);
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Refs for memory leak prevention
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const selectedClient = useMemo(() => {
    if (!selectedClientId || !clients.length) return null;
    return clients.find(c => c && c._id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  const companyMap = useMemo(() => {
    const map = new Map();
    if (!companies || !Array.isArray(companies)) return map;

    companies.forEach(c => {
      if (c && c._id) {
        map.set(c._id, c.businessName || 'Unnamed Company');
      }
    });
    return map;
  }, [companies]);

  const TABS = useMemo(
    () => [
      { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
      { key: 'transactions', label: 'Transactions', Icon: FileText },
      { key: 'companies', label: 'Companies', Icon: Briefcase },
      { key: 'users', label: 'Users', Icon: Users },
      { key: 'reports', label: 'Reports', Icon: FileText },
    ],
    [],
  );

  // Safe data accessors
  const getSafeClientName = useCallback(client => {
    return client?.contactName || 'Unknown Client';
  }, []);

  const getSafeBusinessName = useCallback(company => {
    return company?.businessName || 'Unknown Company';
  }, []);

  // Fetch clients on component mount
  const fetchClients = useCallback(async () => {
    if (!isMountedRef.current) return;

    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsClientsLoading(true);
    setIsInitialLoad(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${BASE_URL}/api/clients`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }

      const data = await response.json();

      if (isMountedRef.current) {
        setClients(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        console.log('Clients fetch was aborted');
        return;
      }

      console.error('Error fetching clients:', error);
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to load clients. Please try again.', [
          { text: 'OK' },
        ]);
        setClients([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsClientsLoading(false);
        setIsInitialLoad(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Fetch companies when client is selected
  const fetchCompanies = useCallback(
    async clientId => {
      if (!clientId || !isMountedRef.current) {
        // clear companies and keep selectedCompanyId as '' (All Companies)
        if (isMountedRef.current) {
          setCompanies([]);
          // do NOT auto-select first company; preserve '' = All Companies
          setSelectedCompanyId('');
        }
        return;
      }

      // Abort previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setIsCompaniesLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found.');

        const response = await fetch(
          `${BASE_URL}/api/companies/by-client/${clientId}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal,
          },
        );

        if (!response.ok) {
          throw new Error('Failed to fetch companies');
        }

        const data = await response.json();

        if (isMountedRef.current) {
          setCompanies(Array.isArray(data) ? data : []);
          // Important: do NOT auto-select the first company here.
          // Keep '' as "All Companies" unless selectedCompanyId was explicitly set.
          // Only set selectedCompanyId if it's null or undefined (not empty string).
          if (selectedCompanyId === null || selectedCompanyId === undefined) {
            setSelectedCompanyId('');
          }
        }
      } catch (error) {
        // Ignore abort errors
        if (error.name === 'AbortError') {
          console.log('Companies fetch was aborted');
          return;
        }

        console.error('Error fetching companies:', error);
        if (isMountedRef.current) {
          Alert.alert('Error', 'Failed to load companies. Please try again.', [
            { text: 'OK' },
          ]);
          setCompanies([]);
        }
      } finally {
        if (isMountedRef.current) {
          setIsCompaniesLoading(false);
        }
      }
    },
    // add selectedCompanyId as dependency so the check above is stable
    [selectedCompanyId],
  );

  useEffect(() => {
    if (selectedClientId) {
      fetchCompanies(selectedClientId);
    } else {
      setCompanies([]);
      setSelectedCompanyId('');
    }
  }, [selectedClientId, fetchCompanies]);

  const handleClientChange = useCallback(clientId => {
    setSelectedClientId(clientId);
    // Reset company to 'All Companies'
    setSelectedCompanyId('');
  }, []);

  const handleCompanyChange = useCallback(companyId => {
    // companyId '' => All Companies
    setSelectedCompanyId(companyId);
  }, []);

  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTab
            selectedClient={selectedClient}
            selectedCompanyId={selectedCompanyId}
          />
        );
      case 'transactions':
        return (
          <TransactionsTab
            selectedClient={selectedClient}
            selectedCompanyId={selectedCompanyId}
            companyMap={companyMap}
          />
        );
      case 'companies':
        return (
          <CompaniesTab
            selectedClient={selectedClient}
            selectedClientId={selectedClientId}
          />
        );
      case 'users':
        return (
          <UsersTab
            selectedClient={selectedClient}
            selectedCompanyId={selectedCompanyId}
            companyMap={companyMap}
          />
        );
      case 'reports':
        return (
          <View style={styles.reportsContainer}>
            <View style={styles.reportTabs}>
              <TouchableOpacity
                style={[
                  styles.reportTabButton,
                  activeReport === 'profitandloss' && styles.activeReportTab,
                ]}
                onPress={() => setActiveReport('profitandloss')}
              >
                <Text
                  style={[
                    styles.reportTabText,
                    activeReport === 'profitandloss' &&
                      styles.activeReportTabText,
                  ]}
                >
                  Profit & Loss
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reportTabButton,
                  activeReport === 'balancesheet' && styles.activeReportTab,
                ]}
                onPress={() => setActiveReport('balancesheet')}
              >
                <Text
                  style={[
                    styles.reportTabText,
                    activeReport === 'balancesheet' &&
                      styles.activeReportTabText,
                  ]}
                >
                  Balance Sheet
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.reportContent}>
              {activeReport === 'profitandloss' && <ProfitAndLossTab />}
              {activeReport === 'balancesheet' && <BalanceSheetTab />}
            </View>
          </View>
        );
      default:
        return null;
    }
  }, [
    activeTab,
    activeReport,
    selectedClient,
    selectedCompanyId,
    companyMap,
    selectedClientId,
  ]);

  const renderPicker = useCallback(
    (
      value,
      onValueChange,
      items,
      label,
      placeholder,
      isLoading = false,
      customStyle = {},
    ) => (
      <View style={[styles.pickerField, customStyle]}>
        <Text style={styles.selectionLabel}>{label}</Text>
        <View style={styles.pickerWrapper}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#6c757d" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <>
              <Picker
                selectedValue={value}
                onValueChange={onValueChange}
                style={styles.hiddenPicker}
                dropdownIconColor="#6c757d"
                enabled={items && items.length > 0}
              >
                <Picker.Item
                  label={placeholder}
                  value=""
                  style={styles.pickerPlaceholderText}
                />
                {items &&
                  items.map((item, idx) => (
                    <Picker.Item
                      // stable key: prefer id, fallback to index-based key
                      key={item?._id ?? `opt-${idx}`}
                      label={
                        // For client list we'll show contactName, for companies show businessName
                        item?.contactName || item?.businessName || placeholder
                      }
                      value={item?._id ?? ''}
                      style={styles.pickerItemText}
                    />
                  ))}
              </Picker>
              <Text style={styles.pickerDisplay} numberOfLines={1}>
                {value && items
                  ? // find matching item by id/value; fallback to placeholder
                    (items.find(i => i && (i._id === value || i.value === value))
                      ?.contactName ||
                      items.find(i => i && (i._id === value || i.value === value))
                        ?.businessName ||
                      placeholder)
                  : placeholder}
              </Text>
              <ChevronDown
                size={20}
                color="#6c757d"
                style={styles.pickerIcon}
              />
            </>
          )}
        </View>
      </View>
    ),
    [getSafeClientName, getSafeBusinessName],
  );

  const renderHeaderAndSelection = useCallback(
    () => (
      <View style={styles.headerContainer}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Client Analytics</Text>
          <Text style={styles.headerSubtitle}>
            Select a client and company to view their detailed dashboard.
          </Text>
        </View>

        <View style={styles.selectionContainer}>
          <View style={styles.twoColumnSelection}>
            {/* Select Client */}
            {renderPicker(
              selectedClientId,
              handleClientChange,
              clients,
              'Select Client',
              '-- Select Client --',
              isClientsLoading,
              styles.pickerFieldHalf,
            )}

            {/* Select Company (Visible only if a client is selected) */}
            {selectedClientId ? (
              renderPicker(
                selectedCompanyId,
                handleCompanyChange,
                // explicit All Companies option with _id: '' to match empty string value
                [{ _id: '', businessName: 'All Companies' }, ...companies],
                'Select Company',
                'All Companies',
                isCompaniesLoading,
                styles.pickerFieldHalf,
              )
            ) : (
              <View style={styles.pickerFieldHalf} />
            )}
          </View>
        </View>
      </View>
    ),
    [
      selectedClientId,
      selectedCompanyId,
      clients,
      companies,
      isClientsLoading,
      isCompaniesLoading,
      renderPicker,
      handleClientChange,
      handleCompanyChange,
    ],
  );

  const renderMainTabs = useCallback(
    () => (
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {TABS.map(({ key, label, Icon }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.tabButton,
                activeTab === key && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab(key)}
              disabled={!selectedClient}
            >
              <Icon
                size={16}
                color={
                  activeTab === key
                    ? '#fff'
                    : !selectedClient
                    ? '#adb5bd'
                    : '#495057'
                }
                style={styles.tabIcon}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === key && styles.activeTabText,
                  !selectedClient && styles.disabledTabText,
                ]}
              >
                {label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    ),
    [TABS, activeTab, selectedClient],
  );

  // Show loading state initially
  if (isInitialLoad) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainerFull}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingTextFull}>Loading Analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header and Selection are fixed at the top */}
      {renderHeaderAndSelection()}

      {!selectedClient && !isClientsLoading ? (
        <ScrollView contentContainerStyle={styles.noClientScroll}>
          <View style={styles.noClientContainer}>
            <Users size={48} color="#adb5bd" />
            <Text style={styles.noClientText}>No Client Selected</Text>
            <Text style={styles.noClientSubtext}>
              Please select a client to view their data.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.tabsContainer}>
          {renderMainTabs()}

          <View style={styles.tabContentFlex}>{renderTabContent()}</View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ...existing styles...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  tabsContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  tabContentFlex: {
    flex: 1,
  },
  noClientScroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },

  // --- Loading State ---
  loadingContainerFull: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingTextFull: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },

  // --- Header ---
  headerContainer: {
    padding: 16,
    paddingBottom: 0,
    backgroundColor: '#fff',
  },
  headerTextContainer: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#212529',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },

  // --- Selection pickers ---
  selectionContainer: {
    marginBottom: 10,
    paddingTop: 10,
  },
  twoColumnSelection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -6,
  },
  pickerField: {
    marginBottom: 10,
  },
  pickerFieldHalf: {
    flex: 1,
    marginHorizontal: 6,
  },
  selectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingVertical: Platform.OS === 'ios' ? 12 : 0,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    minHeight: 50,
  },
  pickerDisplay: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
  },
  pickerIcon: {
    marginLeft: 8,
  },
  hiddenPicker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: Platform.OS === 'android' ? 0 : 1,
    zIndex: Platform.OS === 'android' ? 10 : 0,
    color: 'transparent',
  },
  pickerPlaceholderText: {
    color: '#adb5bd',
  },
  pickerItemText: {
    color: '#212529',
  },
  loadingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6c757d',
  },

  // --- No client selected message ---
  noClientContainer: {
    alignItems: 'center',
    marginTop: 40,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f1f3f5',
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
    maxWidth: '80%',
  },

  // --- Main Tabs ---
  tabsWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  tabScroll: {
    paddingLeft: 16,
  },
  tabsScrollContent: {
    paddingRight: 16,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
    marginRight: 8,
    minWidth: 100,
  },
  tabButtonActive: {
    backgroundColor: '#007bff',
    ...Platform.select({
      ios: {
        shadowColor: '#007bff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tabIcon: {
    marginRight: 6,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },
  activeTabText: {
    color: '#fff',
  },
  disabledTabText: {
    color: '#adb5bd',
  },

  // --- Reports Tabs (Nested) ---
  reportsContainer: {
    padding: 12,
    flex: 1,
  },
  reportTabs: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  reportTabButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  activeReportTab: {
    backgroundColor: '#007bff',
  },
  reportTabText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
  },
  activeReportTabText: {
    color: '#fff',
  },
  reportContent: {
    flex: 1,
  },
});
// ...existing code...