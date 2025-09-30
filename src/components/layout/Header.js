import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Keyboard,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function Header({ role = 'Admin' }) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');

  const handleNotification = () => console.log('Notification clicked');
  const handleHistory = () => console.log('History clicked');
  const handleProfile = () => console.log('Profile clicked');

  const handleSearchSubmit = () => {
    if (searchText.trim() === '') return;
    console.log('Search submitted:', searchText);
    setShowSearch(false);
    setSearchText('');
    Keyboard.dismiss();
  };

  const handleBack = () => {
    setShowSearch(false);
    setSearchText('');
  };

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
        hidden={false}
      />

      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
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
                keyboardType='visible-password'
              />
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

                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleHistory}
                >
                  <Ionicons name="time-outline" size={22} color="#334155" />
                </TouchableOpacity>

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12, // vertical spacing for status bar
    backgroundColor: '#FFFFFF',
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
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
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
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
  // --- Search Mode Styles ---
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 8,
    height: 44, // consistent height with icons
  },
  backButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 0, // vertically center input text
  },
});
