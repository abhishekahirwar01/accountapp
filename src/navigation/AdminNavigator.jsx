import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ClientManagementScreen from '../screens/admin/ClientManagementScreen';
import CompaniesScreen from '../screens/admin/CompaniesScreen';
import AnalyticsScreen from '../screens/admin/AnalyticsScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="ClientManagement" component={ClientManagementScreen} />
      <Stack.Screen name="Companies" component={CompaniesScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
