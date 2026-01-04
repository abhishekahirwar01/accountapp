import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Header from '../components/layout/Header';

import GettingStartedScreen from '../screens/auth/GettingStartedScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import AdminLoginScreen from '../screens/auth/AdminLoginScreen';
import UserLoginScreen from '../screens/auth/UserLoginScreen';
import ClientLoginScreen from '../screens/auth/ClientLoginScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UserDashboardScreen from '../screens/main/UserDashboardScreen';
import CustomerDashboardScreen from '../screens/main/DashboardScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import AdminSettingsScreen from '../screens/admin/SettingsScreen';
import InvoicePreview from '../components/invoices/InvoicePreview';
import SendOtpScreen from '../screens/auth/SendOtpScreen';
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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator({ route }) {
  // 1. Role extract karein jo navigation.reset se pass kiya gaya hai
  const role = route.params?.role?.toLowerCase() || '';

  // 2. Role ke basis par decide karein ki "Home" screen kaunsi hogi
  let initialRoute = 'UserDashboard'; // Default fallback

  if (role === 'master') {
    initialRoute = 'AdminDashboard';
  } else if (['admin', 'customer', 'client'].includes(role)) {
    initialRoute = 'CustomerDashboard';
  } else if (role === 'user') {
    initialRoute = 'UserDashboard';
  }

  return (
    <Tab.Navigator
      // Sabse important points:
      initialRouteName={initialRoute} // Yeh user ko uske dashboard par land karwayega
      backBehavior="initialRoute" // Yeh back karne par AdminDashboard par jane se rokega
      screenOptions={{
        tabBarStyle: { display: 'none' }, // Tab bar hide rahegi
      }}
    >
      {/* --- Screens WITH Header --- */}
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ headerShown: true, header: () => <Header /> }}
      />
      <Tab.Screen
        name="UserDashboard"
        component={UserDashboardScreen}
        options={{ headerShown: true, header: () => <Header /> }}
      />
      <Tab.Screen
        name="CustomerDashboard"
        component={CustomerDashboardScreen}
        options={{ headerShown: true, header: () => <Header /> }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ headerShown: true, header: () => <Header /> }}
      />

      {/* --- Screens WITHOUT Header --- */}
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ headerShown: true, header: () => <Header /> }}
      />
      <Tab.Screen
        name="Companies"
        component={CompaniesScreen}
          options={{ headerShown: true, header: () => <Header /> }}
      />
      <Tab.Screen
        name="Users"
        component={UsersScreen}
        options={{ headerShown: true, header: () => <Header /> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Reports"
        component={Reports}
         options={{ headerShown: true, header: () => <Header /> }}
      />
      <Tab.Screen
        name="Ledger"
        component={Ledger}
       options={{ headerShown: true, header: () => <Header /> }}
      />

      {/* Admin specific screens */}
      <Tab.Screen
        name="AdminAnalytics"
        component={AdminAnalyticsScreen}
          options={{ headerShown: true, header: () => <Header /> }}
      />
      <Tab.Screen
        name="AnalyticsScreen"
        component={AnalyticsScreen}
           options={{ headerShown: true, header: () => <Header /> }}
      />
      <Tab.Screen
        name="AdminCompanies"
        component={AdminCompaniesScreen}
        options={{ headerShown: true, header: () => <Header /> }}
      />
      <Tab.Screen
        name="AdminClientManagement"
        component={AdminClientManagementPage}
         options={{ headerShown: true, header: () => <Header /> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />

      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="HistoryScreen" component={HistoryScreen} />
      <Stack.Screen name="TransactionForm" component={TransactionForm} />
      <Stack.Screen name="InvoicePreview" component={InvoicePreview} />
      <Stack.Screen name="CompanyForm" component={CompanyForm} />
    </Stack.Navigator>
  );
}
