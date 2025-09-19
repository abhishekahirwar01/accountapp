import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/auth/LoginScreen";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import UserDashboardScreen from "../screens/main/UserDashboardScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator({ role, setRole }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {role === null ? (
        // If not logged in → Show Login
        <Stack.Screen name="Login">
          {(props) => <LoginScreen {...props} onLogin={setRole} />}
        </Stack.Screen>
      ) : role === "master" ? (
        // If Admin login
        <Stack.Screen
          name="AdminDashboard"
          children={(props) => (
            <AdminDashboardScreen {...props} setRole={setRole} />
          )}
        />
      ) : (
        // If User login
        <Stack.Screen
          name="UserDashboard"
          children={(props) => (
            <UserDashboardScreen {...props} setRole={setRole} />
          )}
        />
      )}
    </Stack.Navigator>
  );
}
