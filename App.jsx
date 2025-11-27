import React, { useState, useEffect } from 'react';
import { StatusBar, View, Text } from 'react-native'; // <-- ADDED View and Text
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import {
  Provider as PaperProvider,
  MD3LightTheme as DefaultTheme,
} from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/RootNavigation';

import Toast from 'react-native-toast-message';

import { CompanyProvider } from './src/contexts/company-context';
import { PermissionProvider } from './src/contexts/permission-context';
import { UserPermissionsProvider } from './src/contexts/user-permissions-context';

// 1. DEFINE TOAST CONFIGURATION HERE TO RESOLVE THE ERROR
const toastConfig = {
  custom_success: ({ text1, text2, props, ...rest }) => (
    <View style={{ 
        height: 60, 
        width: '90%', 
        backgroundColor: '#10b981', // Green color
        padding: 12, 
        borderRadius: 8,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        elevation: 5,
    }}>
      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>{text1}</Text>
      <Text style={{ color: '#e5e5e5', fontSize: 12 }}>{text2}</Text>
    </View>
  ),
  // You can define other custom types or override default types here
};


const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0A66C2',
    secondary: '#FF4081',
  },
};

export default function App() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    const pingServer = async () => {
      try {
        await fetch(
          'https://accountapp-backend-shardaassociates.onrender.com/ping',
        );
        console.log('✅ Server pinged to stay awake');
      } catch (error) {
        console.log('⚠️ Ping failed:', error.message);
      }
    };

    // 🔹 Ping immediately when app starts
    pingServer();

    // 🔹 Repeat every 5 minutes (300,000 ms)
    const interval = setInterval(pingServer, 5 * 60 * 1000);

    // 🔹 Clear interval when app closes/unmounts
    return () => clearInterval(interval);
  }, []);

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <CompanyProvider>
          <PermissionProvider>
            <UserPermissionsProvider>
              <NavigationContainer ref={navigationRef}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <AppNavigator role={role} setRole={setRole} />
              </NavigationContainer>
            </UserPermissionsProvider>
          </PermissionProvider>
        </CompanyProvider>
      </SafeAreaProvider>
      
      {/* 2. RENDER THE TOAST COMPONENT WITH THE CONFIGURATION */}
      <Toast config={toastConfig} /> 
    </PaperProvider>
  );
}