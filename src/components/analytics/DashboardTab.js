import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function DashboardTab({ selectedClient, selectedCompanyId }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard Tab</Text>
      <Text>Client: {selectedClient?.contactName}</Text>
      <Text>Company ID: {selectedCompanyId || "All Companies"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  title: { fontWeight: "bold", fontSize: 16, marginBottom: 6 },
});
