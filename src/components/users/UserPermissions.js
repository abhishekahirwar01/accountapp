import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert, 
  ScrollView, 
  Switch, // Replaces the Checkbox component for a mobile look
} from "react-native";

// --- Mock Components and Hooks ---

// Mock 'useToast' hook 
const useToast = () => {
  return {
    toast: ({ variant, title, description }) => {
      let message = title;
      if (description) message += `\n${description}`;
      Alert.alert(variant === 'destructive' ? "Error" : "Success", message);
    },
  };
};

// Mock 'Button' Component 
const Button = ({ children, onPress, disabled, style, variant, size }) => {
  const buttonStyle = [
    styles.buttonBase,
    variant === 'ghost' ? styles.buttonGhost : styles.buttonPrimary,
    disabled && styles.buttonDisabled,
    style,
    size === 'sm' && styles.buttonSmall,
  ];
  const textStyle = variant === 'ghost' ? styles.textGhost : styles.textPrimary;

  const Content = (
    <View style={styles.buttonContent}>
      {children}
    </View>
  );

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={buttonStyle}>
      {typeof children === 'string' ? (
        <Text style={textStyle}>{children}</Text>
      ) : (
        Content
      )}
    </TouchableOpacity>
  );
};

// --- Permission Logic (Core Business Logic) ---

const ALL_CAPS = [
  "canCreateInventory",
  "canCreateCustomers",
  "canCreateVendors",
  "canCreateCompanies",
  "canUpdateCompanies",
  "canSendInvoiceEmail",
  "canSendInvoiceWhatsapp",
  "canCreateSaleEntries",
  "canCreatePurchaseEntries",
  "canCreateJournalEntries",
  "canCreateReceiptEntries",
  "canCreatePaymentEntries",
  "canShowCustomers",
  "canShowVendors", 
];

const CAP_LABELS = {
  canCreateInventory: "Create Inventory",
  canCreateCustomers: "Create Customers",
  canCreateVendors: "Create Vendors",
  canCreateCompanies: "Create Companies",
  canUpdateCompanies: "Update Companies",
  canSendInvoiceEmail: "Send Invoice via Email",
  canSendInvoiceWhatsapp: "Send Invoice via WhatsApp",
  canCreateSaleEntries: "Create Sales",
  canCreatePurchaseEntries: "Create Purchase",
  canCreateJournalEntries: "Create Journal",
  canCreateReceiptEntries: "Create Receipt",
  canCreatePaymentEntries: "Create Payment",
  canShowCustomers: "Show Customers",
  canShowVendors: "Show Vendors",
};

const PRIMARY_CAPS = [
  "canCreateSaleEntries",
  "canCreatePurchaseEntries",
  "canCreateReceiptEntries",
  "canCreatePaymentEntries",
  "canCreateJournalEntries",
];

const DEPENDENCIES = {
  canCreateSaleEntries: ["canCreateInventory", "canCreateCustomers", "canShowCustomers"],
  canCreatePurchaseEntries: ["canCreateVendors", "canCreateInventory", "canShowVendors"],
};

const DEP_VALUES = Object.values(DEPENDENCIES).flat();
const DEP_KEYS = Array.from(new Set(DEP_VALUES));
const VISIBLE_KEYS = [...PRIMARY_CAPS, ...DEP_KEYS];


// --- Mock Data & API Simulation ---

const MOCK_USER_PERMISSIONS = {
    // Example state: Sales is on, Purchases is off
    canCreateSaleEntries: true,
    canCreatePurchaseEntries: false,
    canCreateInventory: true,
    canCreateCustomers: true,
    canShowCustomers: true,
    canCreateVendors: false,
    canShowVendors: false,
    // all others false
};

const fetchMockPermissions = async (userId) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simulate finding existing permissions for a known user 
    if (userId === 'mock-user-123') { // Assuming 'mock-user-123' is a known test ID
        return MOCK_USER_PERMISSIONS;
    } 
    // Simulate 404/new user (return all false)
    return ALL_CAPS.reduce((acc, key) => ({ ...acc, [key]: false }), {});
};

