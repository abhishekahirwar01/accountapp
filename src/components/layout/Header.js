import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Keyboard,
  StatusBar,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

export default function Header({ role = "master" }) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const navigation = useNavigation();

  const handleNotification = () => console.log("Notification clicked");

  const handleHistory = () => navigation.navigate("HistoryScreen");

  const handleSearchSubmit = () => {
    if (searchText.trim() === "") return;
    console.log("Search submitted:", searchText);
    setShowSearch(false);
    setSearchText("");
    Keyboard.dismiss();
  };

  const handleBack = () => {
    setShowSearch(false);
    setSearchText("");
  };

  const handleLogout = () => {
    setShowDropdown(false);
    navigation.reset({
      index: 0,
      routes: [{ name: "GettingStarted" }],
    });
  };

  const handleSettings = () => {
    setShowDropdown(false);
    if (role === "master") {
      navigation.navigate("SettingsScreen");
    } else {
      navigation.navigate("ProfileScreen");
    }
  };

  const handleProfile = () => {
    setShowDropdown((prev) => !prev);
  };

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />

      <SafeAreaView edges={["top"]} style={{ backgroundColor: "#fff" }}>
        <View style={styles.container}>
          {showSearch ? (
            <View style={styles.searchContainer}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#334155" />
              </TouchableOpacity>

              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor="#94A3B8"
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
                autoFocus={true}
                onSubmitEditing={handleSearchSubmit}
                keyboardType="visible-password"
              />

              {searchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchText("")}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <Text style={styles.appName}>AccounTech Pro</Text>

              <View style={styles.rightContainer}>
                <TouchableOpacity
                  onPress={() => setShowSearch(true)}
                  style={styles.iconButton}
                >
                  <Ionicons name="search" size={22} color="#334155" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleNotification}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={22}
                    color="#334155"
                  />
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeText}>3</Text>
                  </View>
                </TouchableOpacity>

                {role === "master" && (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={handleHistory}
                  >
                    <Ionicons name="time-outline" size={22} color="#334155" />
                  </TouchableOpacity>
                )}

                {/* Profile + Role Dropdown */}
                <View style={styles.profileWrapper}>
                  <TouchableOpacity
                    style={styles.profileContainer}
                    onPress={handleProfile}
                  >
                    <Ionicons
                      name="person-circle-outline"
                      size={28}
                      color="#334155"
                    />
                    <Text style={styles.roleText}>{role}</Text>
                  </TouchableOpacity>

                  {/* Dropdown Modal */}
                  <Modal
                    visible={showDropdown}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowDropdown(false)}
                  >
                    {/* Backdrop */}
                    <Pressable
                      style={StyleSheet.absoluteFill}
                      onPress={() => setShowDropdown(false)}
                    />

                    {/* Dropdown */}
                    <View
                      pointerEvents="box-none"
                      style={styles.dropdownPortal}
                    >
                      <View style={styles.dropdownMenu}>
                        {role === "master" && (
                          <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => {
                              setShowDropdown(false);
                              navigation.navigate("ProfileScreen");
                            }}
                          >
                            <Text style={styles.dropdownText}>Profile</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={handleSettings}
                        >
                          <Text style={styles.dropdownText}>Settings</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={handleLogout}
                        >
                          <Text
                            style={[styles.dropdownText, { color: "red" }]}
                          >
                            Logout
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
                </View>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  appName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 6,
    marginHorizontal: 4,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 6,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  profileWrapper: {
    position: "relative",
  },
  profileContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  roleText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 8,
    height: 44,
  },
  backButton: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  clearButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    paddingVertical: 0,
  },
  dropdownPortal: {
    flex: 1,
    alignItems: "flex-end",
    paddingTop: Platform.select({ ios: 64, android: 56 }),
    paddingRight: 12,
  },
  dropdownMenu: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 8,
    width: 180,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
    }),
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropdownText: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "500",
  },
});
