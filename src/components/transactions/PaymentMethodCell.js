// components/PaymentMethodCell.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Appearance,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CreditReminderPopup } from './CreditReminderPopupProps';

export const PaymentMethodCell = ({ transaction }) => {
  const [showReminderPopup, setShowReminderPopup] = useState(false);
  const [colorScheme, setColorScheme] = useState('light');

  // Detect color scheme
  React.useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    setColorScheme(Appearance.getColorScheme());
    return () => subscription.remove();
  }, []);

  const paymentMethod = transaction.paymentMethod;

  if (!paymentMethod) {
    return (
      <Text
        style={[
          styles.mutedText,
          { color: colorScheme === 'dark' ? '#9ca3af' : '#6b7280' },
        ]}
      >
        -
      </Text>
    );
  }

  const paymentMethodStyles = {
    Cash: {
      backgroundColor: colorScheme === 'dark' ? '#166534' : '#dcfce7',
      textColor: colorScheme === 'dark' ? '#86efac' : '#166534',
      borderColor: colorScheme === 'dark' ? '#16a34a' : '#22c55e',
    },
    Credit: {
      backgroundColor: colorScheme === 'dark' ? '#7c2d12' : '#ffedd5',
      textColor: colorScheme === 'dark' ? '#fdba74' : '#c2410c',
      borderColor: colorScheme === 'dark' ? '#ea580c' : '#f97316',
    },
    UPI: {
      backgroundColor: colorScheme === 'dark' ? '#1e3a8a' : '#dbeafe',
      textColor: colorScheme === 'dark' ? '#93c5fd' : '#1e40af',
      borderColor: colorScheme === 'dark' ? '#3b82f6' : '#2563eb',
    },
    'Bank Transfer': {
      backgroundColor: colorScheme === 'dark' ? '#4c1d95' : '#f3e8ff',
      textColor: colorScheme === 'dark' ? '#c4b5fd' : '#6b21a8',
      borderColor: colorScheme === 'dark' ? '#8b5cf6' : '#7c3aed',
    },
    Cheque: {
      backgroundColor: colorScheme === 'dark' ? '#374151' : '#f3f4f6',
      textColor: colorScheme === 'dark' ? '#d1d5db' : '#4b5563',
      borderColor: colorScheme === 'dark' ? '#6b7280' : '#9ca3af',
    },
  };

  const defaultStyle = {
    backgroundColor: colorScheme === 'dark' ? '#374151' : '#f3f4f6',
    textColor: colorScheme === 'dark' ? '#d1d5db' : '#4b5563',
    borderColor: colorScheme === 'dark' ? '#6b7280' : '#9ca3af',
  };

  const style = paymentMethodStyles[paymentMethod] || defaultStyle;

  return (
    <>
      <View style={styles.container}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: style.backgroundColor,
              borderColor: style.borderColor,
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: style.textColor }]}>
            {paymentMethod}
          </Text>
        </View>

        {paymentMethod === 'Credit' && transaction.type !== 'purchases' && (
          <TouchableOpacity
            onPress={() => setShowReminderPopup(true)}
            style={[
              styles.reminderButton,
              {
                backgroundColor:
                  colorScheme === 'dark' ? 'transparent' : 'transparent',
              },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon
              name="schedule"
              size={16}
              color={colorScheme === 'dark' ? '#fdba74' : '#f97316'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Credit Reminder Popup */}
      {paymentMethod === 'Credit' && transaction.type !== 'purchases' && (
        <CreditReminderPopup
          isOpen={showReminderPopup}
          onClose={() => setShowReminderPopup(false)}
          transaction={transaction}
          party={transaction.party || transaction.vendor}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  reminderButton: {
    padding: 4,
    borderRadius: 6,
  },
  mutedText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
