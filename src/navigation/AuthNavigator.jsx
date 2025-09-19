import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import ClientLoginScreen from '../screens/auth/ClientLoginScreen';
import UserLoginScreen from '../screens/auth/UserLoginScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ClientLogin" component={ClientLoginScreen} />
      <Stack.Screen name="UserLogin" component={UserLoginScreen} />
    </Stack.Navigator>
  );
}
