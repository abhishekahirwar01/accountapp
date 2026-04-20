import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Replaced react-native-paper Card/Button with native components
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ClientsValidityManager from '../../components/admin/settings/ClientsValidityManager';
import ClientForm from '../../components/clients/ClientForm';
import { BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function SettingsPage() {
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedTab, setSelectedTab] = useState('profile');
  const [formData, setFormData] = useState({
    fullName: 'Master Administrator',
    email: 'admin@accountech.com',
    phone: '+1 (555) 123-4567',
    timezone: 'utc-5',
    invoiceEmails: true,
    reportEmails: false,
    securityAlerts: true,
  });
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  const navigation = useNavigation();

  const handleBack = () => {
    try {
      if (navigation && typeof navigation.canGoBack === 'function') {
        if (navigation.canGoBack()) navigation.goBack();
      }
    } catch (e) {}
  };

  // Load user data from AsyncStorage on component mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userJson = await AsyncStorage.getItem('userData');
      if (userJson) {
        const parsedUserData = JSON.parse(userJson);
        setUserData(parsedUserData);
        // Pre-fill form with user data if available
        setFormData(prev => ({
          ...prev,
          fullName: parsedUserData.fullName || prev.fullName,
          email: parsedUserData.email || prev.email,
          phone: parsedUserData.phone || prev.phone,
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleClientClick = client => {
    setSelectedClient(client);
    setIsClientDialogOpen(true);
  };

  const handleClientFormSubmit = async clientData => {
    try {
      setLoading(true);

      
      const token = await AsyncStorage.getItem('authToken');

      let response;
      if (selectedClient) {
       
        response = await fetch(`${BASE_URL}/api/clients/${selectedClient.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(clientData),
        });
      } else {
        
        response = await fetch(`${BASE_URL}/api/clients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(clientData),
        });
      }

      if (response.ok) {
        Alert.alert(
          'Success',
          `Client ${selectedClient ? 'updated' : 'created'} successfully`,
        );
        setIsClientDialogOpen(false);
        setSelectedClient(null);

      } else {
        throw new Error('Failed to save client');
      }
    } catch (error) {
      console.error('Error saving client:', error);
      Alert.alert('Error', 'Failed to save client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${BASE_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          timezone: formData.timezone,
        }),
      });

      if (response.ok) {
        // Update AsyncStorage with new user data
        const updatedUserData = {
          ...userData,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
        setUserData(updatedUserData);

        Alert.alert('Success', 'Profile settings saved successfully');
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${BASE_URL}/api/notification-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invoiceEmails: formData.invoiceEmails,
          reportEmails: formData.reportEmails,
          securityAlerts: formData.securityAlerts,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Notification settings saved successfully');
      } else {
        throw new Error('Failed to save notification settings');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert(
        'Error',
        'Failed to save notification settings. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCloseClientDialog = () => {
    setIsClientDialogOpen(false);
    setSelectedClient(null);
  };

  // Render different sections of the settings
  const renderProfileSection = () => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrap}>
            <Icon name="account-circle" size={20} color="#8b77ff" />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Profile Settings</Text>
            <Text style={styles.cardDescription}>
              Update your personal information
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PROFILE DETAILS</Text>
          <View style={styles.horizontalLine} />
        </View>

        <View style={styles.formGrid}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={formData.fullName}
              onChangeText={value => handleInputChange('fullName', value)}
              placeholder="Full Name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={value => handleInputChange('email', value)}
              placeholder="Email Address"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={value => handleInputChange('phone', value)}
              placeholder="Phone Number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Timezone</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.timezone}
                onValueChange={value => handleInputChange('timezone', value)}
                style={styles.picker}
              >
                <Picker.Item label="Eastern Time (UTC-5)" value="utc-5" />
                <Picker.Item label="Central Time (UTC-6)" value="utc-6" />
                <Picker.Item label="Mountain Time (UTC-7)" value="utc-7" />
                <Picker.Item label="Pacific Time (UTC-8)" value="utc-8" />
              </Picker>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={handleSaveProfile}
          style={[styles.saveButton, loading && styles.disabledButton]}
          disabled={loading}
        >
          <Icon
            name="content-save"
            size={20}
            color="white"
            style={styles.buttonIcon}
          />
          <Text style={styles.saveButtonText}>Save Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNotificationSection = () => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrap}>
            <Icon name="bell" size={20} color="#8b77ff" />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Notification Settings</Text>
            <Text style={styles.cardDescription}>
              Configure how you receive notifications
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ALERT PREFERENCES</Text>
          <View style={styles.horizontalLine} />
        </View>

        <View style={styles.notificationList}>
          {[
            {
              key: 'invoiceEmails',
              label: 'Invoice Emails',
              description:
                'Receive email notifications for new invoices and payments.',
            },
            {
              key: 'reportEmails',
              label: 'Monthly Reports',
              description:
                'Receive monthly financial summary reports via email.',
            },
            {
              key: 'securityAlerts',
              label: 'Security Alerts',
              description:
                'Receive email notifications for security-related events.',
            },
          ].map(item => (
            <View key={item.key} style={styles.notificationItem}>
              <View style={styles.notificationText}>
                <Text style={styles.notificationLabel}>{item.label}</Text>
                <Text style={styles.notificationDescription}>
                  {item.description}
                </Text>
              </View>
              <Switch
                value={formData[item.key]}
                onValueChange={value => handleInputChange(item.key, value)}
                trackColor={{ false: '#d1d5db', true: '#c5bcff' }}
                thumbColor={formData[item.key] ? '#8b77ff' : '#f8fafc'}
                ios_backgroundColor="#d1d5db"
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={handleSaveNotificationSettings}
          style={[styles.saveButton, loading && styles.disabledButton]}
          disabled={loading}
        >
          <Icon
            name="content-save"
            size={18}
            color="#ffffff"
            style={styles.buttonIcon}
          />
          <Text style={styles.saveButtonText}>Save Notifications</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f9ff" />
      <View style={styles.container}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#8b77ff" />
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          <View style={styles.headerContainer}>
            <View style={styles.headerTitleRow}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Icon name="arrow-left" size={22} color="#8b77ff" />
              </TouchableOpacity>
              <Text style={styles.title}>Settings</Text>
            </View>
            <Text style={styles.subtitle}>
              Manage your account and system preferences
            </Text>
          </View>

          <View style={styles.tabsContainer}>
            <ScrollView
              horizontal
              contentContainerStyle={styles.tabsScrollContent}
              showsHorizontalScrollIndicator={false}
            >
              {[
                {
                  value: 'profile',
                  label: 'Profile',
                  icon: 'account-circle',
                },
                {
                  value: 'client-validity',
                  label: 'Client Validity',
                  icon: 'account-group',
                },
                {
                  value: 'notifications',
                  label: 'Notifications',
                  icon: 'bell',
                },
              ].map(tab => {
                const active = selectedTab === tab.value;

                return (
                  <TouchableOpacity
                    key={tab.value}
                    style={[styles.tabItem, active && styles.tabItemActive]}
                    onPress={() => setSelectedTab(tab.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tabRow}>
                      <Icon
                        name={tab.icon}
                        size={16}
                        color={active ? '#8b77ff' : '#565b63'}
                        style={styles.tabIcon}
                      />
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>
                        {tab.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.tabContentWrapper}>
            {selectedTab === 'profile' && renderProfileSection()}

            {selectedTab === 'client-validity' && (
              <View style={styles.clientsSection}>
                <ClientsValidityManager
                  onClientClick={handleClientClick}
                  baseUrl={BASE_URL}
                />
              </View>
            )}

            {selectedTab === 'notifications' && renderNotificationSection()}
          </View>
        </ScrollView>

        {/* Client Dialog Modal */}
        <Modal
          visible={isClientDialogOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleCloseClientDialog}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>
                    {selectedClient ? 'Edit Client' : 'Add New Client'}
                  </Text>
                  <Text style={styles.modalDescription}>
                    {selectedClient
                      ? `Update the details for ${selectedClient.contactName}.`
                      : 'Fill in the form below to add a new client.'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleCloseClientDialog}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <ClientForm
                  client={selectedClient || undefined}
                  onFormSubmit={handleClientFormSubmit}
                  onCancel={handleCloseClientDialog}
                  loading={loading}
                  baseUrl={BASE_URL}
                />
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f9ff',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#f7f9ff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f7f9ff',
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  headerContainer: {
    marginBottom: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f7f9ff',
    position: 'relative',
  },
  tabsScrollContent: {
    paddingVertical: 0,
    paddingHorizontal: 8,
  },
  tabItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    minWidth: 110,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#8b77ff',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a4e55',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#8b77ff',
  },
  tabContentWrapper: {
    flex: 1,
    marginTop: 10,
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6eeff',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  cardContent: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#efebff',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cardDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  horizontalLine: {
    height: 1,
    backgroundColor: '#e6eeff',
    width: '56%',
  },
  formGrid: {
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dce3f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#dce3f5',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#1f2937',
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: '#e6eeff',
    justifyContent: 'flex-end',
  },
  saveButton: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b77ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    margin: 12,
  },
  saveButtonText: {
    color: '#ffffff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 2,
  },
  clientsSection: {
    marginBottom: 16,
  },
  notificationList: {
    marginTop: 2,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#e3e9fa',
    marginBottom: 10,
  },
  notificationText: {
    flex: 1,
    marginRight: 12,
  },
  notificationLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    color: '#1f2937',
  },
  notificationDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f7f9ff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e6eeff',
    backgroundColor: '#f7f9ff',
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  closeButton: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#efebff',
  },
  modalContent: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(247, 249, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});
