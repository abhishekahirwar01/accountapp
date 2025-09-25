// ClientCard.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Clipboard from "@react-native-clipboard/clipboard";

export default function ClientCard({ client, onEdit, onDelete }) {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const copyToClipboard = () => {
    if (client?.slug) {
      Clipboard.setString(`https://yourapp.com/${client.slug}`);
      Alert.alert("Copied", "Login URL copied to clipboard!");
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{client.contactName}</Text>
        <Text style={styles.email}>{client.email}</Text>
      </View>

      {/* Body */}
      <View style={styles.content}>
        {/* Username */}
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: "#e0f2fe" }]}>
            <Ionicons name="person-outline" size={18} color="#0284c7" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.label}>Username</Text>
            <Text style={styles.value}>{client.clientUsername}</Text>
          </View>
        </View>

        {/* Phone */}
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: "#dcfce7" }]}>
            <Ionicons name="call-outline" size={18} color="#16a34a" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{client.phone}</Text>
          </View>
        </View>

        {/* Joined */}
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: "#f3e8ff" }]}>
            <Ionicons name="calendar-outline" size={18} color="#9333ea" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.label}>Joined</Text>
            <Text style={styles.value}>{formatDate(client.createdAt)}</Text>
          </View>
        </View>

        {/* URL */}
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: "#ffedd5" }]}>
            <Ionicons name="globe-outline" size={18} color="#ea580c" />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.label}>URL</Text>
            {client.slug ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.value}>
                  {`https://yourapp.com/${client.slug}`}
                </Text>
                <TouchableOpacity
                  onPress={copyToClipboard}
                  style={{ marginLeft: 6 }}
                >
                  <Ionicons name="copy-outline" size={20} color="#555" />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.value, { color: "#888" }]}>Not set</Text>
            )}
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { borderColor: "#0284c7" }]}
          onPress={() => Alert.alert("View Analytics")}
        >
          <Ionicons name="eye-outline" size={16} color="#0284c7" />
          <Text style={[styles.buttonText, { color: "#0284c7" }]}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { borderColor: "#9333ea" }]}
          onPress={onEdit}
        >
          <Ionicons name="create-outline" size={16} color="#9333ea" />
          <Text style={[styles.buttonText, { color: "#9333ea" }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { borderColor: "#ef4444" }]}
          onPress={() => client?._id && onDelete(client._id)}
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
          <Text style={[styles.buttonText, { color: "#ef4444" }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
  },
  email: {
    fontSize: 14,
    color: "#666",
  },
  content: {
    marginTop: 8,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  rowText: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginLeft: 12,
  },
  label: {
    color: "#666",
  },
  value: {
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginLeft: 8, // replaces gap
  },
  buttonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "500",
  },
});
