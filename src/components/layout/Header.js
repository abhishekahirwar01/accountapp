import React, { useState, useEffect, memo } from 'react';
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
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Context Hooks
import { useCompany } from '../../contexts/company-context';

// Components
import { CompanySwitcher } from './CompanySwitcher';
import Notification from '../notifications/Notification';

const logoPath2 = require('../../../assets/images/vinimay.png');

function roleToLabel(role) {
  switch (role) {
    case 'master':
      return 'Master';
    case 'admin':
      return 'Admin';
    case 'manager':
      return 'Manager';
    case 'customer':
      return 'Client';
    case 'user':
      return 'User';
    default:
      return 'User';
  }
}

function normalizeRole(rawRole) {
  const role = (rawRole ?? '').toLowerCase();
  if (role === 'client') return 'customer';
  return role;
}

export default memo(function Header() {
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dateString, setDateString] = useState('');
  const [highlightCount, setHighlightCount] = useState(0);
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [formattedRole, setFormattedRole] = useState('');

  const navigation = useNavigation();

  // Context data
  const { triggerCompaniesRefresh } = useCompany();

  useEffect(() => {
    const today = new Date();
    setDateString(
      today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    );

    getUserData();
  }, []);

  // Get user data from storage
  const getUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const userRole = await AsyncStorage.getItem('role');

      if (userData) setCurrentUser(JSON.parse(userData));
      if (userRole) {
        const normalizedRole = normalizeRole(userRole);
        setRole(normalizedRole);
        setFormattedRole(roleToLabel(normalizedRole));
      }
    } catch (error) {
      console.error('Error getting user data:', error);
    }
  };

  // Role-based visibility
  const showNotification = role && role !== 'user' && role !== 'master';
  const showHistory = role === 'master';
  const showCompanySwitcher = ['customer', 'user', 'admin', 'manager'].includes(
    role,
  );

  const isUser = role === 'user';
  const isCustomer = role === 'customer';

  const handleSearchSubmit = () => {
    if (searchText.trim()) {
      handleSearchHighlight(searchText);
    }
    setShowSearch(false);
    setSearchText('');
    Keyboard.dismiss();
  };

  const handleSettings = () => {
    setShowDropdown(false);
    if (role === 'master') {
      navigation.navigate('AdminSettings');
    } else {
      navigation.navigate('ProfileScreen');
    }
  };

  const handleHistory = () => {
    setShowDropdown(false);
    if (role === 'master') {
      navigation.navigate('HistoryScreen');
    }
  };

  const handleProfile = () => {
    setShowDropdown(false);
    if (role === 'master') {
      navigation.navigate('ProfileScreen');
    } else if (role === 'customer' || role === 'user' || role === 'admin') {
      navigation.navigate('ClientProfile');
    }
  };

  const handleSupport = () => {
    setShowDropdown(false);
    navigation.navigate('SupportFormScreen');
  };

  // Search highlight functionality
  const handleSearchHighlight = term => {
    if (!term.trim()) {
      setHighlightCount(0);
      setCurrentHighlightIndex(0);
      return;
    }
    setHighlightCount(5);
    setCurrentHighlightIndex(0);
  };

  const handleNextHighlight = () => {
    if (currentHighlightIndex < highlightCount - 1) {
      setCurrentHighlightIndex(prev => prev + 1);
    }
  };

  const handlePreviousHighlight = () => {
    if (currentHighlightIndex > 0) {
      setCurrentHighlightIndex(prev => prev - 1);
    }
  };

  const handleLogout = async () => {
    try {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.reset({
              index: 0,
              routes: [{ name: 'GettingStarted' }],
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
    setShowDropdown(false);
  };

  // Search UI
  if (showSearch) {
    return (
      <>
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
          <View style={styles.searchContainer}>
            <TouchableOpacity
              onPress={() => {
                setShowSearch(false);
                setSearchText('');
                setHighlightCount(0);
                setCurrentHighlightIndex(0);
              }}
              style={styles.backButton}
            >
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
            />

            {searchText.length > 0 && (
              <View style={styles.searchControls}>
                {highlightCount > 0 && (
                  <View style={styles.highlightControls}>
                    <Text style={styles.highlightCount}>
                      {currentHighlightIndex + 1}/{highlightCount}
                    </Text>

                    <TouchableOpacity
                      onPress={handlePreviousHighlight}
                      style={styles.highlightButton}
                      disabled={currentHighlightIndex === 0}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={18}
                        color={
                          currentHighlightIndex === 0 ? '#CBD5E1' : '#334155'
                        }
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleNextHighlight}
                      style={styles.highlightButton}
                      disabled={currentHighlightIndex === highlightCount - 1}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color={
                          currentHighlightIndex === highlightCount - 1
                            ? '#CBD5E1'
                            : '#334155'
                        }
                      />
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => setSearchText('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </>
    );
  }

  // Main UI
  return (
    <>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
        <View style={styles.container}>
          <Image
            source={logoPath2}
            style={[styles.logoImage, isUser && styles.userLogoImage]}
            resizeMode="contain"
          />

          {/* Company Switcher */}
          {showCompanySwitcher && (
            <View
              style={[
                styles.companySwitcherContainer,
                isUser && styles.userCompanySwitcherContainer,
              ]}
            >
              <CompanySwitcher />
            </View>
          )}

          {/* Right side icons */}
          <View
            style={[styles.rightContainer, isUser && styles.userRightContainer]}
          >
            {/* Notification - Hidden for user */}
            {showNotification && (
              <View style={styles.notificationContainer}>
                <Notification socket={null} />
              </View>
            )}

            {/* History Icon - master only */}
            {showHistory && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleHistory}
              >
                <Ionicons name="time-outline" size={22} color="#334155" />
              </TouchableOpacity>
            )}

            {/* Profile Dropdown */}
            <View style={styles.profileWrapper}>
              <TouchableOpacity
                style={[
                  styles.textProfileContainer,
                  isUser && styles.userTextProfileContainer,
                ]}
                onPress={() => setShowDropdown(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.textProfileRole}>{formattedRole}</Text>
                <Ionicons name="chevron-down" size={16} color="#64748b" />
              </TouchableOpacity>

              {/* Dropdown Modal */}
              <Modal
                visible={showDropdown}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDropdown(false)}
              >
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => setShowDropdown(false)}
                />
                <View pointerEvents="box-none" style={styles.dropdownPortal}>
                  <View
                    style={[
                      styles.dropdownMenu,
                      (isUser || isCustomer) && styles.userDropdownMenu,
                    ]}
                  >
                    {/* ✅ Profile for Master */}
                    {role === 'master' && (
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={handleProfile}
                      >
                        <Ionicons
                          name="person-outline"
                          size={18}
                          color="#64748b"
                        />
                        <Text style={styles.dropdownText}>Profile</Text>
                      </TouchableOpacity>
                    )}

                    {/* ✅ Business Cards for Customer/Client */}
                    {role === 'customer' && (
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={handleProfile}
                      >
                        <Ionicons
                          name="card-outline"
                          size={18}
                          color="#64748b"
                        />
                        <Text style={styles.dropdownText}>Profile</Text>
                      </TouchableOpacity>
                    )}

                    {/* ✅ Profile for User & Admin */}
                    {(role === 'user' || role === 'admin') && (
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={handleProfile}
                      >
                        <Ionicons
                          name="person-outline"
                          size={18}
                          color="#64748b"
                        />
                        <Text style={styles.dropdownText}>Profile</Text>
                      </TouchableOpacity>
                    )}

                    {/* Settings */}
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={handleSettings}
                    >
                      <Ionicons
                        name="settings-outline"
                        size={18}
                        color="#64748b"
                      />
                      <Text
                        style={[
                          styles.dropdownText,
                          isUser && styles.userDropdownText,
                        ]}
                      >
                        Settings
                      </Text>
                    </TouchableOpacity>

                    {/* Support - not for master */}
                    {role !== 'master' && (
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={handleSupport}
                      >
                        <Ionicons
                          name="help-circle-outline"
                          size={18}
                          color="#64748b"
                        />
                        <Text
                          style={[
                            styles.dropdownText,
                            isUser && styles.userDropdownText,
                          ]}
                        >
                          Support
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Logout */}
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={handleLogout}
                    >
                      <Ionicons
                        name="log-out-outline"
                        size={18}
                        color="#ef4444"
                      />
                      <Text style={[styles.dropdownText, { color: '#ef4444' }]}>
                        Logout
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  logoImage: {
    width: 80,
    height: 40,
  },
  companySwitcherContainer: {
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
    marginHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContainer: {
    marginHorizontal: 4,
    paddingTop: 4,
  },
  profileWrapper: {
    position: 'relative',
  },
  profileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  roleText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },

  // User-specific styles
  userLogoImage: {
    width: 60,
    height: 35,
  },
  userCompanySwitcherContainer: {
    flex: 1.5,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  userRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 50,
  },
  userProfileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 8,
  },
  userRoleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userDropdownMenu: {
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },

  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 8,
    height: 44,
  },
  backButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  clearButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 0,
  },
  dropdownPortal: {
    flex: 1,
    alignItems: 'flex-end',
    paddingTop: Platform.select({ ios: 64, android: 48 }),
    paddingRight: 12,
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 140,
    ...Platform.select({
      android: { elevation: 12 },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 12,
  },
  dropdownText: {
    fontSize: 14,
    color: '#3730a3',
    fontWeight: '500',
  },
  userDropdownText: {
    color: '#3730a3',
  },
  searchControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  highlightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  highlightCount: {
    fontSize: 12,
    color: '#64748b',
    marginRight: 8,
    fontWeight: '500',
  },
  highlightButton: {
    padding: 4,
    marginHorizontal: 2,
  },
  textProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  userTextProfileContainer: {
    backgroundColor: '#eef2ff',
  },
  textProfileRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    textTransform: 'capitalize',
  },
});
