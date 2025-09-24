import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';

export default function UserDashboardScreen({ navigation, route }) {
  const { username = 'User', role = 'user' } = route?.params || {};
  const [activeTab, setActiveTab] = useState('Dashboard');

  const handleLogout = () => navigation.replace('GettingStarted');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Optional: navigate to a different screen based on tab
    // navigation.navigate(tab);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <Header username={username} role={role} />

      {/* Main Content */}
      <View style={styles.container}>
        <Text style={styles.title}>🙋 {activeTab}</Text>
        <Text style={styles.subtitle}>Welcome, {username} ({role})</Text>

        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Text style={styles.btnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <BottomNav role={role} onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center', // vertical center
    alignItems: 'center',     // horizontal center
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
