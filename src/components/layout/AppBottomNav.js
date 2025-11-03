import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator, // 🟦 added
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getCurrentUser } from '../../lib/auth';
import { usePermissions } from '../../contexts/permission-context';
import { useUserPermissions } from '../../contexts/user-permissions-context';

// 🟦 Enable layout animation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function AppBottomNav() {
  const navigation = useNavigation();
  const route = useRoute();
  const [currentUser, setCurrentUser] = useState(null);
  const [isReportsExpanded, setIsReportsExpanded] = useState(false);

  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const { permissions: userCaps, isLoading: userCapsLoading } = useUserPermissions(); // 🟦 assume same pattern

  const loading = permissionsLoading || userCapsLoading; // 🟦 combined loading state

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  const roleLower = (currentUser?.role ?? "").toLowerCase();
  const canSeeUsers = roleLower === "admin" || (!!permissions && permissions.canCreateUsers);
  const canSeeInventory = roleLower === "admin" || (!!userCaps && userCaps.canCreateInventory) || roleLower === "customer";
  const isAdmin = currentUser?.role === "master";

  const isActive = (routeName) => route.name === routeName || route.name?.startsWith(routeName);

  const handleNavigation = (screen) => {
    navigation.navigate(screen);
    setIsReportsExpanded(false);
  };

  const toggleReports = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsReportsExpanded(prev => !prev);
  };

  const customerNavItems = [
    { id: 'dashboard', screen: 'Dashboard', icon: 'grid-outline', label: 'Dashboard', shortLabel: 'Home', show: true },
    { id: 'transactions', screen: 'Transactions', icon: 'swap-horizontal-outline', label: 'Transactions', shortLabel: 'Trans', show: true },
    { id: 'inventory', screen: 'Inventory', icon: 'cube-outline', label: 'Inventory', shortLabel: 'Stock', show: canSeeInventory },
    { id: 'companies', screen: 'Companies', icon: 'business-outline', label: 'Companies', shortLabel: 'Comp', show: permissions && (permissions.canCreateCompanies || permissions.canUpdateCompanies) },
    { id: 'users', screen: 'Users', icon: 'people-outline', label: 'Users', shortLabel: 'Users', show: canSeeUsers },
    { id: 'reports', screen: null, icon: 'bar-chart-outline', label: 'Reports', shortLabel: 'Reports', show: true },
    { id: 'settings', screen: 'Settings', icon: 'settings-outline', label: 'Settings', shortLabel: 'Settings', show: true },
  ];

  const adminNavItems = [
    { id: 'dashboard', screen: 'AdminDashboard', icon: 'grid-outline', label: 'Dashboard', shortLabel: 'Home', show: true },
    { id: 'clients', screen: 'ClientManagement', icon: 'people-outline', label: 'Clients', shortLabel: 'Clients', show: true },
    { id: 'companies', screen: 'AdminCompanies', icon: 'business-outline', label: 'Companies', shortLabel: 'Comp', show: true },
    { id: 'analytics', screen: 'Analytics', icon: 'bar-chart-outline', label: 'Analytics', shortLabel: 'Analytics', show: true },
    { id: 'settings', screen: 'AdminSettings', icon: 'settings-outline', label: 'Settings', shortLabel: 'Settings', show: true },
  ];

  const NavItem = ({ item, isActive, onPress }) => {
    const handleLongPress = () => Alert.alert(item.label);
    return (
      <TouchableOpacity
        style={[styles.navItem, isActive && styles.navItemActive]}
        onPress={onPress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        <Ionicons
          name={item.icon}
          size={20}
          color={isActive ? '#2563eb' : '#64748b'}
        />
        <Text
          style={[styles.navLabel, isActive && styles.navLabelActive]}
          numberOfLines={1}
        >
          {item.shortLabel}
        </Text>
      </TouchableOpacity>
    );
  };

  const getVisibleItems = () => {
    const items = isAdmin ? adminNavItems : customerNavItems;
    return items.filter(item => item.show);
  };

  const visibleItems = getVisibleItems();

  if (route.name === 'Login' || !currentUser) return null;

  const isAdminRoute = route.name?.startsWith('Admin');
  if ((isAdmin && !isAdminRoute) || (!isAdmin && isAdminRoute)) return null;

  return (
    <View style={styles.container}>
      {/* 🟦 Permissions loading indicator */}
      {loading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.loadingText}>Loading permissions...</Text>
        </View>
      )}

      <View style={styles.navContainer}>
        {visibleItems.map((item) => {
          const active = isActive(item.screen);

          if (item.id === 'reports') {
            return (
              <NavItem
                key={item.id}
                item={item}
                isActive={isReportsExpanded}
                onPress={toggleReports}
              />
            );
          }

          return (
            <NavItem
              key={item.id}
              item={item}
              isActive={active}
              onPress={() => handleNavigation(item.screen)}
            />
          );
        })}
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
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
  navLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  subMenuContainer: {
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 6,
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  subMenuLabel: {
    fontSize: 13,
    color: '#1e293b',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default AppBottomNav;
