import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/layout/Header';
import { AppSidebar } from '../components/layout/AppBottomNav';
import UserSidebar from '../components/layout/UserBottomNav';
import { getCurrentUser } from '../lib/auth';

// for devloment purposes
// import OTPVerificationScreen from '../screens/auth/otpverification/OTPVerificationScreen';
// import SendOtpScreen from '../screens/auth/otpverification/SendOtpScreen';

import GettingStartedScreen from '../screens/auth/GettingStartedScreen';

// for production purposes
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import SendOtpScreen from '../screens/auth/SendOtpScreen';

import AdminLoginScreen from '../screens/auth/AdminLoginScreen';
import UserLoginScreen from '../screens/auth/UserLoginScreen';
import ClientLoginScreen from '../screens/auth/ClientLoginScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UserDashboardScreen from '../screens/main/UserDashboardScreen';
import CustomerDashboardScreen from '../screens/main/DashboardScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import AdminSettingsScreen from '../screens/admin/SettingsScreen';
import InvoicePreview from '../components/invoices/InvoicePreview';
import HistoryScreen from '../screens/admin/HistoryScreen';
import AdminAnalyticsScreen from '../screens/admin/AnalyticsScreen';
import AnalyticsScreen from '../screens/admin/AnalyticsScreen';
import AdminClientManagementPage from '../screens/admin/ClientManagementScreen';
import AdminCompaniesScreen from '../screens/admin/CompaniesScreen';
import TransactionsScreen from '../screens/main/TransactionsScreen';
import CompaniesScreen from '../screens/main/CompaniesScreen';
import InventoryScreen from '../screens/main/InventoryScreen';
import UsersScreen from '../screens/main/UsersScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import Reports from '../screens/main/reports/Reports';
import Ledger from '../screens/main/ledger/Ledger';
import { CompanyForm } from '../components/companies/CompanyForm';
import { TransactionForm } from '../components/transactions/TransactionForm';
import SupportFormScreen from '../screens/support/SupportFormScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const HeaderComponent = () => <Header />;

const tabScreenOptions = {
  headerShown: false, // Header is now in parent Stack
  animationEnabled: false, // Disable tab switch animation to prevent flicker
  freezeOnBlur: true, // Freeze inactive screens to prevent re-renders
    lazy: true,
  detachInactiveScreens: true,
};

function MainTabNavigator({ route }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false); // Start with false, only show loading if needed

  // 1. Role extract karein jo navigation.reset se pass kiya gaya hai (fallback)
  const fallbackRole = (route.params?.role || '').toLowerCase() || '';
  const explicitScreen = route.params?.screen || null;

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // First try to get from AsyncStorage synchronously if possible
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUser(user);
          console.log('🧩 MainTabNavigator role (from storage):', user?.role);
          return;
        }

        // If not in storage, fetch from API (fallback)
        setLoading(true);
        const user = await getCurrentUser();
        setCurrentUser(user);
        console.log('🧩 MainTabNavigator role (from API):', user?.role);
      } catch (err) {
        console.log('⚠️ Error loading current user in navigator:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Use fetched user role, fallback to route params
  const role = (currentUser?.role ?? fallbackRole).toLowerCase() || 'user';

  // 2. Role ke basis par decide karein ki "Home" screen kaunsi hogi
  // If an explicit `screen` param is passed (navigateByRole), prefer it.
  let initialRoute = explicitScreen || 'UserDashboard'; // Default fallback

  if (!explicitScreen) {
    if (role === 'master') {
      initialRoute = 'AdminDashboard';
    } else if (['admin', 'customer', 'client'].includes(role)) {
      initialRoute = 'CustomerDashboard';
    } else if (role === 'user') {
      initialRoute = 'UserDashboard';
    }
  }

  // Determine which sidebar to use based on role
  const showAppSidebar = ['master', 'client', 'customer', 'admin'].includes(role);
  const SidebarComponent = showAppSidebar ? AppSidebar : UserSidebar;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <Tab.Navigator
      // Sabse important points:
      initialRouteName={initialRoute} // Yeh user ko uske dashboard par land karwayega
      backBehavior="initialRoute" // Yeh back karne par AdminDashboard par jane se rokega
      tabBar={(props) => <SidebarComponent {...props} />} // Conditional sidebar
      screenOptions={tabScreenOptions}
    >
      {/* --- Screens WITH Header --- */}
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
      />
      <Tab.Screen
        name="UserDashboard"
        component={UserDashboardScreen}
      />
      <Tab.Screen
        name="CustomerDashboard"
        component={CustomerDashboardScreen}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
      />

      {/* --- Screens WITHOUT Header --- */}
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
      />
      <Tab.Screen
        name="Companies"
        component={CompaniesScreen}
      />
      <Tab.Screen
        name="Users"
        component={UsersScreen}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Reports"
        component={Reports}
      />
      <Tab.Screen
        name="Ledger"
        component={Ledger}
      />

      {/* Admin specific screens */}
      <Tab.Screen
        name="AdminAnalytics"
        component={AdminAnalyticsScreen}
      />
      <Tab.Screen
        name="AnalyticsScreen"
        component={AnalyticsScreen}
      />
      <Tab.Screen
        name="AdminCompanies"
        component={AdminCompaniesScreen}
      />
      <Tab.Screen
        name="AdminClientManagement"
        component={AdminClientManagementPage}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator({
  role = null,
  initialRouteName = 'GettingStarted',
}) {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRouteName}
    >
      <Stack.Screen name="GettingStarted" component={GettingStartedScreen} />
      <Stack.Screen name="SendOtpScreen" component={SendOtpScreen} />
      <Stack.Screen
        name="OTPVerificationScreen"
        component={OTPVerificationScreen}
      />
      <Stack.Screen name="AdminLoginScreen" component={AdminLoginScreen} />
      <Stack.Screen name="UserLoginScreen" component={UserLoginScreen} />
      <Stack.Screen name="ClientLoginScreen" component={ClientLoginScreen} />

      {/* 2. Main Tab Area (Jahan Header dikhega) */}
      <Stack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        // Pass persisted role (if any) as initial params so nested Tab navigator can pick correct tab
        initialParams={{ role }}
        options={{
          headerShown: true,
          header: HeaderComponent,
        }}
      />

      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="HistoryScreen" component={HistoryScreen} />
      <Stack.Screen name="TransactionForm" component={TransactionForm} />
      <Stack.Screen name="InvoicePreview" component={InvoicePreview} />
      <Stack.Screen name="CompanyForm" component={CompanyForm} />
      <Stack.Screen
        name="SupportFormScreen"
        component={SupportFormScreen}
        options={{
          headerShown: false,
          animationEnabled: true,
          cardStyle: { backgroundColor: 'transparent' },
          cardOverlayEnabled: true,
          cardStyleInterpolator: ({ current: { progress } }) => ({
            cardStyle: {
              opacity: progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.25, 1],
              }),
            },
            overlayStyle: {
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
                extrapolate: 'clamp',
              }),
            },
          }),
        }}
      />
    </Stack.Navigator>
  );
}
