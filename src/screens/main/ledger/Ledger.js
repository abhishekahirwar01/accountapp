import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import PayablesScreen from './PayablesScreen';
import ReceivablesScreen from './ReceivablesScreen';
import { useCompany } from '../../../contexts/company-context';
import { ArrowDownCircle, ArrowUpCircle,CircleDollarSign , TrendingUp ,Landmark , Coins,FileDown } from 'lucide-react-native';

export default function Ledger() {
  const [activeTab, setActiveTab] = useState('payables');
  const { triggerCompaniesRefresh } = useCompany();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [tabWidth, setTabWidth] = useState(0);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: activeTab === 'payables' ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const handleTabLayout = (event) => {
    const { width } = event.nativeEvent.layout;
    setTabWidth(width / 2);
  };

  return (
    <View style={styles.container}>
      {/* Tab Container */}
      <View style={styles.tabWrapper}>
        <View 
          style={styles.tabContainer}
          onLayout={handleTabLayout}
        >
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('payables')}
            activeOpacity={1}
          >
            <View style={styles.tabContent}>
              <ArrowUpCircle
                size={18}
                color={activeTab === 'payables' ? '#DC2626' : '#6B7280'}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'payables' && styles.activeTabButtonText,
                ]}
              >
                Payables
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('receivables')}
            activeOpacity={1}
          >
            <View style={styles.tabContent}>
              <ArrowDownCircle
                size={18}
                color={activeTab === 'receivables' ? '#16A34A' : '#6B7280'}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'receivables' && styles.activeTabButtonText,
                ]}
              >
                Receivables
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
      <View style={styles.contentWrapper}>
        <View style={styles.contentArea}>
          <View
            style={{
              display: activeTab === 'payables' ? 'flex' : 'none',
              flex: 1,
            }}
          >
            <PayablesScreen />
          </View>
          <View
            style={{
              display: activeTab === 'receivables' ? 'flex' : 'none',
              flex: 1,
            }}
          >
            <ReceivablesScreen />
          </View>
        </View>
      </View>
    </View>
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
  contentWrapper: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  contentArea: {
    flex: 1,
    marginHorizontal: 10,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});