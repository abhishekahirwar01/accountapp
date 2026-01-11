import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Context Hooks
import { useCompany } from '../../contexts/company-context';

// Components
import { CompanySwitcher } from './CompanySwitcher';
import Notification from '../notifications/Notification';
import SupportForm from '../support/SupportForm';

// Config
import { BASE_URL } from '../../config';

const logoPath2 = require('../../../assets/images/vinimay.png');

// Role label mapping function (Next.js जैसा)
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

// Role normalization (Next.js जैसा behavior)
function normalizeRole(rawRole) {
  const role = (rawRole ?? '').toLowerCase();
  if (role === 'client') return 'customer';
  return role;
}

export default function Header() {
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [dateString, setDateString] = useState('');
  const [highlightCount, setHighlightCount] = useState(0);
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [formattedRole, setFormattedRole] = useState('');

  const navigation = useNavigation();
  const route = useRoute();

  // Context data
  const { triggerCompaniesRefresh } = useCompany();

  // Refresh companies whenever Header comes to focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Header focused - triggering company refresh...');
      triggerCompaniesRefresh();
    }, [triggerCompaniesRefresh]),
  );

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

    // Get user data from AsyncStorage
    getUserData();
  }, []);

  // Get user data from storage
  const getUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
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

  const handleSearchSubmit = () => {
    if (searchText.trim()) {
      console.log('Search:', searchText);
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
    }
  };

  const handleSupport = () => {
    setShowDropdown(false);
    setShowSupportForm(true);
  };

  // Search highlight functionality
  const handleSearchHighlight = term => {
    if (!term.trim()) {
      setHighlightCount(0);
      setCurrentHighlightIndex(0);
      return;
    }

    console.log('Searching for:', term);
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
            // 1. Storage clear karein (Sab roles ke liye common)
            await AsyncStorage.clear();

            // 2. Navigation Reset karein
            // Isse 'GettingStarted' stack ki pehli aur akeli screen ban jayegi
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
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent={false}
        />
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
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
        <View style={styles.container}>
          {/* Logo */}
          <Image
            source={logoPath2}
            style={styles.logoImage}
            resizeMode="contain"
          />

          {/* Company Switcher - Center Position */}
          {showCompanySwitcher && (
            <View style={styles.companySwitcherContainer}>
              <CompanySwitcher />
            </View>
          )}

          {/* Right side icons */}
          <View style={styles.rightContainer}>
            {/* Notification Component */}
            {showNotification && (
              <View style={styles.notificationContainer}>
                <Notification />
              </View>
            )}

            {/* History Icon */}
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
                style={styles.profileContainer}
                onPress={() => setShowDropdown(true)}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={28}
                  color="#334155"
                />
                {/* Formatted role label display */}
                <Text style={styles.roleText}>{formattedRole}</Text>
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
                  <View style={styles.dropdownMenu}>
                    {/* Profile Option for Master */}
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

                    {/* Settings Option */}
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={handleSettings}
                    >
                      <Ionicons
                        name="settings-outline"
                        size={18}
                        color="#64748b"
                      />
                      <Text style={styles.dropdownText}>Settings</Text>
                    </TouchableOpacity>

                    {/* Support Option */}
                    {role !== 'master'&&(

                      <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={handleSupport}
                    >
                      <Ionicons
                        name="help-circle-outline"
                        size={18}
                        color="#64748b"
                      />
                      <Text style={styles.dropdownText}>Support</Text>
                    </TouchableOpacity>
                    )}
                    

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

      {/* Support Form Modal */}
      <SupportForm
        isVisible={showSupportForm}
        onClose={() => setShowSupportForm(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
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
    paddingTop: Platform.select({ ios: 64, android: 56 }),
    paddingRight: 12,
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 8,
    width: 180,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
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
});
