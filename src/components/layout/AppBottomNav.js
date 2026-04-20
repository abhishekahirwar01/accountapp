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
import { getCurrentUser } from '../../lib/auth';
import { usePermissions } from '../../contexts/permission-context';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import {
  usePermissionSocket,
  useUserPermissionSocket,
} from '../../components/hooks/useSocket';
import FabMenuDashboard from '../ui/FabMenuDashboard';

const { width: W } = Dimensions.get('window');

// ─── Tokens ────
const PURPLE = '#7C6FF7';
const IDLE_COLOR = '#707070';
const WHITE = '#FFFFFF';
const BAR_H = 90;
const FAB_SIZE = 56;
const NOTCH_D = 32;
const NOTCH_W = 78;

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
const SHADOW_PATH = `M 0 0 L ${cx - NOTCH_W} 0 C ${cx - NOTCH_W + 58} 0, ${
  cx - 34
} ${NOTCH_D}, ${cx} ${NOTCH_D} C ${cx + 34} ${NOTCH_D}, ${
  cx + NOTCH_W - 58
} 0, ${cx + NOTCH_W} 0 L ${W} 0`;

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
      <Path
        d={SHADOW_PATH}
        stroke="rgba(0,0,0,0.005)"
        strokeWidth={20}
        fill="none"
        transform="translate(0, 80)"
      />
      <Path
        d={SHADOW_PATH}
        stroke="rgba(0,0,0,0.01)"
        strokeWidth={14}
        fill="none"
        transform="translate(0, 80)"
      />
      <Path
        d={SHADOW_PATH}
        stroke="rgba(0,0,0,0.02)"
        strokeWidth={10}
        fill="none"
        transform="translate(0, 80)"
      />
      <Path
        d={SHADOW_PATH}
        stroke="rgba(0,0,0,0.03)"
        strokeWidth={7}
        fill="none"
        transform="translate(0, 80)"
      />
      <Path
        d={SHADOW_PATH}
        stroke="rgba(0,0,0,0.04)"
        strokeWidth={4}
        fill="none"
        transform="translate(0, 80)"
      />

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
      Animated.timing(scale, {
        toValue: 0.88,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start(() => onPress?.());
  }, [onPress]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handlePress}
      style={styles.tab}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        <Ionicons
          name={icon}
          size={22}
          color={isActive ? PURPLE : IDLE_COLOR}
          style={isActive ? styles.iconActive : styles.iconInactive}
        />
        <Text style={[styles.label, isActive && styles.labelActive]}>
          {title}
        </Text>
        {/* {isActive && <View style={styles.dot} />} */}
      </Animated.View>
    </TouchableOpacity>
  );
});

// ─── FAB Button ───
const FabButton = memo(({ onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.86,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start(() => onPress?.());
  }, [onPress]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handlePress}
      style={styles.fabSlot}
    >
      <Animated.View style={[styles.fab, { transform: [{ scale }] }]}>
        <Ionicons name="add" size={30} color={WHITE} />
      </Animated.View>
    </TouchableOpacity>
  );
});

// ─── Admin Nav ──
const AdminNav = memo(
  ({
    isActive,
    navigate,
    navigation,
    moreButtonRef,
    handleMorePress,
    fabAnchor,
    moreVisible,
    handleCloseMore,
  }) => {
    const adminActions = [
      {
        label: 'Companies',
        icon: 'briefcase-outline',
        onPress: () => {
          handleCloseMore();
          navigate('AdminCompanies');
        },
      },
      {
        label: 'Settings',
        icon: 'settings-outline',
        onPress: () => {
          handleCloseMore();
          navigation.navigate('AdminSettings');
        },
      },
    ];

    return (
      <>
        <TabButton
          icon="grid-outline"
          title="Dashboard"
          isActive={isActive('AdminDashboard')}
          onPress={() => navigate('AdminDashboard')}
        />
        <TabButton
          icon="people-outline"
          title="Clients"
          isActive={isActive('AdminClientManagement')}
          onPress={() => navigate('AdminClientManagement')}
        />
        <FabButton onPress={() => navigation.navigate('ClientForm')} />
        <TabButton
          icon="bar-chart-outline"
          title="Analytics"
          isActive={isActive('AdminAnalytics')}
          onPress={() => navigate('AdminAnalytics')}
        />

        {/* More button with ref for FabMenu anchoring */}
        <View ref={moreButtonRef} collapsable={false} style={styles.tab}>
          <TabButton
            icon="menu"
            title="More"
            isActive={false}
            onPress={handleMorePress}
          />
        </View>

        {/* FabMenu for admin more options */}
        <FabMenuDashboard
          visible={moreVisible}
          onClose={handleCloseMore}
          anchor={fabAnchor}
          actions={adminActions}
        />
      </>
    );
  },
);

