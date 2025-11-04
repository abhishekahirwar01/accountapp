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
        React.cloneElement(child, { isOpen, setIsOpen })
      )}
    </View>
  );
};

const CollapsibleTrigger = ({ children, isOpen, setIsOpen, style }) => (
  <TouchableOpacity onPress={() => setIsOpen(!isOpen)} style={style}>
    {React.Children.map(children, child =>
      React.cloneElement(child, { isOpen })
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
  const { permissions: clientPermissions, isLoading: permissionsLoading } = usePermissions();
  const { permissions: userPermissions, role: userRole } = useUserPermissions();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // ✅ Next.js ke hisaab se permissions - sirf clientPermissions use karein
  const effectivePermissions = clientPermissions;
  const currentRole = userRole || currentUser?.role?.toLowerCase();

  // ✅ Next.js ke exact permission checks
  const canSeeInventory = currentRole === 'customer' || currentRole === 'client';
  const canSeeCompanies = effectivePermissions?.canCreateCompanies || effectivePermissions?.canUpdateCompanies;
  const canSeeUsers = currentRole === 'admin' || (!!effectivePermissions && effectivePermissions.canCreateUsers);

  const isAdmin = currentRole === 'master';
  const isActive = (screenName) => route.name === screenName;
  const isReportsActive = route.name?.startsWith('Reports');
  const isLedgerActive = route.name?.startsWith('Ledger');

  console.log('🔍 Sidebar Debug:', {
    currentRole,
    effectivePermissions,
    canSeeInventory,
    canSeeCompanies,
    canSeeUsers
  });

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
        isActive && (isBottomNav ? styles.bottomNavButtonActive : styles.menuButtonActive),
      ]}
    >
      <View style={isBottomNav ? styles.bottomNavButtonContent : styles.menuButtonContent}>
        <Ionicons
          name={icon}
          size={20}
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
          style={[
            styles.bottomNavText,
            isActive && styles.bottomNavTextActive,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );

  const SubMenuButton = ({ title, isActive, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.subMenuButton,
        isActive && styles.subMenuButtonActive,
      ]}
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
        onPress={() => navigation.navigate('AdminDashboard')}
        isBottomNav={isMobile}
      />
      <MenuButton
        icon="people-outline"
        title="Client Management"
        isActive={isActive('AdminClientManagement')}
        onPress={() => navigation.navigate('AdminClientManagement')}
        isBottomNav={isMobile}
      />
      <MenuButton
        icon="business-outline"
        title="Companies"
        isActive={isActive('AdminCompanies')}
        onPress={() => navigation.navigate('AdminCompanies')}
        isBottomNav={isMobile}
      />
      <MenuButton
        icon="analytics-outline"
        title="Analytics"
        isActive={isActive('AdminAnalytics')}
        onPress={() => navigation.navigate('AdminAnalytics')}
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

  // ----- Customer Menu (EXACTLY like Next.js) -----
  const CustomerMenu = () => (
    <>
      {/* Dashboard - ALWAYS VISIBLE */}
      <MenuButton
        icon="grid-outline"
        title="Dashboard"
        isActive={isActive('UserDashboard') || isActive('CustomerDashboard')}
        onPress={() => navigation.navigate('UserDashboard')}
        isBottomNav={isMobile}
      />

      {/* Transactions - ALWAYS VISIBLE */}
      <MenuButton
        icon="swap-horizontal-outline"
        title="Transactions"
        isActive={isActive('Transactions')}
        onPress={() => navigation.navigate('Transactions')}
        isBottomNav={isMobile}
      />

      {/* Inventory - VISIBLE for customer role (Next.js logic) */}
      {canSeeInventory && (
        <MenuButton
          icon="cube-outline"
          title="Inventory"
          isActive={isActive('Inventory')}
          onPress={() => navigation.navigate('Inventory')}
          isBottomNav={isMobile}
        />
      )}

      {/* Companies - VISIBLE when permission allows (Next.js logic) */}
      {canSeeCompanies && (
        <MenuButton
          icon="business-outline"
          title="Companies"
          isActive={isActive('Companies')}
          onPress={() => navigation.navigate('Companies')}
          isBottomNav={isMobile}
        />
      )}

      {/* Users - VISIBLE for admins OR when permission allows (Next.js logic) */}
      {canSeeUsers && (
        <MenuButton
          icon="people-outline"
          title="Users"
          isActive={isActive('Users')}
          onPress={() => navigation.navigate('Users')}
          isBottomNav={isMobile}
        />
      )}

      {/* Loading indicator */}
      {permissionsLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007bff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Reports Collapsible - ALWAYS VISIBLE (Desktop only) */}
      {!isMobile && (
        <Collapsible defaultOpen={isReportsActive}>
          <CollapsibleTrigger style={styles.collapsibleTrigger}>
            {(props) => (
              <MenuButton
                icon="document-text-outline"
                title="Reports"
                isActive={isReportsActive}
                hasSubmenu={true}
                isSubmenuOpen={props.isOpen}
                onPress={() => props.setIsOpen(!props.isOpen)}
              />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SubMenuButton
              title="Profit & Loss"
              isActive={isActive('ProfitLossReport')}
              onPress={() => navigation.navigate('ProfitLossReport')}
            />
            <SubMenuButton
              title="Balance Sheet"
              isActive={isActive('BalanceSheetReport')}
              onPress={() => navigation.navigate('BalanceSheetReport')}
            />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Ledger Collapsible - ALWAYS VISIBLE (Desktop only) */}
      {!isMobile && (
        <Collapsible defaultOpen={isLedgerActive}>
          <CollapsibleTrigger style={styles.collapsibleTrigger}>
            {(props) => (
              <MenuButton
                icon="document-outline"
                title="Ledger"
                isActive={isLedgerActive}
                hasSubmenu={true}
                isSubmenuOpen={props.isOpen}
                onPress={() => props.setIsOpen(!props.isOpen)}
              />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SubMenuButton
              title="Receivables"
              isActive={isActive('LedgerReceivables')}
              onPress={() => navigation.navigate('LedgerReceivables')}
            />
            <SubMenuButton
              title="Payables"
              isActive={isActive('LedgerPayables')}
              onPress={() => navigation.navigate('LedgerPayables')}
            />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Mobile-only menu items for Reports and Ledger */}
      {isMobile && (
        <>
          {/* Reports Menu for Mobile - ALWAYS VISIBLE */}
          <MenuButton
            icon="document-text-outline"
            title="Reports"
            isActive={isReportsActive}
            onPress={() => navigation.navigate('ProfitLossReport')}
            isBottomNav={isMobile}
          />

          {/* Ledger Menu for Mobile - ALWAYS VISIBLE */}
          <MenuButton
            icon="document-outline"
            title="Ledger"
            isActive={isLedgerActive}
            onPress={() => navigation.navigate('LedgerReceivables')}
            isBottomNav={isMobile}
          />
        </>
      )}
    </>
  );

  // ----- Mobile Bottom Nav -----
  if (isMobile) {
    if (!currentUser) {
      return (
        <View style={styles.bottomNavLoading}>
          <ActivityIndicator size="small" color="#007bff" />
        </View>
      );
    }

    return (
      <View style={styles.bottomNav}>
        {isAdmin ? (
          <AdminMenu />
        ) : (
          <CustomerMenu />
        )}
      </View>
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

      <ScrollView style={styles.sidebarMenu} showsVerticalScrollIndicator={false}>
        {isAdmin ? (
          <AdminMenu />
        ) : (
          <CustomerMenu />
        )}
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
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  bottomNavLoading: {
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  bottomNavButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  bottomNavButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  bottomNavButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavText: {
    fontSize: 10,
    color: '#6c757d',
    marginTop: 4,
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