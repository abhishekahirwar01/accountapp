import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../../config";

// --- Helper functions (Unchanged) ---
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
// --- End Helper functions ---

const UserForm = ({ user, allCompanies, onSave, onCancel }) => {
  // 1. ALL HOOKS MUST BE AT THE TOP LEVEL (UNCONDITIONAL)
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(null); // Hook for tracking focus

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

  // Fetch roles from API
  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${BASE_URL}/api/roles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch roles: ${response.status}`);
      }

      const data = await response.json();
      
      const rolesData = Array.isArray(data) 
        ? data 
        : data?.data || data?.roles || [];

      if (rolesData.length === 0) {
        setRoles([
          { _id: "admin", name: "admin" },
          { _id: "user", name: "user" },
        ]);
      } else {
        setRoles(rolesData);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      Alert.alert(
        "Error", 
        "Failed to load roles. Using default roles.",
        [{ text: "OK" }]
      );
      setRoles([
        { _id: "admin", name: "admin" },
        { _id: "user", name: "user" },
      ]);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // Initialize form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        userName: user.userName || "",
        userId: user.userId || "",
        password: "",
        contactNumber: user.contactNumber || "",
        email: user.email || "",
        address: user.address || "",
        companies: [],
        roleId: "",
      });

      const companyIds = Array.isArray(user.companies)
        ? user.companies
            .map((c) => (typeof c === "string" ? c : c?._id))
            .filter(Boolean)
        : [];
      setSelectedCompanyIds(companyIds);
    } else {
      setFormData({
        userName: "",
        userId: "",
        password: "",
        contactNumber: "",
        email: "",
        address: "",
        companies: [],
        roleId: "",
      });
      setSelectedCompanyIds([]);
    }
  }, [user]);

  // Set default role when roles are loaded
  useEffect(() => {
    if (roles.length === 0) return;

    if (!user) {
      const def = roles.find((r) => r.name === "user") || roles[0];
      if (def) {
        setFormData((prev) => ({ ...prev, roleId: def._id }));
      }
    } else {
      const coerced = mapExistingRoleToForm(user.role, roles);
      const match = roles.find((r) => r.name === coerced);
      if (match) {
        setFormData((prev) => ({ ...prev, roleId: match._id }));
      }
    }
  }, [roles, user]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.userName.trim()) {
      Alert.alert("Error", "Please enter user name");
      return;
    }

    if (!user && !formData.userId.trim()) {
      Alert.alert("Error", "Please enter user ID");
      return;
    }

    if (!user && !formData.password.trim()) {
      Alert.alert("Error", "Please enter password");
      return;
    }

    if (!formData.roleId) {
      Alert.alert("Error", "Please select a role");
      return;
    }

    const selectedRole = roles.find((r) => r._id === formData.roleId);
    if (!selectedRole) {
      Alert.alert("Error", "Please select a valid role");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build payload
      const payload = {
        userName: formData.userName.trim(),
        contactNumber: formData.contactNumber.trim(),
        email: formData.email?.trim() || " ",
        address: formData.address.trim(),
        companies: selectedCompanyIds,
      };

      if (!user) {
        payload.userId = formData.userId.trim();
      }

      if (formData.password?.trim()) {
        payload.password = formData.password.trim();
      }

      const looksLikeObjectId = /^[a-f0-9]{24}$/i.test(selectedRole._id);
      if (looksLikeObjectId) {
        payload.roleId = selectedRole._id;
      } else {
        payload.roleName = selectedRole.name;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      let response;
      if (user) {
        response = await fetch(`${BASE_URL}/api/users/${user._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`${BASE_URL}/api/users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to ${user ? 'update' : 'create'} user`);
      }

      const result = await response.json();
      
      Alert.alert(
        "Success", 
        `User ${user ? 'updated' : 'created'} successfully`,
        [{ text: "OK", onPress: onSave }]
      );

    } catch (error) {
      console.error('Error saving user:', error);
      Alert.alert(
        "Error", 
        error.message || `Failed to ${user ? 'update' : 'create'} user`,
        [{ text: "OK" }]
      );
    } finally {
      setIsSubmitting(false);
    }
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

  const getInputStyle = (name) => [
    styles.input,
    isFocused === name && styles.inputFocused,
    user && name === 'userId' && styles.disabledInput,
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* <Text style={styles.headerTitle}>
          {user ? "Edit User Account" : "Create New User"}
        </Text>
        <Text style={styles.headerSubtitle}>
          Fill in the details to manage the user's profile and access.
        </Text> */}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>General Information</Text>

          {/* Row: User Name + User ID */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>User Name *</Text>
              <TextInput
                style={getInputStyle('userName')}
                value={formData.userName}
                onChangeText={(text) =>
                  setFormData({ ...formData, userName: text })
                }
                onFocus={() => setIsFocused('userName')}
                onBlur={() => setIsFocused(null)}
                placeholder="Enter user's full name"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>User ID {!user && '*'}</Text>
              <TextInput
                style={getInputStyle('userId')}
                value={formData.userId}
                onChangeText={(text) =>
                  setFormData({ ...formData, userId: text })
                }
                onFocus={() => setIsFocused('userId')}
                onBlur={() => setIsFocused(null)}
                placeholder="Unique login ID"
                placeholderTextColor="#9ca3af"
                editable={!user}
              />
            </View>
          </View>

          {/* Password (only visible for new user creation) */}
          {!user && (
            <View style={styles.inputGroupFull}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={getInputStyle('password')}
                value={formData.password}
                onChangeText={(text) =>
                  setFormData({ ...formData, password: text })
                }
                onFocus={() => setIsFocused('password')}
                onBlur={() => setIsFocused(null)}
                placeholder="Set a secure password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
              />
            </View>
          )}

          {/* Contact Number */}
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              style={getInputStyle('contactNumber')}
              value={formData.contactNumber}
              onChangeText={(text) =>
                setFormData({ ...formData, contactNumber: text })
              }
              onFocus={() => setIsFocused('contactNumber')}
              onBlur={() => setIsFocused(null)}
              placeholder="e.g., +1 555-123-4567"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={getInputStyle('email')}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              onFocus={() => setIsFocused('email')}
              onBlur={() => setIsFocused(null)}
              placeholder="user@company.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Address */}
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[getInputStyle('address'), styles.textArea]}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              onFocus={() => setIsFocused('address')}
              onBlur={() => setIsFocused(null)}
              placeholder="Street, City, Zip Code"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Access & Permissions</Text>

          {/* Role selector */}
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Role *</Text>
            {rolesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#10b981" />
                <Text style={styles.loadingText}>Loading roles...</Text>
              </View>
            ) : roles.length === 0 ? (
              <Text style={styles.errorText}>
                No roles available
              </Text>
            ) : (
              <View style={[styles.pickerWrapper, isFocused === 'role' && styles.pickerFocused]} >
                <Picker
                  selectedValue={formData.roleId}
                  onValueChange={(value) => {
                    setFormData({ ...formData, roleId: value });
                    // Manual focus tracking for Picker (optional)
                    setIsFocused('role'); 
                    setTimeout(() => setIsFocused(null), 100); 
                  }}
                  style={styles.picker}
                  mode="dropdown"
                >
                  <Picker.Item label="Select a role" value="" color="#9ca3af" />
                  {roles.map((r) => (
                    <Picker.Item
                      key={r._id}
                      label={r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                      value={r._id}
                    />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {/* Companies multi-select */}
          <View style={styles.inputGroupFull}>
            <Text style={styles.label}>Company Access</Text>
            <Text style={styles.helperText}>
              Select the companies this user is authorized to view/manage.
            </Text>
            
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
                <Text style={styles.selectedCompaniesLabel}>Current Selection:</Text>
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
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          {/* <Text style={styles.requiredTextNote}>* Required fields</Text> */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.cancelButton, isSubmitting && styles.disabledButton]} 
              onPress={onCancel}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.disabledButton]} 
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {user ? "Update User" : "Create User"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

// --- Updated Professional Stylesheet ---
const PRIMARY_COLOR = "#10b981"; // Tailwind emerald-500
const SECONDARY_COLOR = "#374151"; // Dark text
const BORDER_COLOR = "#e5e7eb"; // Light gray border
const BACKGROUND_COLOR = "#f9fafb"; // Very light gray background

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  form: {
    paddingHorizontal: 2,
    // paddingVertical: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: SECONDARY_COLOR,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
    flex: 1,
  },
  inputGroupFull: {
    marginBottom: 16,
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: SECONDARY_COLOR,
  },
  helperText: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 10,
    fontStyle: "italic",
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: SECONDARY_COLOR,
  },
  inputFocused: {
    borderColor: PRIMARY_COLOR, 
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  disabledInput: {
    backgroundColor: "#f3f4f6",
    color: "#9ca3af",
  },
  // Role Selector
  pickerWrapper: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
    ...(Platform.OS === 'ios' && {
      height: 50,
      justifyContent: 'center',
    }),
  },
  pickerFocused: {
    borderColor: PRIMARY_COLOR,
  },
  picker: {
    height: Platform.OS === 'ios' ? 50 : 50,
    width: '100%',
    color: SECONDARY_COLOR,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    paddingVertical: 12,
  },
  // Companies Multi-Select
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
    borderColor: BORDER_COLOR,
    borderRadius: 20,
    backgroundColor: "#f0fdf4",
  },
  selectedCompanyItem: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  companyText: {
    fontSize: 14,
    color: SECONDARY_COLOR,
  },
  selectedCompanyText: {
    color: "#fff",
    fontWeight: "600",
  },
  // Selected Companies Badges
  selectedCompanies: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_COLOR,
  },
  selectedCompaniesLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#065f46",
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 13,
    color: "#065f46",
  },
  removeButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    lineHeight: 14,
  },
  // Buttons and Footer
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  requiredTextNote: {
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "500",
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#9ca3af",
    backgroundColor: "#fff",
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4b5563",
  },
  submitButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: PRIMARY_COLOR,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  disabledButton: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default UserForm;