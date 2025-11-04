import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Host } from 'react-native-portalize';
import Header from './Header';
import { AppSidebar } from './AppBottomNav';
import UserSidebar from './UserBottomNav';
import { getCurrentUser } from '../../lib/auth';

export default function AppLayout({ children }) {
  const route = useRoute();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const roleLower = (currentUser?.role ?? '').toLowerCase();
  const showAppSidebar = ['master', 'client', 'customer', 'admin'].includes(roleLower);
  const isDashboardScreen =
    route.name === 'AdminDashboard' ||
    route.name === 'UserDashboard' ||
    route.name === 'CustomerDashboard';

  // Guard for raw string/number children (the usual cause of that RN error)
  const renderChildren = (child) => {
    if (child === null || child === undefined) return null;

    // primitive string/number
    if (typeof child === 'string' || typeof child === 'number') {
      return <Text>{child}</Text>;
    }

    // array: wrap any primitive entries
    if (Array.isArray(child)) {
      return child.map((c, i) =>
        typeof c === 'string' || typeof c === 'number' ? (
          <Text key={i}>{c}</Text>
        ) : (
          React.isValidElement(c) ? React.cloneElement(c, { key: i }) : c
        ),
      );
    }

    // otherwise assume it's a valid React node
    return child;
  };

  return (
    <Host>
      <View style={styles.container}>
        {isDashboardScreen && <Header />}
        <View style={styles.content}>{renderChildren(children)}</View>
        {showAppSidebar ? <AppSidebar key={roleLower} /> : <UserSidebar key="user" />}
      </View>
    </Host>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});