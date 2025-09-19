import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/main/DashboardScreen';
import TransactionsScreen from '../screens/main/TransactionsScreen';
import InventoryScreen from '../screens/main/InventoryScreen';
import ProfitLossScreen from '../screens/main/reports/ProfitLossScreen';
import BalanceSheetScreen from '../screens/main/reports/BalanceSheetScreen';
import UsersScreen from '../screens/main/UsersScreen';

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Transactions" component={TransactionsScreen} />
      <Stack.Screen name="Inventory" component={InventoryScreen} />
      <Stack.Screen name="ProfitLoss" component={ProfitLossScreen} />
      <Stack.Screen name="BalanceSheet" component={BalanceSheetScreen} />
      <Stack.Screen name="Users" component={UsersScreen} />
    </Stack.Navigator>
  );
}
