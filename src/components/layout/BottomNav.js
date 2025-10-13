// src/components/layout/BottomNav.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

const roleMenus = {
  master: [
    { name: 'Dashboard', icon: 'grid-outline' },
    { name: 'Clients', icon: 'people-outline' },
    { name: 'Companies', icon: 'business-outline' },
    { name: 'Analytics', icon: 'bar-chart-outline' },
    { name: 'Settings', icon: 'settings-outline' },
  ],
  admin: [
    { name: 'Dashboard', icon: 'grid-outline' },
    { name: 'Users', icon: 'people-outline' },
    { name: 'Inventory', icon: 'cube-outline' },
    { name: 'Companies', icon: 'business-outline' },
    { name: 'Reports', icon: 'document-text-outline' },
    { name: 'Settings', icon: 'settings-outline' },
  ],
  customer: [
    { name: 'Dashboard', icon: 'grid-outline' },
    { name: 'Transactions', icon: 'swap-horizontal-outline' },
    { name: 'Inventory', icon: 'cube-outline' },
    { name: 'Users', icon: 'people-outline' },
    { name: 'Companies', icon: 'business-outline' },
    { name: 'Reports', icon: 'document-text-outline' },
  ],
  client: [
    { name: 'Dashboard', icon: 'grid-outline' },
    { name: 'Transactions', icon: 'swap-horizontal-outline' },
    { name: 'Inventory', icon: 'cube-outline' },
    { name: 'Users', icon: 'people-outline' },
    { name: 'Companies', icon: 'business-outline' },
    { name: 'Reports', icon: 'document-text-outline' },
  ],
  user: [
    { name: 'Dashboard', icon: 'grid-outline' },
    { name: 'Transactions', icon: 'swap-horizontal-outline' },
    { name: 'Inventory', icon: 'cube-outline' },
     { name: 'Settings', icon: 'settings-outline' },
  ],
};

export default function BottomNav({ role = 'customer', onTabChange }) {
  const [activeTab, setActiveTab] = useState(roleMenus[role][0].name);
  const [menuItems, setMenuItems] = useState(roleMenus[role]);

  useEffect(() => {
    setMenuItems(roleMenus[role]);
    setActiveTab(roleMenus[role][0].name);
  }, [role]);

  const handlePress = tab => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        {menuItems.map(item => (
          <TouchableOpacity
            key={item.name}
            style={styles.tab}
            onPress={() => handlePress(item.name)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={item.icon}
              size={22}
              color={activeTab === item.name ? '#0A66C2' : '#666'}
            />
            <Text
              style={[
                styles.label,
                { color: activeTab === item.name ? '#0A66C2' : '#666' },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
  },
  container: {
    flexDirection: 'row',
    height: 56,
    borderTopWidth: 0.5,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
  },
});
