import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ProfitAndLossTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profit & Loss Tab</Text>
      <Text>Summary of profit and loss will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  title: { fontWeight: "bold", fontSize: 16, marginBottom: 6 },
});
