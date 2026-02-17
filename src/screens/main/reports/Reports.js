import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, PieChart } from 'lucide-react-native';
import { useCompany } from '../../../contexts/company-context';
import ProfitAndLossTab from '../../main/reports/ProfitLossScreen';
import BalanceSheetTab from '../../main/reports/BalanceSheetScreen';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('profit-loss');
  const [refreshing, setRefreshing] = useState(false);
  const { triggerCompaniesRefresh } = useCompany();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [tabWidth, setTabWidth] = useState(0);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: activeTab === 'profit-loss' ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const handleTabLayout = (event) => {
    const { width } = event.nativeEvent.layout;
    setTabWidth(width / 2);
  };

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
          size={18}
          color={activeTab === 'profit-loss' ? '#007AFF' : '#6B7280'}
        />
      ),
      component: <ProfitAndLossTab />,
    },
    {
      id: 'balance-sheet',
      title: 'Balance Sheet',
      icon: (
        <PieChart
          size={18}
          color={activeTab === 'balance-sheet' ? '#34C759' : '#6B7280'}
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
          colors={['#2563EB']}
        />
      }
    >
      {/* Tab Container */}
      <View style={styles.tabWrapper}>
        <View 
          style={styles.tabContainer}
          onLayout={handleTabLayout}
        >
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('profit-loss')}
            activeOpacity={1}
          >
            <View style={styles.tabContent}>
              {tabs[0].icon}
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'profit-loss' && styles.activeTabButtonText,
                ]}
              >
                {tabs[0].title}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('balance-sheet')}
            activeOpacity={1}
          >
            <View style={styles.tabContent}>
              {tabs[1].icon}
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'balance-sheet' && styles.activeTabButtonText,
                ]}
              >
                {tabs[1].title}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Animated Bottom Line Indicator */}
          {tabWidth > 0 && (
            <Animated.View
              style={[
                styles.bottomLine,
                {
                  width: tabWidth,
                  transform: [
                    {
                      translateX: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, tabWidth],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        {tabs.find(tab => tab.id === activeTab)?.component}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  tabWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabContainer: {
    flexDirection: 'row',
    position: 'relative',
    marginHorizontal: 10,
  },
  tabButton: {
    flex: 1,
    zIndex: 1,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: -0.2,
  },
  activeTabButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
  bottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2.5,
    backgroundColor: '#2563EB',
    borderRadius: 2,
    zIndex: 2,
  },
  contentContainer: {
    marginTop: 5,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
});