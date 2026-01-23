import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getCurrentUser } from '../../lib/auth';
import { usePermissions } from '../../contexts/permission-context';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import {
  usePermissionSocket,
  useUserPermissionSocket,
} from '../../components/hooks/useSocket';
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

// ----- Main Sidebar Component -----
export function AppSidebar() {
  const navigation = useNavigation();
  const route = useRoute();
  const [currentUser, setCurrentUser] = useState(null);
  const {
    permissions: clientPermissions,
    isLoading: permissionsLoading,
    refetch: refetchPermissions,
  } = usePermissions();
  const {
    permissions: userCaps,
    isLoading: userPermissionsLoading,
    refetch: refetchUserPermissions,
  } = useUserPermissions();

  // Socket listeners for real-time permission updates
  usePermissionSocket(() => {
    console.log('🔔 AppBottomNav: Permission update received, refetching...');
    refetchPermissions();
  });

  useUserPermissionSocket(() => {
    console.log(
      '🔔 AppBottomNav: User permission update received, refetching...',
    );
    refetchUserPermissions();
  });

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const currentRole = currentUser?.role;
  const isAdmin = currentRole === 'master';

  // Consistent permission logic with original code
  const canSeeInventory =
    currentRole === 'admin' ||
    (!!userCaps && userCaps.canCreateInventory) ||
    currentRole === 'customer';

  const canSeeCompanies =
    clientPermissions?.canCreateCompanies ||
    clientPermissions?.canUpdateCompanies;

  const canSeeUsers =
    currentRole === 'admin' ||
    (!!clientPermissions && clientPermissions.canCreateUsers);

  const isActive = screenName => route.name === screenName;
  const isReportsActive = route.name?.startsWith('Reports');
  const isLedgerActive = route.name?.startsWith('Ledger');

  // ----- Admin Menu -----
  const AdminMenu = () => (
    <>
      <AnimatedMenuButton
        icon="grid"
        title="Dashboard"
        isActive={isActive('AdminDashboard')}
        onPress={() =>
          navigation.navigate('MainTabs', { screen: 'AdminDashboard' })
        }
      />
      <AnimatedMenuButton
        icon="people"
        title="Clients"
        isActive={isActive('AdminClientManagement')}
        onPress={() =>
          navigation.navigate('MainTabs', {
            screen: 'AdminClientManagement',
          })
        }
      />
      <AnimatedMenuButton
        icon="briefcase"
        title="Companies"
        isActive={isActive('AdminCompanies')}
        onPress={() =>
          navigation.navigate('MainTabs', { screen: 'AdminCompanies' })
        }
      />
      <AnimatedMenuButton
        icon="bar-chart"
        title="Analytics"
        isActive={isActive('AdminAnalytics')}
        onPress={() =>
          navigation.navigate('MainTabs', { screen: 'AdminAnalytics' })
        }
      />
      <AnimatedMenuButton
        icon="settings"
        title="Settings"
        isActive={isActive('AdminSettings')}
        onPress={() => navigation.navigate('AdminSettings')}
      />
    </>
  );

  // ----- Customer Menu -----
  const CustomerMenu = () => (
    <>
      {/* Dashboard */}
      <AnimatedMenuButton
        icon="grid"
        title="Dashboard"
        isActive={isActive('UserDashboard') || isActive('CustomerDashboard')}
        onPress={() =>
          navigation.navigate('MainTabs', { screen: 'CustomerDashboard' })
        }
      />

      {/* Transactions */}
      <AnimatedMenuButton
        icon="swap-horizontal"
        title="Transactions"
        isActive={isActive('Transactions')}
        onPress={() =>
          navigation.navigate('MainTabs', { screen: 'Transactions' })
        }
      />

      {/* Inventory */}
      {canSeeInventory && (
        <AnimatedMenuButton
          icon="cube"
          title="Inventory"
          isActive={isActive('Inventory')}
          onPress={() =>
            navigation.navigate('MainTabs', { screen: 'Inventory' })
          }
        />
      )}

      {/* Companies */}
      {canSeeCompanies && currentRole !== 'admin' && (
        <AnimatedMenuButton
          icon="briefcase"
          title="Companies"
          isActive={isActive('Companies')}
          onPress={() =>
            navigation.navigate('MainTabs', { screen: 'Companies' })
          }
        />
      )}

      {/* Users */}
      <AnimatedMenuButton
        icon="people"
        title="Users"
        isActive={isActive('Users')}
        onPress={() => navigation.navigate('MainTabs', { screen: 'Users' })}
      />

      {/* Reports */}
      <AnimatedMenuButton
        icon="document-text"
        title="Reports"
        isActive={isReportsActive}
        onPress={() => navigation.navigate('MainTabs', { screen: 'Reports' })}
      />

      {/* Ledger */}
      <AnimatedMenuButton
        icon="document"
        title="Ledger"
        isActive={isLedgerActive}
        onPress={() => navigation.navigate('MainTabs', { screen: 'Ledger' })}
      />
    </>
  );

  // ----- Loading State -----
  if (!currentUser) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.bottomNavLoading}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  // ----- Mobile Bottom Nav -----
  return (
    <SafeAreaView edges={['bottom']} style={styles.bottomNavWrapper}>
      <View style={styles.bottomNav}>
        {isAdmin ? <AdminMenu /> : <CustomerMenu />}
      </View>
    </SafeAreaView>
  );
}

// ----- Styles -----
const styles = StyleSheet.create({
  // Mobile Bottom Nav
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
    // paddingTop: 6,
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

export default AppSidebar;
