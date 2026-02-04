import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import React, { useState, useCallback } from 'react';
import PayablesScreen from './PayablesScreen';
import ReceivablesScreen from './ReceivablesScreen';
import { useCompany } from '../../../contexts/company-context';
export default function Ledger() {
  const [activeTab, setActiveTab] = useState('payables');
  const [refreshing, setRefreshing] = useState(false);
  const { triggerCompaniesRefresh } = useCompany();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
   
  triggerCompaniesRefresh();
  
  
  setTimeout(() => {
    setRefreshing(false);
  }, 1000);
  }, [triggerCompaniesRefresh]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#007AFF']}
        />
      }
    >
      
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'payables' && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab('payables')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'payables' && styles.activeTabButtonText,
              ]}
            >
              Payables
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'receivables' && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab('receivables')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'receivables' && styles.activeTabButtonText,
              ]}
            >
              Receivables
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contentArea}>
          {activeTab === 'payables' ? (
            <PayablesScreen />
          ) : (
            <ReceivablesScreen />
          )}
        </View>
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 8,
    padding: 4,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#007AFF',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 16,
  },
});
