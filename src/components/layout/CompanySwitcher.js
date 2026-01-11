import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  AppState,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useCompany } from '../../contexts/company-context';
import { BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function CompanySwitcher() {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedCompanyId, setSelectedCompanyId, refreshTrigger } =
    useCompany();

  // Fetch companies function
  const fetchCompanies = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch companies.');
      }
      const data = await res.json();
      setCompanies(data);
      const savedCompanyId = await AsyncStorage.getItem('selectedCompanyId');

      if (data.length > 0) {
        if (savedCompanyId) {
          const companyExists = data.some(c => c._id === savedCompanyId);
          if (companyExists) {
            setSelectedCompanyId(
              savedCompanyId === 'all' ? null : savedCompanyId,
            );
          } else {
            // If saved company was deleted, select first one
            setSelectedCompanyId(data[0]._id);
            await AsyncStorage.setItem('selectedCompanyId', data[0]._id);
          }
        } else {
          setSelectedCompanyId(data[0]._id);
        }
      }
    } catch (error) {
      console.error('Company fetch error:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchCompanies(true);
  }, []);

  // Refresh when refreshTrigger changes (triggered from context)
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 Refreshing companies from context...');
      fetchCompanies(false);
    }
  }, [refreshTrigger]);

  // Refresh when screen comes to focus
  useFocusEffect(
    React.useCallback(() => {
      console.log(
        '🔄 CompanySwitcher screen focused - refreshing companies...',
      );
      fetchCompanies(false);
    }, []),
  );

  // Refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async state => {
    if (state === 'active') {
      console.log('📱 App came to foreground - refreshing companies...');
      await fetchCompanies(false);
    }
  };

  const handleCompanyChange = async companyId => {
    setSelectedCompanyId(companyId === 'all' ? null : companyId);
    await AsyncStorage.setItem('selectedCompanyId', companyId);
    setShowDropdown(false);
  };

  // Add "All" option to the beginning of the list
  const companyOptions = [
    { value: 'all', label: 'All Companies' },
    ...companies.map(c => ({
      value: c._id,
      label: c.businessName,
    })),
  ];

  // Filter companies based on search query
  const filteredCompanies = companyOptions.filter(company =>
    company.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getSelectedCompanyName = () => {
    if (!selectedCompanyId) {
      return 'All Companies';
    }
    const company = companies.find(c => c._id === selectedCompanyId);
    return company ? company.businessName : 'Select Company';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#64748b" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (companies.length === 0) {
    return (
      <View style={styles.singleCompanyContainer}>
        <Ionicons name="search-outline" size={16} color="#64748b" />
        <Text style={styles.singleCompanyText}>No Companies</Text>
      </View>
    );
  }

  if (companies.length === 1) {
    return (
      <View style={styles.singleCompanyContainer}>
        {/* <Ionicons name="search-outline" size={16} color="#64748b" /> */}
        <Text style={styles.singleCompanyText} numberOfLines={1}>
          {companies[0].businessName}
        </Text>
      </View>
    );
  }

  const renderCompanyItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.companyItem,
        (selectedCompanyId === item.value ||
          (!selectedCompanyId && item.value === 'all')) &&
          styles.companyItemSelected,
      ]}
      onPress={() => handleCompanyChange(item.value)}
    >
      <Text
        style={[
          styles.companyItemText,
          (selectedCompanyId === item.value ||
            (!selectedCompanyId && item.value === 'all')) &&
            styles.companyItemTextSelected,
        ]}
      >
        {item.label}
      </Text>
      {(selectedCompanyId === item.value ||
        (!selectedCompanyId && item.value === 'all')) && (
        <Ionicons name="checkmark" size={18} color="#10b981" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.triggerButton}
        onPress={() => setShowDropdown(true)}
      >
        {/* Search icon instead of business icon */}
        <Ionicons name="search-outline" size={18} color="#94a3b8" />
        <Text style={styles.triggerText} numberOfLines={1}>
          {getSelectedCompanyName()}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#94a3b8" />
      </TouchableOpacity>

      {/* UPDATED MODAL UI */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="slide" // Use slide for a bottom-sheet effect
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity // Background overlay to close modal
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          {/* Prevent closing modal when touching inside the container */}
          <TouchableWithoutFeedback>
            <View style={styles.dropdownContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Company</Text>
                <TouchableOpacity
                  onPress={() => setShowDropdown(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color="#94a3b8"
                    style={styles.searchInputIcon}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search companies..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      style={styles.clearSearchButton}
                    >
                      <Ionicons name="close-circle" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <FlatList
                data={filteredCompanies}
                renderItem={renderCompanyItem}
                keyExtractor={item => item.value}
                style={styles.dropdownList}
                contentContainerStyle={styles.dropdownListContent}
                showsVerticalScrollIndicator={true}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons
                      name="business-outline"
                      size={32}
                      color="#cbd5e1"
                    />
                    <Text style={styles.emptyText}>
                      No companies match your search
                    </Text>
                  </View>
                }
              />
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    maxWidth: 280,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
  },
  // Single company view - FULLY ROUNDED
  singleCompanyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 25,
    backgroundColor: 'white',
    width: '100%',
  },
  singleCompanyText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  // Trigger button - Google search bar style
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    width: '100%',
    minWidth: 180,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  // UPDATED MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Slightly darker overlay
    justifyContent: 'flex-end', // Align to bottom for sheet style
    padding: 0, // Remove padding from overlay
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16, // Rounded top corners
    borderTopRightRadius: 16,
    width: '100%',
    // maxWidth removed to allow full screen width at the bottom
    maxHeight: '80%', // Limit height to 80% of screen
    minHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 }, // Shadow pointing up
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    padding: 16, // Increased padding
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0', // Lighter border
    borderRadius: 10, // Slightly more rounded
    backgroundColor: '#f8fafc', // Light background for the input
    paddingVertical: 4,
  },
  searchInputIcon: {
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16, // Larger font size
    color: '#1e293b',
  },
  clearSearchButton: {
    padding: 8,
    marginRight: 4,
  },
  dropdownList: {
    // max height is now controlled by dropdownContainer
  },
  dropdownListContent: {
    paddingBottom: 20, // Add space at the bottom of the list
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16, // Increased vertical padding
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  companyItemSelected: {
    backgroundColor: '#e0f2fe', // Lighter blue background for selected item
  },
  companyItemText: {
    fontSize: 16, // Larger font
    color: '#374151',
    flex: 1,
  },
  companyItemTextSelected: {
    color: '#0369a1',
    fontWeight: '700', // Bolder selection text
  },
  emptyContainer: {
    padding: 40, // Increased padding
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
