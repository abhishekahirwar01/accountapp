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
  RefreshControl,
  FlatList,
  Modal, 
  Dimensions,
  Animated,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import {
  Users,
  LayoutDashboard,
  FileText,
  Briefcase,
  ChevronDown,
  X,
  Check,
  Search,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DashboardTab from '../../components/analytics/DashboardTab';
import TransactionsTab from '../../components/analytics/TransactionsTab';
import InventoryTab from '../../components/analytics/InventoryTab';
import CompaniesTab from '../../components/analytics/CompaniesTab';
import UsersTab from '../../components/analytics/UsersTab';
import ProfitAndLossTab from '../../components/analytics/ProfitAndLoss';
import BalanceSheetTab from '../../components/analytics/BalanceSheet';

import { BASE_URL } from '../../config';

const { width } = Dimensions.get('window');

// Custom Dropdown Component with Search
const CustomDropdown = ({
  label,
  value,
  items = [],
  onValueChange,
  placeholder = 'Select an option',
  isLoading = false,
  disabled = false,
  style = {},
  emptyMessage = 'No options available',
  showClearButton = true,
  searchable = true,
  searchPlaceholder = 'Search...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const searchInputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const item = items.find(i => i?._id === value);
    setSelectedLabel(
      item?.contactName || item?.businessName || item?.label || placeholder
    );
  }, [value, items, placeholder]);

  // Filter items based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = items.filter(item => {
      const itemText = (
        item?.contactName || 
        item?.businessName || 
        item?.label || 
        ''
      ).toLowerCase();
      return itemText.includes(query);
    });
    
    setFilteredItems(filtered);
  }, [items, searchQuery]);

  const handleOpen = () => {
    if (disabled || isLoading) return;
    setIsOpen(true);
    setSearchQuery('');
    setFilteredItems(items);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (searchable && searchInputRef.current) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
    });
  };

  const handleClose = () => {
    setSearchQuery('');
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => setIsOpen(false));
  };

  const handleSelect = (item) => {
    if (item?._id !== undefined) {
      onValueChange(item._id);
    }
    handleClose();
  };

  const handleClear = () => {
    onValueChange('');
    handleClose();
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const renderItem = (item, index) => (
    <TouchableOpacity
      key={item._id || `item-${index}`}
      style={[
        styles.dropdownItem,
        value === item._id && styles.dropdownItemSelected,
        index === filteredItems.length - 1 && styles.dropdownItemLast,
      ]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.dropdownItemContent}>
        <Text
          style={[
            styles.dropdownItemText,
            value === item._id && styles.dropdownItemTextSelected,
          ]}
          numberOfLines={1}
        >
          {item.contactName || item.businessName || item.label}
        </Text>
        {value === item._id && (
          <Check size={18} color="#007bff" style={styles.dropdownCheckIcon} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.dropdownField, style]}>
      {label && <Text style={styles.dropdownLabel}>{label}</Text>}
      
      <TouchableOpacity
        style={[
          styles.dropdownTrigger,
          disabled && styles.dropdownTriggerDisabled,
          isLoading && styles.dropdownTriggerLoading,
          isOpen && styles.dropdownTriggerOpen,
        ]}
        onPress={handleOpen}
        disabled={disabled || isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <View style={styles.dropdownLoadingContainer}>
            <ActivityIndicator size="small" color="#6c757d" />
            <Text style={styles.dropdownLoadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            <Text
              style={[
                styles.dropdownTriggerText,
                !value && styles.dropdownTriggerTextPlaceholder,
              ]}
              numberOfLines={1}
            >
              {selectedLabel}
            </Text>
            <View style={styles.dropdownTriggerIcons}>
              {showClearButton && value && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  style={styles.clearButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={16} color="#6c757d" />
                </TouchableOpacity>
              )}
              <ChevronDown
                size={18}
                color={disabled ? '#adb5bd' : '#495057'}
                style={[
                  styles.dropdownArrow,
                  isOpen && styles.dropdownArrowOpen,
                ]}
              />
            </View>
          </>
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.dropdownBackdrop}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View
            style={[
              styles.dropdownModal,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderTitle}>{label}</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.dropdownCloseButton}
              >
                <X size={22} color="#495057" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            {searchable && items.length > 5 && (
              <View style={styles.searchContainer}>
                <Search size={18} color="#6c757d" style={styles.searchIcon} />
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder={searchPlaceholder}
                  placeholderTextColor="#6c757d"
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={clearSearch}
                    style={styles.clearSearchButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={16} color="#6c757d" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <FlatList
              data={filteredItems}
              renderItem={({ item, index }) => renderItem(item, index)}
              keyExtractor={(item, index) => item._id || `item-${index}`}
              style={styles.dropdownList}
              showsVerticalScrollIndicator={true}
              ListEmptyComponent={
                <View style={styles.dropdownEmpty}>
                  <Text style={styles.dropdownEmptyText}>
                    {searchQuery ? 'No matching results found' : emptyMessage}
                  </Text>
                  {searchQuery && (
                    <TouchableOpacity
                      onPress={clearSearch}
                      style={styles.clearSearchButtonEmpty}
                    >
                      <Text style={styles.clearSearchTextEmpty}>
                        Clear search
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
              ListHeaderComponent={
                searchable && items.length > 0 && searchQuery && (
                  <View style={styles.searchResultsHeader}>
                    <Text style={styles.searchResultsText}>
                      {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''} found
                    </Text>
                  </View>
                )
              }
            />
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default function AnalyticsScreen() {
  const route = useRoute();
  const preSelectedClientId = route.params?.clientId;

  const [clients, setClients] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeReport, setActiveReport] = useState('profitandloss');
  const [isClientsLoading, setIsClientsLoading] = useState(true);
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  React.useEffect(() => {
    if (preSelectedClientId && clients.length > 0) {
      const clientExists = clients.some(
        c => c && c._id === preSelectedClientId,
      );
      if (clientExists) {
        AsyncStorage.multiRemove(['profitLossCache', 'dashboardCache']);
        setSelectedClientId(preSelectedClientId);
      }
    }
  }, [clients, preSelectedClientId]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await AsyncStorage.multiRemove([
        'profitLossCache',
        'dashboardCache',
        'transactionsCache',
        'inventoryCache'
      ]);
      
      await fetchClients();
      if (selectedClientId) {
        await fetchCompanies(selectedClientId);
        console.log('Data refreshed from server');
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [selectedClientId]);

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
      { key: 'inventory', label: 'Inventory', Icon: Briefcase },
      { key: 'companies', label: 'Companies', Icon: Briefcase },
      { key: 'users', label: 'Users', Icon: Users },
      { key: 'reports', label: 'Reports', Icon: FileText },
    ],
    [],
  );

  const fetchClients = useCallback(async () => {
    if (!isMountedRef.current) return;

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

  const fetchCompanies = useCallback(
    async clientId => {
      if (!clientId || !isMountedRef.current) {
        if (isMountedRef.current) {
          setCompanies([]);
          setSelectedCompanyId('');
        }
        return;
      }

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
          if (selectedCompanyId === null || selectedCompanyId === undefined) {
            setSelectedCompanyId('');
          }
        }
      } catch (error) {
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

  const handleClientChange = useCallback(async (clientId) => {
    await AsyncStorage.multiRemove(['profitLossCache', 'dashboardCache']);
    setSelectedClientId(clientId);
    setSelectedCompanyId('');
  }, []);

  const handleCompanyChange = useCallback(async (companyId) => {
    await AsyncStorage.removeItem('profitLossCache');
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
      case 'inventory':
        return (
          <InventoryTab
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
              {activeReport === 'profitandloss' && (
                <ProfitAndLossTab
                  selectedClient={selectedClient}
                  selectedCompanyId={selectedCompanyId}
                  companyMap={companyMap}
                />
              )}
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
            <CustomDropdown
              label="Select Client"
              value={selectedClientId}
              items={clients}
              onValueChange={handleClientChange}
              placeholder="-- Select Client --"
              isLoading={isClientsLoading}
              style={styles.dropdownFieldHalf}
              emptyMessage="No clients available"
              searchable={true}
              searchPlaceholder="Search clients..."
            />

            {selectedClientId ? (
              <CustomDropdown
                label="Select Company"
                value={selectedCompanyId}
                items={[
                  { _id: '', businessName: 'All Companies' },
                  ...companies,
                ]}
                onValueChange={handleCompanyChange}
                placeholder="All Companies"
                isLoading={isCompaniesLoading}
                style={styles.dropdownFieldHalf}
                disabled={!selectedClientId}
                emptyMessage="No companies available"
                searchable={true}
                searchPlaceholder="Search companies..."
              />
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
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <FlatList
        data={[{ key: 'content' }]}
        renderItem={() => (
          <>
            {!selectedClient && !isClientsLoading ? (
              <View style={styles.noClientScroll}>
                <View style={styles.noClientContainer}>
                  <Users size={48} color="#adb5bd" />
                  <Text style={styles.noClientText}>No Client Selected</Text>
                  <Text style={styles.noClientSubtext}>
                    Please select a client to view their data.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.tabsContainer}>
                {renderMainTabs()}
                <View style={styles.tabContentFlex}>{renderTabContent()}</View>
              </View>
            )}
          </>
        )}
        ListHeaderComponent={renderHeaderAndSelection}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007bff']}
            tintColor="#007bff"
          />
        }
        keyExtractor={item => item.key}
        showsVerticalScrollIndicator={true}
        style={styles.container}
      />
    </>
  );
}

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
    paddingHorizontal: 16,
    paddingVertical: 40,
    alignItems: 'center',
  },

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

  headerContainer: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 0,
    backgroundColor: '#fff',
  },
  headerTextContainer: {
    marginBottom: 6,
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

  selectionContainer: {
    marginBottom: 4,
    paddingTop: 4,
  },
  twoColumnSelection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -6,
  },
  dropdownField: {
    marginBottom: 10,
  },
  dropdownFieldHalf: {
    flex: 1,
    marginHorizontal: 6,
  },
  pickerFieldHalf: {
    flex: 1,
    marginHorizontal: 6,
  },

  // Custom Dropdown Styles
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  dropdownTrigger: {
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
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
  dropdownTriggerOpen: {
    borderColor: '#007bff',
    borderWidth: 2,
    backgroundColor: '#f8f9ff',
  },
  dropdownTriggerDisabled: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
  },
  dropdownTriggerLoading: {
    backgroundColor: '#f8f9fa',
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginRight: 8,
  },
  dropdownTriggerTextPlaceholder: {
    color: '#4a4a4b',
    fontWeight: '400',
  },
  dropdownTriggerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    padding: 4,
    marginRight: 8,
    backgroundColor: '#f1f3f5',
    borderRadius: 12,
  },
  dropdownArrow: {
    transition: 'transform 0.2s',
  },
  dropdownArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownLoadingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },

  // Search Bar Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
    padding: 0,
  },
  clearSearchButton: {
    padding: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 12,
  },
  clearSearchButtonEmpty: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  clearSearchTextEmpty: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Search Results Header
  searchResultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchResultsText: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '500',
  },

  // Modal Backdrop
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Modal Content
  dropdownModal: {
    width: width - 40,
    maxHeight: 500,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  dropdownHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
  },
  dropdownCloseButton: {
    padding: 4,
  },
  dropdownList: {
    maxHeight: 500,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  dropdownItemSelected: {
    backgroundColor: '#f8f9ff',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#495057',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#007bff',
    fontWeight: '600',
  },
  dropdownCheckIcon: {
    marginLeft: 10,
  },
  dropdownEmpty: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownEmptyText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },

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