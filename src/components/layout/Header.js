import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Logo from '../../../assets/images/logo.jpg';

export default function Header({ role = 'Admin' }) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');

  const handleNotification = () => {
    if (showSearch) setShowSearch(false); // close search if open
    console.log('Notification clicked');
  };

  const handleHistory = () => {
    if (showSearch) setShowSearch(false);
    console.log('History clicked');
  };

  const handleProfile = () => {
    if (showSearch) setShowSearch(false);
    console.log('Profile clicked');
  };

  const handleSearchSubmit = () => {
    if (searchText.trim() === '') return;
    console.log('Search submitted:', searchText);
    setShowSearch(false);
    setSearchText('');
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
      <View style={styles.container}>
        {/* Left Side */}
        {!showSearch ? (
          <Text style={styles.appName}>AccounTech Pro</Text>
        ) : (
          <Image source={Logo} style={styles.logo} resizeMode="contain" />
        )}

        {/* Center - Search Bar */}
        {showSearch && (
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
        )}

        {/* Right Side */}
        <View style={styles.rightContainer}>
          {!showSearch && (
            <TouchableOpacity
              onPress={() => setShowSearch(true)}
              style={styles.iconButton}
            >
              <Ionicons name="search" size={22} color="#334155" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleNotification}
          >
            <Ionicons name="notifications-outline" size={22} color="#334155" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={handleHistory}>
            <Ionicons name="time-outline" size={22} color="#334155" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileContainer}
            onPress={handleProfile}
          >
            <Ionicons name="person-circle-outline" size={28} color="#334155" />
            <Text style={styles.roleText}>{role}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12, // Horizontal padding reduced
    paddingTop: 8, // Top padding reduced
    paddingBottom: 0, // Removed bottom padding to eliminate the extra space
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  logo: {
    width: 40,
    height: 40,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6, // Reduced padding
    marginHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  profileContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 8,
  },
  roleText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1E293B',
  },
});
