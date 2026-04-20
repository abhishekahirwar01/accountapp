import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BASE_URL } from '../../config';
import UpdateNotification from '../../components/notifications/UpdateNotification';
import UpdateNotificationBadge from '../../components/notifications/UpdateNotificationBadge';

const toArray = value => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.entries)) return value.entries;
  return [];
};

export default function AdminDashboardScreen({ navigation }) {
  const [clients, setClients] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchClients(), fetchCompanies()]);
    } catch (error) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to load dashboard data. Please try again.',
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchClients = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      navigation.navigate('Login');
      return;
    }

    const res = await fetch(`${BASE_URL}/api/clients`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        await AsyncStorage.removeItem('token');
        Alert.alert('Session Expired', 'Please login again');
        navigation.navigate('Login');
        return;
      }

      let message = 'Failed to fetch clients.';
      try {
        const err = await res.json();
        message = err?.message || message;
      } catch {
        // Keep fallback message if error body is not JSON.
      }
      throw new Error(message);
    }

    const data = await res.json();
    setClients(toArray(data));
  };

  const fetchCompanies = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      navigation.navigate('Login');
      return;
    }

    const res = await fetch(`${BASE_URL}/api/companies/all`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        await AsyncStorage.removeItem('token');
        Alert.alert('Session Expired', 'Please login again');
        navigation.navigate('Login');
        return;
      }

      let message = 'Failed to fetch companies.';
      try {
        const err = await res.json();
        message = err?.message || message;
      } catch {
        // Keep fallback message if error body is not JSON.
      }
      throw new Error(message);
    }

    const data = await res.json();
    setCompanies(toArray(data));
  };

  useEffect(() => {
    fetchData();

    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(cardsAnim, {
        toValue: 1,
        duration: 550,
        delay: 130,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardsAnim, headerAnim]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const totalClients = clients.length;
  const activeClients = useMemo(
    () =>
      clients.filter(
        client => String(client?.status || '').toLowerCase() === 'active',
      ).length,
    [clients],
  );
  const totalCompanies = companies.length;
  const inactiveClients = Math.max(totalClients - activeClients, 0);
  const activeRate = totalClients
    ? `${Math.round((activeClients / totalClients) * 100)}%`
    : '0%';
  const avgCompaniesPerClient = totalClients
    ? (totalCompanies / totalClients).toFixed(1)
    : '0.0';

  const kpiData = useMemo(
    () => [
      {
        title: 'Total Clients',
        value: totalClients.toLocaleString(),
        sub: `${activeClients} active currently`,
        change: `+${Math.floor(Math.random() * 5)}`,
        tone: 'positive',
        icon: 'account-group-outline',
        accent: '#2563EB',
        accentSoft: '#DBEAFE',
      },
      {
        title: 'Companies',
        value: totalCompanies.toLocaleString(),
        sub: `${avgCompaniesPerClient} avg per client`,
        change: 'Portfolio',
        tone: 'neutral',
        icon: 'office-building-outline',
        accent: '#0284C7',
        accentSoft: '#E0F2FE',
      },
      {
        title: 'Transactions',
        value: '1,452',
        sub: 'Total processed',
        change: '+120',
        tone: 'positive',
        icon: 'database-outline',
        accent: '#8B5CF6',
        accentSoft: '#F5F3FF',
      },
      {
        title: 'Pending Invoices',
        value: '23',
        sub: 'Across all clients',
        change: 'Action',
        tone: 'warning',
        icon: 'file-document-outline',
        accent: '#F59E0B',
        accentSoft: '#FFFBEB',
      },
    ],
    [activeClients, avgCompaniesPerClient, totalClients, totalCompanies],
  );

  const quickActions = [
    {
      title: 'Clients',
      subtitle: 'Manage client accounts',
      route: 'AdminClientManagement',
      icon: 'account-multiple-outline',
      iconColor: '#2563EB',
      iconBg: '#E6F0FF',
    },
    {
      title: 'Companies',
      subtitle: 'Review all companies',
      route: 'AdminCompanies',
      icon: 'domain',
      iconColor: '#0284C7',
      iconBg: '#E9F8FF',
    },
    {
      title: 'Analytics',
      subtitle: 'Open advanced reports',
      route: 'AdminAnalytics',
      icon: 'chart-line',
      iconColor: '#0D9488',
      iconBg: '#E7FFFC',
    },
  ];

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <View style={styles.loaderCard}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loaderTitle}>Loading Admin Dashboard</Text>
          <Text style={styles.loaderText}>
            Fetching latest platform data...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.rootContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
            colors={['#2563EB']}
          />
        }
      >
        <Animated.View
          style={[
            styles.heroCard,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.heroGlow} />

          <View style={styles.heroHeader}>
            <View style={styles.heroBadge}>
              <Icon name="shield-crown-outline" size={14} color="#2563EB" />
              <Text style={styles.heroBadgeText}>Admin Control Center</Text>
            </View>

            <UpdateNotificationBadge
              onPress={() => navigation.navigate('AdminAnalytics')}
            />
          </View>

          <Text style={styles.heroTitle}>Master Admin Dashboard</Text>
          <Text style={styles.heroSubtitle}>
            Unified view of client health, company coverage, and operational
            momentum.
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatLabel}>Clients</Text>
              <Text style={styles.heroStatValue}>
                {totalClients.toLocaleString()}
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatLabel}>Companies</Text>
              <Text style={styles.heroStatValue}>
                {totalCompanies.toLocaleString()}
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatChip}>
              <Text style={styles.heroStatLabel}>Active Rate</Text>
              <Text style={styles.heroStatValue}>{activeRate}</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.title}
                activeOpacity={0.8}
                onPress={() => navigation.navigate(action.route)}
                style={styles.quickActionCard}
              >
                <View
                  style={[
                    styles.quickActionIconWrap,
                    { backgroundColor: action.iconBg },
                  ]}
                >
                  <Icon name={action.icon} size={18} color={action.iconColor} />
                </View>

                <View style={styles.quickActionTextWrap}>
                  <Text style={styles.quickActionTitle}>{action.title}</Text>
                  <Text style={styles.quickActionSubtitle}>
                    {action.subtitle}
                  </Text>
                </View>

                <Icon name="chevron-right" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.kpiGrid}>
            {kpiData.map((kpi, index) => {
              const isPositive = kpi.tone === 'positive';
              const isWarning = kpi.tone === 'warning';

              return (
                <Animated.View
                  key={kpi.title}
                  style={[
                    styles.kpiCard,
                    {
                      opacity: cardsAnim,
                      transform: [
                        {
                          translateY: cardsAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [18 + index * 3, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.kpiTopRow}>
                    <View
                      style={[
                        styles.kpiIconWrap,
                        { backgroundColor: kpi.accentSoft },
                      ]}
                    >
                      <Icon name={kpi.icon} size={17} color={kpi.accent} />
                    </View>

                    <View
                      style={[
                        styles.kpiTrend,
                        isPositive && styles.kpiTrendPositive,
                        isWarning && styles.kpiTrendWarning,
                      ]}
                    >
                      <Icon
                        name={
                          isPositive
                            ? 'arrow-top-right'
                            : isWarning
                            ? 'alert-circle-outline'
                            : 'circle-medium'
                        }
                        size={11}
                        color={
                          isPositive
                            ? '#15803D'
                            : isWarning
                            ? '#B45309'
                            : '#475569'
                        }
                      />
                      <Text
                        style={[
                          styles.kpiTrendText,
                          isPositive && styles.kpiTrendTextPositive,
                          isWarning && styles.kpiTrendTextWarning,
                        ]}
                      >
                        {kpi.change}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.kpiValueContainer}>
                    <Text style={styles.kpiValue}>{kpi.value}</Text>
                    <Text style={styles.kpiTitle}>{kpi.title}</Text>
                  </View>
                  <Text style={styles.kpiSub}>{kpi.sub}</Text>

                  <View
                    style={[
                      styles.kpiAccentLine,
                      { backgroundColor: kpi.accent },
                    ]}
                  />
                </Animated.View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Update Notifications</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AdminAnalytics')}
              activeOpacity={0.8}
            >
              <Text style={styles.sectionActionText}>Open Analytics</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.notificationWrap}>
            <UpdateNotification />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F7FF',
    marginBottom: 100,
  },
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  rootContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 34,
    gap: 12,
  },
  bgOrbTop: {
    position: 'absolute',
    top: -70,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: -100,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(8, 145, 178, 0.08)',
  },

  loader: {
    flex: 1,
    backgroundColor: '#F4F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loaderCard: {
    width: '100%',
    maxWidth: 330,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E7EDF8',
    boxShadow: '0px 4px 14px rgba(15, 23, 42, 0.08)',
  },
  loaderTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  loaderText: {
    marginTop: 5,
    fontSize: 12,
    color: '#64748B',
  },

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5ECFA',
    padding: 14,
    overflow: 'hidden',
    // ...cardShadow,
    boxShadow: '0px 4px 14px rgba(15, 23, 42, 0.08)',
  },
  heroGlow: {
    position: 'absolute',
    top: -90,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#D5E3FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '72%',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  heroTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
    maxWidth: '88%',
  },
  heroStatsRow: {
    marginTop: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E8EEF9',
    backgroundColor: '#F8FAFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  heroStatChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  heroStatValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
  },

  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },

  quickActionsRow: {
    gap: 8,
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7EDF8',
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    boxShadow: '0px 2px 6px rgba(15, 23, 42, 0.06)',
  },
  quickActionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTextWrap: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  quickActionSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: '#64748B',
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7EDF8',
    paddingTop: 10,
    paddingHorizontal: 11,
    paddingBottom: 12,
    overflow: 'hidden',
    boxShadow: '0px 2px 6px rgba(15, 23, 42, 0.06)',
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  kpiIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#EEF2FF',
    gap: 3,
    maxWidth: '65%',
  },
  kpiTrendPositive: {
    backgroundColor: '#ECFDF3',
  },
  kpiTrendWarning: {
    backgroundColor: '#FFF7ED',
  },
  kpiTrendText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  kpiTrendTextPositive: {
    color: '#15803D',
  },
  kpiTrendTextWarning: {
    color: '#B45309',
  },
  kpiValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  kpiTitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  kpiSub: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
  },
  kpiAccentLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
  },

  notificationWrap: {
    borderRadius: 14,
    overflow: 'hidden',
  },
});
