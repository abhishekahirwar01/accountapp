import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GettingStartedScreen from '../screens/auth/GettingStartedScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import AdminLoginScreen from '../screens/auth/AdminLoginScreen';
import UserLoginScreen from '../screens/auth/UserLoginScreen';
import ClientLoginScreen from '../screens/auth/ClientLoginScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UserDashboardScreen from '../screens/main/UserDashboardScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import HistoryPage from '../screens/admin/HistoryScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';
import InvoicePreview from '../components/invoices/InvoicePreview';
import SendOtpScreen from '../screens/auth/SendOtpScreen';
import AnalyticsScreen from '../screens/admin/AnalyticsScreen';
const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GettingStarted" component={GettingStartedScreen} />
      <Stack.Screen name="SendOtpScreen" component={SendOtpScreen} />
      <Stack.Screen name="OTPVerificationScreen" component={OTPVerificationScreen} />
      <Stack.Screen name="AdminLoginScreen" component={AdminLoginScreen} />
      <Stack.Screen name="UserLoginScreen" component={UserLoginScreen} />
      <Stack.Screen name="ClientLoginScreen" component={ClientLoginScreen} />

      {/* Dashboards */}
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AnalyticsScreen" component={AnalyticsScreen} />
      <Stack.Screen name="UserDashboard" component={UserDashboardScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />

      {/* History Screen */}
      <Stack.Screen name="HistoryScreen" component={HistoryPage} />
      
      {/* ProfileScreen acts as user settings for non-master users */}
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} /> 
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="InvoicePreview" component={InvoicePreview} />
    </Stack.Navigator>
  );
}