const saveMockPermissions = async (userId, body) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simulate save error 10% of the time
    if (Math.random() < 0.1) {
        return { success: false, message: "Simulated Server Error: Database connection failed." };
    }
    
    // Simulate successful save
    return { success: true, message: "Permissions saved successfully." };
};


// --- Main Component ---

function ManageUserPermissionsDialog({ open, onClose, user }) {
  const { toast } = useToast();

  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);

  // useEffect: Fetching permissions when the dialog opens
  useEffect(() => {
    // The user object is of type User, which contains `_id` and `userName`
    if (!open || !user?._id) return;
    
    (async () => {
      try {
        setLoading(true);
        const data = await fetchMockPermissions(user._id);
        
        const init = {};
        for (const k of ALL_CAPS) init[k] = data[k] === true;
        setOverrides(init);
        
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Failed to load permissions",
          description: String(e),
        });
        const init = {};
        for (const k of ALL_CAPS) init[k] = false;
        setOverrides(init);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, user?._id]); 

  const togglePermission = (k) => {
    setOverrides((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const togglePrimary = (k) => {
    setOverrides((prev) => {
      const next = { ...prev };
      const nextVal = !prev[k];
      next[k] = nextVal;

      const deps = DEPENDENCIES[k] || [];
      if (deps.length) {
        if (nextVal) {
          // turning ON → preselect deps (editable)
          for (const d of deps) next[d] = true;
        } else {
          // turning OFF → turn deps off
          // Only turn off if no other primary entry depends on it (complex logic, simplified here)
          for (const d of deps) next[d] = false; 
        }
      }
      return next;
    });
  };

  const denyAll = () => {
    setOverrides((prev) => {
      const next = { ...prev };
      for (const k of VISIBLE_KEYS) next[k] = false;
      return next;
    });
  };

  const allowAll = () => {
    setOverrides((prev) => {
      const next = { ...prev };
      for (const k of VISIBLE_KEYS) next[k] = true;
      return next;
    });
  };

  const save = async () => {
    setLoading(true);
    try {
      const body = {};
      for (const k of ALL_CAPS) body[k] = overrides[k] || false;

      // Rule: ensure email/whatsapp stay off (as per original code)
      body.canSendInvoiceEmail = false;
      body.canSendInvoiceWhatsapp = false;
      
      const res = await saveMockPermissions(user._id, body);
      
      if (!res.success) {
         throw new Error(res.message || "Failed to save permissions");
      }

      toast({ title: "Permissions updated" });
      onClose();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: String(e),
      });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={open}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Manage Permissions — {user.userName || "User"}
            </Text>
          </View>
          
          {/* Scrollable Content */}
          <ScrollView style={styles.bodyScroll}>
            <View style={styles.body}>
                
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#666" />
                  <Text style={styles.loadingText}>Loading…</Text>
                </View>
              ) : (
                <View style={styles.contentContainer}>
                  {/* Deny All / Allow All Buttons */}
                  <View style={styles.buttonRow}>
                    <Button size="sm" variant="outline" onPress={denyAll}>
                      Deny All
                    </Button>
                    <Button size="sm" variant="outline" onPress={allowAll}>
                      Allow All
                    </Button>
                  </View>

                  {/* Permissions Grid */}
                  <View style={styles.permissionsGrid}>
                    {PRIMARY_CAPS.map((k) => {
                      const isAllowed = overrides[k] === true;
                      const badge = isAllowed ? "Allow" : "Deny";
                      const badgeColor = isAllowed ? styles.textSuccess : styles.textDestructive;
                      const deps = (DEPENDENCIES[k] || []);

                      return (
                        <View
                          key={k}
                          style={styles.card}
                        >
                          {/* Primary row */}
                          <TouchableOpacity
                            onPress={() => togglePrimary(k)}
                            activeOpacity={0.8}
                            style={[
                              styles.primaryRow,
                              isAllowed && styles.primaryRowActive,
                            ]}
                            disabled={loading}
                          >
                            <View style={styles.primaryTextContainer}>
                              <Text style={styles.primaryTitle}>
                                {CAP_LABELS[k]}
                              </Text>
                              <Text style={[styles.primaryBadge, badgeColor]}>
                                {badge}
                              </Text>
                            </View>
                            <Switch
                              value={isAllowed}
                              onValueChange={() => togglePrimary(k)}
                              trackColor={{ false: "#ccc", true: "#007AFF" }} 
                              thumbColor={isAllowed ? "#fff" : "#f4f3f4"}
                              disabled={loading}
                            />
                          </TouchableOpacity>

                          {/* Dependency list */}
                          {isAllowed && deps.length > 0 && (
                            <View style={styles.dependencyContainer}>
                              <View style={styles.dependencyList}>
                                {deps.map((d) => {
                                  const depAllowed = overrides[d] === true;
                                  return (
                                    <TouchableOpacity
                                      key={d}
                                      onPress={() => togglePermission(d)}
                                      activeOpacity={0.8}
                                      style={styles.dependencyItem}
                                      disabled={loading}
                                    >
                                      <Text style={styles.dependencyText}>
                                        {CAP_LABELS[d]}
                                      </Text>
                                      <Switch
                                        value={depAllowed}
                                        onValueChange={() => togglePermission(d)}
                                        trackColor={{ false: "#ccc", true: "#007AFF" }}
                                        thumbColor={depAllowed ? "#fff" : "#f4f3f4"}
                                        disabled={loading}
                                      />
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button variant="ghost" onPress={onClose} disabled={loading} style={styles.footerButton}>
              Cancel
            </Button>
            <Button onPress={save} disabled={loading} style={styles.footerButton}>
                <View style={styles.buttonContent}>
                    {loading ? (
                        <ActivityIndicator color="#fff" style={{marginRight: 5}}/>
                    ) : null}
                    <Text style={styles.textPrimary}>{loading ? "Saving..." : "Save"}</Text>
                </View>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default ManageUserPermissionsDialog;

// --- Stylesheet (mimics the web UI layout) ---

const styles = StyleSheet.create({
    // --- Modal Container ---
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 12,
        width: '95%',
        maxWidth: 700, 
        maxHeight: '80%', 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        overflow: 'hidden',
    },

    // --- Header ---
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },

    // --- Body & Grid Layout ---
    bodyScroll: {
        flexGrow: 1,
    },
    body: {
        padding: 16,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
    },
    contentContainer: {
        gap: 16, 
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 8, 
    },
    permissionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between', // Helps with 2-column layout
        gap: 16, 
    },
    card: {
        width: '100%', // Default to full width on mobile
        borderRadius: 12, 
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#fff', 
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    
    // --- Primary Row ---
    primaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12, 
        borderBottomColor: 'transparent',
    },
    primaryRowActive: {
        borderBottomWidth: 1, 
        borderBottomColor: '#f3f4f6', 
    },
    primaryTextContainer: {
        paddingRight: 12, 
        flex: 1,
    },
    primaryTitle: {
        fontSize: 14,
        fontWeight: '500', 
    },
    primaryBadge: {
        fontSize: 12,
        fontWeight: '500', 
        marginTop: 2,
    },
    textSuccess: {
        color: '#10b981', 
    },
    textDestructive: {
        color: '#ef4444', 
    },

    // --- Dependency List ---
    dependencyContainer: {
        padding: 12, 
        paddingTop: 8, 
    },
    dependencyList: {
        padding: 8, 
        gap: 8, 
        borderRadius: 8, 
        borderWidth: 1,
        borderColor: '#eee',
        backgroundColor: '#f9fafb', 
    },
    dependencyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8, 
        paddingVertical: 8, 
        borderRadius: 4, 
    },
    dependencyText: {
        fontSize: 14,
        color: '#333',
    },

    // --- Footer ---
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        gap: 10,
        marginTop: 16, 
    },
    footerButton: {
        minWidth: 80,
    },

    // --- Button Styles ---
    buttonBase: {
        borderRadius: 6,
        paddingVertical: 10,
        paddingHorizontal: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonSmall: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    buttonPrimary: {
        backgroundColor: '#007AFF', 
    },
    textPrimary: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    buttonGhost: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    textGhost: {
        color: '#333',
        fontSize: 14,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    }
});