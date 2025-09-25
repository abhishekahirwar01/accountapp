import React, { useState } from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { Provider as PaperProvider, MD3LightTheme as DefaultTheme } from "react-native-paper";

import AppNavigator from "./src/navigation/AppNavigator";

// Custom theme (optional)
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#0A66C2", // LinkedIn blue
    secondary: "#FF4081",
  },
};

export default function App() {
  const [role, setRole] = useState(null); // initially null

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />
          <AppNavigator role={role} setRole={setRole} />
        </NavigationContainer>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