// ─── Customer Nav ───
const CustomerNav = memo(
  ({
    isActive,
    navigate,
    navigation,
    canSeeCompanies,
    canSeeInventory,
    currentRole,
    isReportsActive,
    isLedgerActive,
    moreButtonRef,
    handleMorePress,
    fabAnchor,
    moreVisible,
    handleCloseMore,
  }) => {
    const customerActions = [
      ...(canSeeCompanies && currentRole !== 'admin'
        ? [
            {
              label: 'Companies',
              icon: 'briefcase-outline',
              onPress: () => {
                handleCloseMore();
                navigate('Companies');
              },
            },
          ]
        : []),
      {
        label: 'Users',
        icon: 'people-outline',
        onPress: () => {
          handleCloseMore();
          navigate('Users');
        },
      },
      {
        label: 'Reports',
        icon: 'document-text-outline',
        onPress: () => {
          handleCloseMore();
          navigate('Reports');
        },
      },
      {
        label: 'Ledger',
        icon: 'document-outline',
        onPress: () => {
          handleCloseMore();
          navigate('Ledger');
        },
      },
    ];

    return (
      <>
        <TabButton
          icon="home-outline"
          title="Home"
          isActive={isActive('CustomerDashboard') || isActive('UserDashboard')}
          onPress={() => navigate('CustomerDashboard')}
        />
        <TabButton
          icon="shield-checkmark-outline"
          title="Transactions"
          isActive={isActive('Transactions')}
          onPress={() => navigate('Transactions')}
        />
        <FabButton
          onPress={() => {
            handleCloseMore();
            navigation.navigate('TransactionForm');
          }}
        />

        {canSeeInventory && (
          <TabButton
            icon="cube-outline"
            title="Inventory"
            isActive={isActive('Inventory')}
            onPress={() => navigate('Inventory')}
          />
        )}

        {/* More button with ref for FabMenu anchoring */}
        <View ref={moreButtonRef} collapsable={false} style={styles.tab}>
          <TabButton
            icon="ellipsis-vertical"
            title="More"
            isActive={false}
            onPress={handleMorePress}
          />
        </View>

        {/* FabMenu for customer more options */}
        <FabMenuDashboard
          visible={moreVisible}
          onClose={handleCloseMore}
          anchor={fabAnchor}
          actions={customerActions}
        />
      </>
    );
  },
);

// MAIN COMPONENT
export function AppSidebar(props) {
  const navigation = props.navigation;
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom;

  const [currentUser, setCurrentUser] = useState(null);
  const [moreVisible, setMoreVisible] = useState(false);
  const [fabAnchor, setFabAnchor] = useState(null);

  const moreButtonRef = useRef(null);

  const { permissions: clientPermissions, refetch: refetchPermissions } =
    usePermissions();
  const { permissions: userCaps, refetch: refetchUserPermissions } =
    useUserPermissions();

  const handlePermissionChange = useCallback(
    () => refetchPermissions(),
    [refetchPermissions],
  );
  const handleUserPermissionChange = useCallback(
    () => refetchUserPermissions(),
    [refetchUserPermissions],
  );

  usePermissionSocket(handlePermissionChange);
  useUserPermissionSocket(handleUserPermissionChange);

  useEffect(() => {
    (async () => setCurrentUser(await getCurrentUser()))();
  }, []);

  // Handle FabMenu anchor calculation when more button is pressed
  const handleMorePress = useCallback(() => {
    if (moreButtonRef.current) {
      moreButtonRef.current.measureInWindow((x, y, width, height) => {
        setFabAnchor({ x, y, width, height });
        setMoreVisible(true);
      });
    }
  }, []);

  // Handle closing the FabMenu
  const handleCloseMore = useCallback(() => {
    setMoreVisible(false);
    // Clear the anchor after a short delay to allow animation to complete
    setTimeout(() => {
      setFabAnchor(null);
    }, 200);
  }, []);

  const navigate = useCallback(
    screen => {
      handleCloseMore();
      navigation.navigate('MainTabs', { screen });
    },
    [navigation, handleCloseMore],
  );

  const activeScreen = props.state?.routes?.[props.state.index]?.name ?? null;
  const isActive = useCallback(n => activeScreen === n, [activeScreen]);
  const isReportsActive = activeScreen?.startsWith('Reports');
  const isLedgerActive = activeScreen?.startsWith('Ledger');

  if (!currentUser) {
    return (
      <View style={[styles.loading, { paddingBottom: bottomPad }]}>
        <ActivityIndicator size="small" color={PURPLE} />
      </View>
    );
  }

  const currentRole = currentUser?.role;
  const isAdmin = currentRole === 'master';
  const canSeeInventory =
    currentRole === 'admin' ||
    !!userCaps?.canCreateInventory ||
    currentRole === 'customer';
  const canSeeCompanies =
    clientPermissions?.canCreateCompanies ||
    clientPermissions?.canUpdateCompanies;

  return (
    <View style={styles.root}>
      <NotchedBg bottomPad={bottomPad} />
      <View style={[styles.bar, { paddingBottom: bottomPad + 6 }]}>
        {isAdmin ? (
          <AdminNav
            isActive={isActive}
            navigate={navigate}
            navigation={navigation}
            moreButtonRef={moreButtonRef}
            handleMorePress={handleMorePress}
            handleCloseMore={handleCloseMore}
            fabAnchor={fabAnchor}
            moreVisible={moreVisible}
          />
        ) : (
          <CustomerNav
            isActive={isActive}
            navigate={navigate}
            navigation={navigation}
            canSeeCompanies={canSeeCompanies}
            canSeeInventory={canSeeInventory}
            currentRole={currentRole}
            isReportsActive={isReportsActive}
            isLedgerActive={isLedgerActive}
            moreButtonRef={moreButtonRef}
            handleMorePress={handleMorePress}
            handleCloseMore={handleCloseMore}
            fabAnchor={fabAnchor}
            moreVisible={moreVisible}
          />
        )}
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
  dot: {
    marginTop: 4,
    width: 18,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: PURPLE,
  },
  iconActive: {
    backgroundColor: '#7C6FF7',
    padding: 6,
    borderRadius: 16,
    color: WHITE,
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
  },
});

export default AppSidebar;
