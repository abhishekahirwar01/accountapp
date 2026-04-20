import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getCurrentUser, logout } from '../../lib/auth';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { useUserPermissionSocket } from '../../components/hooks/useSocket';

const { width: W } = Dimensions.get('window');

// ─── Tokens ────
const PURPLE     = '#7C6FF7';
const IDLE_COLOR = '#707070';
const WHITE      = '#FFFFFF';
const BAR_H      = 90;
const FAB_SIZE   = 56;
const NOTCH_D    = 32;
const NOTCH_W    = 78;

const cx = W / 2;
const BAR_PATH = `
  M 0 0
  L ${cx - NOTCH_W} 0
  C ${cx - NOTCH_W + 58} 0, ${cx - 34} ${NOTCH_D}, ${cx} ${NOTCH_D}
  C ${cx + 34} ${NOTCH_D}, ${cx + NOTCH_W - 58} 0, ${cx + NOTCH_W} 0
  L ${W} 0
  L ${W} 9999
  L 0 9999
  Z
`;
const CAP_PATH = `
  M ${cx - NOTCH_W} 0
  C ${cx - NOTCH_W + 28} 0, ${cx - 24} ${NOTCH_D}, ${cx} ${NOTCH_D}
  C ${cx + 24} ${NOTCH_D}, ${cx + NOTCH_W - 28} 0, ${cx + NOTCH_W} 0
  L ${cx + NOTCH_W} -80
  L ${cx - NOTCH_W} -80
  Z
`;
const SHADOW_PATH = `M 0 0 L ${cx - NOTCH_W} 0 C ${cx - NOTCH_W + 58} 0, ${cx - 34} ${NOTCH_D}, ${cx} ${NOTCH_D} C ${cx + 34} ${NOTCH_D}, ${cx + NOTCH_W - 58} 0, ${cx + NOTCH_W} 0 L ${W} 0`;

// ─── SVG Notched Bar ───
const NotchedBg = memo(({ bottomPad }) => {
  const H = BAR_H + bottomPad;

  return (
    <Svg
      width={W}
      height={H + 80}
      style={[StyleSheet.absoluteFill, { top: -80 }]}
      pointerEvents="none"
    >
      <Path d={SHADOW_PATH} stroke="rgba(0,0,0,0.005)" strokeWidth={20} fill="none" transform="translate(0, 80)" />
      <Path d={SHADOW_PATH} stroke="rgba(0,0,0,0.01)" strokeWidth={14} fill="none" transform="translate(0, 80)" />
      <Path d={SHADOW_PATH} stroke="rgba(0,0,0,0.02)" strokeWidth={10} fill="none" transform="translate(0, 80)" />
      <Path d={SHADOW_PATH} stroke="rgba(0,0,0,0.03)" strokeWidth={7}  fill="none" transform="translate(0, 80)" />
      <Path d={SHADOW_PATH} stroke="rgba(0,0,0,0.04)" strokeWidth={4}  fill="none" transform="translate(0, 80)" />
      
      <Path d={BAR_PATH} fill="#fff" transform="translate(0, 80)" />

      {/* Cap — hides shadow that bleeds into the notch area */}
      <Path d={CAP_PATH} fill="transparent" transform="translate(0, 80)" />
    </Svg>
  );
});

// ─── Tab Button ────
const TabButton = memo(({ icon, title, isActive, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
    ]).start(() => onPress?.());
  }, [onPress]);

  return (
    <TouchableOpacity activeOpacity={1} onPress={handlePress} style={styles.tab}>
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        <Ionicons
          name={icon}
          size={22}
          color={isActive ? PURPLE : IDLE_COLOR}
          style={isActive ? styles.iconActive : styles.iconInactive}
        />
        <Text style={[styles.label, isActive && styles.labelActive]}>{title}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

// ─── FAB Button ───
const FabButton = memo(({ onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.86, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start(() => onPress?.());
  }, [onPress]);

  return (
    <TouchableOpacity activeOpacity={1} onPress={handlePress} style={styles.fabSlot}>
      <Animated.View style={[styles.fab, { transform: [{ scale }] }]}>
        <Ionicons name="add" size={30} color={WHITE} />
      </Animated.View>
    </TouchableOpacity>
  );
});

// MAIN COMPONENT
export default function UserBottomNav(props) {
  const navigation = props.navigation;
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom;

  const [currentUser, setCurrentUser] = useState(null);
  const {
    permissions: userCaps,
    isLoading,
    role: userRole,
    refetch: refetchUserPermissions,
  } = useUserPermissions();

  // Socket listener for real-time user permission updates
  useUserPermissionSocket(() => {
    console.log('🔔 UserBottomNav: User permission update received, refetching...');
    refetchUserPermissions();
  });

  const currentRole = currentUser?.role || userRole || 'user';

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

  // Get active screen from tab navigator state passed in props
  const getActiveScreen = () => {
    if (props.state && props.state.routes) {
      return props.state.routes[props.state.index]?.name;
    }
    return null;
  };

  const activeScreen = getActiveScreen();

  // Check if screen is active
  const isActive = useCallback((screenName) => {
    if (screenName === 'Dashboard') {
      return activeScreen === 'AdminDashboard' ||
             activeScreen === 'CustomerDashboard' ||
             activeScreen === 'UserDashboard';
    }
    return activeScreen === screenName;
  }, [activeScreen]);

  const navigate = useCallback((screen) => {
    if (screen === 'Settings') {
      navigation.navigate('ProfileScreen');
    } else {
      navigation.navigate('MainTabs', { screen });
    }
  }, [navigation]);

  // Handle FAB press to open transaction form
  const handleFabPress = useCallback(() => {
    navigation.navigate('TransactionForm'); 
  }, [navigation]);

  if (isLoading || !currentUser) {
    return (
      <View style={[styles.loading, { paddingBottom: bottomPad }]}>
        <ActivityIndicator size="small" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <NotchedBg bottomPad={bottomPad} />
      <View style={[styles.bar, { paddingBottom: bottomPad + 6 }]}>
        {/* Dashboard Tab */}
        <TabButton
          icon="home-outline"
          title="Dashboard"
          isActive={isActive('Dashboard')}
          onPress={() => navigate('UserDashboard')}
        />

        {/* Transactions Tab */}
        <TabButton
          icon="shield-checkmark-outline"
          title="Transactions"
          isActive={isActive('Transactions')}
          onPress={() => navigate('Transactions')}
        />

        {/* FAB Button - Opens Transaction Form */}
        <FabButton onPress={handleFabPress} />

        {/* Inventory Tab */}
        <TabButton
          icon="cube-outline"
          title="Inventory"
          isActive={isActive('Inventory')}
          onPress={() => navigate('Inventory')}
        />

        {/* Settings Tab */}
        <TabButton
          icon="settings-outline"
          title="Settings"
          isActive={isActive('Settings')}
          onPress={() => navigate('Settings')}
        />
      </View>
    </View>
  );
}

// ─── Styles ────
const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: BAR_H,
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  loading: {
    height: BAR_H,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E3EE',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 0,
  },
  label: {
    fontSize: 10,
    marginTop: 3,
    color: IDLE_COLOR,
    fontWeight: '500',
  },
  labelActive: {
    color: PURPLE,
    fontWeight: '600',
  },
  iconActive: {
    backgroundColor: '#7C6FF7',
    padding: 6,
    borderRadius: 16,
    color: WHITE,
    overflow: 'hidden',
  },
  iconInactive: {
    // No background for inactive icons
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    zIndex: 10,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: NOTCH_D + 6,
    // Add shadow for better visibility
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
}); 