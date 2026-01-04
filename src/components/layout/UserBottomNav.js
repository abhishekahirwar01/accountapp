import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getCurrentUser, logout } from '../../lib/auth';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

export default function UserSidebar() {
  const navigation = useNavigation();
  const route = useRoute();
  const [currentUser, setCurrentUser] = useState(null);
  const {
    permissions: userCaps,
    isLoading,
    role: userRole,
  } = useUserPermissions();

  const currentRole = currentUser?.role || userRole || 'user';
  const roleLower = currentRole.toLowerCase();

  // Dashboard screen based on role - Next.js के जैसा
  const getDashboardScreen = () => {
    if (roleLower === 'customer') return 'CustomerDashboard';
    if (roleLower === 'master') return 'AdminDashboard';
    return 'UserDashboard';
  };

  const dashboardScreen = getDashboardScreen();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'GettingStarted' }],
    });
  };

  const isActive = screenName => route.name === screenName;

  // Enhanced Menu Button - Next.js structure के according
  const MenuButton = ({
    icon,
    title,
    isActive,
    onPress,
    isBottomNav = false,
    showAlways = false,
    hasPermission = true,
  }) => {
    if (!hasPermission && !showAlways) return null;

    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          isBottomNav ? styles.bottomNavButton : styles.menuButton,
          isActive &&
            (isBottomNav
              ? styles.bottomNavButtonActive
              : styles.menuButtonActive),
        ]}
        disabled={isLoading}
      >
        <View
          style={
            isBottomNav
              ? styles.bottomNavButtonContent
              : styles.menuButtonContent
          }
        >
          <Ionicons
            name={icon}
            size={isBottomNav ? 26 : 20}
            color={isActive ? '#007bff' : '#6c757d'}
          />
          {!isBottomNav && (
            <Text
              style={[
                styles.menuButtonText,
                isActive && styles.menuButtonTextActive,
              ]}
            >
              {title}
            </Text>
          )}
        </View>
        {isBottomNav && (
          <Text
            style={[
              styles.bottomNavText,
              isActive && styles.bottomNavTextActive,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const LoadingState = ({ isBottomNav = false }) => (
    <View
      style={isBottomNav ? styles.bottomNavLoading : styles.loadingContainer}
    >
      <ActivityIndicator size="small" color="#007bff" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );

  // --------- Mobile Bottom Nav ---------
  if (isMobile) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.bottomNavWrapper}>
        <View style={styles.bottomNav}>
          {/* Dashboard - Always visible (Next.js के जैसा) */}
          <MenuButton
            icon="grid-outline"
            title="Dashboard"
            isActive={
              isActive('AdminDashboard') ||
              isActive('CustomerDashboard') ||
              isActive('UserDashboard')
            }
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'UserDashboard' })
            }
            isBottomNav={true}
            showAlways={true}
          />

          {/* Transactions - Always visible (Next.js के जैसा) */}
          <MenuButton
            icon="swap-horizontal-outline"
            title="Transactions"
            isActive={isActive('Transactions')}
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Transactions' })
            }
            isBottomNav={true}
            showAlways={true}
          />

          {/* Inventory - Only show if permission exists (Next.js के जैसा) */}
          {userCaps?.canCreateInventory && (
            <MenuButton
              icon="cube-outline"
              title="Inventory"
              isActive={isActive('Inventory')}
              onPress={() =>
                navigation.navigate('MainTabs', { screen: 'Inventory' })
              }
              isBottomNav={true}
              hasPermission={userCaps?.canCreateInventory}
            />
          )}

          {/* Settings - Direct settings button */}
          <MenuButton
            icon="settings-outline"
            title="Settings"
            isActive={isActive('Settings')}
            onPress={() => navigation.navigate('ProfileScreen')}
            isBottomNav={true}
            showAlways={true}
          />


        </View>
      </SafeAreaView>
    );
  }

  // --------- Desktop Sidebar ---------
  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.logoText}>AccounTech Pro</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLower.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.sidebarMenu}
        showsVerticalScrollIndicator={false}
      >
        {/* Dashboard - Always visible (Next.js के जैसा) */}
        <MenuButton
          icon="grid-outline"
          title="Dashboard"
          isActive={
            isActive('AdminDashboard') ||
            isActive('CustomerDashboard') ||
            isActive('UserDashboard')
          }
          onPress={() =>
            navigation.navigate('MainTabs', { screen: 'CustomerDashboard' })
          }
          showAlways={true}
        />

        {/* Transactions - Always visible (Next.js के जैसा) */}
        <MenuButton
          icon="swap-horizontal-outline"
          title="Transactions"
          isActive={isActive('Transactions')}
          onPress={() =>
            navigation.navigate('MainTabs', { screen: 'Transactions' })
          }
          showAlways={true}
        />

        {/* Inventory - Only show if permission exists (Next.js के जैसा) */}
        {userCaps?.canCreateInventory && (
          <MenuButton
            icon="cube-outline"
            title="Inventory"
            isActive={isActive('Inventory')}
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Inventory' })
            }
            hasPermission={userCaps?.canCreateInventory}
          />
        )}

        {/* Settings - Added to sidebar for desktop */}
        <MenuButton
          icon="settings-outline"
          title="Settings"
          isActive={isActive('Settings')}
          onPress={() =>
            navigation.navigate('MainTabs', { screen: 'ProfileScreen' })
          }
          showAlways={true}
        />


      </ScrollView>

      {currentUser && (
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {currentUser?.initials ||
                  currentUser?.name?.charAt(0)?.toUpperCase() ||
                  'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{currentUser?.name}</Text>
              <Text style={styles.userEmail}>{currentUser?.email}</Text>
              <Text style={styles.userRole}>Role: {roleLower}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoading}
          >
            <Ionicons name="log-out-outline" size={18} color="#6c757d" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
    maxWidth: 280,
  },
  sidebarHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
    minHeight: 80,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoText: { fontSize: 18, fontWeight: 'bold', color: '#3b82f6' },
  roleBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#007bff' },
  sidebarMenu: { flex: 1, padding: 16 },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuButtonActive: { backgroundColor: '#e3f2fd' },
  menuButtonContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuButtonText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  menuButtonTextActive: { color: '#007bff', fontWeight: '600' },

  bottomNavWrapper: { backgroundColor: '#fff' },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 56,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  bottomNavButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 56,
  },
  bottomNavButtonActive: { backgroundColor: '#e3f2fd' },
  bottomNavButtonContent: { alignItems: 'center', justifyContent: 'center' },
  bottomNavText: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 2,
    textAlign: 'center',
  },
  bottomNavTextActive: { color: '#007bff', fontWeight: '500' },
  bottomNavLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    flex: 1,
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  loadingText: { fontSize: 12, color: '#6c757d' },

  userSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  userDetails: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', color: '#333' },
  userEmail: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  userRole: { fontSize: 11, color: '#8b9dc3', marginTop: 2, fontWeight: '500' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  logoutText: { marginLeft: 8, fontSize: 14, color: '#6c757d' },
});
