import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function BalanceSheetTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Balance Sheet Tab</Text>
      <Text>Balance sheet details will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  title: { fontWeight: "bold", fontSize: 16, marginBottom: 6 },
});
