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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getCurrentUser } from '../../lib/auth';
import { usePermissions } from '../../contexts/permission-context';
import { useUserPermissions } from '../../contexts/user-permissions-context';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

// ----- Collapsible Components -----
const Collapsible = ({ defaultOpen, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <View>
      {React.Children.map(children, child =>
        React.cloneElement(child, { isOpen, setIsOpen }),
      )}
    </View>
  );
};

const CollapsibleTrigger = ({ children, isOpen, setIsOpen, style }) => (
  <TouchableOpacity onPress={() => setIsOpen(!isOpen)} style={style}>
    {React.Children.map(children, child =>
      React.cloneElement(child, { isOpen }),
    )}
  </TouchableOpacity>
);

const CollapsibleContent = ({ children, isOpen }) =>
  isOpen ? <View style={styles.collapsibleContent}>{children}</View> : null;

// ----- Main Sidebar -----
export function AppSidebar() {
  const navigation = useNavigation();
  const route = useRoute();
  const [currentUser, setCurrentUser] = useState(null);
  const { permissions: clientPermissions, isLoading: permissionsLoading } =
    usePermissions();
  const { permissions: userCaps, isLoading: userPermissionsLoading } =
    useUserPermissions();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const currentRole = currentUser?.role;
  const isAdmin = currentRole === 'master';

  // Consistent permission logic with web
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

  // ----- Menu Button -----
  const MenuButton = ({
    icon,
    title,
    isActive,
    onPress,
    isBottomNav = false,
    hasSubmenu = false,
    isSubmenuOpen = false,
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        isBottomNav ? styles.bottomNavButton : styles.menuButton,
        isActive &&
          (isBottomNav
            ? styles.bottomNavButtonActive
            : styles.menuButtonActive),
      ]}
    >
      <View
        style={
          isBottomNav ? styles.bottomNavButtonContent : styles.menuButtonContent
        }
      >
        <Ionicons
          name={icon}
          size={isBottomNav ? 28 : 20}
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
        {hasSubmenu && !isBottomNav && (
          <Ionicons
            name={isSubmenuOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#6c757d"
            style={{ marginLeft: 'auto' }}
          />
        )}
      </View>
      {isBottomNav && (
        <Text
          style={[styles.bottomNavText, isActive && styles.bottomNavTextActive]}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );

  const SubMenuButton = ({ title, isActive, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.subMenuButton, isActive && styles.subMenuButtonActive]}
    >
      <Text
        style={[
          styles.subMenuButtonText,
          isActive && styles.subMenuButtonTextActive,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  // ----- Admin Menu -----
  const AdminMenu = () => (
    <>
      <MenuButton
        icon="grid-outline"
        title="Dashboard"
        isActive={isActive('AdminDashboard')}
        onPress={() =>
          navigation.navigate('MainTabs', { screen: 'AdminDashboard' })
        }
        isBottomNav={isMobile}
      />
      <MenuButton
        icon="people-outline"
        title="Clients"
        isActive={isActive('AdminClientManagement')}
        onPress={() =>
          navigation.navigate('MainTabs', { screen: 'AdminClientManagement' })
        }
        isBottomNav={isMobile}
      />
      <MenuButton
        icon="business-outline"
        title="Companies"
        isActive={isActive('AdminCompanies')}
        onPress={() =>
          navigation.navigate('MainTabs', { screen: 'AdminCompanies' })
        }
        isBottomNav={isMobile}
      />
      <MenuButton
        icon="bar-chart-outline"
        title="Analytics"
        isActive={isActive('AdminAnalytics')}
        onPress={() =>
          navigation.navigate('MainTabs', { screen: 'AdminAnalytics' })
        }
        isBottomNav={isMobile}
      />
      <MenuButton
        icon="settings-outline"
        title="Settings"
        isActive={isActive('AdminSettings')}
        onPress={() => navigation.navigate('AdminSettings')}
        isBottomNav={isMobile}
      />
    </>
  );

  // ----- Customer Menu -----
  const CustomerMenu = () => {
    const [reportsOpen, setReportsOpen] = useState(isReportsActive);
    const [ledgerOpen, setLedgerOpen] = useState(isLedgerActive);

    return (
      <>
        {/* Dashboard */}
        <MenuButton
          icon="grid-outline"
          title="Dashboard"
          isActive={isActive('UserDashboard') || isActive('CustomerDashboard')}
          onPress={() =>
            navigation.navigate('MainTabs', { screen: 'CustomerDashboard' })
          }
          isBottomNav={isMobile}
        />

        {/* Transactions */}
        <MenuButton
          icon="swap-horizontal-outline"
          title="Transactions"
          isActive={isActive('Transactions')}
          onPress={() =>
            navigation.navigate('MainTabs', { screen: 'Transactions' })
          }
          isBottomNav={isMobile}
        />

        {/* Inventory */}
        {canSeeInventory && (
          <MenuButton
            icon="cube-outline"
            title="Inventory"
            isActive={isActive('Inventory')}
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Inventory' })
            }
            isBottomNav={isMobile}
          />
        )}

        {/* Companies */}
        {canSeeCompanies && currentRole !== 'admin' && (
          <MenuButton
            icon="business-outline"
            title="Companies"
            isActive={isActive('Companies')}
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Companies' })
            }
            isBottomNav={isMobile}
          />
        )}

        {/* Users: always show */}
        <MenuButton
          icon="people-outline"
          title="Users"
          isActive={isActive('Users')}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Users' })}
          isBottomNav={isMobile}
        />

        {/* Reports - Collapsible for Desktop, Simple for Mobile */}
        {!isMobile ? (
          <Collapsible defaultOpen={isReportsActive}>
            <CollapsibleTrigger
              style={styles.collapsibleTrigger}
              isOpen={reportsOpen}
              setIsOpen={setReportsOpen}
            >
              <MenuButton
                icon="document-text-outline"
                title="Reports"
                isActive={isReportsActive}
                onPress={() => {}}
                hasSubmenu={true}
                isSubmenuOpen={reportsOpen}
              />
            </CollapsibleTrigger>
            <CollapsibleContent isOpen={reportsOpen}>
              <SubMenuButton
                title="Profit & Loss"
                isActive={isActive('Reports')}
                onPress={() =>
                  navigation.navigate('MainTabs', { screen: 'Reports' })
                }
              />
              <SubMenuButton
                title="Balance Sheet"
                isActive={isActive('Reports')}
                onPress={() =>
                  navigation.navigate('MainTabs', { screen: 'Reports' })
                }
              />
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <MenuButton
            icon="document-text-outline"
            title="Reports"
            isActive={isReportsActive}
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Reports' })
            }
            isBottomNav={isMobile}
          />
        )}

        {/* Ledger - Collapsible for Desktop, Simple for Mobile */}
        {!isMobile ? (
          <Collapsible defaultOpen={isLedgerActive}>
            <CollapsibleTrigger
              style={styles.collapsibleTrigger}
              isOpen={ledgerOpen}
              setIsOpen={setLedgerOpen}
            >
              <MenuButton
                icon="document-outline"
                title="Ledger"
                isActive={isLedgerActive}
                onPress={() => {}}
                hasSubmenu={true}
                isSubmenuOpen={ledgerOpen}
              />
            </CollapsibleTrigger>
            <CollapsibleContent isOpen={ledgerOpen}>
              <SubMenuButton
                title="Receivables"
                isActive={isActive('Ledger')}
                onPress={() =>
                  navigation.navigate('MainTabs', { screen: 'Ledger' })
                }
              />
              <SubMenuButton
                title="Payables"
                isActive={isActive('Ledger')}
                onPress={() =>
                  navigation.navigate('MainTabs', { screen: 'Ledger' })
                }
              />
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <MenuButton
            icon="document-outline"
            title="Ledger"
            isActive={isLedgerActive}
            onPress={() =>
              navigation.navigate('MainTabs', { screen: 'Ledger' })
            }
            isBottomNav={isMobile}
          />
        )}
      </>
    );
  };

  // ----- Mobile Bottom Nav -----
  if (isMobile) {
    if (!currentUser) {
      return (
        <SafeAreaView edges={['bottom']} style={styles.bottomNavLoading}>
          <ActivityIndicator size="small" color="#007bff" />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView edges={['bottom']} style={styles.bottomNavWrapper}>
        <View style={styles.bottomNav}>
          {isAdmin ? <AdminMenu /> : <CustomerMenu />}
        </View>
      </SafeAreaView>
    );
  }

  // ----- Desktop Sidebar -----
  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.logoText}>AccounTech Pro</Text>
        </View>
      </View>

      <ScrollView
        style={styles.sidebarMenu}
        showsVerticalScrollIndicator={false}
      >
        {isAdmin ? <AdminMenu /> : <CustomerMenu />}
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
              <Text style={styles.userName}>
                {currentUser?.role === 'master'
                  ? 'Master Administrator'
                  : currentUser?.name}
              </Text>
              <Text style={styles.userEmail}>{currentUser?.email}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ----- Styles -----
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
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  sidebarMenu: {
    flex: 1,
    padding: 16,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  menuButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButtonText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  menuButtonTextActive: {
    color: '#007bff',
    fontWeight: '600',
  },
  bottomNavWrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 8,
  },
  bottomNavLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 56,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  bottomNavButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  bottomNavButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  bottomNavButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavText: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 2,
    textAlign: 'center',
  },
  bottomNavTextActive: {
    color: '#007bff',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6c757d',
  },
  collapsibleTrigger: {
    marginBottom: 4,
  },
  collapsibleContent: {
    marginLeft: 16,
    marginTop: 4,
  },
  subMenuButton: {
    padding: 12,
    borderRadius: 6,
    marginVertical: 2,
    marginLeft: 8,
  },
  subMenuButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  subMenuButtonText: {
    fontSize: 14,
    color: '#6c757d',
  },
  subMenuButtonTextActive: {
    color: '#007bff',
    fontWeight: '500',
  },
  userSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
});
