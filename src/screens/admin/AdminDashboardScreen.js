import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';

// Import your screens
import ClientManagementScreen from './ClientManagementScreen';
import ClientDetailScreen from './ClientDetailScreen';
import CompaniesScreen from './CompaniesScreen';
import AnalyticsScreen from './AnalyticsScreen';
import SettingsScreen from './SettingsScreen';

// Icons
import { Users, Building, Database, FileText, TrendingDown, TrendingUp } from 'lucide-react-native';

export default function AdminDashboardScreen({ navigation }) {
  const [currentTab, setCurrentTab] = useState('Dashboard');

  // Hardcoded data for Dashboard
  const totalClients = 128;
  const activeUsers = 76;
  const revenue = '$12,480';
  const pendingTasks = 8;

  const renderContent = () => {
    switch (currentTab) {
      case 'Dashboard':
        return (
          <ScrollView contentContainerStyle={styles.mainContent}>
            <Text style={styles.title}>Master Admin Dashboard</Text>
            <Text style={styles.subtitle}>Welcome, Master Admin!</Text>

            {/* KPI Cards */}
            <View style={styles.kpiContainer}>
              {/* Total Clients */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiCardContent}>
                  <Text style={styles.kpiTitle}>Total Clients</Text>
                  <Text style={styles.kpiValue}>{totalClients}</Text>
                  <View style={styles.kpiChangeContainer}>
                    <TrendingUp size={16} color="green" />
                    <Text style={styles.kpiChangeText}> +5 this month</Text>
                  </View>
                </View>
                <View style={[styles.kpiIconContainer, { backgroundColor: '#e0f2fe' }]}>
                  <Users size={24} color="#3b82f6" />
                </View>
              </View>

              {/* Active Users */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiCardContent}>
                  <Text style={styles.kpiTitle}>Active Users</Text>
                  <Text style={styles.kpiValue}>{activeUsers}</Text>
                  <View style={styles.kpiChangeContainer}>
                    <TrendingUp size={16} color="green" />
                    <Text style={styles.kpiChangeText}> +10 this month</Text>
                  </View>
                </View>
                <View style={[styles.kpiIconContainer, { backgroundColor: '#dcfce7' }]}>
                  <Building size={24} color="#22c55e" />
                </View>
              </View>

              {/* Revenue */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiCardContent}>
                  <Text style={styles.kpiTitle}>Revenue</Text>
                  <Text style={styles.kpiValue}>{revenue}</Text>
                  <View style={styles.kpiChangeContainer}>
                    <TrendingUp size={16} color="green" />
                    <Text style={styles.kpiChangeText}> +$1,200 this month</Text>
                  </View>
                </View>
                <View style={[styles.kpiIconContainer, { backgroundColor: '#ede9fe' }]}>
                  <Database size={24} color="#7c3aed" />
                </View>
              </View>

              {/* Pending Tasks */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiCardContent}>
                  <Text style={styles.kpiTitle}>Pending Tasks</Text>
                  <Text style={styles.kpiValue}>{pendingTasks}</Text>
                  <View style={styles.kpiChangeContainer}>
                    <TrendingDown size={16} color="red" />
                    <Text style={styles.kpiChangeText}> -2 this week</Text>
                  </View>
                </View>
                <View style={[styles.kpiIconContainer, { backgroundColor: '#fff7ed' }]}>
                  <FileText size={24} color="#f97316" />
                </View>
              </View>
            </View>
          </ScrollView>
        );

      case 'Clients':
        return <ClientManagementScreen navigation={navigation} />;
      case 'ClientDetail':
        return <ClientDetailScreen navigation={navigation} />;
      case 'Companies':
        return <CompaniesScreen navigation={navigation} />;
      case 'Analytics':
        return <AnalyticsScreen navigation={navigation} />;
      case 'Settings':
        return <SettingsScreen navigation={navigation} />;

      default:
        return (
          <View style={styles.center}>
            <Text>{currentTab} Screen Coming Soon...</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header only on Dashboard */}
      {currentTab === 'Dashboard' && <Header username="Master Admin" role="master" />}

      {/* Tab-wise Content */}
      <View style={{ flex: 1 }}>{renderContent()}</View>

      {/* Bottom Navigation */}
      <BottomNav role="master" onTabChange={tab => setCurrentTab(tab)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  mainContent: { flexGrow: 1, alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#475569', textAlign: 'center', marginBottom: 25 },

  kpiContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 30 },
  kpiCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
  },
  kpiCardContent: { flex: 1, alignItems: 'center' },
  kpiTitle: { fontSize: 14, color: '#94a3b8', marginBottom: 10 },
  kpiValue: { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  kpiChangeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  kpiChangeText: { fontSize: 12, color: '#475569', marginLeft: 4 },

  kpiIconContainer: { padding: 12, borderRadius: 50, marginTop: 16, alignItems: 'center', justifyContent: 'center' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
