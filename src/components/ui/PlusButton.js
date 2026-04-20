import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const PlusButton = React.forwardRef(({ onPress }, ref) => (
  <TouchableOpacity
    ref={ref}
    style={styles.btn}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Text style={styles.text}>+</Text>
  </TouchableOpacity>
));

PlusButton.displayName = 'PlusButton';

export default PlusButton;

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#75bbd4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
});
