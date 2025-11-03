import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import AdminClientManagementPage from '../screens/admin/ClientManagementScreen';
import AdminCompaniesScreen from '../screens/admin/CompaniesScreen';
import TransactionsScreen from '../screens/main/TransactionsScreen';
import CompaniesScreen from '../screens/main/CompaniesScreen';
import InventoryScreen from '../screens/main/InventoryScreen';
import UsersScreen from '../screens/main/UsersScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import Reports from '../screens/main/reports/Reports';

const Stack = createNativeStackNavigator();

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

      {/* Dashboards */}
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="HistoryScreen" component={HistoryScreen} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
      <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
      <Stack.Screen
        name="AdminClientManagement"
        component={AdminClientManagementPage}
      />
      <Stack.Screen name="AdminCompanies" component={AdminCompaniesScreen} />

      <Stack.Screen name="UserDashboard" component={UserDashboardScreen} />
      <Stack.Screen
        name="CustomerDashboard"
        component={CustomerDashboardScreen}
      />
      <Stack.Screen name="Transactions" component={TransactionsScreen} />
      <Stack.Screen name="Companies" component={CompaniesScreen} />
      <Stack.Screen name="Inventory" component={InventoryScreen} />
      <Stack.Screen name="Users" component={UsersScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Reports" component={Reports} />

      {/* ProfileScreen acts as user settings for non-master users */}
      <Stack.Screen name="InvoicePreview" component={InvoicePreview} />
    </Stack.Navigator>
  );
}
