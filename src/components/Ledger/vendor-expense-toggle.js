import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet
} from 'react-native';

export function VendorExpenseToggle({ currentView, onViewChange }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          currentView === 'vendor' ? styles.activeButton : styles.inactiveButton,
          currentView === 'vendor' ? styles.vendorActive : styles.vendorInactive
        ]}
        onPress={() => onViewChange('vendor')}
      >
        <Text style={[
          styles.buttonText,
          currentView === 'vendor' ? styles.activeText : styles.inactiveText
        ]}>
          Vendor Account
        </Text>
        <Text style={[
          styles.buttonTextMobile,
          currentView === 'vendor' ? styles.activeText : styles.inactiveText
        ]}>
          Vendor
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.button,
          currentView === 'expense' ? styles.activeButton : styles.inactiveButton,
          currentView === 'expense' ? styles.expenseActive : styles.expenseInactive
        ]}
        onPress={() => onViewChange('expense')}
      >
        <Text style={[
          styles.buttonText,
          currentView === 'expense' ? styles.activeText : styles.inactiveText
        ]}>
          Expense Account
        </Text>
         <Text style={[
          styles.buttonTextMobile,
          currentView === 'expense' ? styles.activeText : styles.inactiveText
        ]}>
          expense
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 4,
  },
  button: {
    paddingHorizontal: 12,
    // paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    height: 25,
    minWidth: 80,
  },
  activeButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inactiveButton: {
    backgroundColor: 'transparent',
  },
  vendorActive: {
    backgroundColor: '#007AFF', // blue-600
  },
  vendorInactive: {
    
  
  },
  expenseActive: {
    backgroundColor: '#007AFF', 
  },
  expenseInactive: {
   
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    display: 'none', 
  },
  buttonTextMobile: {
    fontSize: 12,
    fontWeight: '500',
    display: 'flex', 
  },
  activeText: {
    color: 'white',
  },
  inactiveText: {
    color: '#475569', 
  },
});