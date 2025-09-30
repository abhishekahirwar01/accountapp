import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';

const UpdateWalkthrough = () => {
  return (
    <TouchableOpacity activeOpacity={0.85} style={[styles.btn, styles.btnOutline]} onPress={() => {}}>
      <Text>What’s New</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginRight: 8 },
  btnOutline: { borderWidth: 1, borderColor: '#ccc', backgroundColor: 'white' },
});

export default UpdateWalkthrough;
