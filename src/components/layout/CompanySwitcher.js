import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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

  //    const fetchCompanies = async (showLoading = false) => {
  //   if (showLoading && companies.length === 0) setIsLoading(true);

  //   try {
  //     const token = await AsyncStorage.getItem('token');
  //     if (!token) throw new Error('Authentication token not found.');

  //     const res = await fetch(`${BASE_URL}/api/companies/my`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });

  //     if (!res.ok) throw new Error('Failed to fetch companies.');

  //     const data = await res.json();
  //     setCompanies(data);

  //     // ✅ FIX: Only set company on initial load, not on every fetch
  //     if (showLoading) {
  //       const savedCompanyId = await AsyncStorage.getItem('selectedCompanyId');

  //       if (data.length > 0) {
  //         if (savedCompanyId) {
  //           // ✅ Handle "all" case properly
  //           if (savedCompanyId === 'all') {
  //             setSelectedCompanyId(null);
  //           } else {
  //             // Check if saved company still exists
  //             const companyExists = data.some(c => c._id === savedCompanyId);
  //             setSelectedCompanyId(companyExists ? savedCompanyId : data[0]._id);
  //           }
  //         } else {
  //           // No saved company, default to first
  //           setSelectedCompanyId(data[0]._id);
  //           await AsyncStorage.setItem('selectedCompanyId', data[0]._id);
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Company fetch error:', error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };
  
  const fetchCompanies = async (showLoading = false) => {
    if (showLoading && companies.length === 0) setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCompanies(data);

        if (showLoading) {
          const savedCompanyId = await AsyncStorage.getItem(
            'selectedCompanyId',
          );

          // Agar pehle se kuch saved hai to wahi dikhao,
          // warna hamesha 'null' (All Companies) set karo
          if (!savedCompanyId || savedCompanyId === 'all') {
            setSelectedCompanyId(null);
            await AsyncStorage.setItem('selectedCompanyId', 'all');
          } else {
            const companyExists = data.some(c => c._id === savedCompanyId);
            setSelectedCompanyId(companyExists ? savedCompanyId : null);
          }
        }
      }
    } catch (error) {
      console.error('Company fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies(true); // Only initial load should reset selection
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) fetchCompanies(false); // Don't reset on refresh
  }, [refreshTrigger]);

  useFocusEffect(
    React.useCallback(() => {
      fetchCompanies(false); // Don't reset on screen focus
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') fetchCompanies(false); // Don't reset on app resume
    });
    return () => subscription.remove();
  }, []);

  const handleCompanyChange = async companyId => {
    const valueToStore = companyId; // 'all' or actual company ID
    const valueForContext = companyId === 'all' ? null : companyId;

    setSelectedCompanyId(valueForContext);
    await AsyncStorage.setItem('selectedCompanyId', valueToStore);
    setShowDropdown(false);
  };

  const getSelectedCompanyName = () => {
    if (!selectedCompanyId) return 'All Companies';
    const company = companies.find(c => c._id === selectedCompanyId);
    return company ? company.businessName : 'Select Company';
  };

  const currentName = getSelectedCompanyName();

  // --- ORDERED RENDER LOGIC (Flicker Fix) ---

  // 1. Loading check
  if (isLoading && companies.length === 0) {
    return (
      <View style={[styles.triggerButton, { opacity: 0.7 }]}>
        <ActivityIndicator
          size="small"
          color="#94a3b8"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.triggerText}>Loading...</Text>
      </View>
    );
  }

  // 2. No Companies
  if (!isLoading && companies.length === 0) {
    return (
      <View style={styles.singleCompanyContainer}>
        <Ionicons name="search-outline" size={16} color="#64748b" />
        <Text style={styles.singleCompanyText}>No Companies</Text>
      </View>
    );
  }

  // 3. Single Company View
  if (companies.length === 1) {
    return (
      <View style={styles.singleCompanyContainer}>
        <Text style={styles.singleCompanyText} numberOfLines={1}>
          {companies[0].businessName}
        </Text>
      </View>
    );
  }

  // 4. Main Multiple Companies UI
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.triggerButton}
        onPress={() => setShowDropdown(true)}
      >
        {currentName.length < 15 && (
          <Ionicons name="search-outline" size={18} color="#94a3b8" />
        )}
        <Text style={styles.triggerText} numberOfLines={1}>
          {currentName}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#94a3b8" />
      </TouchableOpacity>

      <Modal
        visible={showDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
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
                data={[
                  { value: 'all', label: 'All Companies' },
                  ...companies.map(c => ({
                    value: c._id,
                    label: c.businessName,
                  })),
                ].filter(c =>
                  c.label.toLowerCase().includes(searchQuery.toLowerCase()),
                )}
                renderItem={({ item }) => {
                  const isSelected =
                    selectedCompanyId === item.value ||
                    (!selectedCompanyId && item.value === 'all');
                  return (
                    <TouchableOpacity
                      style={[
                        styles.companyItem,
                        isSelected && styles.companyItemSelected,
                      ]}
                      onPress={() => handleCompanyChange(item.value)}
                    >
                      <Text
                        style={[
                          styles.companyItemText,
                          isSelected && styles.companyItemTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color="#10b981" />
                      )}
                    </TouchableOpacity>
                  );
                }}
                keyExtractor={item => item.value}
                contentContainerStyle={styles.dropdownListContent}
              />
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', flex: 1, maxWidth: 280 },
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
    elevation: 2,
    width: '100%',
  },
  triggerText: { flex: 1, fontSize: 15, color: '#1e293b', fontWeight: '500' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  closeButton: { padding: 4 },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  searchInputIcon: { marginLeft: 12 },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1e293b',
  },
  clearSearchButton: { padding: 8 },
  dropdownListContent: { paddingBottom: 20 },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  companyItemSelected: { backgroundColor: '#e0f2fe' },
  companyItemText: { fontSize: 16, color: '#374151', flex: 1 },
  companyItemTextSelected: { color: '#0369a1', fontWeight: '700' },
});
