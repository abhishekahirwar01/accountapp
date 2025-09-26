import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function UsersTab({ selectedClient, selectedCompanyId, companyMap }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Users Tab</Text>
      <Text>Client: {selectedClient?.contactName}</Text>
      <Text>Company: {companyMap.get(selectedCompanyId) || "All Companies"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  title: { fontWeight: "bold", fontSize: 16, marginBottom: 6 },
});
