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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useCompany } from "../../contexts/company-context";
import { BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function CompanySwitcher() {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedCompanyId, setSelectedCompanyId, currentCompany } = useCompany();

  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoading(true);
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) throw new Error("Authentication token not found.");

        const res = await fetch(`${BASE_URL}/api/companies/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to fetch companies.");
        }
        const data = await res.json();
        setCompanies(data);
        const savedCompanyId = await AsyncStorage.getItem("selectedCompanyId");
        
        if (data.length > 0) {
          if (savedCompanyId) {
            setSelectedCompanyId(savedCompanyId === "all" ? null : savedCompanyId);
          } else {
            setSelectedCompanyId(data[0]._id); 
          }
        }
      } catch (error) {
        console.error("Company fetch error:", error);
        // Don't show alert for now to avoid blocking UI
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const handleCompanyChange = async (companyId) => {
    setSelectedCompanyId(companyId === "all" ? null : companyId);
    await AsyncStorage.setItem("selectedCompanyId", companyId);
    setShowDropdown(false);
  };

  // Add "All" option to the beginning of the list
  const companyOptions = [
    { value: "all", label: "All Companies" },
    ...companies.map((c) => ({
      value: c._id,
      label: c.businessName,
    })),
  ];

  // Filter companies based on search query
  const filteredCompanies = companyOptions.filter(company =>
    company.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSelectedCompanyName = () => {
    if (!selectedCompanyId) {
      return "All Companies";
    }
    const company = companies.find(c => c._id === selectedCompanyId);
    return company ? company.businessName : "Select Company";
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
        <Ionicons name="business-outline" size={16} color="#64748b" />
        <Text style={styles.singleCompanyText}>No Companies</Text>
      </View>
    );
  }

  if (companies.length === 1) {
    return (
      <View style={styles.singleCompanyContainer}>
        <Ionicons name="business-outline" size={16} color="#64748b" />
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
        (selectedCompanyId === item.value || (!selectedCompanyId && item.value === "all")) && 
        styles.companyItemSelected
      ]}
      onPress={() => handleCompanyChange(item.value)}
    >
      <Text style={[
        styles.companyItemText,
        (selectedCompanyId === item.value || (!selectedCompanyId && item.value === "all")) && 
        styles.companyItemTextSelected
      ]}>
        {item.label}
      </Text>
      {(selectedCompanyId === item.value || (!selectedCompanyId && item.value === "all")) && (
        <Ionicons name="checkmark" size={16} color="#10b981" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.triggerButton}
        onPress={() => setShowDropdown(true)}
      >
        <Ionicons name="business-outline" size={16} color="#64748b" />
        <Text style={styles.triggerText} numberOfLines={1}>
          {getSelectedCompanyName()}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#64748b" />
      </TouchableOpacity>

      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search companies..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
            
            <FlatList
              data={filteredCompanies}
              renderItem={renderCompanyItem}
              keyExtractor={(item) => item.value}
              style={styles.dropdownList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No companies found</Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 200,
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
  singleCompanyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    backgroundColor: 'white',
  },
  singleCompanyText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  triggerText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    width: '100%',
    maxWidth: 280,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: 'white',
  },
  dropdownList: {
    maxHeight: 300,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  companyItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  companyItemText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  companyItemTextSelected: {
    color: '#0369a1',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
});

