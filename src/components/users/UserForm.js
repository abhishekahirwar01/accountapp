import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

// ✅ Put your real role IDs here
const DEFAULT_ROLES = [
  { _id: "REPLACE_ADMIN_ROLE_ID", name: "admin" },
  { _id: "REPLACE_USER_ROLE_ID", name: "user" },
];

// Helper functions
const isObjectId = (s) => !!s && /^[a-f0-9]{24}$/i.test(s);

const coerceRoleName = (r) => {
  if (!r) return null;
  if (typeof r === "string") return r.toLowerCase();
  if (typeof r === "object") {
    const o = r;
    const n = ((o.name || o.label || "").toLowerCase());
    return n || null;
  }
  return null;
};

const mapExistingRoleToForm = (r, roles) => {
  const n = coerceRoleName(r);
  if (n) {
    if (n === "admin" || n === "manager" || n === "client") return "admin";
    if (n === "user") return "user";
  }

  if (typeof r === "string" && isObjectId(r)) {
    const found = roles.find((x) => x._id === r);
    if (found) return found.name;
  }

  if (r && typeof r === "object" && "_id" in r) {
    const id = r._id;
    const found = roles.find((x) => x._id === id);
    if (found) return found.name;
  }

  return "user";
};

const UserForm = ({ user, allCompanies, onSave, onCancel }) => {
  const [roles] = useState(DEFAULT_ROLES);
  const [rolesLoading] = useState(false);

  const [formData, setFormData] = useState({
    userName: "",
    userId: "",
    password: "",
    email: "",
    contactNumber: "",
    address: "",
    companies: [],
    roleId: "",
  });

  const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);

  // Initialize form data when user prop changes
  useEffect(() => {
    setFormData((prev) =>
      user
        ? {
            userName: user.userName || "",
            userId: user.userId || "",
            password: "",
            contactNumber: user.contactNumber || "",
            email: user.email || "",
            address: user.address || "",
            companies: Array.isArray(user.companies)
              ? user.companies
                  .map((c) => (typeof c === "string" ? c : c?._id))
                  .filter(Boolean)
              : [],
            roleId: prev.roleId,
          }
        : {
            userName: "",
            userId: "",
            password: "",
            contactNumber: "",
            email: "",
            address: "",
            companies: [],
            roleId: prev.roleId,
          }
    );

    // Set selected companies
    if (user && Array.isArray(user.companies)) {
      const companyIds = user.companies
        .map((c) => (typeof c === "string" ? c : c?._id))
        .filter(Boolean);
      setSelectedCompanyIds(companyIds);
    } else {
      setSelectedCompanyIds([]);
    }
  }, [user]);

  // Set default role
  useEffect(() => {
    if (!roles || roles.length === 0) return;

    if (!user) {
      // creating → default to "user"
      const def = roles.find((r) => r.name === "user") || roles[0];
      setFormData((prev) => ({ ...prev, roleId: def._id }));
    } else {
      // editing → correctly map existing role to "admin" | "user"
      const coerced = mapExistingRoleToForm(user.role, roles);
      const match = roles.find((r) => r.name === coerced);
      if (match) setFormData((prev) => ({ ...prev, roleId: match._id }));
    }
  }, [roles, user]);

  const handleSubmit = () => {
    const selectedRole =
      roles.find((r) => r._id === formData.roleId) ||
      roles.find((r) => r.name === "user");

    if (!selectedRole) {
      Alert.alert("Error", "Please select a role");
      return;
    }

    // Build payload
    const payload = {
      userName: formData.userName,
      contactNumber: formData.contactNumber,
      email: formData.email?.trim(),
      address: formData.address,
      companies: selectedCompanyIds,
    };

    // Creation vs update
    if (!user) payload.userId = formData.userId;

    // Only send password if user typed one
    if (formData.password?.trim()) {
      payload.password = formData.password.trim();
    }

    // Send role
    const looksLikeObjectId = /^[a-f0-9]{24}$/i.test(selectedRole._id);
    if (looksLikeObjectId) payload.roleId = selectedRole._id;
    else payload.roleName = selectedRole.name;

    onSave(payload);
  };

  const handleCompanySelect = (companyId) => {
    setSelectedCompanyIds((prev) => {
      if (prev.includes(companyId)) {
        return prev.filter((id) => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
  };

  const selectedCompanies = allCompanies.filter((c) =>
    selectedCompanyIds.includes(c._id)
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Row: User Name + User ID */}
        <View style={styles.row}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>User Name</Text>
            <TextInput
              style={styles.input}
              value={formData.userName}
              onChangeText={(text) =>
                setFormData({ ...formData, userName: text })
              }
              placeholder="Enter user name"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>User ID</Text>
            <TextInput
              style={[styles.input, user && styles.disabledInput]}
              value={formData.userId}
              onChangeText={(text) =>
                setFormData({ ...formData, userId: text })
              }
              placeholder="Enter user ID"
              editable={!user}
            />
          </View>
        </View>

        {!user && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={formData.password}
              onChangeText={(text) =>
                setFormData({ ...formData, password: text })
              }
              placeholder="Enter password"
              secureTextEntry
            />
          </View>
        )}

        {/* Contact Number */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Contact Number</Text>
          <TextInput
            style={styles.input}
            value={formData.contactNumber}
            onChangeText={(text) =>
              setFormData({ ...formData, contactNumber: text })
            }
            placeholder="Enter contact number"
            keyboardType="phone-pad"
          />
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Address */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholder="Enter address"
            multiline
          />
        </View>

        {/* Role selector */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Role</Text>
          {rolesLoading ? (
            <Text style={styles.loadingText}>Loading roles...</Text>
          ) : roles.length === 0 ? (
            <Text style={styles.errorText}>
              No roles available. Please set DEFAULT_ROLES ids.
            </Text>
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.roleId}
                onValueChange={(value) =>
                  setFormData({ ...formData, roleId: value })
                }
                style={styles.picker}
              >
                {roles.map((r) => (
                  <Picker.Item
                    key={r._id}
                    label={r.name}
                    value={r._id}
                  />
                ))}
              </Picker>
            </View>
          )}
        </View>

        {/* Companies multi-select */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Companies</Text>
          <View style={styles.companiesContainer}>
            {allCompanies.map((company) => (
              <TouchableOpacity
                key={company._id}
                style={[
                  styles.companyItem,
                  selectedCompanyIds.includes(company._id) &&
                    styles.selectedCompanyItem,
                ]}
                onPress={() => handleCompanySelect(company._id)}
              >
                <Text
                  style={[
                    styles.companyText,
                    selectedCompanyIds.includes(company._id) &&
                      styles.selectedCompanyText,
                  ]}
                >
                  {company.businessName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Selected companies badges */}
          {selectedCompanies.length > 0 && (
            <View style={styles.selectedCompanies}>
              <Text style={styles.selectedCompaniesLabel}>Selected Companies:</Text>
              <View style={styles.badgesContainer}>
                {selectedCompanies.map((company) => (
                  <View key={company._id} style={styles.badge}>
                    <Text style={styles.badgeText}>{company.businessName}</Text>
                    <TouchableOpacity
                      onPress={() => handleCompanySelect(company._id)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>
              {user ? "Update" : "Create"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  form: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  inputContainer: {
    marginBottom: 16,
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  disabledInput: {
    backgroundColor: "#f3f4f6",
    color: "#9ca3af",
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  companiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  companyItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 20,
    backgroundColor: "#f9fafb",
  },
  selectedCompanyItem: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  companyText: {
    fontSize: 14,
    color: "#374151",
  },
  selectedCompanyText: {
    color: "#fff",
    fontWeight: "500",
  },
  selectedCompanies: {
    marginTop: 8,
  },
  selectedCompaniesLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#374151",
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  badgeText: {
    fontSize: 14,
    color: "#374151",
  },
  removeButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#9ca3af",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    lineHeight: 14,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
  },
});

export default UserForm;