import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getCurrentUser, logout } from '../../lib/auth';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserPermissionSocket } from '../../components/hooks/useSocket';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

// ----- Animated Menu Button for Mobile -----
const AnimatedMenuButton = ({ icon, title, isActive, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const indicatorAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: isActive ? 1 : 0,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [isActive]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(onPress);
  };

  const indicatorWidth = indicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '70%'],
  });

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handlePress}
      style={styles.bottomNavButton}
    >
      <Animated.View
        style={[
          styles.topIndicator,
          {
            width: indicatorWidth,
            opacity: indicatorAnim,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bottomNavButtonContent,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={isActive ? '#3b82f6' : '#94a3b8'}
        />
        <Text
          style={[styles.bottomNavText, isActive && styles.bottomNavTextActive]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function UserSidebar() {
  const navigation = useNavigation();
  const route = useRoute();
  const [currentUser, setCurrentUser] = useState(null);
  const {
    permissions: userCaps,
    isLoading,
    role: userRole,
    refetch: refetchUserPermissions,
  } = useUserPermissions();

  // Socket listener for real-time user permission updates
  useUserPermissionSocket(() => {
    console.log(
      '🔔 UserBottomNav: User permission update received, refetching...',
    );
    refetchUserPermissions();
  });
  
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

  // Enhanced Menu Button for Desktop - keeping original functionality
  const MenuButton = ({
    icon,
    title,
    isActive,
    onPress,
    showAlways = false,
    hasPermission = true,
  }) => {
    if (!hasPermission && !showAlways) return null;

    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.menuButton, isActive && styles.menuButtonActive]}
        disabled={isLoading}
      >
        <View style={styles.menuButtonContent}>
          <Ionicons
            name={icon}
            size={20}
            color={isActive ? '#007bff' : '#6c757d'}
          />
          <Text
            style={[
              styles.menuButtonText,
              isActive && styles.menuButtonTextActive,
            ]}
          >
            {title}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const LoadingState = () => (
    <SafeAreaView edges={['bottom']} style={styles.bottomNavLoading}>
      <ActivityIndicator size="small" color="#3b82f6" />
    </SafeAreaView>
  );

  // --------- Mobile Bottom Nav ---------
  if (isMobile) {
    if (isLoading || !currentUser) {
      return <LoadingState />;
    }

    return (
      <SafeAreaView edges={['bottom']} style={styles.bottomNavWrapper}>
        <View style={styles.bottomNav}>
          {/* Dashboard - Always visible */}
          <AnimatedMenuButton
            icon="grid"
            title="Dashboard"
            isActive={
              isActive('AdminDashboard') ||
              isActive('CustomerDashboard') ||
              isActive('UserDashboard')
            }
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'UserDashboard' })
            }
          />

          {/* Transactions - Always visible */}
          <AnimatedMenuButton
            icon="swap-horizontal"
            title="Transactions"
            isActive={isActive('Transactions')}
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Transactions' })
            }
          />

          {/* Inventory - Only show if permission exists */}
          {userCaps?.canCreateInventory && (
            <AnimatedMenuButton
              icon="cube"
              title="Inventory"
              isActive={isActive('Inventory')}
              onPress={() =>
                navigation.navigate('MainTabs', { screen: 'Inventory' })
              }
            />
          )}

          {/* Settings - Direct settings button */}
          <AnimatedMenuButton
            icon="settings"
            title="Settings"
            isActive={isActive('Settings')}
            onPress={() => navigation.navigate('ProfileScreen')}
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
        {/* Dashboard - Always visible */}
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

        {/* Transactions - Always visible */}
        <MenuButton
          icon="swap-horizontal-outline"
          title="Transactions"
          isActive={isActive('Transactions')}
          onPress={() =>
            navigation.navigate('MainTabs', { screen: 'Transactions' })
          }
          showAlways={true}
        />

        {/* Inventory - Only show if permission exists */}
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
  // Desktop Sidebar Styles
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

  // Mobile Bottom Nav Styles (matching AppSidebar)
  bottomNavWrapper: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    height: 58,
    paddingHorizontal: 4,
    backgroundColor: '#ffffff',
  },
  bottomNavLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 64,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  bottomNavButton: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
    position: 'relative',
    paddingTop: 4,
  },
  topIndicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomNavButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  bottomNavText: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  bottomNavTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});
