// src/screens/admin/AdminDashboardScreen.jsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';

// Import your screens
import ClientManagementScreen from './ClientManagementScreen';
import ClientDetailScreen from './ClientDetailScreen';
import CompaniesScreen from './CompaniesScreen'; // ✅ Add this import
import AnalyticsScreen from './AnalyticsScreen';
import SettingsScreen from './SettingsScreen';

export default function AdminDashboardScreen({ navigation }) {
  const [currentTab, setCurrentTab] = useState('Dashboard');

  const handleLogout = () => navigation.replace('GettingStarted');

  // ✅ Helper function to render tab-wise content
  const renderContent = () => {
    switch (currentTab) {
      case 'Dashboard':
        return (
          <ScrollView contentContainerStyle={styles.mainContent}>
            <Text style={styles.title}>Master Admin Dashboard</Text>
            <Text style={styles.subtitle}>Welcome, Master Admin!</Text>

            <View style={styles.cardsContainer}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Total Clients</Text>
                <Text style={styles.cardValue}>128</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Active Users</Text>
                <Text style={styles.cardValue}>76</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Revenue</Text>
                <Text style={styles.cardValue}>$12,480</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Pending Tasks</Text>
                <Text style={styles.cardValue}>8</Text>
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
      {/* Header */}
      <Header username="Master Admin" role="master" />

      {/* Tab-wise Content */}
      <View style={{ flex: 1 }}>{renderContent()}</View>

      {/* Bottom Navigation */}
      <BottomNav role="master" onTabChange={tab => setCurrentTab(tab)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  mainContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 25,
  },
  cardsContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 10,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
