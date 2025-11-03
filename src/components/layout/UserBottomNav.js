import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Import your actual context and functions
import { getCurrentUser, logout } from '../../lib/auth';
import { useUserPermissions } from '../../contexts/user-permissions-context';

export default function UserBottomNav() {
  const navigation = useNavigation();
  const route = useRoute();
  const [currentUser, setCurrentUser] = useState(null);
  const [isReportsExpanded, setIsReportsExpanded] = useState(false);

  const { permissions: userCaps, isLoading } = useUserPermissions();

  const roleLower = (currentUser?.role ?? '').toLowerCase();
  const dashboardScreen =
    roleLower === 'admin' ? 'AdminDashboard' : 'UserDashboard';

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        onPress: () => {
          logout();
          navigation.navigate('Login');
        },
      },
    ]);
  };

  const isActive = screenName => {
    return route.name === screenName || route.name?.startsWith(screenName);
  };

  const handleNavigation = screen => {
    navigation.navigate(screen);
    setIsReportsExpanded(false);
  };

  const NavItem = ({
    icon,
    label,
    shortLabel,
    isActive,
    onPress,
    showBadge,
  }) => {
    return (
      <TouchableOpacity
        style={[styles.navItem, isActive && styles.navItemActive]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={22}
            color={isActive ? '#2563eb' : '#64748b'}
          />
          {showBadge && <View style={styles.badge} />}
        </View>
        <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
          {shortLabel || label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Don't show bottom nav on login page or if no user
  if (route.name === 'Login' || !currentUser) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.loadingText}>Loading permissions...</Text>
        </View>
      )}

      <View style={styles.navContainer}>
        {/* Dashboard */}
        <NavItem
          icon="grid-outline"
          label="Dashboard"
          shortLabel="Home"
          isActive={isActive(dashboardScreen)}
          onPress={() => handleNavigation(dashboardScreen)}
        />

        {/* Transactions */}
        <NavItem
          icon="swap-horizontal-outline"
          label="Transactions"
          shortLabel="Trans"
          isActive={isActive('Transactions')}
          onPress={() => handleNavigation('Transactions')}
        />

        {/* Inventory - Conditionally shown based on permissions */}
        {userCaps?.canCreateInventory && (
          <NavItem
            icon="cube-outline"
            label="Inventory"
            shortLabel="Stock"
            isActive={isActive('Inventory')}
            onPress={() => handleNavigation('Inventory')}
          />
        )}

        {/* Reports - Commented out as per original */}
        {/* 
        <NavItem
          icon="document-text-outline"
          label="Reports"
          shortLabel="Reports"
          isActive={isReportsExpanded}
          onPress={() => setIsReportsExpanded(!isReportsExpanded)}
        />
        */}

        {/* Profile/More Menu */}
        <NavItem
          icon="person-outline"
          label="Profile"
          shortLabel="Me"
          isActive={isActive('Profile') || isActive('Settings')}
          onPress={() => {
            Alert.alert('Profile Menu', 'Choose an option', [
              {
                text: 'View Profile',
                onPress: () => navigation.navigate('Profile'),
              },
              {
                text: 'Settings',
                onPress: () => navigation.navigate('Settings'),
              },
              {
                text: 'Logout',
                style: 'destructive',
                onPress: handleLogout,
              },
              {
                text: 'Cancel',
                style: 'cancel',
              },
            ]);
          }}
        />
      </View>

      {/* Expanded Reports Menu - Commented out as per original */}
      {/*
      {isReportsExpanded && (
        <View style={styles.subMenuContainer}>
          <TouchableOpacity
            style={styles.subMenuItem}
            onPress={() => handleNavigation('ProfitLossReport')}
          >
            <Ionicons name="document-text-outline" size={18} color="#2563eb" />
            <Text style={styles.subMenuLabel}>Profit & Loss</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.subMenuItem}
            onPress={() => handleNavigation('BalanceSheetReport')}
          >
            <Ionicons name="document-text-outline" size={18} color="#2563eb" />
            <Text style={styles.subMenuLabel}>Balance Sheet</Text>
          </TouchableOpacity>
        </View>
      )}
      */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 6,
  },
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 60,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    flex: 1,
    minHeight: 52,
    marginHorizontal: 2,
    maxWidth: 80,
  },
  navItemActive: {
    backgroundColor: '#eff6ff',
    transform: [{ scale: 1.02 }],
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  navLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 12,
  },
  navLabelActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  subMenuContainer: {
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  subMenuLabel: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    fontWeight: '500',
  },
});
