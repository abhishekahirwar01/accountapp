import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert, // Use Alert for simple toasts/notifications
} from 'react-native';

// --- Placeholder/Mock Components and Hooks ---
// In a real project, you would build these separately.

// Mock 'useToast' hook - uses React Native's built-in Alert for simplicity
const useToast = () => {
  return {
    toast: ({ variant, title, description }) => {
      let message = title;
      if (description) message += `\n${description}`;
      Alert.alert(variant === 'destructive' ? "Error" : "Success", message);
    },
  };
};

// Mock 'Button' Component (Simple TouchableOpacity)
const Button = ({ children, onPress, disabled, style, variant }) => {
  const buttonStyle = [
    styles.buttonBase,
    variant === 'ghost' ? styles.buttonGhost : styles.buttonPrimary,
    disabled && styles.buttonDisabled,
    style,
  ];
  const textStyle = variant === 'ghost' ? styles.textGhost : styles.textPrimary;

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={buttonStyle}>
      {children}
    </TouchableOpacity>
  );
};

// Mock 'Label' Component
const Label = ({ children }) => <Text style={styles.label}>{children}</Text>;

// --- Main Component ---

export default function ResetPasswordDialog({ open, onClose, userId, userName }) {
  const { toast } = useToast();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  // Hardcoded/Mock API Data (as requested)
  const MOCK_TOKEN = "mock-auth-token-12345";
  // In a real RN app, you'd use a library like @react-native-async-storage/async-storage
  const getToken = () => MOCK_TOKEN;

  const submit = async () => {
    if (!pw1 || pw1.length < 6) {
      toast({ variant: "destructive", title: "Password must be at least 6 characters" });
      return;
    }
    if (pw1 !== pw2) {
      toast({ variant: "destructive", title: "Passwords do not match" });
      return;
    }

    setLoading(true);

    // --- Backend Simulation Start ---
    // In a real app, this is where your fetch logic would go.
    // We'll simulate a successful request delay (e.g., 1.5 seconds)
    
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    // Simulation logic:
    // const token = getToken(); // Replace with actual storage retrieval
    // const baseURL = "https://your-api-base.com"; // Replace with your actual base URL

    try {
        // Simulating a successful API response
        if (userId) { 
            toast({ 
                title: "Password reset", 
                description: `Password updated for ${userName ?? "user"}.` 
            });
            onClose();
        } else {
            // Simulating an API error (e.g., missing userId)
            throw new Error("User ID is missing. Failed to reset password.");
        }
    } catch (e) {
      toast({ 
          variant: "destructive", 
          title: "Reset failed", 
          description: e instanceof Error ? e.message : String(e) 
      });
    } finally {
      setLoading(false);
      setPw1("");
      setPw2("");
    }
    // --- Backend Simulation End ---
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={open}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          
          {/* Header (DialogHeader & DialogTitle) */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Reset Password{userName ? ` — ${userName}` : ""}
            </Text>
          </View>

          <View style={styles.body}>
            {/* New Password */}
            <View style={styles.inputGroup}>
              <Label>New Password</Label>
              <View style={styles.inputWrapper}>
                <TextInput
                  secureTextEntry={!showPw1}
                  value={pw1}
                  onChangeText={setPw1}
                  style={styles.input}
                  placeholder="Enter new password"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPw1((prev) => !prev)}
                  style={styles.toggleButton}
                  disabled={loading}
                >
                  <Text style={styles.toggleText}>
                    {showPw1 ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm New Password */}
            <View style={styles.inputGroup}>
              <Label>Confirm New Password</Label>
              <View style={styles.inputWrapper}>
                <TextInput
                  secureTextEntry={!showPw2}
                  value={pw2}
                  onChangeText={setPw2}
                  style={styles.input}
                  placeholder="Confirm new password"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPw2((prev) => !prev)}
                  style={styles.toggleButton}
                  disabled={loading}
                >
                  <Text style={styles.toggleText}>
                    {showPw2 ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Footer (DialogFooter) */}
          <View style={styles.footer}>
            <Button variant="ghost" onPress={onClose} disabled={loading} style={styles.footerButton}>
              <Text style={styles.textGhost}>Cancel</Text>
            </Button>
            <Button onPress={submit} disabled={loading} style={styles.footerButton}>
              <View style={styles.buttonContent}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.textPrimary}>Update</Text>
                )}
              </View>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Modal overlay background
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 12,
    width: '90%', // Adjust width for mobile view
    maxWidth: 400, // Optional max width for tablets/larger screens
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    padding: 16,
    gap: 15, // Mimics space-y-3
  },
  inputGroup: {
    gap: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    paddingRight: 10,
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#333',
  },
  toggleButton: {
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  toggleText: {
    fontSize: 12,
    color: '#666', // muted-foreground
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 10,
  },
  footerButton: {
    minWidth: 80, // Ensure consistent button size
  },
  // Custom Button Styles
  buttonBase: {
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF', // A nice primary blue
  },
  textPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#eee',
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