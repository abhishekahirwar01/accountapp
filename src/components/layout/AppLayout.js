// src/components/layout/AppLayout.jsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Header from './Header';
import { AppSidebar } from './AppBottomNav';
import UserSidebar from './UserBottomNav';
import { getCurrentUser } from '../../lib/auth';

export default function AppLayout({ children }) {
  const route = useRoute();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        console.log('🧩 AppLayout role:', user?.role);
      } catch (err) {
        console.log('⚠️ Error fetching current user:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  // ✅ Role logic after loading
  const roleLower = (currentUser?.role ?? '').toLowerCase();
  const showAppSidebar = ['master', 'client', 'customer', 'admin'].includes(roleLower);

  // ✅ Check if current screen is dashboard
  const isDashboardScreen =
    route.name === 'AdminDashboard' ||
    route.name === 'UserDashboard' ||
    route.name === 'CustomerDashboard';

  return (
    <View style={styles.container}>
      {isDashboardScreen && <Header />}
      <View style={styles.content}>{children}</View>
      {showAppSidebar ? <AppSidebar key={roleLower} /> : <UserSidebar key="user" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
