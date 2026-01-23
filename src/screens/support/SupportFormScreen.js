import React from 'react';
import { View, StyleSheet } from 'react-native';
import SupportForm from '../../components/support/SupportForm';

export default function SupportFormScreen({ navigation }) {
  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <SupportForm isVisible={true} onClose={handleClose} fullScreen={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
