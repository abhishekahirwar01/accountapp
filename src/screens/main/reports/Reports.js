import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, PieChart } from 'lucide-react-native';
import { useCompany } from '../../../contexts/company-context';
import ProfitAndLossTab from '../../main/reports/ProfitLossScreen';
import BalanceSheetTab from '../../main/reports/BalanceSheetScreen';
export default function Reports() {
  const [activeTab, setActiveTab] = useState('profit-loss');
  const [refreshing, setRefreshing] = useState(false);
  const { triggerCompaniesRefresh } = useCompany();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.resolve(triggerCompaniesRefresh()).finally(() => {
      setRefreshing(false);
    });
  }, [triggerCompaniesRefresh]);

  const tabs = [
    {
      id: 'profit-loss',
      title: 'Profit & Loss',
      icon: (
        <TrendingUp
          size={20}
          color={activeTab === 'profit-loss' ? '#007AFF' : '#666'}
        />
      ),
      component: <ProfitAndLossTab />,
    },
    {
      id: 'balance-sheet',
      title: 'Balance Sheet',
      icon: (
        <PieChart
          size={20}
          color={activeTab === 'balance-sheet' ? '#34C759' : '#666'}
        />
      ),
      component: <BalanceSheetTab />,
    },
  ];

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
      {/* Header */}
      {/* <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>Financial statements and analytics</Text>
      </View> */}

      {/* Tab Buttons */}
      <View style={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              activeTab === tab.id && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <View style={styles.tabContent}>
              {tab.icon}
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.activeTabText,
                ]}
              >
                {tab.title}
              </Text>
            </View>
            {activeTab === tab.id && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        {tabs.find(tab => tab.id === activeTab)?.component}
      </View>

      {/* Footer Info */}
      {/* <View style={styles.footer}>
          <Text style={styles.footerText}>
            Switch between reports using the tabs above
          </Text>
        </View> */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  // header: {
  //   backgroundColor: 'white',
  //   paddingHorizontal: 20,
  //   paddingTop: 2,
  //   paddingBottom: 2,
  //   borderBottomLeftRadius: 20,
  //   borderBottomRightRadius: 20,
  //   shadowColor: '#000',
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.1,
  //   shadowRadius: 8,
  //   elevation: 4,
  //   // marginBottom: 8,
  // },
  // title: {
  //   fontSize: 32,
  //   fontWeight: 'bold',
  //   color: '#1a1a1a',
  //   marginBottom: 8,
  // },
  // subtitle: {
  //   fontSize: 16,
  //   color: '#666',
  // },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 10,
    marginTop: 8,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  activeTabButton: {
    backgroundColor: '#f8f9fa',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#007AFF',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  contentContainer: {
    marginTop: 5,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  // footer: {
  //   padding: 20,
  //   borderTopWidth: 1,
  //   borderTopColor: '#e9ecef',
  //   marginTop: 20,
  //   backgroundColor: 'white',
  // },
  // footerText: {
  //   fontSize: 14,
  //   color: '#666',
  //   textAlign: 'center',
  //   lineHeight: 20,
  // },
});
