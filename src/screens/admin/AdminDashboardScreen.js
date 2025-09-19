import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function AdminDashboardScreen({ setRole }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>👑 Admin Dashboard</Text>
      <TouchableOpacity style={styles.button} onPress={() => setRole(null)}>
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  button: { padding: 12, backgroundColor: "#2563eb", borderRadius: 8 },
  btnText: { color: "#fff", fontSize: 16 },
});
