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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ClientsValidityManager from '../../components/admin/settings/ClientsValidityManager';
import ClientForm from '../../components/clients/ClientForm';
import { BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLayout from '../../components/layout/AppLayout';
import { useNavigation } from '@react-navigation/native';

export default function SettingsPage() {
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
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
        const userData = JSON.parse(userJson);
        setUserData(userData);
        // Pre-fill form with user data if available
        setFormData(prev => ({
          ...prev,
          fullName: userData.fullName || prev.fullName,
          email: userData.email || prev.email,
          phone: userData.phone || prev.phone,
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

      // Get auth token from AsyncStorage
      const token = await AsyncStorage.getItem('authToken');

      let response;
      if (selectedClient) {
        // Update existing client - /api/ जोड़ा गया
        response = await fetch(`${BASE_URL}/api/clients/${selectedClient.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(clientData),
        });
      } else {
        // Create new client - /api/ जोड़ा गया
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

        // Refresh clients list in ClientsValidityManager
        // You might want to use a callback or context to refresh the list
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
      // /api/ जोड़ा गया
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
      const token = await AsyncStorage.getItem('authToken');
      // /api/ जोड़ा गया
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
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Icon name="account-circle" size={24} color="#666" />
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Profile Settings</Text>
            <Text style={styles.cardDescription}>
              Update your personal information
            </Text>
          </View>
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
      </Card.Content>

      <Card.Actions style={styles.cardActions}>
        <Button
          mode="contained"
          onPress={handleSaveProfile}
          style={styles.saveButton}
          disabled={loading}
        >
          <Icon
            name="content-save"
            size={20}
            color="white"
            style={styles.buttonIcon}
          />
          Save Profile
        </Button>
      </Card.Actions>
    </Card>
  );

  const renderNotificationSection = () => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Icon name="bell" size={24} color="#666" />
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Notification Settings</Text>
            <Text style={styles.cardDescription}>
              Configure how you receive notifications
            </Text>
          </View>
        </View>

        <View style={styles.notificationItem}>
          <View style={styles.notificationText}>
            <Text style={styles.notificationLabel}>Invoice Emails</Text>
            <Text style={styles.notificationDescription}>
              Receive email notifications for new invoices and payments.
            </Text>
          </View>
          <Switch
            value={formData.invoiceEmails}
            onValueChange={value => handleInputChange('invoiceEmails', value)}
          />
        </View>

        <View style={styles.separator} />

        <View style={styles.notificationItem}>
          <View style={styles.notificationText}>
            <Text style={styles.notificationLabel}>Monthly Reports</Text>
            <Text style={styles.notificationDescription}>
              Receive monthly financial summary reports via email.
            </Text>
          </View>
          <Switch
            value={formData.reportEmails}
            onValueChange={value => handleInputChange('reportEmails', value)}
          />
        </View>

        <View style={styles.separator} />

        <View style={styles.notificationItem}>
          <View style={styles.notificationText}>
            <Text style={styles.notificationLabel}>Security Alerts</Text>
            <Text style={styles.notificationDescription}>
              Receive email notifications for security-related events.
            </Text>
          </View>
          <Switch
            value={formData.securityAlerts}
            onValueChange={value => handleInputChange('securityAlerts', value)}
          />
        </View>
      </Card.Content>

      {/* <Card.Actions style={styles.cardActions}>
        <Button 
          mode="contained" 
          onPress={handleSaveNotificationSettings}
          style={styles.saveButton}
          disabled={loading}
        >
          <Icon name="bell" size={20} color="white" style={styles.buttonIcon} />
          Save Notifications
        </Button>
      </Card.Actions> */}
    </Card>
  );

  // Data for FlatList sections
  const settingsSections = [
    {
      id: 'header',
      type: 'header',
    },
    {
      id: 'profile',
      type: 'profile',
    },
    {
      id: 'clients',
      type: 'clients',
    },
    {
      id: 'notifications',
      type: 'notifications',
    },
  ];

  const renderItem = ({ item }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={handleBack}
                  style={styles.backButton}
                >
                  <Icon name="arrow-left" size={24} color="#666" />
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
              </View>
              <Text style={styles.subtitle}>
                Manage your account and system preferences
              </Text>
            </View>
          </View>
        );
      case 'profile':
        return renderProfileSection();
      case 'clients':
        return (
          <ClientsValidityManager
            onClientClick={handleClientClick}
            baseUrl={BASE_URL}
          />
        );
      case 'notifications':
        return renderNotificationSection();
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          )}

          <FlatList
            data={settingsSections}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />

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
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  headerRow: {
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  backButton: {
    marginRight: 10,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 10,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderText: {
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
  formGrid: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
    justifyContent: 'flex-end',
  },
  saveButton: {
    borderRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  notificationText: {
    flex: 1,
    marginRight: 16,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 4,
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});
