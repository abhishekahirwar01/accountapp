import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function CompaniesTab({ selectedClient, selectedClientId }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Companies Tab</Text>
      <Text>Client: {selectedClient?.contactName}</Text>
      <Text>Client ID: {selectedClientId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  title: { fontWeight: "bold", fontSize: 16, marginBottom: 6 },
});
