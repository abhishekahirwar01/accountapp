// Tabs.js
import React, { useState, createContext, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

// Create context for tabs
const TabsContext = createContext();

// Main Tabs component
export const Tabs = ({ defaultValue, value, onValueChange, children, style }) => {
  const [activeTab, setActiveTab] = useState(value || defaultValue);
  

  const handleValueChange = (newValue) => {
    setActiveTab(newValue);
    onValueChange?.(newValue);
  };

  const contextValue = {
    activeTab: value || activeTab,
    onTabChange: handleValueChange,
  };

  return (
    <TabsContext.Provider value={contextValue}>
      <View style={[styles.tabsContainer, style]}>
        {children}
      </View>
    </TabsContext.Provider>
  );
};

// TabsList component
export const TabsList = React.forwardRef(({ children, style, ...props }, ref) => {
  return (
    <View ref={ref} style={[styles.tabsList, style]} {...props}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsListContent}
      >
        {children}
      </ScrollView>
    </View>
  );
});

TabsList.displayName = 'TabsList';

// TabsTrigger component
export const TabsTrigger = React.forwardRef(({ 
  value, 
  children, 
  style, 
  disabled,
  ...props 
}, ref) => {
  const { activeTab, onTabChange } = useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <TouchableOpacity
      ref={ref}
      style={[
        styles.tabTrigger,
        isActive && styles.tabTriggerActive,
        disabled && styles.tabTriggerDisabled,
        style,
      ]}
      onPress={() => !disabled && onTabChange(value)}
      disabled={disabled}
      {...props}
    >
      <Text style={[
        styles.tabTriggerText,
        isActive && styles.tabTriggerTextActive,
        disabled && styles.tabTriggerTextDisabled,
      ]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
});

TabsTrigger.displayName = 'TabsTrigger';

// TabsContent component
export const TabsContent = React.forwardRef(({ value, children, style, ...props }, ref) => {
  const { activeTab } = useContext(TabsContext);

  if (value !== activeTab) {
    return null;
  }

  return (
    <View ref={ref} style={[styles.tabContent, style]} {...props}>
      {children}
    </View>
  );
});

TabsContent.displayName = 'TabsContent';

// Styles
const styles = StyleSheet.create({
  tabsContainer: {
    width: '100%',
  },
  tabsList: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'rgba(243, 244, 246, 0.6)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
  },
  tabsListContent: {
    padding: 4,
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  tabTrigger: {
    minHeight: 40,
    minWidth: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 2,
  },
  tabTriggerActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabTriggerDisabled: {
    opacity: 0.5,
  },
  tabTriggerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  tabTriggerTextActive: {
    color: '#111827',
  },
  tabTriggerTextDisabled: {
    color: '#9ca3af',
  },
  tabContent: {
    marginTop: 16,
  },
});

// Usage example:
/*
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';

const MyComponent = () => {
  return (
    <Tabs defaultValue="products" onValueChange={(value) => console.log(value)}>
      <TabsList>
        <TabsTrigger value="products">
          Products
        </TabsTrigger>
        <TabsTrigger value="services">
          Services
        </TabsTrigger>
        <TabsTrigger value="inventory" disabled>
          Inventory
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="products">
        <Text>Products content goes here</Text>
      </TabsContent>
      
      <TabsContent value="services">
        <Text>Services content goes here</Text>
      </TabsContent>
      
      <TabsContent value="inventory">
        <Text>Inventory content goes here</Text>
      </TabsContent>
    </Tabs>
  );
};
*/