// src/components/layout/BottomNav.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Role-based menu items
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
    { name: 'Reports', icon: 'document-text-outline' },
  ],
  customer: [
    { name: 'Dashboard', icon: 'grid-outline' },
    { name: 'Transactions', icon: 'swap-horizontal-outline' },
    { name: 'Inventory', icon: 'cube-outline' },
    { name: 'Users', icon: 'people-outline' },
    { name: 'Reports', icon: 'document-text-outline' },
  ],
  client: [
    { name: 'Dashboard', icon: 'grid-outline' },
    { name: 'Transactions', icon: 'swap-horizontal-outline' },
    { name: 'Inventory', icon: 'cube-outline' },
    { name: 'Users', icon: 'people-outline' },
    { name: 'Reports', icon: 'document-text-outline' },
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
    <View style={styles.container}>
      {menuItems.map(item => (
        <TouchableOpacity
          key={item.name}
          style={styles.tab}
          onPress={() => handlePress(item.name)}
        >
          <Ionicons
            name={item.icon}
            size={24}
            color={activeTab === item.name ? '#4F46E5' : '#999'}
          />
          <Text
            style={[
              styles.label,
              { color: activeTab === item.name ? '#4F46E5' : '#999' },
            ]}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 70,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
});
